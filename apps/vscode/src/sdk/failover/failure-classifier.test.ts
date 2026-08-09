import { describe, expect, it } from "vitest"
import { classifyFailure } from "./failure-classifier"

/**
 * The case that started this: NVIDIA rate limited a real task and nothing
 * happened. Pinned verbatim, because the string is the whole point — it
 * contains no 429, no "rate limit", and spells the gRPC status camel-cased.
 */
const NVIDIA_RATE_LIMIT = "ResourceExhausted: Worker local total request limit reached (32/32)"

describe("classifyFailure", () => {
	describe("layer 1 — http status", () => {
		it("treats 429 as a rate limit whatever the wording", () => {
			const result = classifyFailure({ error: { status: 429, message: "nonsense wording" } })
			expect(result).toMatchObject({ kind: "rate-limit", shouldFailover: true, signal: "http-status" })
		})

		it.each([500, 502, 503, 504, 529])("treats %i as overloaded", (status) => {
			const result = classifyFailure({ error: { status, message: "upstream" } })
			expect(result).toMatchObject({ kind: "overloaded", shouldFailover: true })
		})

		it("does not fail over on a 4xx that is our own bad request", () => {
			const result = classifyFailure({ error: { status: 400, message: "bad request" } })
			expect(result.shouldFailover).toBe(false)
		})

		it("does not fail over when out of credit, which switching cannot fix", () => {
			// 402 is deliberately absent from the retryable table: moving the user
			// onto a different paid provider would spend money they did not agree to.
			const result = classifyFailure({ error: { status: 402, message: "payment required" } })
			expect(result.shouldFailover).toBe(false)
		})
	})

	describe("layer 2 — error code", () => {
		it("catches NVIDIA's camel-cased gRPC status from the message prefix", () => {
			const result = classifyFailure({ error: new Error(NVIDIA_RATE_LIMIT) })
			expect(result).toMatchObject({ kind: "rate-limit", shouldFailover: true, signal: "error-code" })
		})

		it.each(["RESOURCE_EXHAUSTED", "ResourceExhausted", "resource-exhausted"])(
			"normalizes the %s spelling to one code",
			(code) => {
				const result = classifyFailure({ error: { code, message: "throttled" } })
				expect(result).toMatchObject({ kind: "rate-limit", shouldFailover: true, signal: "error-code" })
			},
		)
	})

	describe("layer 3 — known phrasings", () => {
		it.each([
			["classic", "Rate limit reached for model x"],
			["plain english", "Too Many Requests"],
			["quota", "Quota exceeded for this project"],
			["nvidia's own words", "Worker local total request limit reached (32/32)"],
		])("catches %s", (_label, message) => {
			expect(classifyFailure({ error: new Error(message) }).shouldFailover).toBe(true)
		})

		it("treats an overloaded provider as worth moving off", () => {
			const result = classifyFailure({ error: new Error("The server is busy, try again later") })
			expect(result).toMatchObject({ kind: "overloaded", shouldFailover: true })
		})
	})

	describe("layer 4 — repetition", () => {
		it("does not fail over on an unrecognized first failure", () => {
			const result = classifyFailure({ error: new Error("weird upstream hiccup") })
			expect(result.shouldFailover).toBe(false)
		})

		it("fails over on an unrecognized failure the second time", () => {
			// The safety net: a provider whose wording nobody has seen still moves
			// the task along instead of ending it.
			const result = classifyFailure({ error: new Error("weird upstream hiccup"), priorFailuresThisTurn: 1 })
			expect(result).toMatchObject({ kind: "repeated-failure", shouldFailover: true, signal: "repetition" })
		})

		it("never promotes a terminal error to repeated-failure", () => {
			// An expired key fails identically on every provider. Walking it across
			// the chain would produce five copies of the same error and bury the
			// real cause.
			const result = classifyFailure({ error: new Error("401 unauthorized"), priorFailuresThisTurn: 3 })
			expect(result.shouldFailover).toBe(false)
		})
	})

	describe("things failover must not touch", () => {
		it.each([
			["a bad key", "Invalid API key provided"],
			["auth failure", "authentication failed"],
			["a rejected parameter", "Unsupported parameter(s): reasoning"],
			["a missing model", "model not found"],
			["no balance", "insufficient credit"],
		])("leaves %s alone", (_label, message) => {
			expect(classifyFailure({ error: new Error(message) }).shouldFailover).toBe(false)
		})
	})

	describe("retry delay", () => {
		it("carries the provider's stated delay through", () => {
			const result = classifyFailure({ error: new Error("Rate limit reached. Please try again in 30 seconds") })
			expect(result.retryAfterMs).toBe(30_000)
		})

		it("leaves the delay unset when the provider did not say", () => {
			expect(classifyFailure({ error: new Error(NVIDIA_RATE_LIMIT) }).retryAfterMs).toBeUndefined()
		})
	})

	it("never throws on malformed input", () => {
		for (const error of [null, undefined, 42, {}, [], "plain string"]) {
			expect(() => classifyFailure({ error })).not.toThrow()
		}
	})
})
