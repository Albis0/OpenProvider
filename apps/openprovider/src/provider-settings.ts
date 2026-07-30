/**
 * Credential resolution for the Faz 0 spikes.
 *
 * Reads whatever provider the user already configured through Cline's own
 * store (`~/.cline/data/settings/providers.json`) via the SDK's
 * `ProviderSettingsManager`. Nothing here writes a key, and no key is ever
 * printed — see `describe()`, which reports only the length.
 *
 * An env var wins when set, so a throwaway key can be used without touching
 * the stored settings:
 *
 *   OPENPROVIDER_PROVIDER=gemini OPENPROVIDER_API_KEY=... bun run hello
 */
import { ProviderSettingsManager } from "@cline/sdk";

export interface ResolvedProvider {
	providerId: string;
	modelId: string;
	apiKey: string;
	/** Where the credential came from, for logging. */
	source: "env" | "cline-settings";
}

export class MissingProviderError extends Error {}

/**
 * `ProviderSettings` is a union across every provider shape, so `model` and
 * `apiKey` are not on the common base. Both are plain optional strings on the
 * providers we care about (groq, gemini, cerebras, openrouter, nvidia).
 */
function readStringField(
	settings: unknown,
	field: "model" | "apiKey",
): string | undefined {
	if (!settings || typeof settings !== "object") {
		return undefined;
	}
	const value = (settings as Record<string, unknown>)[field];
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function resolveProvider(): ResolvedProvider {
	const manager = new ProviderSettingsManager();

	// Explicit provider request, or whichever the user last used in Cline.
	const requestedId = process.env.OPENPROVIDER_PROVIDER?.trim();
	const stored = requestedId
		? manager.getProviderSettings(requestedId)
		: manager.getLastUsedProviderSettings();

	const providerId = requestedId ?? stored?.provider;
	if (!providerId) {
		throw new MissingProviderError(
			"No provider configured. Set OPENPROVIDER_PROVIDER + OPENPROVIDER_API_KEY, " +
				"or configure one in the OpenProvider/Cline extension first.",
		);
	}

	const envKey = process.env.OPENPROVIDER_API_KEY?.trim();
	const storedKey = readStringField(stored, "apiKey");
	const apiKey = envKey || storedKey;
	if (!apiKey) {
		throw new MissingProviderError(
			`Provider "${providerId}" has no API key. Set OPENPROVIDER_API_KEY, ` +
				`or add the key in the extension's settings.`,
		);
	}

	const modelId =
		process.env.OPENPROVIDER_MODEL?.trim() || readStringField(stored, "model");
	if (!modelId) {
		throw new MissingProviderError(
			`Provider "${providerId}" has no model selected. Set OPENPROVIDER_MODEL.`,
		);
	}

	return {
		providerId,
		modelId,
		apiKey,
		source: envKey ? "env" : "cline-settings",
	};
}

/** Safe one-line summary. Never includes the key itself. */
export function describe(resolved: ResolvedProvider): string {
	return `${resolved.providerId} / ${resolved.modelId} (key: ${resolved.apiKey.length} chars from ${resolved.source})`;
}
