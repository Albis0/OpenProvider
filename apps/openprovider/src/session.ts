/**
 * Faz 4 — birleşik oturum.
 *
 * v1 produced three working pieces that had to be wired together by hand:
 * routing picked a provider, the context engine chose files, verification ran
 * the tests. This is the one object that uses all three.
 *
 *   prompt
 *     → route   (mode → provider, skipping unavailable ones)
 *     → context (select files, inject a repo map)
 *     → run     (the SDK agent)
 *     → verify  (project's own build/test, one guided retry)
 *     → report
 *
 * A failed provider is fed straight back into the router, so a retry lands
 * somewhere else instead of repeating the same failure — the part that only
 * becomes possible once the pieces share an owner.
 */
import type { AgentTool } from "@cline/agents";
import { Agent } from "@cline/sdk";
import { ContextEngine } from "./context";
import { createContextTransform } from "./context/hook";
import type { ScoredFile } from "./context/score";
import {
	type BeforeModelHook,
	composeBeforeModel,
	createOutputCapTransform,
	type RequestTransform,
} from "./hooks/pipeline";
import { type CredentialSource, createCredentialSource } from "./provider-settings";
import { createSanitizerTransform, resolveOutputCap } from "./providers";
import {
	observeRateLimits,
	type QuotaSnapshot,
	QuotaTracker,
	type RateLimitObserver,
	UsageStore,
} from "./quota";
import {
	type ChainPlan,
	classifyError,
	CORE_ROLE,
	describeChain,
	describeSwitch,
	type Handoff,
	loadConfig,
	type Mode,
	parseHandoff,
	planChain,
	renderHandoff,
	renderReviewPrompt,
	resolveDecider,
	resolveWaitMs,
	type Role,
	ROLE_PROMPTS,
	type RouteDecision,
	Router,
	type RoutingConfig,
	suggestConfig,
	type SwitchDecider,
	type SwitchPolicy,
	type SwitchRequest,
} from "./routing";
import { runVerifiedTask, verify, type VerificationReport } from "./verify";

export interface AgentRunOutcome {
	text: string;
	/** Set when the provider or runtime failed. */
	error?: string;
	/** Real token counts from the provider, when the run reported them. */
	usage?: { inputTokens?: number; outputTokens?: number };
}

export interface SessionAgent {
	run(prompt: string): Promise<AgentRunOutcome>;
}

export interface AgentFactoryInput {
	providerId: string;
	modelId?: string;
	apiKey: string;
	beforeModel: BeforeModelHook;
	// biome-ignore lint/suspicious/noExplicitAny: tool input/output types vary
	// per tool, so a concrete AgentTool<X, Y> is not assignable to
	// AgentTool<unknown, unknown>. The SDK's own AgentRuntimeConfig does this.
	tools?: readonly AgentTool<any, any>[];
	maxIterations: number;
}

/**
 * Builds the thing that actually talks to a model. Swappable so the session
 * can be exercised end to end without a network or a quota.
 */
export type AgentFactory = (input: AgentFactoryInput) => SessionAgent;

export const defaultAgentFactory: AgentFactory = (input) => {
	const agent = new Agent({
		providerId: input.providerId,
		modelId: input.modelId ?? "",
		apiKey: input.apiKey,
		maxIterations: input.maxIterations,
		tools: input.tools,
		hooks: { beforeModel: input.beforeModel },
	});

	return {
		async run(prompt: string): Promise<AgentRunOutcome> {
			const result = await agent.run(prompt);
			// `run()` never throws; a failure shows up as status + error.
			return {
				text: result.outputText ?? "",
				error:
					result.status === "failed"
						? (result.error?.message ?? "run failed")
						: undefined,
				usage: {
					inputTokens: result.usage?.inputTokens,
					outputTokens: result.usage?.outputTokens,
				},
			};
		},
	};
};

