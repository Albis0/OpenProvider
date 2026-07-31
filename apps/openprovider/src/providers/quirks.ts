/**
 * Faz 5, adım 2 — sağlayıcı yetenek ve tuhaflık tablosu.
 *
 * Free-tier providers are not interchangeable, and the ways they differ are
 * not in any catalog: one rejects a field its own model produced, another
 * counts reserved output against the input quota, a third caps daily requests
 * low enough that one session exhausts it.
 *
 * Every entry here was measured against the live API, not read from docs.
 * `measuredOn` says when, because these limits change.
 */

export interface ProviderQuirks {
	/**
	 * Strip `reasoning` parts from assistant messages before sending.
	 *
	 * Groq's `gpt-oss-120b` emits reasoning, the AI SDK serialises it back as
	 * `reasoning_content` on the next request, and Groq then rejects its own
	 * field:
	 *
	 *   'messages.1' : for 'role:assistant' the following must be satisfied
	 *   [('messages.1' : property 'reasoning_content' is unsupported)]
	 *
	 * Only bites on the second request, so single-turn chat looks fine and
	 * tool-using loops fail.
	 */
	stripReasoning?: boolean;
	/**
	 * Output cap that keeps the free tier usable. Providers that bill reserved
	 * output against a per-minute quota need this or a one-line prompt can be
	 * refused for requesting 32k tokens it will never use.
	 */
	defaultMaxOutputTokens?: number;
	/** False when tool-using agent loops are known not to work. */
	supportsTools?: boolean;
	/** Free-tier ceiling, for the quota work in Faz 6. */
	limits?: {
		tokensPerMinute?: number;
		requestsPerDay?: number;
	};
	/** Human-readable caveat surfaced in diagnostics. */
	note?: string;
	measuredOn?: string;
}

const QUIRKS: Record<string, ProviderQuirks> = {
	groq: {
		stripReasoning: true,
		defaultMaxOutputTokens: 2048,
		supportsTools: true,
		// Both confirmed against Groq's own x-ratelimit headers in Faz 6.
		limits: { tokensPerMinute: 8000, requestsPerDay: 1000 },
		note:
			"Counts reserved output against TPM, so an uncapped request can be " +
			"refused outright. Emits reasoning it will not accept back. " +
			"Publishes x-ratelimit headers, so quota is exact rather than estimated.",
		measuredOn: "2026-07-31",
	},
	gemini: {
		// Reasoning models spend this allowance before the first visible token,
		// so a tight cap fails the stream rather than truncating it.
		defaultMaxOutputTokens: 4096,
		supportsTools: true,
		limits: { requestsPerDay: 20 },
		note: "Free tier allows 20 requests/day; one agent session exhausts it.",
		measuredOn: "2026-07-31",
	},
	cerebras: {
		defaultMaxOutputTokens: 4096,
		supportsTools: true,
	},
	openrouter: {
		defaultMaxOutputTokens: 4096,
		supportsTools: true,
	},
	nvidia: {
		defaultMaxOutputTokens: 4096,
		supportsTools: true,
		note: "Not wired into the VS Code extension yet.",
	},
};

/** Everything known about a provider. Empty object for unknown ones. */
export function quirksFor(providerId: string): ProviderQuirks {
	return QUIRKS[providerId] ?? {};
}

/** True unless a provider is explicitly known to break on tool loops. */
export function supportsTools(providerId: string): boolean {
	return quirksFor(providerId).supportsTools !== false;
}

/**
 * Output cap to use, preferring an explicit config value over the measured
 * default. Undefined means "let the gateway decide", which is only safe on
 * providers that do not bill reserved output.
 */
export function resolveOutputCap(
	providerId: string,
	configured?: number,
): number | undefined {
	return configured ?? quirksFor(providerId).defaultMaxOutputTokens;
}

/** Provider ids with a recorded quirk. For diagnostics. */
export function knownProviders(): string[] {
	return Object.keys(QUIRKS);
}
