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
	assessComplexity,
	type ChainPlan,
	type ComplexitySignal,
	describeChain,
	planChain,
	type PlanChainOptions,
} from "./chain";
export {
	CONFIG_FILENAME,
	EMPTY_CONFIG,
	EMPTY_ROLE_CONFIG,
	loadConfig,
	type LoadedConfig,
	type ModeTarget,
	parseConfig,
	parseRoleConfig,
	type RoleConfig,
	type RoleTarget,
	type RoutingConfig,
	saveConfig,
	suggestConfig,
} from "./config";
export {
	type Handoff,
	handoffFiles,
	type HandoffStep,
	parseHandoff,
	renderHandoff,
	renderReviewPrompt,
} from "./handoff";
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
	CORE_ROLE,
	isRole,
	type Role,
	ROLE_PROMPTS,
	ROLES,
} from "./roles";
export {
	NoProviderAvailableError,
	type RouteDecision,
	Router,
} from "./router";
export {
	classifyError,
	isRateLimitError,
	parseRetryDelay,
	type RateLimitInfo,
} from "./rate-limit";
export {
	autoDecide,
	describeSwitch,
	MAX_WAIT_MS,
	resolveDecider,
	resolveWaitMs,
	stopDecide,
	type SwitchDecider,
	type SwitchDecision,
	type SwitchPolicy,
	type SwitchRequest,
} from "./switch-policy";
