/**
 * Multi-agent bitiş kriteri.
 *
 * The bar: roles route to different providers, the planner's output reaches
 * the executor as structure rather than prose, a simple request skips the
 * chain, and each role fails over on its own.
 *
 * Everything runs against a stub agent. That is not a shortcut here — a live
 * chain is three calls per turn across three providers, and the free-tier
 * quotas this project targets would be spent proving plumbing rather than
 * doing work. The stub also makes the assertions deterministic: "the planner
 * went to alpha and the executor to beta" is a fact about routing, and
 * involving a real model would only add noise to it.
 *
 *   bun run src/probe-multi-agent.ts
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
	type AgentFactory,
	type AgentRunOutcome,
	OpenProviderSession,
	type RoutingConfig,
} from "./index";
import type { CredentialSource } from "./provider-settings";
import { assessComplexity, parseHandoff, planChain } from "./routing";

/** Three providers with keys, so each role can land somewhere different. */
const stubCredentials: CredentialSource = {
	listAvailable: () => ["alpha", "beta", "gamma"],
	get: (providerId) =>
		["alpha", "beta", "gamma"].includes(providerId)
			? { providerId, apiKey: `${providerId}-key`, model: `${providerId}-model` }
			: undefined,
};

const CHAIN_CONFIG: RoutingConfig = {
	defaultMode: "code",
	modes: {
		plan: { provider: "alpha" },
		review: { provider: "gamma" },
		code: { provider: "beta" },
		docs: { provider: "beta" },
	},
	compression: { enabled: false, maxTokens: 1024 },
	roleConfig: {
		enabled: true,
		roles: {
			planner: { mode: "plan" },
			executor: { mode: "code" },
			reviewer: { mode: "review" },
		},
	},
	fallback: ["beta", "alpha", "gamma"],
	disabled: [],
	maxOutputTokens: 2048,
};

const PLANNER_OUTPUT = [
	"1. Read apps/openprovider/src/routing/router.ts and find the candidate list.",
	"2. Add a role parameter to candidatesFor in router.ts.",
	"3. Update src/session.ts to pass the role through.",
].join("\n");

interface Call {
	prompt: string;
	providerId: string;
}

/**
 * Records every call and answers based on which role prompt it sees.
 *
 * `failOn` knocks out one provider so per-role failover can be observed
 * without waiting on a real rate limit.
 */
function makeFactory(
	calls: Call[],
	failOn?: string,
): AgentFactory {
	return (input) => ({
		async run(prompt: string): Promise<AgentRunOutcome> {
			calls.push({ prompt, providerId: input.providerId });

			if (failOn && input.providerId === failOn) {
				return { text: "", error: "429 Too Many Requests: rate limit reached" };
			}

			if (prompt.startsWith("You are the planner")) {
				return { text: PLANNER_OUTPUT };
			}
			if (prompt.startsWith("You are the reviewer")) {
				return { text: "Looks correct. No problems found." };
			}
			return { text: "Applied the change." };
		},
	});
}

let failures = 0;

