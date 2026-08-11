/**
 * Strips `reasoning` parts out of assistant history before a request goes out.
 *
 * Some providers emit reasoning content and then refuse to accept it back:
 *
 *   'messages.2' : for 'role:assistant' the following must be satisfied
 *   [('messages.2' : property 'reasoning_content' is unsupported)]
 *
 * The model produces a `type: "reasoning"` part, the SDK keeps it in history,
 * the AI SDK serialises it as `reasoning_content` on the next request, and the
 * provider rejects its own field. Nothing in our code ever creates it, so
 * `beforeModel` is the only point where we own the message list and can drop it
 * — hence a hook rather than a fix at the construction site.
 *
 * The failure is turn-dependent, which is what makes it confusing in use: the
 * first request has no assistant history and succeeds, so single-turn chat
 * looks healthy while every tool loop dies on its second call. That is exactly
 * the shape the user hit on Groq's `gpt-oss-120b` (2026-08-12) — and switching
 * models did not help, because the rejection comes from the provider's request
 * validator, not the model.
 *
 * Ported from `apps/openprovider/src/providers/sanitizer.ts`, where this was
 * diagnosed and fixed against the live API (Faz 5). The logic is duplicated
 * rather than imported because the two apps ship as separate bundles.
 */
import type { AgentMessage, AgentMessagePart } from "@cline/agents"
import { shouldStripReasoningHistory } from "./provider-compat"

/**
 * Whether this provider's history must have reasoning removed.
 *
 * The decision itself lives in `provider-compat.ts` alongside the providers
 * that *require* reasoning kept (DeepSeek, Gemini). Keeping a second list here
 * is how those two groups drift apart: the same edit that adds a rejecting
 * provider to one list is the edit that has to not add it to the other.
 */
export function providerRejectsReasoningHistory(providerId: string | undefined): boolean {
	return shouldStripReasoningHistory(providerId)
}

export interface SanitizeResult {
	messages: AgentMessage[]
	/** How many parts were dropped. Zero means the list is unchanged. */
	removed: number
}

export function stripReasoningParts(messages: readonly AgentMessage[]): SanitizeResult {
	let removed = 0

	const cleaned = messages.map((message) => {
		// Only assistant messages carry reasoning; skip the rest untouched.
		if (message.role !== "assistant" || !Array.isArray(message.content)) {
			return message
		}

		const kept = message.content.filter((part: AgentMessagePart) => part.type !== "reasoning")
		if (kept.length === message.content.length) {
			return message
		}
		removed += message.content.length - kept.length

		// An assistant message can be *only* reasoning. Removing its content
		// outright would leave an empty message, which providers reject just as
		// firmly as the reasoning field, so a placeholder keeps the alternating
		// turn structure intact.
		return {
			...message,
			content: kept.length > 0 ? kept : ([{ type: "text", text: "" }] as AgentMessagePart[]),
		}
	})

	return { messages: cleaned, removed }
}
