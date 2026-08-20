/**
 * Failover context compaction — rewriting the conversation for the provider
 * that is about to inherit it.
 *
 * ## Neden
 *
 * Failover currently hands the *raw* prompt to the next provider. That is the
 * safe default and it is also the expensive one: the reason the previous
 * provider stopped serving is very often that the conversation had grown past
 * what its free tier would accept in one minute. Handing the same oversized
 * history to the next provider in the chain walks it into the same wall, one
 * provider at a time, and the task dies having burned every quota it had.
 *
 * The live measurement that motivates this: Groq's free tier refuses a request
 * at 8000 TPM *including reserved output*, and a real agent turn measured
 * 32209 tokens — four times the budget. Every provider in the chain sees the
 * same 32k.
 *
 * So before the switch, a small fast model rewrites "everything that happened
 * so far" into a brief the next provider can actually accept.
 *
 * ## Neden ayrı bir sağlayıcı
 *
 * The compression model is configured separately and deliberately is *not* the
 * provider that just failed. Asking a rate-limited provider to summarise its
 * own history fails for exactly the reason the original call failed.
 *
 * ## Neden asla görevi durdurmaz
 *
 * Compression is an optimisation, never a dependency. If the compressing model
 * is itself rate limited, misconfigured, slow, or returns nothing usable, the
 * caller falls back to the raw prompt — the pre-existing behaviour. A feature
 * that makes failover *more* fragile would defeat its own purpose, so every
 * failure path here returns "use the original" rather than throwing.
 */
import type { CompressionTarget } from "./config";

/** How long to wait for a summary before giving up and using the raw prompt. */
export const COMPACTION_TIMEOUT_MS = 20_000;

/**
 * Below this, compressing is not worth a network call.
 *
 * A short prompt is not what exhausted anybody's quota, and a round trip to
 * summarise it costs more time than the tokens it would save.
 */
export const COMPACTION_MIN_CHARS = 2_000;

export const COMPACTION_SYSTEM_PROMPT = [
	"You compress an in-progress coding task so another AI model can pick it up.",
	"Produce a brief containing, in this order:",
	"1. The user's original goal, stated in one or two sentences.",
	"2. What has already been done, including any files created or edited.",
	"3. What still needs doing, as concrete next steps.",
	"4. Any constraints, decisions or error messages that must not be lost.",
	"Be dense and specific. Keep file paths, identifiers and error text verbatim.",
	"Do not add commentary, do not greet, do not explain that you are summarising.",
	"Output only the brief.",
].join("\n");

/** What the compressor is being asked to condense. */
export interface CompactionInput {
	/** The prompt as it would otherwise be sent to the next provider. */
	prompt: string;
	/** Provider that just failed, for the brief's header. */
	fromProviderId: string;
	/** Provider about to take over. */
	toProviderId: string;
	/** Anything the run already produced, oldest first. */
	priorOutputs?: readonly string[];
}

export interface CompactionResult {
	/** The prompt to actually send. Equals the input prompt when compaction was skipped. */
	prompt: string;
	/** True only when a model actually rewrote it. */
	compacted: boolean;
	/** Why it did not happen, when it did not. One line, for the event log. */
	reason: string;
	/** Character counts, so the caller can report what was saved. */
	originalChars: number;
	compactedChars: number;
}

/**
 * Runs one model call and returns its text.
 *
 * Injected rather than constructed so this module needs neither the SDK nor a
 * network to be exercised, and so the session can reuse the agent factory it
 * already has.
 */
export type CompactionRunner = (input: {
	providerId: string;
	modelId?: string;
	maxTokens: number;
	systemPrompt: string;
	prompt: string;
}) => Promise<string>;

export interface CompactionOptions {
	config: CompressionTarget;
	run: CompactionRunner;
	/** Resolves a key for the compression provider. Absent key means skip. */
	hasCredentials: (providerId: string) => boolean;
	onEvent?: (message: string) => void;
	/** Injectable, so the timeout is testable without waiting. */
	timeoutMs?: number;
	minChars?: number;
}

