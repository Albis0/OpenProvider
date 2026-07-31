/**
 * OpenProvider — provider-agnostic coding agent layer on top of `@cline/sdk`.
 *
 * The one thing most callers need:
 *
 * ```ts
 * const session = await OpenProviderSession.create({ projectDir })
 * const result = await session.run("fix the failing test")
 * console.log(result.summary)
 * ```
 *
 * The three pieces underneath are exported too, for using one without the
 * others.
 */
export * from "./context";
export {
	type BeforeModelHook,
	composeBeforeModel,
	createOutputCapTransform,
	type RequestPatch,
	type RequestTransform,
	type TransformContext,
} from "./hooks/pipeline";
export {
	type CredentialSource,
	createCredentialSource,
	describe as describeProvider,
	MissingProviderError,
	type ProviderCredentials,
	type ResolvedProvider,
	resolveProvider,
} from "./provider-settings";
export * from "./providers";
export * from "./quota";
export * from "./routing";
export {
	type AgentFactory,
	type AgentFactoryInput,
	type AgentRunOutcome,
	defaultAgentFactory,
	OpenProviderSession,
	type SessionAgent,
	type SessionOptions,
	type SessionRunOptions,
	type SessionRunResult,
} from "./session";
export * from "./verify";
