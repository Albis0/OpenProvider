import type { ApiConfiguration, ApiProvider } from "@shared/api"
import type { ClineMessage } from "@shared/ExtensionMessage"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { classifyFailure } from "./failure-classifier"
import { SdkFailoverCoordinator } from "./sdk-failover-coordinator"

/**
 * End-to-end failover, with the provider error injected rather than waited for.
 *
 * This exists because the bug it covers was invisible to every other kind of
 * test. Each piece worked: the classifier classified, the selector selected,
 * the switcher switched — and the feature did nothing, because the thing that
 * calls them was hung off a callback the SDK never fires for provider errors.
 * Only a test that starts from a real provider error and asserts on the
 * observable outcome can catch that, and waiting for a live 429 to find out is
 * how it survived three releases.
 *
 * The seam is `classifyFailure` → `handleRateLimit`, i.e. exactly what
 * `SdkController.tryFailoverOnProviderFailure` does. The controller itself
 * needs an extension host, so the two-line body is mirrored here instead.
 */

/** Verbatim from NVIDIA, mid-task, 2026-08-08. */
const NVIDIA_RATE_LIMIT = "ResourceExhausted: Worker local total request limit reached (32/32)"

interface Harness {
	coordinator: SdkFailoverCoordinator
	messages: ClineMessage[]
	config: () => ApiConfiguration
	resumed: () => number
	setNow: (ms: number) => void
	/** Mirrors SdkController.tryFailoverOnProviderFailure. */
	fail: (error: unknown, providerId: string) => Promise<boolean>
}

function makeHarness(
	options: {
		mode?: "ask" | "auto" | "stop"
		order?: ApiProvider[]
		withKeys?: string[]
		answer?: string
	} = {},
): Harness {
	const withKeys = options.withKeys ?? ["nvidia", "groq", "gemini"]
	let config: ApiConfiguration = { actModeApiProvider: "nvidia" } as ApiConfiguration
	const messages: ClineMessage[] = []
	let resumed = 0
	let now = 1_000_000

	const coordinator = new SdkFailoverCoordinator({
		getFailoverMode: () => options.mode ?? "auto",
		getFailoverOrder: () => options.order ?? (["nvidia", "groq", "gemini"] as ApiProvider[]),
		getMode: () => "act",
		getApiConfiguration: () => config,
		applyApiConfiguration: (next) => {
			config = next
		},
		hasCredentials: (providerId) => withKeys.includes(providerId),
		normalizeSwitch: (_previous, next) => next,
		emitMessages: (batch) => messages.push(...batch),
		waitForPendingRebuilds: async () => {},
		resumeTurn: async () => {
			resumed += 1
		},
		askQuestion: async () => options.answer ?? "Switch to groq",
		now: () => now,
	})

	const fail = async (error: unknown, providerId: string): Promise<boolean> => {
		const classification = classifyFailure({
			error,
			providerId,
			priorFailuresThisTurn: coordinator.failureCountFor(providerId),
		})
		coordinator.recordFailure(providerId)
		if (!classification.shouldFailover) {
			return false
		}
		const outcome = await coordinator.handleRateLimit({
			failedProviderId: providerId,
			summary: classification.summary,
			kind: classification.kind,
			retryAfterMs: classification.retryAfterMs,
		})
		return outcome.kind === "switched"
	}

	return {
		coordinator,
		messages,
		config: () => config,
		resumed: () => resumed,
		setNow: (ms) => {
			now = ms
		},
		fail,
	}
}

const bannerPayloads = (messages: ClineMessage[]) =>
	messages.filter((m) => m.say === "provider_failover").map((m) => JSON.parse(m.text ?? "{}"))

