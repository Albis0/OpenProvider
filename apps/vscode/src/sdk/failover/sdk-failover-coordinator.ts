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
import { describeFailureKind, type FailureKind } from "./failure-classifier"
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
	/** What the classifier decided this failure was. */
	kind?: FailureKind
	/** How long the provider asked us to wait, when it said. */
	retryAfterMs?: number
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

	/**
	 * Failures per provider during this turn, whatever the cause.
	 *
	 * Feeds the classifier's repetition layer: an error nobody recognises is
	 * not worth switching over the first time, but is the second. Without this
	 * count a provider with novel wording could fail forever in place.
	 */
	private readonly failureCounts = new Map<string, number>()

	constructor(private readonly options: SdkFailoverCoordinatorOptions) {}

	/** Called at the start of each send so a new turn starts with a clean slate. */
	beginTurn(): void {
		if (this.isRetrying) {
			return
		}
		this.exhausted.clear()
		this.failureCounts.clear()
	}

	/** How many times this provider has already failed this turn. */
	failureCountFor(providerId: string | undefined): number {
		return providerId ? (this.failureCounts.get(providerId) ?? 0) : 0
	}

	/** Records a failure for the repetition layer. Call once per failure. */
	recordFailure(providerId: string | undefined): void {
		if (providerId) {
			this.failureCounts.set(providerId, this.failureCountFor(providerId) + 1)
		}
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
			// Not announced: the user set this deliberately, and repeating their
			// own setting back at them on every error is noise.
			Logger.log("[Failover] skipped — mode is 'stop'")
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
			// Said out loud on purpose. A silent no-op here is indistinguishable
			// from a broken failover engine — which is exactly how a dead code
			// path went unnoticed until someone read the source. The user needs
			// to know the difference between "nothing to switch to" and "the
			// feature is not working".
			this.announce(
				`${attempt.failedProviderId ?? "The provider"} ${describeFailureKind(attempt.kind ?? "rate-limit")}, ` +
					"but no other provider with an API key is available to switch to. " +
					"Add a key in Settings → Provider Priority to enable failover.",
			)
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
			`${from} ${describeFailureKind(attempt.kind ?? "rate-limit")}.\n\n${attempt.summary}\n\nSwitch to ${provider} and continue?`,
			[switchAnswer, STAY_ANSWER],
		)

		// Anything other than an explicit refusal proceeds: the user was asked
		// mid-task and a typed reply like "yes go ahead" should not read as no.
		return answer.trim() !== STAY_ANSWER
	}

	/**
	 * Tells the user why failover did not act.
	 *
	 * Uses the same banner as a successful switch, with no `to` provider, so the
	 * two outcomes read as one story rather than two unrelated features.
	 */
	private announce(reason: string): void {
		Logger.log(`[Failover] ${reason}`)
		this.options.emitMessages([
			{
				ts: Date.now(),
				type: "say",
				say: "provider_failover",
				text: JSON.stringify({ from: "", to: "", summary: reason }),
				partial: false,
			},
		])
	}

	private async switchTo(provider: ApiProvider, attempt: FailoverAttempt): Promise<void> {
		const previous = this.options.getApiConfiguration()
		const patch = buildProviderSwitchPatch(provider, this.options.getMode())
		// normalizeSwitch resolves a valid model id for the new provider; without
		// it the session would restart pointing at the old provider's model.
		const next = this.options.normalizeSwitch(previous, { ...previous, ...patch })

		Logger.log(
			`[Failover] ${attempt.failedProviderId ?? "unknown"} ${describeFailureKind(attempt.kind ?? "rate-limit")}; switching to ${provider}`,
		)

		// The banner needs the two provider ids as data, not buried in a
		// sentence, so the row can show the hand-off as `from → to` at a glance.
		// JSON rather than a formatted string because this is the one message
		// whose meaning must survive being skimmed.
		this.options.emitMessages([
			{
				ts: Date.now(),
				type: "say",
				say: "provider_failover",
				text: JSON.stringify({
					from: attempt.failedProviderId ?? "The provider",
					to: provider,
					summary: attempt.summary,
				}),
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
