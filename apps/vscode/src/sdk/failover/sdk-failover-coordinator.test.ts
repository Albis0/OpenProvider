import type { ApiConfiguration, ApiProvider } from "@shared/api"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { FailoverMode } from "./provider-failover"
import { SdkFailoverCoordinator } from "./sdk-failover-coordinator"

vi.mock("@/shared/services/Logger", () => ({
	Logger: { log: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

function makeCoordinator(overrides: { mode?: FailoverMode; order?: ApiProvider[]; keyed?: string[]; answer?: string } = {}) {
	let config: ApiConfiguration = { actModeApiProvider: "nvidia" } as ApiConfiguration
	const applyApiConfiguration = vi.fn((next: ApiConfiguration) => {
		config = next
	})
	const resumeTurn = vi.fn(async () => {})
	const emitMessages = vi.fn()
	const keyed = overrides.keyed ?? ["gemini", "cerebras", "groq", "openrouter", "nvidia"]
	const askQuestion = vi.fn(async () => overrides.answer ?? "Switch to groq")

	const coordinator = new SdkFailoverCoordinator({
		getFailoverMode: () => overrides.mode ?? "auto",
		getFailoverOrder: () => overrides.order ?? (["nvidia", "groq"] as ApiProvider[]),
		getMode: () => "act",
		getApiConfiguration: () => config,
		applyApiConfiguration,
		hasCredentials: (providerId) => keyed.includes(providerId),
		normalizeSwitch: (_previous, next) => next,
		emitMessages,
		waitForPendingRebuilds: async () => {},
		resumeTurn,
		askQuestion,
	})

	return { coordinator, applyApiConfiguration, resumeTurn, emitMessages, askQuestion, getConfig: () => config }
}

const attempt = (failedProviderId: string | undefined = "nvidia") => ({
	failedProviderId,
	summary: "429 Too Many Requests",
})

describe("SdkFailoverCoordinator", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("switches to the next provider and resumes the turn", async () => {
		const { coordinator, applyApiConfiguration, resumeTurn, getConfig } = makeCoordinator()

		const outcome = await coordinator.handleRateLimit(attempt())

		expect(outcome).toEqual({ kind: "switched", to: "groq" })
		expect(applyApiConfiguration).toHaveBeenCalledTimes(1)
		expect(getConfig().actModeApiProvider).toBe("groq")
		expect(resumeTurn).toHaveBeenCalledTimes(1)
	})

	it("tells the user which provider it moved to", async () => {
		const { coordinator, emitMessages } = makeCoordinator()

		await coordinator.handleRateLimit(attempt())

		const [messages] = emitMessages.mock.calls[0]
		// Its own say type, so the chat row can render it as a banner rather
		// than as ordinary assistant prose the user scrolls past.
		expect(messages[0].say).toBe("provider_failover")

		// Both provider ids travel as data. The row shows them as `from → to`,
		// which only works if neither is buried in a sentence.
		expect(JSON.parse(messages[0].text)).toEqual({
			from: "nvidia",
			to: "groq",
			summary: "429 Too Many Requests",
		})
	})

	it("does nothing in stop mode", async () => {
		const { coordinator, applyApiConfiguration, resumeTurn } = makeCoordinator({ mode: "stop" })

		const outcome = await coordinator.handleRateLimit(attempt())

		expect(outcome).toEqual({ kind: "disabled" })
		expect(applyApiConfiguration).not.toHaveBeenCalled()
		expect(resumeTurn).not.toHaveBeenCalled()
	})

	it("reports exhaustion when no keyed provider remains", async () => {
		const { coordinator, resumeTurn } = makeCoordinator({ keyed: ["nvidia"] })

		const outcome = await coordinator.handleRateLimit(attempt())

		expect(outcome).toEqual({ kind: "exhausted" })
		expect(resumeTurn).not.toHaveBeenCalled()
	})

	// The whole point of the exhausted set: a second rate limit in the same turn
	// must not send us back to the provider that already failed.
	it("does not return to a provider already rate limited this turn", async () => {
		const { coordinator } = makeCoordinator({
			order: ["nvidia", "groq", "gemini"] as ApiProvider[],
		})

		await coordinator.handleRateLimit(attempt("nvidia"))
		const second = await coordinator.handleRateLimit(attempt("groq"))

		expect(second).toEqual({ kind: "switched", to: "gemini" })

		const third = await coordinator.handleRateLimit(attempt("gemini"))
		expect(third).toEqual({ kind: "exhausted" })
	})

	// The failover retry is itself a send, so it re-enters beginTurn(). If that
	// cleared the set, the chain above would loop instead of terminating.
	it("keeps its memory when the retry it started re-enters beginTurn", async () => {
		let coordinator: SdkFailoverCoordinator
		const applyApiConfiguration = vi.fn()
		let config = { actModeApiProvider: "nvidia" } as ApiConfiguration

		coordinator = new SdkFailoverCoordinator({
			getFailoverMode: () => "auto",
			getFailoverOrder: () => ["nvidia", "groq", "gemini"] as ApiProvider[],
			getMode: () => "act",
			getApiConfiguration: () => config,
			applyApiConfiguration: (next) => {
				config = next
				applyApiConfiguration(next)
			},
			hasCredentials: () => true,
			normalizeSwitch: (_previous, next) => next,
			emitMessages: vi.fn(),
			waitForPendingRebuilds: async () => {},
			// Simulates the real send path calling back into beginTurn().
			resumeTurn: async () => {
				coordinator.beginTurn()
			},
			askQuestion: async () => "",
		})

		await coordinator.handleRateLimit(attempt("nvidia"))
		const second = await coordinator.handleRateLimit(attempt("groq"))

		expect(second).toEqual({ kind: "switched", to: "gemini" })
	})

	it("asks before switching in ask mode", async () => {
		const { coordinator, askQuestion, resumeTurn } = makeCoordinator({ mode: "ask" })

		const outcome = await coordinator.handleRateLimit(attempt())

		expect(askQuestion).toHaveBeenCalledTimes(1)
		const [question, options] = askQuestion.mock.calls[0] as unknown as [string, string[]]
		expect(question).toContain("nvidia")
		expect(question).toContain("groq")
		expect(options).toHaveLength(2)
		expect(outcome).toEqual({ kind: "switched", to: "groq" })
		expect(resumeTurn).toHaveBeenCalledTimes(1)
	})

	it("stays put when the user declines", async () => {
		const { coordinator, applyApiConfiguration, resumeTurn } = makeCoordinator({
			mode: "ask",
			answer: "Stay and show the error",
		})

		const outcome = await coordinator.handleRateLimit(attempt())

		expect(outcome).toEqual({ kind: "declined" })
		expect(applyApiConfiguration).not.toHaveBeenCalled()
		expect(resumeTurn).not.toHaveBeenCalled()
	})

	// The user is answering mid-task and may type instead of clicking; only an
	// explicit refusal should block the switch.
	it("treats a free-text reply as consent", async () => {
		const { coordinator, resumeTurn } = makeCoordinator({ mode: "ask", answer: "yes go ahead" })

		const outcome = await coordinator.handleRateLimit(attempt())

		expect(outcome).toEqual({ kind: "switched", to: "groq" })
		expect(resumeTurn).toHaveBeenCalledTimes(1)
	})

	it("does not ask when there is nothing to switch to", async () => {
		const { coordinator, askQuestion } = makeCoordinator({ mode: "ask", keyed: ["nvidia"] })

		const outcome = await coordinator.handleRateLimit(attempt())

		expect(outcome).toEqual({ kind: "exhausted" })
		expect(askQuestion).not.toHaveBeenCalled()
	})

	it("starts fresh on a genuinely new turn", async () => {
		const { coordinator } = makeCoordinator({ order: ["nvidia", "groq"] as ApiProvider[] })

		await coordinator.handleRateLimit(attempt("nvidia"))
		coordinator.beginTurn()
		const afterNewTurn = await coordinator.handleRateLimit(attempt("nvidia"))

		expect(afterNewTurn).toEqual({ kind: "switched", to: "groq" })
	})
})
