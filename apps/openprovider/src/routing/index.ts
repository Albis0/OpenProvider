/**
 * OpenProvider routing — rule-based provider selection, no classifier call.
 *
 * ```ts
 * const { config } = await loadConfig(process.cwd())
 * const router = new Router(config, createCredentialSource())
 * const route = router.route("plan the quota indicator")
 * // route.mode === "plan", route.providerId === whatever plan maps to
 * ```
 */
export {
	CONFIG_FILENAME,
	EMPTY_CONFIG,
	loadConfig,
	type LoadedConfig,
	type ModeTarget,
	parseConfig,
	type RoutingConfig,
	saveConfig,
	suggestConfig,
} from "./config";
export {
	DEFAULT_MODE,
	isMode,
	type Mode,
	MODES,
	type ModeSuggestion,
	resolveMode,
	suggestMode,
} from "./modes";
export {
	NoProviderAvailableError,
	type RouteDecision,
	Router,
} from "./router";
