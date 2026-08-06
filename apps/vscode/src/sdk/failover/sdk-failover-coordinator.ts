/**
 * Enacts a rate-limit failover: writes the new provider into the API
 * configuration and restarts the active session onto it.
 *
 * Split from `SdkController` so the decision ("should we switch, and to what?")
 * is testable without an extension host. The controller supplies the accessors;
 * this class owns the sequence.
 */
import type { ApiConfiguration, ApiProvider } from "@shared/api"
import type { ClineMessage } from "@shared/ExtensionMessage"
import type { Mode } from "@shared/storage/types"
import { Logger } from "@/shared/services/Logger"
import { buildProviderSwitchPatch, type FailoverMode, selectNextProvider } from "./provider-failover"

export interface SdkFailoverCoordinatorOptions {
	getFailoverMode: () => FailoverMode
	getFailoverOrder: () => readonly ApiProvider[]
	getMode: () => Mode
	getApiConfiguration: () => ApiConfiguration
	/** Persists the config and triggers the provider-change session restart. */
	applyApiConfiguration: (next: ApiConfiguration, previous: ApiConfiguration) => void
	/** True when the provider has usable credentials. */
	hasCredentials: (providerId: string, config: ApiConfiguration) => boolean
	/** Normalizes the model id for the newly selected provider. */
	normalizeSwitch: (previous: ApiConfiguration, next: ApiConfiguration) => ApiConfiguration
	emitMessages: (messages: ClineMessage[]) => void
	/** Waits for the provider-change session restart to settle. */
	waitForPendingRebuilds: () => Promise<void>
	/**
	 * Resumes the interrupted turn on the newly selected provider. This is the
	 * same entry point the "Retry" button uses (`askResponse` with no prompt).
	 */
	resumeTurn: () => Promise<void>
	/**
	 * Asks the user a question with preset answers and waits. Reuses the SDK's
	 * existing follow-up mechanism, which already renders options as buttons and
	 * blocks the turn until answered — no new UI or round-trip is needed.
	 */
	askQuestion: (question: string, options: string[]) => Promise<string>
}

export interface FailoverAttempt {
	failedProviderId: string | undefined
	/** The provider's message, already summarized to one line. */
	summary: string
}

export type FailoverOutcome =
	| { kind: "switched"; to: ApiProvider }
	/** Mode is "stop", so the error surfaces unchanged. */
	| { kind: "disabled" }
	/** Nothing left to switch to; the error surfaces unchanged. */
	| { kind: "exhausted" }
	/** Mode is "ask" and the user said no. */
	| { kind: "declined" }

const STAY_ANSWER = "Stay and show the error"

export class SdkFailoverCoordinator {
	/**
	 * Providers already rate limited during this turn. Without it, a chain of
	 * failures could walk back onto a provider that just failed and loop.
	 * Cleared whenever a turn starts.
	 */
	private exhausted = new Set<string>()

	/**
	 * True while a failover-initiated retry is in flight.
	 *
	 * That retry is itself a send, so it fires `onSendStart` → `beginTurn()`.
	 * Without this guard the set would be cleared on the way back in and a
	 * chain of rate limits could bounce between the same two providers forever.
	 */
	private isRetrying = false

	constructor(private readonly options: SdkFailoverCoordinatorOptions) {}

	/** Called at the start of each send so a new turn starts with a clean slate. */
	beginTurn(): void {
		if (this.isRetrying) {
			return
		}
		this.exhausted.clear()
	}

	/**
	 * Decides and, in "auto" mode, performs the switch.
	 *
	 * Returns what happened so the caller can choose how to surface the original
	 * error: a successful switch replaces the error message with a notice, while
	 * every other outcome leaves the normal error path alone.
	 */
	async handleRateLimit(attempt: FailoverAttempt): Promise<FailoverOutcome> {
		const mode = this.options.getFailoverMode()
		if (mode === "stop") {
			return { kind: "disabled" }
		}

		if (attempt.failedProviderId) {
			this.exhausted.add(attempt.failedProviderId)
		}

		const config = this.options.getApiConfiguration()
		const next = selectNextProvider({
			failedProviderId: attempt.failedProviderId,
			configuredOrder: this.options.getFailoverOrder(),
			exhausted: this.exhausted,
			hasCredentials: (providerId) => this.options.hasCredentials(providerId, config),
		})

		if (!next) {
			return { kind: "exhausted" }
		}

		if (mode === "ask" && !(await this.confirmSwitch(next, attempt))) {
			return { kind: "declined" }
		}

		await this.switchTo(next, attempt)
		return { kind: "switched", to: next }
	}

	/**
	 * Asks before switching. The question carries the provider's own message,
	 * because "nvidia hit its rate limit" is not enough to decide on — the
	 * stated retry delay usually is.
	 */
	private async confirmSwitch(provider: ApiProvider, attempt: FailoverAttempt): Promise<boolean> {
		const switchAnswer = `Switch to ${provider}`
		const from = attempt.failedProviderId ?? "The provider"

		const answer = await this.options.askQuestion(
			`${from} hit its rate limit.\n\n${attempt.summary}\n\nSwitch to ${provider} and continue?`,
			[switchAnswer, STAY_ANSWER],
		)

		// Anything other than an explicit refusal proceeds: the user was asked
		// mid-task and a typed reply like "yes go ahead" should not read as no.
		return answer.trim() !== STAY_ANSWER
	}

	private async switchTo(provider: ApiProvider, attempt: FailoverAttempt): Promise<void> {
		const previous = this.options.getApiConfiguration()
		const patch = buildProviderSwitchPatch(provider, this.options.getMode())
		// normalizeSwitch resolves a valid model id for the new provider; without
		// it the session would restart pointing at the old provider's model.
		const next = this.options.normalizeSwitch(previous, { ...previous, ...patch })

		Logger.log(`[Failover] ${attempt.failedProviderId ?? "unknown"} rate limited; switching to ${provider}`)

		this.options.emitMessages([
			{
				ts: Date.now(),
				type: "say",
				say: "text",
				text: `${attempt.failedProviderId ?? "The provider"} hit its rate limit. Switched to ${provider} and retrying.\n\n${attempt.summary}`,
				partial: false,
			},
		])

		// Persisting the provider is what triggers the session restart, via the
		// controller's existing handleApiConfigurationChanged path.
		this.options.applyApiConfiguration(next, previous)

		// The restart is scheduled, not immediate. Resuming before it settles
		// would send the retry to the session being replaced — i.e. straight back
		// to the provider that just rate limited us.
		await this.options.waitForPendingRebuilds()

		// resumeTurn() reaches the send — and therefore `onSendStart` →
		// beginTurn() — before the promise it returns settles, so clearing the
		// flag in `finally` still happens after the guarded call. This holds
		// because the resume carries no prompt and so skips the one `await`
		// (mention resolution) that would otherwise yield first.
		this.isRetrying = true
		try {
			await this.options.resumeTurn()
		} finally {
			this.isRetrying = false
		}
	}
}
