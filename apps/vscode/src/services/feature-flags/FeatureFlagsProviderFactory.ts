import { Logger } from "@/shared/services/Logger"
import type { FeatureFlagsAndPayloads, IFeatureFlagsProvider } from "./providers/IFeatureFlagsProvider"

/**
 * Supported feature flags provider types
 *
 * NOTE: PostHog feature flags (Cline's first-party data.cline.bot proxy) has
 * been removed -- this fork has no PostHog project of its own and must never
 * query Cline's for feature flags. Only the no-op provider remains, so all
 * feature flags resolve to their default/off state.
 */
type FeatureFlagsProviderType = "no-op"

/**
 * Configuration for feature flags providers
 */
export interface FeatureFlagsProviderConfig {
	type: FeatureFlagsProviderType
}

/**
 * Factory class for creating feature flags providers
 */
export class FeatureFlagsProviderFactory {
	/**
	 * Creates a feature flags provider based on the provided configuration
	 * @param _config Configuration for the feature flags provider
	 * @returns IFeatureFlagsProvider instance
	 */
	public static createProvider(_config: FeatureFlagsProviderConfig): IFeatureFlagsProvider {
		return new NoOpFeatureFlagsProvider()
	}

	/**
	 * Gets the default feature flags provider configuration
	 * @returns Default no-op configuration
	 */
	public static getDefaultConfig(): FeatureFlagsProviderConfig {
		return { type: "no-op" }
	}
}

/**
 * No-operation feature flags provider for when feature flags are disabled
 * or for testing purposes
 */
class NoOpFeatureFlagsProvider implements IFeatureFlagsProvider {
	async getAllFlagsAndPayloads(_: { flagKeys?: string[] }): Promise<FeatureFlagsAndPayloads | undefined> {
		return {}
	}

	public isEnabled(): boolean {
		return true
	}

	public getSettings() {
		return {
			enabled: true,
			timeout: 1000,
		}
	}

	public async dispose(): Promise<void> {
		Logger.info("[NoOpFeatureFlagsProvider] Disposing")
	}
}