export interface SessionOptions {
	/** Repository the task operates on. Verification runs here. */
	projectDir: string;
	/** Directory holding `openprovider.config.json`. Defaults to `projectDir`. */
	configDir?: string;
	/** Repository to index for context. Defaults to `projectDir`. */
	contextRoot?: string;
	/** Tools handed to the agent. Without these it can only talk. */
	// biome-ignore lint/suspicious/noExplicitAny: tool input/output types vary
	// per tool, so a concrete AgentTool<X, Y> is not assignable to
	// AgentTool<unknown, unknown>. The SDK's own AgentRuntimeConfig does this.
	tools?: readonly AgentTool<any, any>[];
	maxIterations?: number;
	credentials?: CredentialSource;
	agentFactory?: AgentFactory;
	onEvent?: (message: string) => void;
	/** Skips repository indexing. Useful in tests and for non-code tasks. */
	disableContext?: boolean;
	/** Records token usage per provider. Default true. */
	trackQuota?: boolean;
	/**
	 * Wraps the global `fetch` to read the provider's own `x-ratelimit-*`
	 * headers, which are authoritative where local counting is only an
	 * estimate. Off by default because it is a global patch — the `Agent` path
	 * offers no per-call seam. Call `dispose()` to remove it.
	 */
	observeRateLimitHeaders?: boolean;
	/** Overrides where usage is persisted. Used by tests. */
	usageDir?: string;
	/**
	 * What to do when a provider fails mid-run. Defaults to `"ask"`, which
	 * calls `onProviderSwitch`; with no callback it degrades to `"auto"`,
	 * since stalling on a question nobody can answer is worse than choosing.
	 */
	switchPolicy?: SwitchPolicy;
	/** Consulted before switching providers, when the policy is `"ask"`. */
	onProviderSwitch?: SwitchDecider;
	/** Injectable delay, so tests do not actually wait. */
	sleep?: (ms: number) => Promise<void>;
}

function defaultSleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface SessionRunOptions {
	/** Overrides the keyword-derived mode. */
	mode?: string;
	/** Runs build/test afterwards. Default true. */
	verify?: boolean;
	/** Files to inject at most. Default 8. */
	contextLimit?: number;
	/**
	 * Runs the full role chain even when the request looks like a single edit.
	 * For a caller who knows the keyword table guessed wrong.
	 */
	forceChain?: boolean;
}

/** What one seat in the chain did. */
export interface RoleRunRecord {
	role: Role;
	/** Provider that served the final attempt for this role. */
	providerId: string;
	modelId?: string;
	/** Every provider this role tried, in order. Longer than 1 means failover. */
	providersUsed: string[];
	ok: boolean;
	output: string;
	error?: string;
}

export interface SessionRunResult {
	ok: boolean;
	mode: Mode;
	/** Provider that served the final attempt. */
	providerId: string;
	modelId?: string;
	/** One entry per attempt, in order. */
	providersUsed: string[];
	usedFallback: boolean;
	/** Routing messages: why a provider was skipped, what it switched to. */
	notices: string[];
	selectedFiles: ScoredFile[];
	outputs: string[];
	attempts: number;
	retried: boolean;
	verification?: VerificationReport;
	summary: string;
	/** Roles that ran, and why that set. Present even for a solo executor. */
	chain?: ChainPlan;
	/** One entry per role that ran, in order. */
	roleRuns?: RoleRunRecord[];
	/** The planner's parsed plan, when a planner ran. */
	plan?: Handoff;
	/** The reviewer's verdict, when a reviewer ran. */
	review?: string;
}

export class OpenProviderSession {
	private constructor(
		private readonly options: SessionOptions,
		private readonly router: Router,
		readonly config: RoutingConfig,
		private readonly engine: ContextEngine | undefined,
		private readonly agentFactory: AgentFactory,
		private readonly tracker: QuotaTracker | undefined,
		private readonly rateLimitObserver: RateLimitObserver | undefined,
	) {}

