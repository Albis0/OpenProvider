/**
 * Faz 7, adım 1 — "bu bir rate limit mi, ve ne kadar beklemeli?"
 *
 * Providers do not agree on how to say it. Groq returns a TPM message, Gemini
 * a quota message with `Please retry in 48.09s`, others a bare 429. There is
 * no structured field to read on this path — `AgentRunResult.error` is an
 * `Error` whose message is the provider's prose — so the prose is what gets
 * parsed.
 *
 * The classifier is deliberately generous and the delay parser deliberately
 * strict: treating an auth failure as a rate limit only costs one pointless
 * question, while inventing a wait time would sit doing nothing for a number
 * nobody said.
 */

const RATE_LIMIT_PATTERNS = [
	/rate.?limit/i,
	/\b429\b/,
	/too many requests/i,
	/quota exceeded/i,
	/exceeded your current quota/i,
	/tokens per minute/i,
	/\bTPM\b/,
	/requests per (minute|day)/i,
	/request too large/i,
];

/** True when the message looks like a throttle rather than a hard failure. */
export function isRateLimitError(message: string): boolean {
	return RATE_LIMIT_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Phrasings seen in the wild, most explicit first:
 *   "Please retry in 48.091315407s."      (Gemini)
 *   "Please try again in 2m30s."          (Groq)
 *   "try again in 7.66 seconds"
 *   "retry after 30 seconds"
 */
const DELAY_PATTERNS = [
	/(?:retry|try again)\s+(?:in|after)\s+(\d+(?:\.\d+)?)\s*(ms|milliseconds?|s|seconds?|m|minutes?)\b/i,
	/(?:retry|try again)\s+(?:in|after)\s+(?:(\d+)\s*m)\s*(?:(\d+(?:\.\d+)?)\s*s)?/i,
	/retry[-\s]?after[:\s]+(\d+(?:\.\d+)?)\s*(s|seconds?)?/i,
];

function unitToMs(amount: number, unit: string | undefined): number {
	switch ((unit ?? "s").toLowerCase()) {
		case "ms":
		case "millisecond":
		case "milliseconds":
			return amount;
		case "m":
		case "minute":
		case "minutes":
			return amount * 60_000;
		default:
			return amount * 1000;
	}
}

/**
 * Milliseconds the provider asked us to wait, or undefined when it did not
 * say. Never guesses.
 */
export function parseRetryDelay(message: string): number | undefined {
	// "2m30s" style first: the generic pattern would read only the minutes.
	const compound = /(?:retry|try again)\s+(?:in|after)\s+(\d+)\s*m\s*(\d+(?:\.\d+)?)\s*s/i.exec(
		message,
	);
	if (compound) {
		return Math.round(
			Number(compound[1]) * 60_000 + Number(compound[2]) * 1000,
		);
	}

	for (const pattern of DELAY_PATTERNS) {
		const match = pattern.exec(message);
		if (match?.[1]) {
			return Math.round(unitToMs(Number(match[1]), match[2]));
		}
	}
	return undefined;
}

export interface RateLimitInfo {
	isRateLimit: boolean;
	/** Present only when the provider stated a delay. */
	retryAfterMs?: number;
	/** First line of the provider's message, for showing the user. */
	summary: string;
}

export function classifyError(message: string): RateLimitInfo {
	return {
		isRateLimit: isRateLimitError(message),
		retryAfterMs: parseRetryDelay(message),
		summary: message.split("\n")[0]?.trim() ?? message,
	};
}
