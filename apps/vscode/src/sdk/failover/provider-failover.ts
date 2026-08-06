/**
 * Rate-limit failover — picking the next provider and moving the session onto it.
 *
 * The user configures two things in Settings → Provider Priority:
 *   - `providerFailoverMode`: "ask" | "auto" | "stop"
 *   - `providerFailoverOrder`: an ordered list of provider ids
 *
 * This module owns the "which provider next" decision and the config write that
 * enacts it. It deliberately does *not* own error classification (that is
 * `ClineError.getErrorType()`) or session restarting (that is
 * `SdkProviderChangeCoordinator`, which already preserves the session id and
 * message history).
 */
import type { ApiConfiguration, ApiProvider } from "@shared/api"
import type { Mode } from "@shared/storage/types"
import { toLegacyApiProvider } from "@/shared/model-catalog/provider-helpers"

export type FailoverMode = "ask" | "auto" | "stop"

/**
 * Mirrors `DEFAULT_FAILOVER_ORDER` in the webview's ProviderPrioritySection.
 *
 * Duplicated rather than shared because the two run in different bundles, and
 * because they answer slightly different questions: the webview shows the user
 * a starting point they can edit, while this is the fallback for a stored order
 * that is empty because the user never opened that screen.
 */
export const DEFAULT_FAILOVER_ORDER: ApiProvider[] = ["gemini", "cerebras", "groq", "openrouter", "nvidia"]

export interface FailoverCandidateInput {
	/** The provider that just failed. */
	failedProviderId: string | undefined
	/** User's configured order; empty means "never customized". */
	configuredOrder: readonly ApiProvider[]
	/** Providers already tried and rate limited during this same turn. */
	exhausted: ReadonlySet<string>
	/** True when the provider has usable credentials. */
	hasCredentials: (providerId: string) => boolean
}

/**
 * The next provider to try, or undefined when there is nothing left.
 *
 * Skips, in order: the provider that just failed, anything already exhausted
 * this turn, and anything without credentials — a switch to a provider with no
 * key would fail instantly and look like a bug.
 *
 * An empty configured order is treated as "the user never opened the settings
 * screen" and falls back to the same default the UI shows. A user who
 * deliberately empties the list is indistinguishable from that at this layer;
 * see the note in the session-2 report.
 */
export function selectNextProvider(input: FailoverCandidateInput): ApiProvider | undefined {
	const order = input.configuredOrder.length > 0 ? input.configuredOrder : DEFAULT_FAILOVER_ORDER
	const failed = input.failedProviderId ? toLegacyApiProvider(input.failedProviderId) : undefined

	for (const candidate of order) {
		const normalized = toLegacyApiProvider(candidate)
		if (normalized === failed || input.exhausted.has(normalized)) {
			continue
		}
		if (!input.hasCredentials(normalized)) {
			continue
		}
		return candidate
	}
	return undefined
}

/**
 * The config patch that switches the active mode onto `provider`.
 *
 * Only the mode-specific provider field is written. The matching model id is
 * left to `normalizeProviderSwitchModel`, which already knows how to resolve a
 * valid model for a newly selected provider (last used → SDK default → first in
 * catalog) and is the same path a manual provider switch takes.
 */
export function buildProviderSwitchPatch(provider: ApiProvider, mode: Mode): Partial<ApiConfiguration> {
	return mode === "plan" ? { planModeApiProvider: provider } : { actModeApiProvider: provider }
}
