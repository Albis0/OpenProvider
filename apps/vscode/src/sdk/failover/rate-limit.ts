/**
 * "How long did the provider ask us to wait?"
 *
 * Ported from `apps/openprovider/src/routing/rate-limit.ts`. That app is a Node
 * CLI with its own bundler, so the code is copied rather than imported; the
 * decision to duplicate instead of extracting a shared package is recorded in
 * `.claude/docs/provider-failover/`.
 *
 * Only the delay parser came across. Classification (*is* this a rate limit?)
 * is not duplicated: `ClineError.getErrorType()` already answers it here, is
 * provider-agnostic, and having two disagreeing classifiers would be worse than
 * having one.
 *
 * The parser is deliberately strict — inventing a wait time would sit doing
 * nothing for a number nobody said.
 */

/**
 * Phrasings seen in the wild, most explicit first:
 *   "Please retry in 48.091315407s."      (Gemini)
 *   "Please try again in 2m30s."          (Groq)
 *   "try again in 7.66 seconds"
 *   "retry after 30 seconds"
 */
const DELAY_PATTERNS = [
	/(?:retry|try again)\s+(?:in|after)\s+(\d+(?:\.\d+)?)\s*(ms|milliseconds?|s|seconds?|m|minutes?)\b/i,
	/retry[-\s]?after[:\s]+(\d+(?:\.\d+)?)\s*(s|seconds?)?/i,
]

function unitToMs(amount: number, unit: string | undefined): number {
	switch ((unit ?? "s").toLowerCase()) {
		case "ms":
		case "millisecond":
		case "milliseconds":
			return amount
		case "m":
		case "minute":
		case "minutes":
			return amount * 60_000
		default:
			return amount * 1000
	}
}

/**
 * Milliseconds the provider asked us to wait, or undefined when it did not say.
 * Never guesses.
 */
export function parseRetryDelay(message: string): number | undefined {
	// "2m30s" style first: the generic pattern would read only the minutes.
	const compound = /(?:retry|try again)\s+(?:in|after)\s+(\d+)\s*m\s*(\d+(?:\.\d+)?)\s*s/i.exec(message)
	if (compound) {
		return Math.round(Number(compound[1]) * 60_000 + Number(compound[2]) * 1000)
	}

	for (const pattern of DELAY_PATTERNS) {
		const match = pattern.exec(message)
		if (match?.[1]) {
			return Math.round(unitToMs(Number(match[1]), match[2]))
		}
	}
	return undefined
}

/** First line of the provider's message, for showing the user. */
export function summarizeError(message: string): string {
	return message.split("\n")[0]?.trim() || message
}