function check(label: string, ok: boolean, detail?: string): void {
	console.log(`  ${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
	if (!ok) {
		failures += 1;
	}
}

function heading(title: string): void {
	console.log(`\n${"─".repeat(68)}\n${title}\n${"─".repeat(68)}`);
}

async function makeFixture(): Promise<string> {
	const dir = await mkdtemp(path.join(tmpdir(), "openprovider-chain-"));
	await writeFile(
		path.join(dir, "package.json"),
		JSON.stringify({ name: "fixture", private: true }, null, "\t"),
		"utf8",
	);
	return dir;
}

async function makeSession(
	dir: string,
	factory: AgentFactory,
	config: RoutingConfig,
): Promise<OpenProviderSession> {
	// The config is written to disk rather than injected, so the file schema is
	// exercised too: a role block that parses in memory but not from JSON would
	// otherwise pass this probe and fail for a real user.
	await writeFile(
		path.join(dir, "openprovider.config.json"),
		`${JSON.stringify(config, null, "\t")}\n`,
		"utf8",
	);

	return OpenProviderSession.create({
		projectDir: dir,
		credentials: stubCredentials,
		agentFactory: factory,
		disableContext: true,
		trackQuota: false,
		switchPolicy: "auto",
		sleep: async () => {},
	});
}

async function main(): Promise<void> {
	heading("1. Karmaşıklık değerlendirmesi (model çağrısı yok)");

	const simple = assessComplexity("scanner.ts'deki typo'yu düzelt");
	check("single-file request is simple", !simple.complex, simple.reason);

	const multiStep = assessComplexity(
		"önce router.ts'i güncelle sonra session.ts'i bağla",
	);
	check("multi-step wording is complex", multiStep.complex, multiStep.reason);

	const multiFile = assessComplexity(
		"update src/routing/router.ts and src/session.ts together",
	);
	check("two named files is complex", multiFile.complex, multiFile.reason);

	const planning = assessComplexity("bir kota göstergesi planla");
	check("planning language is complex", planning.complex, planning.reason);

	heading("2. Zincir seçimi");

	const disabled = planChain("refactor everything", {
		enabled: false,
		roles: {},
	});
	check(
		"disabled config runs executor alone",
		disabled.roles.length === 1 && disabled.roles[0] === "executor",
		disabled.reason,
	);

	const skipped = planChain("fix the typo", CHAIN_CONFIG.roleConfig);
	check(
		"simple request skips planner and reviewer",
		skipped.roles.length === 1 && skipped.skipped,
		skipped.reason,
	);

	const full = planChain(
		"önce router.ts'i güncelle sonra session.ts'i bağla",
		CHAIN_CONFIG.roleConfig,
	);
	check(
		"complex request runs all three roles",
		full.roles.join(",") === "planner,executor,reviewer",
		full.roles.join(" → "),
	);

	heading("3. Devir ayrıştırma");

	const parsed = parseHandoff("planner", PLANNER_OUTPUT);
	check("numbered plan parses as structured", parsed.structured);
	check("all three steps found", parsed.steps.length === 3, `${parsed.steps.length}`);
	check(
		"file paths extracted from steps",
		parsed.steps[0]?.files.some((file) => file.includes("router.ts")) === true,
		parsed.steps[0]?.files.join(", "),
	);

	const prose = parseHandoff("planner", "Just change the function and be done.");
	check("unstructured prose degrades rather than throwing", !prose.structured);
	check("prose still yields one step", prose.steps.length === 1);

	const empty = parseHandoff("planner", "   ");
	check("empty output yields no steps", empty.steps.length === 0);

	heading("4. Uçtan uca zincir — roller farklı sağlayıcılara gidiyor");

	const dir = await makeFixture();
	try {
		const calls: Call[] = [];
		const session = await makeSession(dir, makeFactory(calls), CHAIN_CONFIG);
		const result = await session.run(
			"önce router.ts'i güncelle sonra session.ts'i bağla",
			{ verify: false },
		);

		check("three roles ran", result.roleRuns?.length === 3, `${result.roleRuns?.length}`);

		const byRole = new Map(
			(result.roleRuns ?? []).map((run) => [run.role, run.providerId]),
		);
		check("planner routed to alpha", byRole.get("planner") === "alpha", byRole.get("planner"));
		check("executor routed to beta", byRole.get("executor") === "beta", byRole.get("executor"));
		check("reviewer routed to gamma", byRole.get("reviewer") === "gamma", byRole.get("reviewer"));

		check("plan was parsed and carried", result.plan?.steps.length === 3);
		check("review verdict captured", (result.review?.length ?? 0) > 0);

		// The point of the whole handoff: the executor must have been given the
		// planner's steps, not the planner's raw prose.
		const executorCall = calls.find((call) =>
			call.prompt.startsWith("You are the executor"),
		);
		check(
			"executor received the structured plan",
			executorCall?.prompt.includes("Plan from the planner:") === true,
		);
		check(
			"executor also received the original request",
			executorCall?.prompt.includes("Original request:") === true,
		);
		check(
			"executor was told which files the plan touches",
			executorCall?.prompt.includes("Files the plan expects to touch") === true,
		);

		// The returned answer must be the work, not the critique of it.
		check(
			"result text is the executor's output, not the reviewer's",
			result.outputs[0]?.includes("Applied the change") === true,
			result.outputs[0],
		);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}

	heading("5. Basit istek zinciri atlıyor (tek çağrı)");

	const skipDir = await makeFixture();
	try {
		const calls: Call[] = [];
		const session = await makeSession(skipDir, makeFactory(calls), CHAIN_CONFIG);
		const result = await session.run("fix the typo in sum", { verify: false });

		check("exactly one model call", calls.length === 1, `${calls.length} call(s)`);
		check("chain reports the skip", result.chain?.skipped === true);
		check(
			"no role prompt was prepended on the solo path",
			calls[0]?.prompt.startsWith("You are the") === false,
		);
	} finally {
		await rm(skipDir, { recursive: true, force: true });
	}

	heading("6. Rol başına failover");

	const failDir = await makeFixture();
	try {
		const calls: Call[] = [];
		// alpha is the planner's provider. Knocking it out should move the
		// planner alone, leaving the executor and reviewer where they were.
		const session = await makeSession(
			failDir,
			makeFactory(calls, "alpha"),
			CHAIN_CONFIG,
		);
		const result = await session.run(
			"önce router.ts'i güncelle sonra session.ts'i bağla",
			{ verify: false },
		);

		const planner = result.roleRuns?.find((run) => run.role === "planner");
		const executor = result.roleRuns?.find((run) => run.role === "executor");

		check(
			"planner tried more than one provider",
			(planner?.providersUsed.length ?? 0) > 1,
			planner?.providersUsed.join(" → "),
		);
		check(
			"planner ended up off the failing provider",
			planner?.providerId !== "alpha",
			planner?.providerId,
		);
		check(
			"executor was unaffected by the planner's failover",
			executor?.providerId === "beta",
			executor?.providerId,
		);
		check("task still succeeded", result.ok === true);
	} finally {
		await rm(failDir, { recursive: true, force: true });
	}

	heading("7. Executor çökerse görev çöker");

	const hardDir = await makeFixture();
	try {
		const calls: Call[] = [];
		// Every provider fails, so the executor has nowhere to go.
		const factory: AgentFactory = () => ({
			async run(prompt: string): Promise<AgentRunOutcome> {
				calls.push({ prompt, providerId: "any" });
				return { text: "", error: "500 upstream exploded" };
			},
		});
		const session = await makeSession(hardDir, factory, CHAIN_CONFIG);
		const result = await session.run(
			"önce router.ts'i güncelle sonra session.ts'i bağla",
			{ verify: false },
		);

		check("run reports failure", result.ok === false);
		check(
			"planner failure was noticed, not swallowed",
			result.notices.some((notice) => notice.includes("planner failed")),
		);
	} finally {
		await rm(hardDir, { recursive: true, force: true });
	}

	heading("Sonuç");
	if (failures === 0) {
		console.log("  Tüm kontroller geçti.");
	} else {
		console.log(`  ${failures} kontrol başarısız.`);
		process.exitCode = 1;
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
