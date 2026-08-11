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

/**
 * Providers known to reject the reasoning they themselves produced.
 *
 * Deliberately a list and not "strip for everyone": on providers that do accept
 * it, reasoning in history is useful context for the model, and throwing it
 * away would quietly degrade answers to fix a problem those providers do not
 * have.
 */
const PROVIDERS_REJECTING_REASONING = new Set(["groq"])

export function providerRejectsReasoningHistory(providerId: string | undefined): boolean {
	return providerId ? PROVIDERS_REJECTING_REASONING.has(providerId) : false
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
