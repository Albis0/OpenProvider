/**
 * Faz 1, adım 5 — SDK entegrasyonu.
 *
 * Turns a `ContextEngine` into the `beforeModel` hook proven out in Faz 0.
 * On every model call the latest user message is read, relevant files are
 * selected, and a repo map is inserted ahead of the conversation.
 *
 * Two properties this relies on, both verified in Faz 0:
 *   - messages returned from the hook apply to that request only and are never
 *     persisted, so stale context cannot accumulate in the transcript;
 *   - `options` returned from the hook do reach the gateway, which is the only
 *     way to cap output tokens on the plain `Agent`.
 *
 * The user's own `@file` mentions are untouched. This adds a suggestion; it
 * never removes what they asked for.
 */
import type {
	AgentBeforeModelResult,
	AgentMessage,
	AgentRuntimeHooks,
} from "@cline/agents";
import type { ContextEngine, RenderOptions } from "./engine";
import type { ScoredFile, ScoreOptions } from "./score";

/**
 * `@cline/sdk` re-exports the `Agent` class but not the hook types, so those
 * come from `@cline/agents` directly. Both are the same workspace packages the
 * extension builds against.
 */
type BeforeModelHook = NonNullable<AgentRuntimeHooks["beforeModel"]>;

export interface ContextHookOptions extends ScoreOptions, RenderOptions {
	/**
	 * Caps output tokens on the outgoing request. Set this on free tiers:
	 * providers such as Groq bill reserved output against the same per-minute
	 * budget as input, and the SDK's synthesized default is large enough to
	 * exceed the whole quota on its own.
	 */
	maxOutputTokens?: number;
	/** Called after each selection. Useful for logging what was chosen. */
	onSelect?: (selected: ScoredFile[], prompt: string) => void;
}

function lastUserPrompt(
	messages: readonly AgentMessage[],
): string | undefined {
	for (let index = messages.length - 1; index >= 0; index--) {
		const message = messages[index];
		if (message?.role !== "user") {
			continue;
		}
		const text = message.content
			.map((part) => (part.type === "text" ? part.text : ""))
			.filter(Boolean)
			.join("\n")
			.trim();
		if (text) {
			return text;
		}
	}
	return undefined;
}

function makeContextMessage(text: string): AgentMessage {
	return {
		id: `openprovider-context-${Date.now()}`,
		role: "user",
		content: [{ type: "text", text }],
		createdAt: Date.now(),
	};
}

/**
 * Builds the hook. Assign the result to `hooks.beforeModel` when constructing
 * an `Agent`, or to `hooks` on a `ClineCore` session config.
 */
export function createContextHook(
	engine: ContextEngine,
	options: ContextHookOptions = {},
): BeforeModelHook {
	return async ({ request }): Promise<AgentBeforeModelResult | undefined> => {
		const modelOptions =
			options.maxOutputTokens === undefined
				? undefined
				: { maxTokens: options.maxOutputTokens };
		const optionsOnly = modelOptions ? { options: modelOptions } : undefined;

		const prompt = lastUserPrompt(request.messages);
		if (!prompt) {
			return optionsOnly;
		}

		const { text, selected } = await engine.buildContext(prompt, options);
		options.onSelect?.(selected, prompt);

		if (!text) {
			return optionsOnly;
		}

		return {
			messages: [makeContextMessage(text), ...request.messages],
			...(modelOptions ? { options: modelOptions } : {}),
		};
	};
}