describe("failover chain, from a real provider error", () => {
	let harness: Harness

	beforeEach(() => {
		harness = makeHarness()
		harness.coordinator.beginTurn()
	})

	it("switches provider and resumes the turn on NVIDIA's real rate limit", async () => {
		const switched = await harness.fail(new Error(NVIDIA_RATE_LIMIT), "nvidia")

		expect(switched).toBe(true)
		expect(harness.config().actModeApiProvider).toBe("groq")
		// The turn continuing is the whole point; a switch that does not resume
		// leaves the user staring at a stopped task.
		expect(harness.resumed()).toBe(1)
	})

	it("tells the user, with both provider ids as data", async () => {
		await harness.fail(new Error(NVIDIA_RATE_LIMIT), "nvidia")

		expect(bannerPayloads(harness.messages)).toEqual([
			{ from: "nvidia", to: "groq", summary: NVIDIA_RATE_LIMIT },
		])
	})

	it("walks down the chain as each provider gives out", async () => {
		await harness.fail(new Error(NVIDIA_RATE_LIMIT), "nvidia")
		await harness.fail(new Error(NVIDIA_RATE_LIMIT), "groq")

		expect(harness.config().actModeApiProvider).toBe("gemini")
		expect(harness.resumed()).toBe(2)
	})

	it("says so instead of going quiet when nothing is left", async () => {
		const solo = makeHarness({ withKeys: ["nvidia"] })
		solo.coordinator.beginTurn()

		const switched = await solo.fail(new Error(NVIDIA_RATE_LIMIT), "nvidia")

		expect(switched).toBe(false)
		// The regression that made this whole feature look broken: no switch AND
		// no explanation is indistinguishable from a dead code path.
		const [banner] = bannerPayloads(solo.messages)
		expect(banner.to).toBe("")
		expect(banner.summary).toMatch(/no other provider/i)
	})

	it("leaves errors alone that switching cannot fix", async () => {
		const switched = await harness.fail(new Error("401 Invalid API key provided"), "nvidia")

		expect(switched).toBe(false)
		expect(harness.config().actModeApiProvider).toBe("nvidia")
		expect(harness.messages).toHaveLength(0)
	})

	it("moves off a provider that fails twice with wording nobody recognises", async () => {
		const first = await harness.fail(new Error("something nobody has seen"), "nvidia")
		expect(first).toBe(false)

		const second = await harness.fail(new Error("something nobody has seen"), "nvidia")
		expect(second).toBe(true)
		expect(harness.config().actModeApiProvider).toBe("groq")
	})

	it("does nothing when the user set mode to stop", async () => {
		const stopped = makeHarness({ mode: "stop" })
		stopped.coordinator.beginTurn()

		expect(await stopped.fail(new Error(NVIDIA_RATE_LIMIT), "nvidia")).toBe(false)
		expect(stopped.config().actModeApiProvider).toBe("nvidia")
	})

	it("honours a refusal in ask mode", async () => {
		const asked = makeHarness({ mode: "ask", answer: "Stay and show the error" })
		asked.coordinator.beginTurn()

		expect(await asked.fail(new Error(NVIDIA_RATE_LIMIT), "nvidia")).toBe(false)
		expect(asked.config().actModeApiProvider).toBe("nvidia")
	})

	describe("cooldown across turns", () => {
		it("does not return to a provider that was just rate limited", async () => {
			await harness.fail(new Error(NVIDIA_RATE_LIMIT), "nvidia")
			expect(harness.config().actModeApiProvider).toBe("groq")

			// New turn: the per-turn exhausted set resets, but nvidia's quota has
			// not. Without a cooldown the next failure walks straight back onto it.
			harness.coordinator.beginTurn()
			await harness.fail(new Error(NVIDIA_RATE_LIMIT), "groq")

			expect(harness.config().actModeApiProvider).toBe("gemini")
		})

		it("returns to it once the cooldown expires", async () => {
			await harness.fail(new Error(NVIDIA_RATE_LIMIT), "nvidia")

			harness.setNow(1_000_000 + 200_000)
			harness.coordinator.beginTurn()
			await harness.fail(new Error(NVIDIA_RATE_LIMIT), "groq")

			expect(harness.config().actModeApiProvider).toBe("nvidia")
		})

		it("prefers a cooling provider over failing the task outright", async () => {
			const pair = makeHarness({ withKeys: ["nvidia", "groq"], order: ["nvidia", "groq"] as ApiProvider[] })
			pair.coordinator.beginTurn()

			await pair.fail(new Error(NVIDIA_RATE_LIMIT), "nvidia")
			expect(pair.config().actModeApiProvider).toBe("groq")

			pair.coordinator.beginTurn()
			await pair.fail(new Error(NVIDIA_RATE_LIMIT), "groq")

			// nvidia is still cooling, but it is the only candidate left, and a
			// provider that might have recovered beats stopping.
			expect(pair.config().actModeApiProvider).toBe("nvidia")
		})
	})

	it("does not loop between two providers inside one turn", async () => {
		const pair = makeHarness({ withKeys: ["nvidia", "groq"], order: ["nvidia", "groq"] as ApiProvider[] })
		pair.coordinator.beginTurn()

		await pair.fail(new Error(NVIDIA_RATE_LIMIT), "nvidia")
		await pair.fail(new Error(NVIDIA_RATE_LIMIT), "groq")
		const third = await pair.fail(new Error(NVIDIA_RATE_LIMIT), "nvidia")

		// Both are exhausted for this turn, so there is nowhere left to go.
		expect(third).toBe(false)
	})
})

describe("the event path is what actually fires", () => {
	/**
	 * Guards the specific mistake this work fixed: failover hung off
	 * `onSendError`, which the SDK does not call for provider errors. If the
	 * hook is ever removed from the event coordinator's options this fails,
	 * rather than the feature going quietly dead again.
	 */
	it("keeps a provider-failure hook on the session event coordinator", async () => {
		const module = await import("../sdk-session-event-coordinator")
		const source = await import("node:fs/promises").then((fs) =>
			fs.readFile(new URL("../sdk-session-event-coordinator.ts", import.meta.url), "utf8"),
		)

		expect(module.SdkSessionEventCoordinator).toBeTypeOf("function")
		expect(source).toContain("handleProviderFailure")
		// It must be reached from the agent-error branch, not merely declared.
		expect(source).toMatch(/agentFailure[\s\S]{0,800}handleProviderFailure/)
	})
})

describe("classifier and coordinator agree", () => {
	it("passes the classified kind through to the question the user sees", async () => {
		const asked = makeHarness({ mode: "ask", answer: "Stay and show the error" })
		asked.coordinator.beginTurn()
		const askQuestion = vi.fn(async () => "Stay and show the error")

		const coordinator = new SdkFailoverCoordinator({
			getFailoverMode: () => "ask",
			getFailoverOrder: () => ["nvidia", "groq"] as ApiProvider[],
			getMode: () => "act",
			getApiConfiguration: () => ({ actModeApiProvider: "nvidia" }) as ApiConfiguration,
			applyApiConfiguration: () => {},
			hasCredentials: () => true,
			normalizeSwitch: (_p, n) => n,
			emitMessages: () => {},
			waitForPendingRebuilds: async () => {},
			resumeTurn: async () => {},
			askQuestion,
		})

		await coordinator.handleRateLimit({
			failedProviderId: "nvidia",
			summary: "503 upstream",
			kind: "overloaded",
		})

		// Not "hit its rate limit" — saying the wrong reason trains the user to
		// stop reading the prompt.
		expect(askQuestion.mock.calls[0]?.[0]).toContain("is overloaded")
		expect(asked.messages).toHaveLength(0)
	})
})
