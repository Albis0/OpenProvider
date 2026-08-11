import { beforeEach, describe, expect, it } from "vitest"
import {
	compatFor,
	defaultMaxOutputTokens,
	isReasoningHistoryRejection,
	noteReasoningHistoryRejected,
	providersWithCompatEntries,
	resetLearnedRejectors,
	shouldStripReasoningHistory,
} from "./provider-compat"

beforeEach(() => {
	resetLearnedRejectors()
})

describe("reasoning history policy", () => {
	it("strips on providers that reject the reasoning they emit", () => {
		expect(shouldStripReasoningHistory("groq")).toBe(true)
		expect(shouldStripReasoningHistory("cerebras")).toBe(true)
	})

	// The whole reason this is three-state. DeepSeek returns 400 when reasoning
	// is *missing* from a thinking-mode tool call, so the fix for Groq is the bug
	// for DeepSeek.
	it("never strips on providers that require reasoning back", () => {
		expect(shouldStripReasoningHistory("deepseek")).toBe(false)
		expect(shouldStripReasoningHistory("gemini")).toBe(false)
	})

	it("leaves unmeasured providers alone rather than guessing", () => {
		expect(shouldStripReasoningHistory("nvidia")).toBe(false)
		expect(shouldStripReasoningHistory("openrouter")).toBe(false)
		expect(shouldStripReasoningHistory(undefined)).toBe(false)
	})

	// Two call sites read this table holding different spellings of the same id.
	it("resolves extension spellings onto SDK provider ids", () => {
		expect(compatFor("groq")).toBe(compatFor("groq"))
		// `openai` is the extension's id for the SDK's `openai-compatible`.
		expect(compatFor("openai")).toBe(compatFor("openai-compatible"))
	})

	it("every entry explains itself and says how well it is known", () => {
		for (const providerId of providersWithCompatEntries()) {
			const entry = compatFor(providerId)
			expect(entry?.note, providerId).toBeTruthy()
			expect(["measured", "reported"], providerId).toContain(entry?.source)
		}
	})
})

describe("output caps", () => {
	// Groq bills reserved output against the same per-minute budget as input, so
	// an uncapped request is refused for tokens it would never have used.
	it("caps Groq, whose quota counts output it only reserved", () => {
		expect(defaultMaxOutputTokens("groq")).toBe(2048)
	})

	// Elsewhere a cap has no upside and truncates good answers.
	it("does not cap providers that bill only what they generate", () => {
		expect(defaultMaxOutputTokens("gemini")).toBeUndefined()
		expect(defaultMaxOutputTokens("nvidia")).toBeUndefined()
		expect(defaultMaxOutputTokens(undefined)).toBeUndefined()
	})
})

describe("isReasoningHistoryRejection", () => {
	it("recognises Groq's wording", () => {
		expect(
			isReasoningHistoryRejection(
				"'messages.2' : for 'role:assistant' the following must be satisfied" +
					"[('messages.2' : property 'reasoning_content' is unsupported)]",
			),
		).toBe(true)
	})

	it("recognises Cerebras's different wording for the same refusal", () => {
		expect(
			isReasoningHistoryRejection("messages.2.assistant.reasoning_content: property 'reasoning_content' is unsupported"),
		).toBe(true)
	})

	// DeepSeek names the same field while asking for the opposite. Reading that
	// as a rejection would strip exactly what it is demanding.
	it("does not mistake DeepSeek's demand for a rejection", () => {
		expect(isReasoningHistoryRejection("400 The reasoning_content in the thinking mode must be passed back to the API")).toBe(
			false,
		)
		expect(isReasoningHistoryRejection("reasoning_content must be fully passed back to the API")).toBe(false)
	})

	it("ignores unrelated failures", () => {
		expect(isReasoningHistoryRejection("ResourceExhausted: Worker local total request limit reached (33/32)")).toBe(false)
		expect(isReasoningHistoryRejection("Validation: Unsupported parameter(s): `reasoning`")).toBe(false)
		expect(isReasoningHistoryRejection(undefined)).toBe(false)
	})

	it("digs the message out of Error and nested object shapes", () => {
		expect(isReasoningHistoryRejection(new Error("property 'reasoning_content' is unsupported"))).toBe(true)
		expect(isReasoningHistoryRejection({ error: { message: "property 'reasoning_content' is unsupported" } })).toBe(true)
	})
})

describe("runtime discovery", () => {
	it("learns a provider nobody had measured, so the next request strips", () => {
		expect(shouldStripReasoningHistory("nvidia")).toBe(false)

		expect(noteReasoningHistoryRejected("nvidia")).toBe(true)

		expect(shouldStripReasoningHistory("nvidia")).toBe(true)
	})

	// The second note returning false is what stops a failed repair from
	// retrying forever.
	it("only learns a provider once", () => {
		expect(noteReasoningHistoryRejected("nvidia")).toBe(true)
		expect(noteReasoningHistoryRejected("nvidia")).toBe(false)
	})

	// A reviewed entry outranks one runtime error: flipping DeepSeek to "strip"
	// would break a provider that currently works.
	it("refuses to learn against a provider the table says needs reasoning", () => {
		expect(noteReasoningHistoryRejected("deepseek")).toBe(false)
		expect(shouldStripReasoningHistory("deepseek")).toBe(false)
	})

	it("does not re-learn a provider already known to strip", () => {
		expect(noteReasoningHistoryRejected("groq")).toBe(false)
	})

	it("ignores a missing provider id", () => {
		expect(noteReasoningHistoryRejected(undefined)).toBe(false)
	})
})