	static async create(
		options: SessionOptions,
	): Promise<OpenProviderSession> {
		const credentials = options.credentials ?? createCredentialSource();
		const configDir = options.configDir ?? options.projectDir;

		let { config } = await loadConfig(configDir);
		if (config.fallback.length === 0 && Object.keys(config.modes).length === 0) {
			// No config on disk: derive one from whatever has credentials, so a
			// first run works instead of failing on an empty routing table.
			config = suggestConfig(credentials.listAvailable());
			options.onEvent?.("no config found — using providers that have keys");
		}

		let engine: ContextEngine | undefined;
		if (!options.disableContext) {
			engine = await ContextEngine.create({
				root: options.contextRoot ?? options.projectDir,
				onProgress: (message) => options.onEvent?.(`context: ${message}`),
			});
			options.onEvent?.(
				`context: ${engine.stats.parsed} files, ${engine.stats.edges} edges, ${engine.stats.buildMs}ms`,
			);
		}

		// The header observer patches global fetch, so it is opt-in and must be
		// installed before any request goes out.
		const observer = options.observeRateLimitHeaders
			? observeRateLimits({
					onSnapshot: (snapshot) =>
						options.onEvent?.(
							`quota: ${snapshot.providerId} reported ${snapshot.tokensRemaining ?? "?"} tokens remaining`,
						),
				})
			: undefined;

		const tracker =
			options.trackQuota === false
				? undefined
				: new QuotaTracker({
						store: new UsageStore({ dir: options.usageDir }),
						observer,
					});

		return new OpenProviderSession(
			options,
			new Router(config, credentials),
			config,
			engine,
			options.agentFactory ?? defaultAgentFactory,
			tracker,
			observer,
		);
	}

	/**
	 * Usage and remaining allowance per provider.
	 *
	 * Defaults to every provider with credentials, so a caller does not have to
	 * know which ones exist.
	 */
	async quota(providerIds?: readonly string[]): Promise<QuotaSnapshot[]> {
		if (!this.tracker) {
			return [];
		}
		const ids =
			providerIds ??
			[...new Set([...this.config.fallback, ...Object.values(this.config.modes).map((target) => target.provider)])];
		return this.tracker.snapshots(ids);
	}

	/** Removes the global fetch wrapper, if one was installed. */
	dispose(): void {
		this.rateLimitObserver?.uninstall();
	}

	/** Providers the router still considers usable. */
	availableProviders(): string[] {
		return this.router.availableProviders();
	}

	/** Clears runtime knock-outs, e.g. after a rate limit window passes. */
	resetAvailability(): void {
		this.router.resetAvailability();
	}

	private buildHook(
		route: RouteDecision,
		runOptions: SessionRunOptions,
		selected: { files: ScoredFile[] },
	): BeforeModelHook {
		const transforms: RequestTransform[] = [];

		if (this.engine) {
			transforms.push(
				createContextTransform(this.engine, {
					limit: runOptions.contextLimit ?? 8,
					onSelect: (files) => {
						selected.files = files;
						this.options.onEvent?.(
							`context: selected ${files.length} file(s): ${files
								.slice(0, 4)
								.map((file) => file.path)
								.join(", ")}`,
						);
					},
				}),
			);
		}

		// The measured per-provider default fills in when config says nothing;
		// leaving it unset is only safe on providers that do not bill reserved
		// output against the input quota.
		const cap = resolveOutputCap(route.providerId, route.maxOutputTokens);
		if (cap !== undefined) {
			transforms.push(createOutputCapTransform(cap));
		}

		// Last, so it cleans the final message list rather than a prefix of it.
		const sanitizer = createSanitizerTransform({
			providerId: route.providerId,
			onSanitize: (summary) => this.options.onEvent?.(`sanitize: ${summary}`),
		});
		if (sanitizer) {
			transforms.push(sanitizer);
		}

		return composeBeforeModel(transforms, {
			onError: (name, error) =>
				this.options.onEvent?.(`hook "${name}" failed: ${String(error)}`),
		});
	}

