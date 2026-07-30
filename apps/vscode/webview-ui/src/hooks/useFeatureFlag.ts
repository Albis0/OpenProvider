/**
 * Hook to check feature flag status in the webview.
 *
 * This fork does not use PostHog (Cline's first-party feature-flag backend), and
 * has no feature-flag service of its own, so every flag reads as disabled.
 * Kept as a stable API so callers don't need to change if a flag source is
 * added later.
 */
export const useHasFeatureFlag = (_flagName: string): boolean => {
	return false
}
