/**
 * PostHog (Cline's first-party data.cline.bot proxy) has been removed from
 * this fork's telemetry, error, and feature-flags factories entirely -- this
 * fork has no PostHog project of its own and must never send data to
 * Cline's. These factories now always return no-op providers, regardless of
 * self-hosted mode, so these tests just assert the always-no-op behavior.
 */

import { describe, it } from "bun:test"

import * as assert from "assert"
import { ErrorProviderFactory } from "../error/ErrorProviderFactory"
import { FeatureFlagsProviderFactory } from "../feature-flags/FeatureFlagsProviderFactory"

describe("PostHog disabled - always no-op", () => {
	describe("FeatureFlagsProviderFactory", () => {
		it("should always return no-op config", () => {
			const config = FeatureFlagsProviderFactory.getDefaultConfig()

			assert.strictEqual(config.type, "no-op", "Should always return no-op type")
		})

		it("should create NoOp provider", () => {
			const config = FeatureFlagsProviderFactory.getDefaultConfig()
			const provider = FeatureFlagsProviderFactory.createProvider(config)

			// NoOp provider should always be enabled (returns true for isEnabled)
			assert.strictEqual(provider.isEnabled(), true, "NoOp provider should report as enabled")
		})
	})

	describe("ErrorProviderFactory", () => {
		it("should always return no-op config", () => {
			const config = ErrorProviderFactory.getDefaultConfig()

			assert.strictEqual(config.type, "no-op", "Should always return no-op type")
		})

		it("should create NoOp provider", async () => {
			const config = ErrorProviderFactory.getDefaultConfig()
			const provider = await ErrorProviderFactory.createProvider(config)

			// NoOp provider should always be enabled
			assert.strictEqual(provider.isEnabled(), true, "NoOp provider should report as enabled")

			await provider.dispose()
		})
	})

	describe("Integration - all factories are no-op", () => {
		it("should return no-op for all factories", () => {
			const featureFlagsConfig = FeatureFlagsProviderFactory.getDefaultConfig()
			const errorConfig = ErrorProviderFactory.getDefaultConfig()

			assert.strictEqual(featureFlagsConfig.type, "no-op", "FeatureFlags should always be no-op")
			assert.strictEqual(errorConfig.type, "no-op", "Error provider should always be no-op")
		})
	})
})
