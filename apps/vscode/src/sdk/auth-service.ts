// Replaces classic src/services/auth/AuthService.ts (see origin/main)
//
// SDK-backed authentication service. Uses ProviderSettingsManager
// (providers.json) as the single source of truth for OAuth-derived provider
// API keys/credentials.
//
// NOTE: Cline-account OAuth (login to app.cline.bot / api.cline.bot, credit
// balance, organizations, remote config) has been removed -- this fork has no
// Cline account backend and never will. This class is kept because it is
// shared OAuth infrastructure for other providers: OpenRouter, Requesty,
// Hicap, and OpenAI Codex all authenticate through it.

import type { OAuthCredentials } from "@cline/core"
import { createOAuthClientCallbacks, loginOpenAICodex } from "@cline/core"
import type { ApiProvider } from "@shared/api"
import { StateManager } from "@/core/storage/StateManager"
import { openAiCodexOAuthManager } from "@/integrations/openai-codex/oauth"
import { fetch } from "@/shared/net"
import { Logger } from "@/shared/services/Logger"
import { openExternal } from "@/utils/env"
import { getProviderSettingsManager } from "./provider-migration"

/** Logout reason kept for interface compatibility with callers (e.g. cross-window sync handlers). */
export enum LogoutReason {
	USER_INITIATED = "user_initiated",
	CROSS_WINDOW_SYNC = "cross_window_sync",
	ERROR_RECOVERY = "error_recovery",
	UNKNOWN = "unknown",
}

// ---------------------------------------------------------------------------
// AuthService
// ---------------------------------------------------------------------------

export class AuthService {
	private static instance: AuthService | null = null

	private constructor() {}

	/**
	 * Gets the singleton instance of AuthService.
	 */
	public static getInstance(): AuthService {
		if (!AuthService.instance) {
			AuthService.instance = new AuthService()
		}
		return AuthService.instance
	}

	/**
	 * Initiate OpenAI Codex OAuth login.
	 */
	async openAiCodexLogin(): Promise<void> {
		try {
			const callbacks = createOAuthClientCallbacks({
				onPrompt: async (prompt) => prompt.defaultValue ?? "",
				openUrl: async (url: string) => {
					await openExternal(url)
				},
				onOpenUrlError: ({ url, error }) => {
					Logger.error(`[SdkAuthService] Failed to open browser for Codex: ${url}:`, error)
				},
			})

			const credentials = await loginOpenAICodex(callbacks)

			// Store Codex credentials in providers.json
			await this.saveCodexCredentials(credentials)
			await openAiCodexOAuthManager.saveCredentials({
				type: "openai-codex",
				access_token: credentials.access,
				refresh_token: credentials.refresh,
				expires: credentials.expires,
				email: credentials.email,
				accountId: credentials.accountId,
			})
		} catch (error) {
			Logger.error("[SdkAuthService] OpenAI Codex OAuth login failed:", error)
			throw error
		}
	}

	/**
	 * Save Codex OAuth credentials to provider settings.
	 */
	private async saveCodexCredentials(credentials: OAuthCredentials): Promise<void> {
		try {
			const manager = getProviderSettingsManager()
			const existing = manager.getProviderSettings("openai-codex")

			manager.saveProviderSettings(
				{
					...(existing ?? { provider: "openai-codex" }),
					provider: "openai-codex",
					auth: {
						accessToken: credentials.access,
						refreshToken: credentials.refresh,
						accountId: credentials.accountId,
					},
				},
				{ tokenSource: "oauth" },
			)
		} catch (error) {
			Logger.error("[SdkAuthService] Failed to save Codex credentials:", error)
		}
	}

	/**
	 * Clear Codex credentials from provider settings.
	 */
	async clearCodexCredentials(): Promise<void> {
		try {
			await openAiCodexOAuthManager.clearCredentials()

			const manager = getProviderSettingsManager()
			const existing = manager.getProviderSettings("openai-codex")
			if (existing) {
				manager.saveProviderSettings(
					{
						...existing,
						provider: "openai-codex",
						auth: undefined,
					},
					{ tokenSource: "manual" },
				)
			}
		} catch (error) {
			Logger.error("[SdkAuthService] Failed to clear Codex credentials:", error)
		}
	}

	// ---- Provider-specific auth callbacks ----

	/**
	 * Shared helper: set a provider's API key and switch both plan/act modes to it.
	 */
	private setProviderApiKey(provider: ApiProvider, apiKeyField: string, apiKey: string): void {
		const stateManager = StateManager.get()
		const currentApiConfiguration = stateManager.getApiConfiguration()
		const updatedConfig = {
			...currentApiConfiguration,
			planModeApiProvider: provider,
			actModeApiProvider: provider,
			[apiKeyField]: apiKey,
		}
		stateManager.setApiConfiguration(updatedConfig)
	}

	/**
	 * Handle OpenRouter OAuth callback.
	 */
	async handleOpenRouterCallback(code: string): Promise<void> {
		let apiKey: string
		try {
			const response = await fetch("https://openrouter.ai/api/v1/auth/keys", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ code }),
			})
			if (!response.ok) {
				throw new Error(`OpenRouter API responded with status ${response.status}`)
			}
			const data = (await response.json()) as { key?: string }
			if (data?.key) {
				apiKey = data.key
			} else {
				throw new Error("Invalid response from OpenRouter API")
			}
		} catch (error) {
			Logger.error("[SdkAuthService] Error exchanging code for API key:", error)
			throw error
		}

		this.setProviderApiKey("openrouter", "openRouterApiKey", apiKey)
	}

	/**
	 * Handle Requesty OAuth callback.
	 */
	async handleRequestyCallback(code: string): Promise<void> {
		this.setProviderApiKey("requesty", "requestyApiKey", code)
	}

	/**
	 * Handle Hicap OAuth callback.
	 */
	async handleHicapCallback(code: string): Promise<void> {
		this.setProviderApiKey("hicap", "hicapApiKey", code)
	}
}