/** Everything the compressing model is shown, as one prompt. */
export function renderCompactionRequest(input: CompactionInput): string {
	const sections: string[] = [
		`The task was running on ${input.fromProviderId} and is moving to ${input.toProviderId}.`,
		"",
		"=== ORIGINAL REQUEST AND CONTEXT ===",
		input.prompt,
	];

	const outputs = (input.priorOutputs ?? []).filter(
		(output) => output.trim().length > 0,
	);
	if (outputs.length > 0) {
		sections.push("", "=== WORK PRODUCED SO FAR ===");
		for (const [index, output] of outputs.entries()) {
			sections.push(`--- output ${index + 1} ---`, output);
		}
	}

	return sections.join("\n");
}

/**
 * Wraps the summary so the receiving model knows it is inheriting a task
 * rather than reading a description of one.
 *
 * The distinction matters: handed a bare summary, models routinely reply with
 * an acknowledgement of the summary instead of continuing the work.
 */
export function renderHandoverPrompt(
	summary: string,
	input: CompactionInput,
): string {
	return [
		`You are continuing a task that was started on ${input.fromProviderId} and handed to you mid-flight.`,
		"The following is a compressed brief of everything that happened so far.",
		"Continue the work from where it stopped. Do not restart it and do not summarise the brief back.",
		"",
		"=== BRIEF ===",
		summary.trim(),
	].join("\n");
}

function rejectAfter(ms: number): {
	promise: Promise<never>;
	cancel: () => void;
} {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const promise = new Promise<never>((_, reject) => {
		timer = setTimeout(
			() => reject(new Error(`compaction timed out after ${ms}ms`)),
			ms,
		);
	});
	return {
		promise,
		cancel: () => {
			if (timer) {
				clearTimeout(timer);
			}
		},
	};
}

/**
 * Compresses the context for a handover, or explains why it did not.
 *
 * Never throws and never returns an empty prompt: every failure resolves to
 * the original prompt with `compacted: false`.
 */
export async function compactForHandover(
	input: CompactionInput,
	options: CompactionOptions,
): Promise<CompactionResult> {
	const originalChars = input.prompt.length;
	const unchanged = (reason: string): CompactionResult => ({
		prompt: input.prompt,
		compacted: false,
		reason,
		originalChars,
		compactedChars: originalChars,
	});

	const { config } = options;
	if (!config.enabled || !config.provider) {
		return unchanged("compaction is off");
	}

	// Compressing on the provider that just gave out would fail the same way.
	if (config.provider === input.fromProviderId) {
		return unchanged(
			`compaction provider ${config.provider} is the one that just failed`,
		);
	}

	if (!options.hasCredentials(config.provider)) {
		return unchanged(`${config.provider} has no API key`);
	}

	const request = renderCompactionRequest(input);
	const minChars = options.minChars ?? COMPACTION_MIN_CHARS;
	if (request.length < minChars) {
		return unchanged(
			`context is only ${request.length} chars — not worth a call`,
		);
	}

	const timeout = rejectAfter(options.timeoutMs ?? COMPACTION_TIMEOUT_MS);
	try {
		const summary = await Promise.race([
			options.run({
				providerId: config.provider,
				modelId: config.model,
				maxTokens: config.maxTokens,
				systemPrompt: COMPACTION_SYSTEM_PROMPT,
				prompt: request,
			}),
			timeout.promise,
		]);

		if (typeof summary !== "string" || summary.trim().length === 0) {
			return unchanged("compaction model returned nothing");
		}

		const prompt = renderHandoverPrompt(summary, input);

		// A "summary" longer than the thing it summarised is a failed summary.
		// Sending it would make the very problem compaction exists to solve
		// worse, so the raw prompt wins.
		if (prompt.length >= originalChars) {
			return unchanged(
				`summary was not smaller (${prompt.length} >= ${originalChars} chars)`,
			);
		}

		options.onEvent?.(
			`compaction: ${originalChars} → ${prompt.length} chars via ${config.provider}`,
		);

		return {
			prompt,
			compacted: true,
			reason: `compacted by ${config.provider}`,
			originalChars,
			compactedChars: prompt.length,
		};
	} catch (error) {
		// The whole point: a failed compaction must not fail the failover.
		const detail = error instanceof Error ? error.message : String(error);
		options.onEvent?.(`compaction failed (${detail}) — using the raw context`);
		return unchanged(`compaction failed: ${detail}`);
	} finally {
		timeout.cancel();
	}
}
