/**
 * Quota tracking — what has been spent per provider, and what is left.
 *
 * ```ts
 * const snapshots = await session.quota()
 * for (const snapshot of snapshots) console.log(formatQuota(snapshot))
 * // groq: 1240/8000 tokens/min (16%), resets in 43s
 * // gemini: 18/20 requests today (estimated)
 * ```
 */
export {
	observeRateLimits,
	parseDuration,
	parseRateLimitHeaders,
	providerForUrl,
	type RateLimitObserver,
	type RateLimitSnapshot,
} from "./headers";
export {
	DEFAULT_USAGE_DIR,
	USAGE_FILENAME,
	UsageStore,
	type UsageEvent,
	type UsageStoreOptions,
	type UsageTotals,
} from "./store";
export {
	formatQuota,
	QuotaTracker,
	type QuotaSnapshot,
	type QuotaTrackerOptions,
	type QuotaWindow,
} from "./tracker";
