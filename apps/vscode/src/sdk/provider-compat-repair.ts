/**
 * Repairs a request the provider refused on compatibility grounds, and retries
 * it on the same provider.
 *
 * ## Why this is not failover
 *
 * Failover answers "this provider cannot serve me right now, who can?" — the
 * right move for a rate limit. A compatibility rejection is the opposite
 * situation: the provider is healthy and would serve us happily if we stopped
 * sending it a field it does not accept. Switching providers there is wrong
 * twice over — it spends quota on a second provider to escape a problem that
 * followed the request rather than the provider, and it moves the user off the
 * model they chose for no reason.
 *
 * The classifier already declines to fail over on these (a 400 is terminal), so
 * before this existed the task simply ended. That is the gap this closes.
 *
 * ## Why it only ever tries once
 *
 * `noteReasoningHistoryRejected` returns true only the first time it learns a
 * provider, so a retry that fails again cannot start another. The failure then
 * surfaces normally — a repair that does not work must not turn one dead end
 * into an endless one.
 */
import { Logger } from "@/shared/services/Logger"
import { isReasoningHistoryRejection, noteReasoningHistoryRejected } from "./provider-compat"

export interface ProviderCompatRepairOptions {
	/**
	 * Resumes the interrupted turn. Same entry point as the Retry button and as
	 * failover's resume — an empty prompt continues rather than adding a message.
	 */
	resumeTurn: () => Promise<void>
	/** Waits for any scheduled session rebuild to settle before resuming. */
	waitForPendingRebuilds: () => Promise<void>
	/** Tells the user what was adjusted, in one line. */
	announce: (text: string) => void
}

export class ProviderCompatRepair {
	constructor(private readonly options: ProviderCompatRepairOptions) {}

	/**
	 * Returns true when the request was repaired and the turn resumed, so the
	 * caller should not surface the error — the task is still running.
	 *
	 * Returns false for anything it does not recognise, leaving the existing
	 * error path exactly as it was.
	 */
	tryRepair(error: unknown, providerId: string | undefined): boolean {
		if (!isReasoningHistoryRejection(error)) {
			return false
		}
		// False here means either "already known" (so the request that just failed
		// was *already* being stripped, and reasoning was not the problem) or
		// "this provider requires reasoning kept" (so stripping would break it
		// further). Neither is repairable by us.
		if (!noteReasoningHistoryRejected(providerId)) {
			return false
		}

		const name = providerId ?? "The provider"
		Logger.log(`[CompatRepair] ${name} rejected reasoning history; stripping it and retrying on the same provider`)
		this.options.announce(
			`${name} refused the reasoning its own model produced. Removing it from the conversation history and retrying — ` +
				"no provider switch needed.",
		)

		// Detached for the same reason failover detaches its resume: this runs
		// inside the session-event handler, and `resumeTurn()` produces events
		// into that same handler. Awaiting here would have the retry's events wait
		// on a handler that is itself waiting on the retry.
		void this.resumeAfterRepair(name)
		return true
	}

	private async resumeAfterRepair(name: string): Promise<void> {
		try {
			await this.options.waitForPendingRebuilds()
			await this.options.resumeTurn()
		} catch (error) {
			// Nobody is awaiting this, so a log is the only trace it would leave.
			Logger.error(`[CompatRepair] resume after repairing ${name} failed:`, error)
		}
	}
}
