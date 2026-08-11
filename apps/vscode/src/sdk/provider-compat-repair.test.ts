import { beforeEach, describe, expect, it, vi } from "vitest"
import { resetLearnedRejectors, shouldStripReasoningHistory } from "./provider-compat"
import { ProviderCompatRepair } from "./provider-compat-repair"

const GROQ_REJECTION =
	"'messages.2' : for 'role:assistant' the following must be satisfied [('messages.2' : property 'reasoning_content' is unsupported)]"

function makeRepair() {
	const announce = vi.fn()
	const resumeTurn = vi.fn(async () => {})
	const waitForPendingRebuilds = vi.fn(async () => {})
	const repair = new ProviderCompatRepair({ announce, resumeTurn, waitForPendingRebuilds })
	return { repair, announce, resumeTurn, waitForPendingRebuilds }
}

beforeEach(() => {
	resetLearnedRejectors()
})

describe("ProviderCompatRepair", () => {
	it("learns the provider, tells the user, and resumes on the same provider", async () => {
		const { repair, announce, resumeTurn } = makeRepair()

		expect(repair.tryRepair(GROQ_REJECTION, "nvidia")).toBe(true)

		// The point of the repair: the next request on this provider strips.
		expect(shouldStripReasoningHistory("nvidia")).toBe(true)
		expect(announce).toHaveBeenCalledOnce()
		// Resume is detached, so it has not necessarily run by the time tryRepair
		// returns — but it must run.
		await vi.waitFor(() => expect(resumeTurn).toHaveBeenCalledOnce())
	})

	it("waits for a pending session rebuild before resuming", async () => {
		const { repair, resumeTurn, waitForPendingRebuilds } = makeRepair()
		const order: string[] = []
		waitForPendingRebuilds.mockImplementation(async () => {
			order.push("wait")
		})
		resumeTurn.mockImplementation(async () => {
			order.push("resume")
		})

		repair.tryRepair(GROQ_REJECTION, "nvidia")

		await vi.waitFor(() => expect(order).toEqual(["wait", "resume"]))
	})

	// Otherwise one dead end becomes an endless one.
	it("does not repair the same provider twice", async () => {
		const { repair, resumeTurn } = makeRepair()

		expect(repair.tryRepair(GROQ_REJECTION, "nvidia")).toBe(true)
		expect(repair.tryRepair(GROQ_REJECTION, "nvidia")).toBe(false)

		await vi.waitFor(() => expect(resumeTurn).toHaveBeenCalledOnce())
	})

	// Groq already strips, so a rejection from it means reasoning was not the
	// problem and there is nothing here to fix.
	it("declines when the provider was already stripping", () => {
		const { repair, resumeTurn } = makeRepair()

		expect(repair.tryRepair(GROQ_REJECTION, "groq")).toBe(false)
		expect(resumeTurn).not.toHaveBeenCalled()
	})

	// Stripping is the opposite of what DeepSeek asked for.
	it("declines on a provider that requires reasoning kept", () => {
		const { repair } = makeRepair()

		expect(repair.tryRepair(GROQ_REJECTION, "deepseek")).toBe(false)
		expect(shouldStripReasoningHistory("deepseek")).toBe(false)
	})

	it("leaves unrelated errors to the existing error path", () => {
		const { repair, announce, resumeTurn } = makeRepair()

		expect(repair.tryRepair("ResourceExhausted: Worker local total request limit reached (33/32)", "nvidia")).toBe(false)
		expect(announce).not.toHaveBeenCalled()
		expect(resumeTurn).not.toHaveBeenCalled()
	})

	// Nobody awaits the detached resume, so a throw there must not escape as an
	// unhandled rejection.
	it("swallows a failing resume", async () => {
		const { repair, resumeTurn } = makeRepair()
		resumeTurn.mockRejectedValueOnce(new Error("resume exploded"))

		expect(repair.tryRepair(GROQ_REJECTION, "nvidia")).toBe(true)

		await vi.waitFor(() => expect(resumeTurn).toHaveBeenCalledOnce())
	})
})
