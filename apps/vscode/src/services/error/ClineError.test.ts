import { describe, expect, it } from "vitest"
import { ClineError, ClineErrorType } from "./ClineError"

/**
 * Rate-limit classification is what decides whether failover runs at all. When
 * it misses, nothing happens and nothing is reported — the task just stops with
 * a raw provider error, which is exactly how the NVIDIA case below went
 * unnoticed until someone hit it during real work on 2026-08-08.
 *
 * So the wordings are pinned here. A provider that phrases throttling in a new
 * way is a silent failure, not a loud one, and only a test catches it.
 */
describe("ClineError rate limit classification", () => {
	const isRateLimit = (message: string): boolean =>
		ClineError.transform(new Error(message)).isErrorType(ClineErrorType.RateLimit)

	it("catches NVIDIA's camel-cased gRPC status with no 429 and no 'rate limit' wording", () => {
		// Verbatim from the extension, NVIDIA + nemotron, during a real task.
		expect(isRateLimit("ResourceExhausted: Worker local total request limit reached (32/32)")).toBe(true)
	})

	it.each([
		["429 status", "Request failed with status code 429"],
		["spelled out", "Too Many Requests"],
		["classic phrasing", "Rate limit reached for model x"],
		["quota", "Quota exceeded for this project"],
		["spaced gRPC status", "Resource exhausted"],
		["underscored gRPC status", "RESOURCE_EXHAUSTED"],
	])("catches %s", (_label, message) => {
		expect(isRateLimit(message)).toBe(true)
	})

	it.each([
		// A stated retry delay alone is not throttling — it shows up in
		// unrelated transient errors too, and treating it as a rate limit would
		// switch providers over a hiccup.
		["a bare retry hint", "Please retry in 48.09s"],
		["a server fault", "500 Internal Server Error"],
		// The GLM reasoning rejection. Misreading this as a rate limit would
		// send the task to another provider instead of dropping the parameter.
		["a rejected parameter", "Unsupported parameter(s): reasoning"],
		["an auth failure", "401 Unauthorized"],
	])("does not treat %s as a rate limit", (_label, message) => {
		expect(isRateLimit(message)).toBe(false)
	})
})