	async run(
		prompt: string,
		runOptions: SessionRunOptions = {},
	): Promise<SessionRunResult> {
		const shouldVerify = runOptions.verify ?? true;
		const selected = { files: [] as ScoredFile[] };
		const notices: string[] = [];
		const providersUsed: string[] = [];
		let lastRoute: RouteDecision | undefined;

		const decider = resolveDecider(
			this.options.switchPolicy ?? "ask",
			this.options.onProviderSwitch,
		);
		const sleep = this.options.sleep ?? defaultSleep;

		// Routing happens per attempt, not once, and a failure raises a decision
		// rather than silently moving on: the user chose a model for a reason.
		//
		// `role` makes the failover per-seat: the router is asked for that
		// role's own candidate chain, so a planner that runs out of quota moves
		// to the planner's next provider without disturbing where the executor
		// will go. Roles frequently sit on different providers precisely so one
		// exhausted quota does not stall the whole task.
		const runAttempt = async (
			attemptPrompt: string,
			role?: Role,
			roleProvidersUsed?: string[],
		): Promise<AgentRunOutcome> => {
			let waitsUsed = 0;
			// Bounded by the number of providers, so a chain of failures cannot
			// cycle forever.
			let switchesLeft = Math.max(1, this.config.fallback.length + 1);

			for (;;) {
				const route = this.router.route(prompt, runOptions.mode, role);
				lastRoute = route;
				providersUsed.push(route.providerId);
				roleProvidersUsed?.push(route.providerId);
				for (const notice of route.notices) {
					if (!notices.includes(notice)) {
						notices.push(notice);
					}
				}
				this.options.onEvent?.(
					`routing: ${role ? `${role} ` : ""}mode "${route.mode}" -> ${
						route.providerId
					}${route.modelId ? ` / ${route.modelId}` : ""}`,
				);

				const agent = this.agentFactory({
					providerId: route.providerId,
					modelId: route.modelId,
					apiKey: route.apiKey,
					beforeModel: this.buildHook(route, runOptions, selected),
					tools: this.options.tools,
					maxIterations: this.options.maxIterations ?? 6,
				});

				// The role instruction rides on the prompt rather than a system
				// message: `AgentFactoryInput` has no `systemPrompt` seam, and
				// adding one would change the factory contract for every existing
				// caller to serve a feature that is off by default.
				const outcome = await agent.run(
					role ? `${ROLE_PROMPTS[role]}\n\n${attemptPrompt}` : attemptPrompt,
				);
				// Recorded even on failure: a rejected request can still consume
				// quota, and a provider that fails repeatedly is worth seeing.
				await this.tracker?.record(
					route.providerId,
					outcome.usage,
					!outcome.error,
				);

				if (!outcome.error) {
					return outcome;
				}

				const info = classifyError(outcome.error);
				const request: SwitchRequest = {
					from: route.providerId,
					to: this.router.peekAlternative(route.mode, route.providerId, role),
					reason: info.summary,
					isRateLimit: info.isRateLimit,
					retryAfterMs: info.retryAfterMs,
					quota: await this.tracker?.snapshot(route.providerId),
					timesAsked: waitsUsed,
				};

				const decision = await decider(request);
				this.options.onEvent?.(
					`${describeSwitch(request)}\n  decision: ${decision}`,
				);
				notices.push(`${request.from}: ${info.summary} → ${decision}`);

				if (decision === "abort") {
					return outcome;
				}

				if (decision === "wait") {
					const waitMs = resolveWaitMs(request);
					if (waitMs !== undefined && waitsUsed === 0) {
						waitsUsed += 1;
						this.options.onEvent?.(
							`waiting ${Math.ceil(waitMs / 1000)}s for ${route.providerId}`,
						);
						await sleep(waitMs);
						continue;
					}
					// Nothing to wait for, or we already waited once. Waiting again
					// on an unstated delay is just stalling, so treat it as a switch.
					this.options.onEvent?.(
						"cannot wait again — switching instead",
					);
				}

				this.router.markUnavailable(
					route.providerId,
					outcome.error.slice(0, 80),
				);
				switchesLeft -= 1;
				if (switchesLeft <= 0 || !request.to) {
					return outcome;
				}
			}
		};

		const chain = planChain(prompt, this.config.roleConfig, {
			force: runOptions.forceChain,
		});
		this.options.onEvent?.(describeChain(chain));

		const roleRuns: RoleRunRecord[] = [];
		let plan: Handoff | undefined;
		let review: string | undefined;

		/**
		 * Runs the chain once and returns what the executor produced.
		 *
		 * The executor's output is what comes back, not the reviewer's: the
		 * reviewer's job is to comment on work, and returning its commentary as
		 * the task result would replace the actual answer with a critique of it.
		 * The verdict is carried separately, in `review`.
		 *
		 * A failing planner or reviewer does not abort the task. Both are
		 * advisory — losing the plan degrades the executor to the single-agent
		 * behaviour that was the default until now, which is a worse turn but
		 * still a real one. Only the executor failing is a failed task.
		 */
		const runChain = async (
			attemptPrompt: string,
		): Promise<AgentRunOutcome> => {
			// A solo chain must stay byte-for-byte the old path: no role prompt,
			// no role routing, so an unconfigured user sees no change at all.
			if (chain.roles.length === 1) {
				return runAttempt(attemptPrompt);
			}

			let executorPrompt = attemptPrompt;

			if (chain.roles.includes("planner")) {
				const used: string[] = [];
				const outcome = await runAttempt(attemptPrompt, "planner", used);
				const route = lastRoute as RouteDecision;
				roleRuns.push({
					role: "planner",
					providerId: route.providerId,
					modelId: route.modelId,
					providersUsed: used,
					ok: !outcome.error,
					output: outcome.text,
					error: outcome.error,
				});

				if (outcome.error) {
					notices.push(
						`planner failed (${outcome.error.split("\n")[0]}) — executing without a plan`,
					);
				} else {
					plan = parseHandoff("planner", outcome.text);
					if (!plan.structured) {
						notices.push(
							"planner did not return a numbered plan — passing its notes through as-is",
						);
					}
					this.options.onEvent?.(
						`planner: ${plan.steps.length} step(s)${
							plan.structured ? "" : " (unstructured)"
						}`,
					);
					executorPrompt = renderHandoff(plan, attemptPrompt);
				}
			}

			const used: string[] = [];
			const executorOutcome = await runAttempt(executorPrompt, CORE_ROLE, used);
			const executorRoute = lastRoute as RouteDecision;
			roleRuns.push({
				role: CORE_ROLE,
				providerId: executorRoute.providerId,
				modelId: executorRoute.modelId,
				providersUsed: used,
				ok: !executorOutcome.error,
				output: executorOutcome.text,
				error: executorOutcome.error,
			});

			if (executorOutcome.error) {
				return executorOutcome;
			}

			if (chain.roles.includes("reviewer")) {
				const reviewUsed: string[] = [];
				const reviewOutcome = await runAttempt(
					renderReviewPrompt(attemptPrompt, executorOutcome.text, plan),
					"reviewer",
					reviewUsed,
				);
				const reviewRoute = lastRoute as RouteDecision;
				roleRuns.push({
					role: "reviewer",
					providerId: reviewRoute.providerId,
					modelId: reviewRoute.modelId,
					providersUsed: reviewUsed,
					ok: !reviewOutcome.error,
					output: reviewOutcome.text,
					error: reviewOutcome.error,
				});

				if (reviewOutcome.error) {
					notices.push(
						`reviewer failed (${reviewOutcome.error.split("\n")[0]}) — result not reviewed`,
					);
				} else {
					review = reviewOutcome.text;
				}
			}

			// The executor's own route is what the caller should see as "who
			// served this turn", so it is restored after the reviewer moved it.
			lastRoute = executorRoute;
			return executorOutcome;
		};

		if (!shouldVerify) {
			const outcome = await runChain(prompt);
			const route = lastRoute as RouteDecision;
			return {
				ok: !outcome.error,
				mode: route.mode,
				providerId: route.providerId,
				modelId: route.modelId,
				providersUsed,
				usedFallback: route.usedFallback,
				notices,
				selectedFiles: selected.files,
				outputs: [outcome.text],
				attempts: 1,
				retried: false,
				chain,
				roleRuns: roleRuns.length > 0 ? roleRuns : undefined,
				plan,
				review,
				summary: outcome.error
					? `Run failed on ${route.providerId}: ${outcome.error.split("\n")[0]}`
					: "Run completed (verification skipped).",
			};
		}

		const verified = await runVerifiedTask({
			prompt,
			projectDir: this.options.projectDir,
			onEvent: this.options.onEvent,
			run: ({ prompt: attemptPrompt }) => runChain(attemptPrompt),
		});

		const route = lastRoute as RouteDecision;
		return {
			ok: verified.ok,
			mode: route.mode,
			providerId: route.providerId,
			modelId: route.modelId,
			providersUsed,
			usedFallback: route.usedFallback || new Set(providersUsed).size > 1,
			notices,
			selectedFiles: selected.files,
			outputs: verified.outputs,
			attempts: verified.attempts,
			retried: verified.retried,
			verification: verified.report,
			chain,
			roleRuns: roleRuns.length > 0 ? roleRuns : undefined,
			plan,
			review,
			summary: verified.summary,
		};
	}

	/** Runs verification on its own, without a model. */
	async verifyOnly(): Promise<VerificationReport> {
		return verify({
			projectDir: this.options.projectDir,
			onStep: (message) => this.options.onEvent?.(message),
		});
	}
}
