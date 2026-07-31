/**
 * Faz 7, adım 2-3 — geçiş kararı.
 *
 * Until now the router switched providers silently on failure. That is the
 * right default for a script and the wrong one for a person: the user picked
 * a model for a reason, and swapping it mid-task without saying so produces
 * output they did not ask for.
 *
 * So a rate limit raises a decision instead: switch, wait it out, or stop.
 * The question carries the numbers from Faz 6, because "Groq is rate limited"
 * is not enough to answer with — "8000/8000 tokens this minute, resets in 32
 * seconds" is.
 */
import type { QuotaSnapshot } from "../quota/tracker";
import { formatQuota } from "../quota/tracker";

export type SwitchDecision = "switch" | "wait" | "abort";

export type SwitchPolicy =
	/** Raise the decision to the caller. Default. */
	| "ask"
	/** Switch silently, the pre-Faz-7 behaviour. Right for unattended runs. */
	| "auto"
	/** Never switch; fail instead. For when only one provider is acceptable. */
	| "stop";

export interface SwitchRequest {
	/** Provider that just failed. */
	from: string;
	/** Where it would go. Undefined when nothing else is available. */
	to?: string;
	/** The provider's own message, first line. */
	reason: string;
	/** True when the failure looks like throttling rather than a hard error. */
	isRateLimit: boolean;
	/** How long the provider asked us to wait, when it said. */
	retryAfterMs?: number;
	/** Usage for `from`, as of now. */
	quota?: QuotaSnapshot;
	/** How many times we have already asked about this provider this run. */
	timesAsked: number;
}

export type SwitchDecider = (
	request: SwitchRequest,
) => Promise<SwitchDecision> | SwitchDecision;

/** Longest single wait. Beyond this, waiting is worse than switching. */
export const MAX_WAIT_MS = 90_000;

/**
 * Human-readable question. Kept here rather than in the caller so every
 * surface — CLI, sidebar, log — asks it the same way.
 */
export function describeSwitch(request: SwitchRequest): string {
	const lines: string[] = [];

	lines.push(
		request.isRateLimit
			? `${request.from} hit its rate limit.`
			: `${request.from} failed: ${request.reason}`,
	);

	if (request.quota) {
		lines.push(`  ${formatQuota(request.quota)}`);
	}

	if (request.retryAfterMs !== undefined) {
		lines.push(`  It asked to retry in ${Math.ceil(request.retryAfterMs / 1000)}s.`);
	}

	lines.push(
		request.to
			? `  Switch to ${request.to}, or wait?`
			: "  No other provider is available.",
	);

	return lines.join("\n");
}

/**
 * The decision when nobody is asked.
 *
 * Waiting is only offered when the provider named a delay and that delay is
 * short. An unattended run that sits for two minutes on every throttle is
 * worse than one that switches, and a wait with no stated duration is a guess.
 */
export function autoDecide(request: SwitchRequest): SwitchDecision {
	if (
		request.isRateLimit &&
		request.retryAfterMs !== undefined &&
		request.retryAfterMs <= MAX_WAIT_MS &&
		request.timesAsked === 0
	) {
		return "wait";
	}
	return request.to ? "switch" : "abort";
}

/** Never switches. Waits once if the provider named a short delay. */
export function stopDecide(request: SwitchRequest): SwitchDecision {
	if (
		request.isRateLimit &&
		request.retryAfterMs !== undefined &&
		request.retryAfterMs <= MAX_WAIT_MS &&
		request.timesAsked === 0
	) {
		return "wait";
	}
	return "abort";
}

/**
 * Resolves the decider for a policy.
 *
 * `"ask"` without a callback has to fall back to `autoDecide` — there is
 * nobody to ask, and stalling would be worse than choosing.
 */
export function resolveDecider(
	policy: SwitchPolicy,
	ask?: SwitchDecider,
): SwitchDecider {
	switch (policy) {
		case "ask":
			return ask ?? autoDecide;
		case "stop":
			return stopDecide;
		default:
			return autoDecide;
	}
}

/**
 * Caps a wait and refuses to sit on an unstated delay.
 *
 * Returns the milliseconds actually waited, or undefined when waiting was
 * declined — the caller then treats the decision as a switch.
 */
export function resolveWaitMs(request: SwitchRequest): number | undefined {
	if (request.retryAfterMs === undefined) {
		return undefined;
	}
	// A little padding: providers report the boundary, and arriving exactly on
	// it tends to be rejected again.
	const padded = request.retryAfterMs + 500;
	return padded <= MAX_WAIT_MS ? padded : undefined;
}
