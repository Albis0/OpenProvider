/**
 * Faz 6, adım 3 — "ne kadar kaldı".
 *
 * Three sources, in order of trust:
 *
 *   1. The provider's own `x-ratelimit-*` headers, when observed. Authoritative:
 *      they account for requests made by anything else using the same key.
 *   2. Local counters plus the measured limits in the quirk table. An estimate,
 *      and blind to other tools, but always available.
 *   3. Nothing — the provider publishes no headers and has no measured limit,
 *      so usage is reported without a ceiling.
 *
 * `source` says which one answered, because an estimate presented as fact is
 * worse than no number at all.
 */
import { quirksFor } from "../providers/quirks";
import type { RateLimitObserver } from "./headers";
import type { UsageStore } from "./store";

const MINUTE_MS = 60_000;

export interface QuotaWindow {
	limit?: number;
	used: number;
	/** Undefined when no limit is known. */
	remaining?: number;
	/** Percentage consumed, 0-100. Undefined without a limit. */
	percentUsed?: number;
}

export interface QuotaSnapshot {
	providerId: string;
	source: "provider-headers" | "local-estimate" | "unknown";
	tokensPerMinute?: QuotaWindow;
	requestsPerDay?: QuotaWindow;
	/** Milliseconds until the binding window resets, when the provider says. */
	resetsInMs?: number;
	observedAt: number;
	/** Caveat worth surfacing, e.g. the estimate's blind spot. */
	note?: string;
}

function makeWindow(used: number, limit?: number): QuotaWindow {
	if (limit === undefined) {
		return { used };
	}
	const remaining = Math.max(0, limit - used);
	return {
		limit,
		used,
		remaining,
		percentUsed: limit > 0 ? Math.min(100, (used / limit) * 100) : undefined,
	};
}

export interface QuotaTrackerOptions {
	store: UsageStore;
	/** When present, provider headers take precedence over local counting. */
	observer?: RateLimitObserver;
	now?: () => number;
}

export class QuotaTracker {
	private readonly store: UsageStore;
	private readonly observer?: RateLimitObserver;
	private readonly now: () => number;

	constructor(options: QuotaTrackerOptions) {
		this.store = options.store;
		this.observer = options.observer;
		this.now = options.now ?? (() => Date.now());
	}

	/** Records one completed request. */
	async record(
		providerId: string,
		usage: { inputTokens?: number; outputTokens?: number } | undefined,
		ok: boolean,
	): Promise<void> {
		await this.store.record({
			providerId,
			inputTokens: usage?.inputTokens ?? 0,
			outputTokens: usage?.outputTokens ?? 0,
			ok,
		});
	}

	async snapshot(providerId: string): Promise<QuotaSnapshot> {
		const observed = this.observer?.latest(providerId);
		const quirks = quirksFor(providerId);

		// 1. The provider told us directly.
		if (observed) {
			const snapshot: QuotaSnapshot = {
				providerId,
				source: "provider-headers",
				observedAt: observed.observedAt,
				resetsInMs: observed.resetsInMs,
			};

			if (observed.tokensLimit !== undefined) {
				const remaining = observed.tokensRemaining ?? 0;
				snapshot.tokensPerMinute = {
					limit: observed.tokensLimit,
					used: Math.max(0, observed.tokensLimit - remaining),
					remaining,
					percentUsed:
						observed.tokensLimit > 0
							? Math.min(
									100,
									((observed.tokensLimit - remaining) / observed.tokensLimit) *
										100,
								)
							: undefined,
				};
			}
			if (observed.requestsLimit !== undefined) {
				const remaining = observed.requestsRemaining ?? 0;
				snapshot.requestsPerDay = {
					limit: observed.requestsLimit,
					used: Math.max(0, observed.requestsLimit - remaining),
					remaining,
				};
			}
			return snapshot;
		}

		// 2. Local counters against measured limits.
		const perMinute = await this.store.totals(providerId, MINUTE_MS);
		const perDay = await this.store.today(providerId);

		const hasKnownLimit =
			quirks.limits?.tokensPerMinute !== undefined ||
			quirks.limits?.requestsPerDay !== undefined;

		return {
			providerId,
			source: hasKnownLimit ? "local-estimate" : "unknown",
			observedAt: this.now(),
			tokensPerMinute: makeWindow(
				perMinute.totalTokens,
				quirks.limits?.tokensPerMinute,
			),
			requestsPerDay: makeWindow(
				perDay.requests,
				quirks.limits?.requestsPerDay,
			),
			note: hasKnownLimit
				? "Estimated from local counters; requests made by other tools with the same key are not counted."
				: "No published limit and none measured for this provider.",
		};
	}

	async snapshots(providerIds: readonly string[]): Promise<QuotaSnapshot[]> {
		return Promise.all(providerIds.map((id) => this.snapshot(id)));
	}
}

/** One-line rendering, for logs and the eventual sidebar. */
export function formatQuota(snapshot: QuotaSnapshot): string {
	const parts: string[] = [];

	const tokens = snapshot.tokensPerMinute;
	if (tokens?.limit !== undefined) {
		parts.push(
			`${Math.round(tokens.used)}/${tokens.limit} tokens/min` +
				(tokens.percentUsed !== undefined
					? ` (${tokens.percentUsed.toFixed(0)}%)`
					: ""),
		);
	} else if (tokens && tokens.used > 0) {
		parts.push(`${Math.round(tokens.used)} tokens in the last minute`);
	}

	const requests = snapshot.requestsPerDay;
	if (requests?.limit !== undefined) {
		parts.push(`${requests.used}/${requests.limit} requests today`);
	} else if (requests && requests.used > 0) {
		parts.push(`${requests.used} requests today`);
	}

	if (snapshot.resetsInMs !== undefined) {
		parts.push(`resets in ${Math.ceil(snapshot.resetsInMs / 1000)}s`);
	}

	const body = parts.length > 0 ? parts.join(", ") : "no usage recorded";
	const qualifier =
		snapshot.source === "provider-headers"
			? ""
			: snapshot.source === "local-estimate"
				? " (estimated)"
				: " (no known limit)";

	return `${snapshot.providerId}: ${body}${qualifier}`;
}
