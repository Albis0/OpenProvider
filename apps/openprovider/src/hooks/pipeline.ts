/**
 * Faz 4, adım 2 — tek `beforeModel` hook'u.
 *
 * The SDK gives one `beforeModel` slot per agent, but this project has several
 * things to do there: inject context, cap output, strip fields a provider
 * rejects, count usage. Writing them as one function would tangle four
 * concerns; registering four hooks is not possible.
 *
 * So they are written as *transforms* over the outgoing request and composed
 * into a single hook. Each transform sees the request as the previous ones
 * left it, which is what makes ordering meaningful — a sanitizer has to run
 * after whatever injected the messages it is cleaning.
 */
import type {
	AgentBeforeModelResult,
	AgentMessage,
	AgentModelRequest,
	AgentRuntimeHooks,
} from "@cline/agents";

export type BeforeModelHook = NonNullable<AgentRuntimeHooks["beforeModel"]>;

/** What a transform may change. Mirrors `AgentBeforeModelResult`. */
export interface RequestPatch {
	messages?: readonly AgentMessage[];
	options?: Record<string, unknown>;
	/** Stops the run before the model is called. */
	stop?: boolean;
	reason?: string;
}

export interface TransformContext {
	/** The request including every patch applied so far. */
	request: AgentModelRequest;
	/** Names of transforms that already ran, in order. */
	applied: readonly string[];
}

export interface RequestTransform {
	/** Used in ordering, logging and error messages. */
	name: string;
	apply(
		context: TransformContext,
	): Promise<RequestPatch | undefined> | RequestPatch | undefined;
}

export interface ComposeOptions {
	/**
	 * Called when a transform throws. The default swallows the error and keeps
	 * going: a broken context engine should degrade to "no extra context", not
	 * take down the run.
	 */
	onError?: (transformName: string, error: unknown) => void;
	onApplied?: (transformName: string, patch: RequestPatch) => void;
}

/**
 * Folds transforms into one `beforeModel` hook.
 *
 * A transform returning `stop` short-circuits the rest — there is no point
 * building context for a request that will not be sent.
 */
export function composeBeforeModel(
	transforms: readonly RequestTransform[],
	options: ComposeOptions = {},
): BeforeModelHook {
	return async ({ request }): Promise<AgentBeforeModelResult | undefined> => {
		let current = request;
		let touched = false;
		const applied: string[] = [];

		for (const transform of transforms) {
			let patch: RequestPatch | undefined;
			try {
				patch = await transform.apply({ request: current, applied });
			} catch (error) {
				options.onError?.(transform.name, error);
				continue;
			}
			if (!patch) {
				continue;
			}

			if (patch.stop) {
				return { stop: true, reason: patch.reason };
			}

			if (patch.messages) {
				current = { ...current, messages: patch.messages };
				touched = true;
			}
			if (patch.options) {
				current = {
					...current,
					options: { ...current.options, ...patch.options },
				};
				touched = true;
			}

			applied.push(transform.name);
			options.onApplied?.(transform.name, patch);
		}

		if (!touched) {
			return undefined;
		}

		return {
			messages: current.messages,
			options: current.options,
		};
	};
}

/**
 * Caps output tokens.
 *
 * Necessary on free tiers, and only reachable from here: neither
 * `maxTokensPerTurn` nor the `Agent` constructor's `options` reaches the
 * gateway (NOTES.md §6). Providers such as Groq count reserved output against
 * the same per-minute quota as input, so an uncapped one-line prompt can
 * request 32k tokens and be refused.
 */
export function createOutputCapTransform(maxTokens: number): RequestTransform {
	return {
		name: "output-cap",
		apply: () => ({ options: { maxTokens } }),
	};
}
