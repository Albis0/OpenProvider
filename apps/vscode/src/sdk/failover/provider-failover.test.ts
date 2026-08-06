import type { ApiProvider } from "@shared/api"
import { describe, expect, it } from "vitest"
import { buildProviderSwitchPatch, DEFAULT_FAILOVER_ORDER, selectNextProvider } from "./provider-failover"
import { parseRetryDelay, summarizeError } from "./rate-limit"

const allKeyed = () => true

function select(overrides: Partial<Parameters<typeof selectNextProvider>[0]> = {}) {
	return selectNextProvider({
		failedProviderId: undefined,
		configuredOrder: [],
		exhausted: new Set(),
		hasCredentials: allKeyed,
		...overrides,
	})
}

describe("selectNextProvider", () => {
	it("returns the first configured provider", () => {
		expect(select({ configuredOrder: ["groq", "nvidia"] as ApiProvider[] })).toBe("groq")
	})

	it("skips the provider that just failed", () => {
		expect(
			select({
				configuredOrder: ["groq", "nvidia"] as ApiProvider[],
				failedProviderId: "groq",
			}),
		).toBe("nvidia")
	})

	it("skips providers already exhausted this turn", () => {
		expect(
			select({
				configuredOrder: ["groq", "nvidia", "gemini"] as ApiProvider[],
				failedProviderId: "groq",
				exhausted: new Set(["nvidia"]),
			}),
		).toBe("gemini")
	})

	it("skips providers with no credentials", () => {
		expect(
			select({
				configuredOrder: ["groq", "nvidia"] as ApiProvider[],
				hasCredentials: (id) => id === "nvidia",
			}),
		).toBe("nvidia")
	})

	it("returns undefined when every candidate is filtered out", () => {
		expect(
			select({
				configuredOrder: ["groq"] as ApiProvider[],
				failedProviderId: "groq",
			}),
		).toBeUndefined()
	})

	it("returns undefined when nothing has credentials", () => {
		expect(
			select({
				configuredOrder: ["groq", "nvidia"] as ApiProvider[],
				hasCredentials: () => false,
			}),
		).toBeUndefined()
	})

	it("falls back to the default order when none is configured", () => {
		expect(select()).toBe(DEFAULT_FAILOVER_ORDER[0])
	})

	// `openai-compatible` and `openai` are the same provider spelled two ways;
	// a spelling-only difference must not read as a different provider, or the
	// failed provider would be selected again immediately.
	it("compares providers by canonical spelling", () => {
		expect(
			select({
				configuredOrder: ["openai", "nvidia"] as ApiProvider[],
				failedProviderId: "openai-compatible",
			}),
		).toBe("nvidia")
	})
})

describe("buildProviderSwitchPatch", () => {
	it("writes the act-mode provider field", () => {
		expect(buildProviderSwitchPatch("groq" as ApiProvider, "act")).toEqual({ actModeApiProvider: "groq" })
	})

	it("writes the plan-mode provider field", () => {
		expect(buildProviderSwitchPatch("groq" as ApiProvider, "plan")).toEqual({ planModeApiProvider: "groq" })
	})
})

describe("parseRetryDelay", () => {
	it("reads Gemini's fractional seconds", () => {
		expect(parseRetryDelay("Please retry in 48.09s.")).toBe(48_090)
	})

	it("reads a compound minutes+seconds delay", () => {
		expect(parseRetryDelay("Please try again in 2m30s")).toBe(150_000)
	})

	it("reads retry-after", () => {
		expect(parseRetryDelay("retry-after: 30")).toBe(30_000)
	})

	it("reads explicit milliseconds", () => {
		expect(parseRetryDelay("try again in 500ms")).toBe(500)
	})

	it("returns undefined rather than guessing", () => {
		expect(parseRetryDelay("429 Too Many Requests")).toBeUndefined()
	})
})

describe("summarizeError", () => {
	it("keeps only the first line", () => {
		expect(summarizeError("Rate limit reached\n  at Foo.bar\n  at Baz")).toBe("Rate limit reached")
	})
})
