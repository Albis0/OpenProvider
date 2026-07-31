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
import {
	loadConfig,
	type Mode,
	type RouteDecision,
	Router,
	type RoutingConfig,
	suggestConfig,
} from "./routing";
import { runVerifiedTask, verify, type VerificationReport } from "./verify";

export interface AgentRunOutcome {
	text: string;
	/** Set when the provider or runtime failed. */
	error?: string;
}

export interface SessionAgent {
	run(prompt: string): Promise<AgentRunOutcome>;
}

export interface AgentFactoryInput {
	providerId: string;
	modelId?: string;
	apiKey: string;
	beforeModel: BeforeModelHook;
	tools?: readonly AgentTool[];
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
	tools?: readonly AgentTool[];
	maxIterations?: number;
	credentials?: CredentialSource;
	agentFactory?: AgentFactory;
	onEvent?: (message: string) => void;
	/** Skips repository indexing. Useful in tests and for non-code tasks. */
	disableContext?: boolean;
}

export interface SessionRunOptions {
	/** Overrides the keyword-derived mode. */
	mode?: string;
	/** Runs build/test afterwards. Default true. */
	verify?: boolean;
	/** Files to inject at most. Default 8. */
	contextLimit?: number;
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
}

export class OpenProviderSession {
	private constructor(
		private readonly options: SessionOptions,
		private readonly router: Router,
		readonly config: RoutingConfig,
		private readonly engine: ContextEngine | undefined,
		private readonly agentFactory: AgentFactory,
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

		return new OpenProviderSession(
			options,
			new Router(config, credentials),
			config,
			engine,
			options.agentFactory ?? defaultAgentFactory,
		);
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

		if (route.maxOutputTokens !== undefined) {
			transforms.push(createOutputCapTransform(route.maxOutputTokens));
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

		// Routing happens per attempt, not once. If the first provider fails,
		// it is knocked out and the retry is routed somewhere else.
		const runAttempt = async (
			attemptPrompt: string,
		): Promise<AgentRunOutcome> => {
			const route = this.router.route(prompt, runOptions.mode);
			lastRoute = route;
			providersUsed.push(route.providerId);
			for (const notice of route.notices) {
				if (!notices.includes(notice)) {
					notices.push(notice);
				}
			}
			this.options.onEvent?.(
				`routing: mode "${route.mode}" -> ${route.providerId}${
					route.modelId ? ` / ${route.modelId}` : ""
				}`,
			);

			const agent = this.agentFactory({
				providerId: route.providerId,
				modelId: route.modelId,
				apiKey: route.apiKey,
				beforeModel: this.buildHook(route, runOptions, selected),
				tools: this.options.tools,
				maxIterations: this.options.maxIterations ?? 6,
			});

			const outcome = await agent.run(attemptPrompt);
			if (outcome.error) {
				// Feed the failure back so the next attempt avoids this provider.
				this.router.markUnavailable(route.providerId, outcome.error.slice(0, 80));
				this.options.onEvent?.(
					`routing: ${route.providerId} knocked out — ${outcome.error.split("\n")[0]}`,
				);
			}
			return outcome;
		};

		if (!shouldVerify) {
			const outcome = await runAttempt(prompt);
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
				summary: outcome.error
					? `Run failed on ${route.providerId}: ${outcome.error.split("\n")[0]}`
					: "Run completed (verification skipped).",
			};
		}

		const verified = await runVerifiedTask({
			prompt,
			projectDir: this.options.projectDir,
			onEvent: this.options.onEvent,
			run: ({ prompt: attemptPrompt }) => runAttempt(attemptPrompt),
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
