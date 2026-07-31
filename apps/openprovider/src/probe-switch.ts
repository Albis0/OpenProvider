/**
 * Faz 7 bitiş kriteri.
 *
 * A rate limit should raise a decision rather than silently swapping models:
 * switch, wait it out, or stop. Both the wait path and the switch path have
 * to work.
 *
 * All of it is stubbed. Provoking a real rate limit on demand is not
 * repeatable, and waiting out a real one would put a minute of sleep in a
 * test — the sleep is injected instead, so the timing logic is checked without
 * spending the time.
 *
 *   bun run src/probe-switch.ts
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
	type AgentFactory,
	autoDecide,
	classifyError,
	describeSwitch,
	OpenProviderSession,
	stopDecide,
	type SwitchDecision,
	type SwitchRequest,
} from "./index";
import type { CredentialSource } from "./provider-settings";

const checks: Array<{ name: string; passed: boolean; detail: string }> = [];
function record(name: string, passed: boolean, detail: string): void {
	checks.push({ name, passed, detail });
	console.log(`  ${passed ? "PASS" : "FAIL"}  ${name} — ${detail}`);
}
function heading(title: string): void {
	console.log(`\n${"─".repeat(68)}\n${title}\n${"─".repeat(68)}`);
}

const stubCredentials: CredentialSource = {
	listAvailable: () => ["alpha", "beta"],
	get: (providerId) =>
		["alpha", "beta"].includes(providerId)
			? { providerId, apiKey: `${providerId}-key`, model: `${providerId}-model` }
			: undefined,
};

const CONFIG = {
	defaultMode: "code" as const,
	modes: { code: { provider: "alpha" }, plan: { provider: "alpha" } },
	fallback: ["alpha", "beta"],
	disabled: [] as string[],
	maxOutputTokens: 2048,
};

async function makeProject(): Promise<string> {
	const dir = await mkdtemp(path.join(tmpdir(), "openprovider-switch-"));
	await writeFile(
		path.join(dir, "openprovider.config.json"),
		JSON.stringify(CONFIG, null, "\t"),
		"utf8",
	);
	return dir;
}

/** Fails on the given providers, for the first `failTimes` attempts each. */
function makeFactory(spec: {
	failing: Record<string, { message: string; times: number }>;
	onRun?: (providerId: string) => void;
}): { factory: AgentFactory; calls: string[] } {
	const seen: Record<string, number> = {};
	const calls: string[] = [];

	const factory: AgentFactory = (input) => ({
		async run() {
			calls.push(input.providerId);
			spec.onRun?.(input.providerId);
			const failure = spec.failing[input.providerId];
			seen[input.providerId] = (seen[input.providerId] ?? 0) + 1;
			if (failure && (seen[input.providerId] ?? 0) <= failure.times) {
				return { text: "", error: failure.message };
			}
			return {
				text: `ok from ${input.providerId}`,
				usage: { inputTokens: 10, outputTokens: 5 },
			};
		},
	});

	return { factory, calls };
}

const GEMINI_MESSAGE =
	"You exceeded your current quota, please check your plan and billing details.\n" +
	"* Quota exceeded for metric: generate_content_free_tier_requests, limit: 20\n" +
	"Please retry in 48.091315407s.";
const GROQ_MESSAGE =
	"Rate limit reached for model `openai/gpt-oss-120b` on tokens per minute (TPM): " +
	"Limit 8000, Used 8000. Please try again in 2m30s.";

function testClassification(): void {
	heading("1. Reading the provider's prose");

	const gemini = classifyError(GEMINI_MESSAGE);
	record(
		"recognises Gemini's quota message and its delay",
		gemini.isRateLimit && gemini.retryAfterMs === 48_091,
		`isRateLimit=${gemini.isRateLimit}, retryAfterMs=${gemini.retryAfterMs}`,
	);

	const groq = classifyError(GROQ_MESSAGE);
	record(
		"recognises Groq's TPM message and its compound delay",
		groq.isRateLimit && groq.retryAfterMs === 150_000,
		`isRateLimit=${groq.isRateLimit}, retryAfterMs=${groq.retryAfterMs}`,
	);

	const auth = classifyError("Invalid API Key");
	record(
		"does not treat an auth failure as a rate limit",
		!auth.isRateLimit && auth.retryAfterMs === undefined,
		`isRateLimit=${auth.isRateLimit}`,
	);

	const vague = classifyError("429 Too Many Requests");
	record(
		"never invents a delay the provider did not state",
		vague.isRateLimit && vague.retryAfterMs === undefined,
		"isRateLimit=true, retryAfterMs=undefined",
	);
}

function testDeciders(): void {
	heading("2. Default decisions");

	const short: SwitchRequest = {
		from: "alpha",
		to: "beta",
		reason: "rate limited",
		isRateLimit: true,
		retryAfterMs: 5_000,
		timesAsked: 0,
	};
	record(
		"auto waits out a short, stated delay",
		autoDecide(short) === "wait",
		`5s -> ${autoDecide(short)}`,
	);
	record(
		"auto switches rather than waiting twice",
		autoDecide({ ...short, timesAsked: 1 }) === "switch",
		`already waited -> ${autoDecide({ ...short, timesAsked: 1 })}`,
	);
	record(
		"auto switches on a long delay",
		autoDecide({ ...short, retryAfterMs: 150_000 }) === "switch",
		`2m30s -> ${autoDecide({ ...short, retryAfterMs: 150_000 })}`,
	);
	record(
		"auto switches when no delay was stated",
		autoDecide({ ...short, retryAfterMs: undefined }) === "switch",
		"no delay -> switch",
	);
	record(
		"auto aborts when there is nowhere to go",
		autoDecide({ ...short, to: undefined, retryAfterMs: undefined }) === "abort",
		"no alternative -> abort",
	);
	record(
		"stop policy never switches",
		stopDecide({ ...short, timesAsked: 1 }) === "abort",
		`-> ${stopDecide({ ...short, timesAsked: 1 })}`,
	);

	const text = describeSwitch({
		...short,
		quota: {
			providerId: "alpha",
			source: "provider-headers",
			observedAt: 0,
			tokensPerMinute: { limit: 8000, used: 8000, remaining: 0, percentUsed: 100 },
		},
	});
	record(
		"the question carries the numbers, not just the fact",
		text.includes("8000/8000") && text.includes("retry in 5s"),
		JSON.stringify(text.split("\n")[1]?.trim()),
	);
}

