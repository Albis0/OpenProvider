import { type ReactNode } from "react"

/**
 * PostHog telemetry (Cline's first-party data.cline.bot proxy / PostHog SaaS
 * UI host) has been disabled -- this fork has no PostHog project of its own
 * and must never send data to Cline's or PostHog's servers. This component is
 * kept as a pass-through (no PostHogProvider, no posthog.init()) so callers
 * (Providers.tsx) don't need to change.
 */
export function CustomPostHogProvider({ children }: { children: ReactNode }) {
	return <>{children}</>
}
