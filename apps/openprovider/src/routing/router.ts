/**
 * Faz 2, adım 3-4 — yönlendirme ve geçiş bildirimi.
 *
 * Given a prompt, decide which provider and model should serve it:
 *
 *   prompt → mode (keyword rule) → configured target → availability check
 *          → fall through the chain if needed → decision + notices
 *
 * Every step is a table lookup or a string match. Nothing here calls a model,
 * so routing costs nothing and adds no latency, which was the requirement.
 *
 * The SDK has no automatic failover — checked in Faz 0, and again here: there
 * is no retry-across-providers anywhere in `@cline/core`. So the simplest
 * useful thing is implemented instead, exactly as the roadmap allows: walk to
 * the next provider in the configured order and say so out loud.
 */
import type { CredentialSource } from "../provider-settings";
import type { RoutingConfig } from "./config";
import { type Mode, resolveMode } from "./modes";

export interface RouteDecision {
	mode: Mode;
	/** True when the mode came from a keyword match or explicit choice. */
	modeMatched: boolean;
	modeTrigger?: string;
	providerId: string;
	modelId?: string;
	apiKey: string;
	maxOutputTokens?: number;
	/** Messages meant for the user, e.g. why a provider was skipped. */
	notices: string[];
	/** True when the mode's configured provider was not the one chosen. */
	usedFallback: boolean;
}

export class NoProviderAvailableError extends Error {
	constructor(readonly notices: readonly string[]) {
		super(
			`No usable provider. ${notices.join(" ")}`.trim() ||
				"No usable provider is configured.",
		);
	}
}

/** Why a provider was passed over. Kept separate so messages stay consistent. */
type SkipReason = "disabled" | "no-key" | "runtime-failure";

function describeSkip(providerId: string, reason: SkipReason): string {
	switch (reason) {
		case "disabled":
			return `${providerId} is switched off in the config, skipping.`;
		case "no-key":
			return `${providerId} has no API key configured, skipping.`;
		case "runtime-failure":
			return `${providerId} failed earlier in this session, skipping.`;
	}
}

export class Router {
	/**
	 * Providers knocked out during this process — a rate limit or an auth
	 * failure. Not persisted: a quota that reset should not stay punished
	 * across runs.
	 */
	private readonly unavailable = new Map<string, string>();

	constructor(
		private readonly config: RoutingConfig,
		private readonly credentials: CredentialSource,
	) {}

	/**
	 * Records that a provider just failed, so the next route skips it.
	 * Call this from a `run-failed` event — the SDK reports provider errors as
	 * events rather than thrown exceptions (NOTES.md §7).
	 */
	markUnavailable(providerId: string, reason: string): void {
		this.unavailable.set(providerId, reason);
	}

	/** Clears runtime knock-outs, e.g. after waiting out a rate limit. */
	resetAvailability(): void {
		this.unavailable.clear();
	}

	private skipReason(providerId: string): SkipReason | undefined {
		if (this.config.disabled.includes(providerId)) {
			return "disabled";
		}
		if (this.unavailable.has(providerId)) {
			return "runtime-failure";
		}
		if (!this.credentials.get(providerId)) {
			return "no-key";
		}
		return undefined;
	}

	/**
	 * The order to try, for a mode: its configured provider first, then the
	 * fallback chain, with duplicates removed.
	 */
	private candidatesFor(mode: Mode): string[] {
		const preferred = this.config.modes[mode]?.provider;
		const ordered = preferred
			? [preferred, ...this.config.fallback]
			: [...this.config.fallback];
		return [...new Set(ordered)];
	}

	route(prompt: string, explicitMode?: string): RouteDecision {
		const suggestion = resolveMode(prompt, explicitMode);
		const candidates = this.candidatesFor(suggestion.mode);
		const notices: string[] = [];

		if (candidates.length === 0) {
			notices.push(
				`No provider is configured for "${suggestion.mode}" and the fallback list is empty.`,
			);
			throw new NoProviderAvailableError(notices);
		}

		for (const [position, providerId] of candidates.entries()) {
			const reason = this.skipReason(providerId);
			if (reason) {
				const detail = this.unavailable.get(providerId);
				notices.push(
					reason === "runtime-failure" && detail
						? `${describeSkip(providerId, reason)} (${detail})`
						: describeSkip(providerId, reason),
				);
				continue;
			}

			const credentials = this.credentials.get(providerId);
			if (!credentials) {
				// skipReason already covers this; guards the type.
				continue;
			}

			const usedFallback = position > 0;
			if (usedFallback) {
				notices.push(`Switching to ${providerId} for this "${suggestion.mode}" turn.`);
			}

			return {
				mode: suggestion.mode,
				modeMatched: suggestion.matched,
				modeTrigger: suggestion.trigger,
				providerId,
				modelId: this.config.modes[suggestion.mode]?.model ?? credentials.model,
				apiKey: credentials.apiKey,
				maxOutputTokens: this.config.maxOutputTokens,
				notices,
				usedFallback,
			};
		}

		throw new NoProviderAvailableError(notices);
	}

	/** Everything the router currently considers usable. For diagnostics. */
	availableProviders(): string[] {
		return this.credentials
			.listAvailable()
			.filter((id) => !this.skipReason(id));
	}
}
