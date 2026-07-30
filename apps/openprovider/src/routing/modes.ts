/**
 * Faz 2, adım 1-2 — mod tanımları ve mod önerisi.
 *
 * A mode says what kind of work a turn is, which is what the router uses to
 * pick a model. The user can always state it. When they do not, the mode is
 * guessed from keywords in the prompt.
 *
 * The guess is deliberately a regex match and nothing more. Asking a model
 * "what kind of task is this?" would add a network round trip and a bill to
 * every single turn, which is the cost the whole project exists to avoid.
 * A wrong guess is cheap — it picks a different model, not a wrong answer —
 * so a fast approximate rule beats a slow accurate one here.
 */

export const MODES = ["plan", "code", "docs", "review"] as const;
export type Mode = (typeof MODES)[number];

export const DEFAULT_MODE: Mode = "code";

export function isMode(value: string): value is Mode {
	return (MODES as readonly string[]).includes(value);
}

/**
 * Keywords per mode, Turkish and English.
 *
 * Turkish matters: prompts on this project are written in Turkish, and a
 * keyword table that only knows English silently degrades to always returning
 * the default. Turkish is agglutinative, so stems are matched rather than
 * whole words — "planla", "planlama", "planlayalım" all start with "planl".
 */
const MODE_PATTERNS: Record<Mode, RegExp> = {
	plan: /\b(plan|planl\w*|tasarla\w*|tasarım|mimari|architect\w*|design|strateji|yaklaşım|approach|nasıl\s+yapmal\w*|how\s+should\s+we)\b/iu,
	docs: /\b(docs?|doküman\w*|dokuman\w*|belge\w*|readme|changelog|yorum\s+ekle|comment|açıkla\w*|acikla\w*|explain|anlat\w*|write\s+up)\b/iu,
	review: /\b(review|incele\w*|gözden\s+geçir\w*|gozden\s+gecir\w*|denetle\w*|audit|refactor|kod\s+kalites\w*|code\s+smell|güvenlik\s+aç\w*)\b/iu,
	code: /\b(yaz|yazar\w*|kodla\w*|implement\w*|düzelt\w*|duzelt\w*|fix|bug|hata|test|debug|ekle|refactor\w*|çalışmıyor|calismiyor|patl\w*|broken)\b/iu,
};

/**
 * Checked in this order. `code` is last because its vocabulary ("ekle",
 * "test", "fix") shows up inside planning and review requests too, so a more
 * specific mode should win when both match.
 */
const MATCH_ORDER: readonly Mode[] = ["plan", "review", "docs", "code"];

export interface ModeSuggestion {
	mode: Mode;
	/** True when a keyword matched; false when the default was used. */
	matched: boolean;
	/** The word that decided it, for showing the user why. */
	trigger?: string;
}

/** Guesses a mode from a prompt. No model is called. */
export function suggestMode(prompt: string): ModeSuggestion {
	for (const mode of MATCH_ORDER) {
		const match = MODE_PATTERNS[mode].exec(prompt);
		if (match) {
			return { mode, matched: true, trigger: match[0] };
		}
	}
	return { mode: DEFAULT_MODE, matched: false };
}

/**
 * Resolves the mode for a turn: an explicit choice always wins, otherwise the
 * keyword guess runs.
 */
export function resolveMode(
	prompt: string,
	explicit?: string,
): ModeSuggestion {
	if (explicit && isMode(explicit)) {
		return { mode: explicit, matched: true, trigger: "explicit" };
	}
	return suggestMode(prompt);
}
