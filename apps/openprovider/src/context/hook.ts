/**
 * Faz 1, adım 5 — SDK entegrasyonu.
 *
 * Turns a `ContextEngine` into something that runs before each model call:
 * read the latest user message, select relevant files, and insert a repo map
 * ahead of the conversation.
 *
 * Two properties this relies on, both verified in Faz 0:
 *   - messages returned from `beforeModel` apply to that request only and are
 *     never persisted, so stale context cannot accumulate in the transcript;
 *   - `options` returned from it do reach the gateway, which is the only way
 *     to cap output tokens on the plain `Agent`.
 *
 * The user's own `@file` mentions are untouched. This adds a suggestion; it
 * never removes what they asked for.
 */
import type { AgentMessage } from "@cline/agents";
import {
	type BeforeModelHook,
	composeBeforeModel,
	createOutputCapTransform,
	type RequestTransform,
} from "../hooks/pipeline";
import type { ContextEngine, RenderOptions } from "./engine";
import type { ScoredFile, ScoreOptions } from "./score";

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
 * The context engine as a pipeline transform.
 *
 * Prefer this over `createContextHook` when anything else also needs to touch
 * the request — a sanitizer, a usage counter — since only one `beforeModel`
 * slot exists per agent.
 */
export function createContextTransform(
	engine: ContextEngine,
	options: ContextHookOptions = {},
): RequestTransform {
	return {
		name: "context",
		async apply({ request }) {
			const prompt = lastUserPrompt(request.messages);
			if (!prompt) {
				return undefined;
			}

			const { text, selected } = await engine.buildContext(prompt, options);
			options.onSelect?.(selected, prompt);
			if (!text) {
				return undefined;
			}

			return {
				messages: [makeContextMessage(text), ...request.messages],
			};
		},
	};
}

/**
 * Convenience wrapper for the common case: context injection plus an output
 * cap, and nothing else.
 */
export function createContextHook(
	engine: ContextEngine,
	options: ContextHookOptions = {},
): BeforeModelHook {
	const transforms: RequestTransform[] = [createContextTransform(engine, options)];
	if (options.maxOutputTokens !== undefined) {
		transforms.push(createOutputCapTransform(options.maxOutputTokens));
	}
	return composeBeforeModel(transforms);
}
