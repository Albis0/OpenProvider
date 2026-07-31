/**
 * Faz 5, adım 1 — istek temizleyici.
 *
 * Removes fields a provider will not accept from the outgoing request. This
 * has to happen in `beforeModel` rather than anywhere else, because the
 * offending content is produced by the model itself and put back into history
 * by the SDK — there is no earlier point where we own it.
 *
 * Ordering matters: the sanitizer must run *after* anything that adds
 * messages, so it cleans the final list rather than a prefix of it. The
 * pipeline in `hooks/pipeline.ts` guarantees that as long as it is registered
 * last.
 */
import type { AgentMessage, AgentMessagePart } from "@cline/agents";
import type { RequestTransform } from "../hooks/pipeline";
import { quirksFor } from "./quirks";

export interface SanitizerOptions {
	providerId: string;
	/** Called when something was actually removed. For diagnostics. */
	onSanitize?: (summary: string) => void;
}

function stripReasoningParts(messages: readonly AgentMessage[]): {
	messages: AgentMessage[];
	removed: number;
} {
	let removed = 0;

	const cleaned = messages.map((message) => {
		// User and tool messages never carry reasoning; skip the work.
		if (message.role !== "assistant") {
			return message;
		}
		const kept = message.content.filter(
			(part: AgentMessagePart) => part.type !== "reasoning",
		);
		if (kept.length === message.content.length) {
			return message;
		}
		removed += message.content.length - kept.length;

		// An assistant message can be *only* reasoning. Dropping its content
		// entirely would leave an empty message, which providers reject just as
		// firmly, so a placeholder keeps the turn structure intact.
		return {
			...message,
			content:
				kept.length > 0
					? kept
					: ([{ type: "text", text: "" }] as AgentMessagePart[]),
		};
	});

	return { messages: cleaned, removed };
}

/**
 * Builds the sanitizer for a provider. Returns `undefined` when that provider
 * has no known quirks, so the pipeline stays empty rather than carrying a
 * no-op.
 */
export function createSanitizerTransform(
	options: SanitizerOptions,
): RequestTransform | undefined {
	const quirks = quirksFor(options.providerId);
	if (!quirks.stripReasoning) {
		return undefined;
	}

	return {
		name: `sanitize:${options.providerId}`,
		apply({ request }) {
			const { messages, removed } = stripReasoningParts(request.messages);
			if (removed === 0) {
				return undefined;
			}
			options.onSanitize?.(
				`removed ${removed} reasoning part(s) rejected by ${options.providerId}`,
			);
			return { messages };
		},
	};
}