async function testAskAndWait(): Promise<void> {
	heading("3. Asking, then waiting out the limit on the same provider");
	const dir = await makeProject();
	try {
		const asked: SwitchRequest[] = [];
		const slept: number[] = [];
		// alpha is throttled once; waiting should be enough.
		const { factory, calls } = makeFactory({
			failing: { alpha: { message: GEMINI_MESSAGE, times: 1 } },
		});

		const session = await OpenProviderSession.create({
			projectDir: dir,
			credentials: stubCredentials,
			disableContext: true,
			trackQuota: false,
			agentFactory: factory,
			switchPolicy: "ask",
			onProviderSwitch: (request): SwitchDecision => {
				asked.push(request);
				return "wait";
			},
			sleep: async (ms) => {
				slept.push(ms);
			},
		});

		const result = await session.run("fix it", { verify: false });

		record(
			"the callback was consulted before switching",
			asked.length === 1 && asked[0]?.from === "alpha",
			`asked ${asked.length}x about ${asked[0]?.from}`,
		);
		record(
			"the request carried the stated delay and an alternative",
			asked[0]?.retryAfterMs === 48_091 && asked[0]?.to === "beta",
			`retryAfterMs=${asked[0]?.retryAfterMs}, to=${asked[0]?.to}`,
		);
		record(
			"it waited roughly the stated time",
			slept.length === 1 && (slept[0] ?? 0) >= 48_091,
			`slept ${slept[0]}ms`,
		);
		record(
			"and stayed on the provider the user chose",
			result.ok && result.providerId === "alpha" && calls.every((c) => c === "alpha"),
			`calls: ${calls.join(" -> ")}`,
		);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

async function testAskAndSwitch(): Promise<void> {
	heading("4. Asking, then switching");
	const dir = await makeProject();
	try {
		const { factory, calls } = makeFactory({
			failing: { alpha: { message: GROQ_MESSAGE, times: 5 } },
		});
		const asked: SwitchRequest[] = [];

		const session = await OpenProviderSession.create({
			projectDir: dir,
			credentials: stubCredentials,
			disableContext: true,
			trackQuota: false,
			agentFactory: factory,
			switchPolicy: "ask",
			onProviderSwitch: (request): SwitchDecision => {
				asked.push(request);
				return "switch";
			},
			sleep: async () => {},
		});

		const result = await session.run("fix it", { verify: false });

		record(
			"switching moves to the alternative immediately",
			result.ok && result.providerId === "beta",
			`calls: ${calls.join(" -> ")}`,
		);
		record(
			"the switch is recorded in the notices",
			result.notices.some((notice) => notice.includes("switch")),
			JSON.stringify(result.notices.at(-1)),
		);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

async function testWaitOnlyOnce(): Promise<void> {
	heading("5. Waiting is offered once, not repeatedly");
	const dir = await makeProject();
	try {
		// alpha keeps failing, so a wait cannot rescue it.
		const { factory, calls } = makeFactory({
			failing: { alpha: { message: GEMINI_MESSAGE, times: 9 } },
		});
		const slept: number[] = [];

		const session = await OpenProviderSession.create({
			projectDir: dir,
			credentials: stubCredentials,
			disableContext: true,
			trackQuota: false,
			agentFactory: factory,
			switchPolicy: "ask",
			// Always asks to wait; the session must refuse the second time.
			onProviderSwitch: (): SwitchDecision => "wait",
			sleep: async (ms) => {
				slept.push(ms);
			},
		});

		const result = await session.run("fix it", { verify: false });

		record(
			"waited at most once",
			slept.length === 1,
			`slept ${slept.length} time(s)`,
		);
		record(
			"then moved on instead of stalling",
			result.providerId === "beta" && calls.includes("beta"),
			`calls: ${calls.join(" -> ")}`,
		);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

async function testStopPolicy(): Promise<void> {
	heading("6. The stop policy never switches");
	const dir = await makeProject();
	try {
		const { factory, calls } = makeFactory({
			failing: { alpha: { message: GROQ_MESSAGE, times: 9 } },
		});

		const session = await OpenProviderSession.create({
			projectDir: dir,
			credentials: stubCredentials,
			disableContext: true,
			trackQuota: false,
			agentFactory: factory,
			switchPolicy: "stop",
			sleep: async () => {},
		});

		const result = await session.run("fix it", { verify: false });

		record(
			"stayed on the chosen provider and failed",
			!result.ok && calls.every((call) => call === "alpha"),
			`ok=${result.ok}, calls: ${calls.join(" -> ")}`,
		);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

async function main(): Promise<void> {
	testClassification();
	testDeciders();
	await testAskAndWait();
	await testAskAndSwitch();
	await testWaitOnlyOnce();
	await testStopPolicy();

	heading("Result");
	const failed = checks.filter((check) => !check.passed);
	console.log(`  ${checks.length - failed.length}/${checks.length} checks passed`);
	console.log(`\n[switch] ${failed.length === 0 ? "PASS" : "FAIL"}`);
	process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((error: unknown) => {
	console.error("[switch] failed:", error);
	process.exit(1);
});
