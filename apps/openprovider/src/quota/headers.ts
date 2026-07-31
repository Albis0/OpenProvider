/**
 * Faz 6, adım 2 — sağlayıcının kendi rate limit başlıklarını okumak.
 *
 * A local counter is an estimate: it cannot see requests made by other tools
 * with the same key, and it guesses when the window resets. Providers that
 * publish `x-ratelimit-*` headers tell us the truth, so those win when
 * available.
 *
 * **Why a global fetch wrapper.** The gateway does accept a custom `fetch`
 * (`GatewayConfig.fetch`), but the plain `Agent` path never passes one — it
 * calls `createGateway({ providerConfigs, telemetry })` and nothing else. So
 * there is no supported seam on this path.
 *
 * The wrapper is therefore opt-in, reversible, and strictly passive: it reads
 * response headers and forwards the response untouched. It never modifies a
 * request, never buffers a body, and `uninstall()` restores the original
 * exactly. If that trade is unacceptable, leave it off — the local counter
 * still works.
 */

export interface RateLimitSnapshot {
	providerId: string;
	observedAt: number;
	requestsLimit?: number;
	requestsRemaining?: number;
	tokensLimit?: number;
	tokensRemaining?: number;
	/** Milliseconds until the limiting window resets, when published. */
	resetsInMs?: number;
}

/** `"1m30s"`, `"7.66s"`, `"2m"`, `"500ms"` → milliseconds. */
export function parseDuration(value: string): number | undefined {
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		return undefined;
	}
	// A bare number is seconds, which is what `retry-after` uses.
	if (/^\d+(\.\d+)?$/.test(trimmed)) {
		return Math.round(Number(trimmed) * 1000);
	}

	const pattern = /(\d+(?:\.\d+)?)(ms|s|m|h)/g;
	let total = 0;
	let matched = false;
	for (const match of trimmed.matchAll(pattern)) {
		const amount = Number(match[1]);
		matched = true;
		switch (match[2]) {
			case "ms":
				total += amount;
				break;
			case "s":
				total += amount * 1000;
				break;
			case "m":
				total += amount * 60_000;
				break;
			case "h":
				total += amount * 3_600_000;
				break;
		}
	}
	return matched ? Math.round(total) : undefined;
}

function readNumber(headers: Headers, name: string): number | undefined {
	const raw = headers.get(name);
	if (raw === null) {
		return undefined;
	}
	const value = Number(raw);
	return Number.isFinite(value) ? value : undefined;
}

function readDuration(headers: Headers, name: string): number | undefined {
	const raw = headers.get(name);
	return raw === null ? undefined : parseDuration(raw);
}

/**
 * Reads the `x-ratelimit-*` family, which Groq and several OpenAI-compatible
 * providers emit. Returns undefined when none are present.
 */
export function parseRateLimitHeaders(
	providerId: string,
	headers: Headers,
	now = Date.now(),
): RateLimitSnapshot | undefined {
	const snapshot: RateLimitSnapshot = {
		providerId,
		observedAt: now,
		requestsLimit: readNumber(headers, "x-ratelimit-limit-requests"),
		requestsRemaining: readNumber(headers, "x-ratelimit-remaining-requests"),
		tokensLimit: readNumber(headers, "x-ratelimit-limit-tokens"),
		tokensRemaining: readNumber(headers, "x-ratelimit-remaining-tokens"),
	};

	// Prefer the window that is actually binding; fall back to retry-after.
	snapshot.resetsInMs =
		readDuration(headers, "x-ratelimit-reset-tokens") ??
		readDuration(headers, "x-ratelimit-reset-requests") ??
		readDuration(headers, "retry-after");

	const hasAny = (
		[
			"requestsLimit",
			"requestsRemaining",
			"tokensLimit",
			"tokensRemaining",
			"resetsInMs",
		] as const
	).some((key) => snapshot[key] !== undefined);

	return hasAny ? snapshot : undefined;
}

/** Host → provider id, so a response can be attributed without extra plumbing. */
const HOST_PROVIDERS: Array<[RegExp, string]> = [
	[/(^|\.)groq\.com$/i, "groq"],
	[/(^|\.)generativelanguage\.googleapis\.com$/i, "gemini"],
	[/(^|\.)cerebras\.ai$/i, "cerebras"],
	[/(^|\.)openrouter\.ai$/i, "openrouter"],
	[/(^|\.)api\.nvidia\.com$/i, "nvidia"],
	[/integrate\.api\.nvidia\.com$/i, "nvidia"],
];

export function providerForUrl(url: string): string | undefined {
	let host: string;
	try {
		host = new URL(url).hostname;
	} catch {
		return undefined;
	}
	return HOST_PROVIDERS.find(([pattern]) => pattern.test(host))?.[1];
}

type FetchLike = typeof globalThis.fetch;

export interface RateLimitObserver {
	/** Most recent snapshot per provider. */
	latest(providerId: string): RateLimitSnapshot | undefined;
	/** Restores the original `fetch`. Safe to call twice. */
	uninstall(): void;
}

/**
 * Installs the passive fetch wrapper. Returns an observer plus the means to
 * remove it — always uninstall in a `finally`, or a long-lived process keeps
 * a wrapper it no longer needs.
 */
export function observeRateLimits(options: {
	now?: () => number;
	onSnapshot?: (snapshot: RateLimitSnapshot) => void;
} = {}): RateLimitObserver {
	const now = options.now ?? (() => Date.now());
	const snapshots = new Map<string, RateLimitSnapshot>();
	const original: FetchLike = globalThis.fetch;
	let installed = true;

	const handler = async (
		input: Parameters<FetchLike>[0],
		init?: Parameters<FetchLike>[1],
	): Promise<Response> => {
		const response = await original(input, init);
		if (!installed) {
			return response;
		}
		try {
			const url =
				typeof input === "string"
					? input
					: input instanceof URL
						? input.href
						: input.url;
			const providerId = providerForUrl(url);
			if (providerId) {
				const snapshot = parseRateLimitHeaders(
					providerId,
					response.headers,
					now(),
				);
				if (snapshot) {
					snapshots.set(providerId, snapshot);
					options.onSnapshot?.(snapshot);
				}
			}
		} catch {
			// Observation must never break the request it is watching.
		}
		return response;
	};

	// Runtimes hang extras off `fetch` — Bun adds `preconnect`, and code that
	// reaches for one should not break because the function was wrapped.
	const wrapped = Object.assign(handler, original) as FetchLike;
	globalThis.fetch = wrapped;

	return {
		latest: (providerId) => snapshots.get(providerId),
		uninstall: () => {
			if (!installed) {
				return;
			}
			installed = false;
			// Only restore if nobody wrapped fetch after us; clobbering their
			// wrapper would be worse than leaving ours in place.
			if (globalThis.fetch === wrapped) {
				globalThis.fetch = original;
			}
		},
	};
}
