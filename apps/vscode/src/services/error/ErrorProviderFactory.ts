import { Logger } from "@/shared/services/Logger"
import { ClineError } from "./ClineError"
import { IErrorProvider } from "./providers/IErrorProvider"

/**
 * Supported error provider types
 *
 * NOTE: PostHog error tracking (Cline's first-party data.cline.bot proxy) has
 * been removed -- this fork has no PostHog project of its own and must never
 * send error data to Cline's. Only the no-op provider remains.
 */
type ErrorProviderType = "no-op"

/**
 * Configuration for error providers
 */
export interface ErrorProviderConfig {
	type: ErrorProviderType
}

/**
 * Factory class for creating error providers
 */
export class ErrorProviderFactory {
	/**
	 * Creates an error provider based on the provided configuration
	 * @param _config Configuration for the error provider
	 * @returns IErrorProvider instance
	 */
	public static async createProvider(_config: ErrorProviderConfig): Promise<IErrorProvider> {
		return new NoOpErrorProvider()
	}

	/**
	 * Gets the default error provider configuration
	 * @returns Default no-op configuration
	 */
	public static getDefaultConfig(): ErrorProviderConfig {
		return { type: "no-op" }
	}
}

/**
 * No-operation error provider for when error logging is disabled
 * or for testing purposes
 */
class NoOpErrorProvider implements IErrorProvider {
	async captureException(error: Error | ClineError, properties?: Record<string, unknown>): Promise<void> {
		Logger.error("[NoOpErrorProvider] captureException called", { error: error.message || String(error), properties })
	}

	public logException(error: Error | ClineError, _properties?: Record<string, unknown>): void {
		// Use Logger.error directly to avoid potential infinite recursion through Logger
		Logger.error("[NoOpErrorProvider]", error.message || String(error))
	}

	public logMessage(
		message: string,
		level?: "error" | "warning" | "log" | "debug" | "info",
		properties?: Record<string, unknown>,
	): void {
		Logger.log("[NoOpErrorProvider]", { message, level, properties })
	}

	public isEnabled(): boolean {
		return true
	}

	public getSettings() {
		return {
			enabled: true,
			hostEnabled: true,
			level: "all" as const,
		}
	}

	public async dispose(): Promise<void> {
		Logger.info("[NoOpErrorProvider] Disposing")
	}
}
