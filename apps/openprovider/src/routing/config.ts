/**
 * Faz 2, adım 3 — provider config sistemi.
 *
 * A small JSON file says which provider and model each mode should use, and
 * in what order to fall through when one is unavailable.
 *
 * **No credential ever goes in this file.** It holds provider *ids* only.
 * Keys stay where the SDK already keeps them, in
 * `~/.cline/data/settings/providers.json` at mode 0600, and are read through
 * `ProviderSettingsManager`. That keeps one owner for secrets and means this
 * file is safe to commit, diff and share.
 *
 * The SDK's own provider layer does all the adapter work, so there is none
 * here — this is routing policy, nothing more.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_MODE, isMode, type Mode, MODES } from "./modes";

export const CONFIG_FILENAME = "openprovider.config.json";

export interface ModeTarget {
	/** Provider id as the SDK knows it, e.g. "groq", "gemini". */
	provider: string;
	/** Model id. Falls back to whatever the provider has stored. */
	model?: string;
}

export interface RoutingConfig {
	defaultMode: Mode;
	modes: Partial<Record<Mode, ModeTarget>>;
	/** Providers to try, in order, when a mode's provider cannot serve. */
	fallback: string[];
	/** Providers the user has switched off by hand. Skipped entirely. */
	disabled: string[];
	/**
	 * Output cap applied to every request. Free tiers count reserved output
	 * against the same per-minute quota as input, so leaving this unset can
	 * exhaust a whole minute's budget on a one-line prompt (see NOTES.md §6).
	 */
	maxOutputTokens?: number;
}

export const EMPTY_CONFIG: RoutingConfig = {
	defaultMode: DEFAULT_MODE,
	modes: {},
	fallback: [],
	disabled: [],
	maxOutputTokens: 4096,
};

function asStringArray(value: unknown): string[] {
	return Array.isArray(value)
		? value.filter((item): item is string => typeof item === "string")
		: [];
}

function parseModeTarget(value: unknown): ModeTarget | undefined {
	if (!value || typeof value !== "object") {
		return undefined;
	}
	const record = value as Record<string, unknown>;
	if (typeof record.provider !== "string" || record.provider.length === 0) {
		return undefined;
	}
	return {
		provider: record.provider,
		model: typeof record.model === "string" ? record.model : undefined,
	};
}

/**
 * Parses a config object, dropping anything malformed rather than throwing.
 * A typo in one mode should not stop the other three from working.
 */
export function parseConfig(raw: unknown): RoutingConfig {
	if (!raw || typeof raw !== "object") {
		return { ...EMPTY_CONFIG };
	}
	const record = raw as Record<string, unknown>;

	const modes: Partial<Record<Mode, ModeTarget>> = {};
	const rawModes = record.modes;
	if (rawModes && typeof rawModes === "object") {
		for (const [key, value] of Object.entries(rawModes)) {
			if (!isMode(key)) {
				continue;
			}
			const target = parseModeTarget(value);
			if (target) {
				modes[key] = target;
			}
		}
	}

	const defaultMode =
		typeof record.defaultMode === "string" && isMode(record.defaultMode)
			? record.defaultMode
			: DEFAULT_MODE;

	const maxOutputTokens =
		typeof record.maxOutputTokens === "number" && record.maxOutputTokens > 0
			? Math.floor(record.maxOutputTokens)
			: EMPTY_CONFIG.maxOutputTokens;

	return {
		defaultMode,
		modes,
		fallback: asStringArray(record.fallback),
		disabled: asStringArray(record.disabled),
		maxOutputTokens,
	};
}

export interface LoadedConfig {
	config: RoutingConfig;
	/** Absolute path the config came from, or undefined when defaults were used. */
	source?: string;
}

/** Reads the config from `dir`, returning defaults when it does not exist. */
export async function loadConfig(dir: string): Promise<LoadedConfig> {
	const filePath = path.join(dir, CONFIG_FILENAME);
	try {
		const text = await readFile(filePath, "utf8");
		return { config: parseConfig(JSON.parse(text)), source: filePath };
	} catch {
		return { config: { ...EMPTY_CONFIG } };
	}
}

export async function saveConfig(
	dir: string,
	config: RoutingConfig,
): Promise<string> {
	const filePath = path.join(dir, CONFIG_FILENAME);
	await writeFile(filePath, `${JSON.stringify(config, null, "\t")}\n`, "utf8");
	return filePath;
}

/**
 * Builds a starting config from providers that already have credentials.
 *
 * Ordering is by preference for free-tier work: providers with roomier limits
 * first, so the fallback chain degrades sensibly rather than alphabetically.
 */
export function suggestConfig(availableProviders: readonly string[]): RoutingConfig {
	const preference = ["gemini", "cerebras", "groq", "openrouter", "nvidia"];
	const ordered = [
		...preference.filter((id) => availableProviders.includes(id)),
		...availableProviders.filter((id) => !preference.includes(id)),
	];

	if (ordered.length === 0) {
		return { ...EMPTY_CONFIG };
	}

	// Reasoning-heavy work goes to the first choice; mechanical work to the
	// second when there is one, so a rate limit on either does not stall
	// everything at once.
	const primary = ordered[0] as string;
	const secondary = (ordered[1] ?? primary) as string;

	const byMode: Record<Mode, string> = {
		plan: primary,
		review: primary,
		code: secondary,
		docs: secondary,
	};

	const modes: Partial<Record<Mode, ModeTarget>> = {};
	for (const mode of MODES) {
		modes[mode] = { provider: byMode[mode] };
	}

	return {
		defaultMode: DEFAULT_MODE,
		modes,
		fallback: ordered,
		disabled: [],
		maxOutputTokens: 4096,
	};
}
