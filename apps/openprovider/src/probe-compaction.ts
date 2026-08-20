/**
 * Failover context compaction — bitiş kriteri.
 *
 * Two things have to be true, and the second matters more than the first:
 *
 *   1. When it works, the next provider gets a *smaller* prompt that still
 *      carries the goal, the work done and the next steps.
 *   2. When it fails — the compressing model is rate limited, times out,
 *      returns junk, has no key, or is the provider that just died — the task
 *      keeps going on the raw context, exactly as it did before this feature.
 *
 * (2) is the one worth testing hardest. A compaction step that can strand a
 * task has made failover worse, which is the opposite of the point.
 *
 * Everything is stubbed: provoking a real rate limit on demand is not
 * repeatable, and the timeout is injected so the probe does not spend 20s
 * proving it can wait.
 *
 *   bun run src/probe-compaction.ts
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
	type AgentFactory,
	type CompactionRunner,
	compactForHandover,
	OpenProviderSession,
	parseCompression,
	renderCompactionRequest,
	renderHandoverPrompt,
	type SwitchDecision,
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
	listAvailable: () => ["alpha", "beta", "tiny"],
	get: (providerId) =>
		["alpha", "beta", "tiny"].includes(providerId)
			? {
					providerId,
					apiKey: `${providerId}-key`,
					model: `${providerId}-model`,
				}
			: undefined,
};

/** Long enough to be past the min-chars floor, as a real stalled turn would be. */
const BIG_PROMPT = [
	"Refactor the provider failover layer so it stops duplicating the retry table.",
	"".padEnd(40, "-"),
	Array.from(
		{ length: 60 },
		(_, i) =>
			`step ${i}: inspect apps/openprovider/src/routing/router.ts and note the candidate order, ` +
			`then confirm the fallback chain still skips providers without credentials.`,
	).join("\n"),
].join("\n");

const GROQ_TPM =
	"Rate limit reached for model `openai/gpt-oss-120b` on tokens per minute (TPM): " +
	"Limit 8000, Used 8000. Please try again in 2m30s.";

const CONFIG = {
	defaultMode: "code" as const,
	modes: { code: { provider: "alpha" }, plan: { provider: "alpha" } },
	fallback: ["alpha", "beta"],
	disabled: [] as string[],
	maxOutputTokens: 2048,
	compression: { provider: "tiny", enabled: true, maxTokens: 512 },
};

async function makeProject(
	compression: Record<string, unknown> = CONFIG.compression,
): Promise<string> {
	const dir = await mkdtemp(path.join(tmpdir(), "openprovider-compaction-"));
	await writeFile(
		path.join(dir, "openprovider.config.json"),
		JSON.stringify({ ...CONFIG, compression }, null, "\t"),
		"utf8",
	);
	return dir;
}

/** Fails on the given providers for the first `times` attempts each. */
function makeFactory(spec: {
	failing: Record<string, { message: string; times: number }>;
}): { factory: AgentFactory; calls: string[]; prompts: string[] } {
	const seen: Record<string, number> = {};
	const calls: string[] = [];
	const prompts: string[] = [];

	const factory: AgentFactory = (input) => ({
		async run(prompt: string) {
			calls.push(input.providerId);
			prompts.push(prompt);
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

	return { factory, calls, prompts };
}

const SUMMARY =
	"GOAL: refactor failover. DONE: read router.ts. NEXT: dedupe the retry table.";

function testConfigParsing(): void {
	heading("1. Config");

	const off = parseCompression(undefined);
	record(
		"absent block means off",
		!off.enabled && off.provider === undefined,
		`enabled=${off.enabled}`,
	);

	const armed = parseCompression({
		provider: "groq",
		enabled: true,
		maxTokens: 800,
	});
	record(
		"a provider + enabled arms it",
		armed.enabled && armed.provider === "groq" && armed.maxTokens === 800,
		`provider=${armed.provider}, maxTokens=${armed.maxTokens}`,
	);

	// The one that would bite mid-failover: enabled with nothing to call.
	const noProvider = parseCompression({ enabled: true });
	record(
		"enabled with no provider is forced off, not left armed",
		!noProvider.enabled,
		`enabled=${noProvider.enabled}`,
	);

	const badTokens = parseCompression({
		provider: "groq",
		enabled: true,
		maxTokens: -5,
	});
	record(
		"a nonsense maxTokens falls back to the default",
		badTokens.maxTokens === 1024,
		`maxTokens=${badTokens.maxTokens}`,
	);
}

function testRendering(): void {
	heading("2. What the models are shown");

	const request = renderCompactionRequest({
		prompt: "fix the bug",
		fromProviderId: "alpha",
		toProviderId: "beta",
		priorOutputs: ["edited router.ts", "   "],
	});
	record(
		"the compaction request names both providers",
		request.includes("alpha") && request.includes("beta"),
		"header carries from/to",
	);
	record(
		"prior work is included, blank outputs are not",
		request.includes("edited router.ts") && !request.includes("output 2"),
		"1 of 2 outputs kept",
	);

	const handover = renderHandoverPrompt(SUMMARY, {
		prompt: "fix the bug",
		fromProviderId: "alpha",
		toProviderId: "beta",
	});
	record(
		"the handover tells the receiver to continue, not to summarise back",
		handover.includes("Continue the work") && handover.includes(SUMMARY),
		"continuation framing present",
	);
}

async function testUnitFallbacks(): Promise<void> {
	heading("3. Every failure returns the raw prompt");

	const base = {
		prompt: BIG_PROMPT,
		fromProviderId: "alpha",
		toProviderId: "beta",
	};
	const armed = { provider: "tiny", enabled: true, maxTokens: 512 };
	const always = () => true;

	const off = await compactForHandover(base, {
		config: { enabled: false, maxTokens: 512 },
		run: async () => SUMMARY,
		hasCredentials: always,
	});
	record(
		"disabled → untouched",
		!off.compacted && off.prompt === BIG_PROMPT,
		off.reason,
	);

	const noKey = await compactForHandover(base, {
		config: armed,
		run: async () => SUMMARY,
		hasCredentials: () => false,
	});
	record(
		"no key for the compressor → untouched",
		!noKey.compacted && noKey.prompt === BIG_PROMPT,
		noKey.reason,
	);

	const sameProvider = await compactForHandover(base, {
		config: { provider: "alpha", enabled: true, maxTokens: 512 },
		run: async () => SUMMARY,
		hasCredentials: always,
	});
	record(
		"never asks the provider that just failed to compress",
		!sameProvider.compacted && sameProvider.prompt === BIG_PROMPT,
		sameProvider.reason,
	);

	// The headline case: the compressor is itself rate limited.
	const rateLimited = await compactForHandover(base, {
		config: armed,
		run: async () => {
			throw new Error(GROQ_TPM);
		},
		hasCredentials: always,
	});
	record(
		"compressor rate limited → task continues on raw context",
		!rateLimited.compacted && rateLimited.prompt === BIG_PROMPT,
		rateLimited.reason.slice(0, 60),
	);

	const empty = await compactForHandover(base, {
		config: armed,
		run: async () => "   ",
		hasCredentials: always,
	});
	record(
		"empty summary → untouched",
		!empty.compacted && empty.prompt === BIG_PROMPT,
		empty.reason,
	);

	const bloated = await compactForHandover(base, {
		config: armed,
		run: async () => BIG_PROMPT + BIG_PROMPT,
		hasCredentials: always,
	});
	record(
		"a summary bigger than the original is rejected",
		!bloated.compacted && bloated.prompt === BIG_PROMPT,
		bloated.reason.slice(0, 50),
	);

	const timedOut = await compactForHandover(base, {
		config: armed,
		run: () => new Promise<string>(() => {}),
		hasCredentials: always,
		timeoutMs: 30,
	});
	record(
		"a hanging compressor times out instead of stalling the task",
		!timedOut.compacted && timedOut.prompt === BIG_PROMPT,
		timedOut.reason.slice(0, 45),
	);

	const tooShort = await compactForHandover(
		{ ...base, prompt: "fix it" },
		{ config: armed, run: async () => SUMMARY, hasCredentials: always },
	);
	record(
		"a short context is not worth a call",
		!tooShort.compacted,
		tooShort.reason,
	);

	const ok = await compactForHandover(base, {
		config: armed,
		run: async () => SUMMARY,
		hasCredentials: always,
	});
	record(
		"and when it works, the prompt actually shrinks",
		ok.compacted &&
			ok.compactedChars < ok.originalChars &&
			ok.prompt.includes(SUMMARY),
		`${ok.originalChars} → ${ok.compactedChars} chars`,
	);
}

async function testSessionCompacts(): Promise<void> {
	heading("4. End to end: a real switch compacts the context");
	const dir = await makeProject();
	try {
		const { factory, calls, prompts } = makeFactory({
			failing: { alpha: { message: GROQ_TPM, times: 5 } },
		});
		const compressed: string[] = [];
		const runner: CompactionRunner = async ({ providerId }) => {
			compressed.push(providerId);
			return SUMMARY;
		};

		const session = await OpenProviderSession.create({
			projectDir: dir,
			credentials: stubCredentials,
			disableContext: true,
			trackQuota: false,
			agentFactory: factory,
			switchPolicy: "ask",
			onProviderSwitch: (): SwitchDecision => "switch",
			sleep: async () => {},
			compactionRunner: runner,
		});

		const result = await session.run(BIG_PROMPT, { verify: false });

		record(
			"the switch happened and the task finished",
			result.ok && result.providerId === "beta",
			`calls: ${calls.join(" -> ")}`,
		);
		record(
			"compaction ran on the configured provider, not the failed one",
			compressed.length === 1 && compressed[0] === "tiny",
			`compressed by: ${compressed.join(", ") || "(none)"}`,
		);
		const secondPrompt = prompts[1] ?? "";
		record(
			"the second provider received the brief, not the raw prompt",
			secondPrompt.includes(SUMMARY) && secondPrompt.length < BIG_PROMPT.length,
			`${BIG_PROMPT.length} → ${secondPrompt.length} chars`,
		);
		record(
			"the user is told it was compacted",
			result.notices.some((notice) => notice.includes("compacted")),
			JSON.stringify(
				result.notices.find((n) => n.includes("compacted"))?.slice(0, 55),
			),
		);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

async function testSessionSurvivesCompactionFailure(): Promise<void> {
	heading("5. End to end: the compressor dies, the task does not");
	const dir = await makeProject();
	try {
		const { factory, calls, prompts } = makeFactory({
			failing: { alpha: { message: GROQ_TPM, times: 5 } },
		});

		const session = await OpenProviderSession.create({
			projectDir: dir,
			credentials: stubCredentials,
			disableContext: true,
			trackQuota: false,
			agentFactory: factory,
			switchPolicy: "ask",
			onProviderSwitch: (): SwitchDecision => "switch",
			sleep: async () => {},
			// The compressing model is rate limited too.
			compactionRunner: async () => {
				throw new Error(GROQ_TPM);
			},
		});

		const result = await session.run(BIG_PROMPT, { verify: false });

		record(
			"the task still switched and completed",
			result.ok && result.providerId === "beta",
			`calls: ${calls.join(" -> ")}`,
		);
		record(
			"the next provider got the original context, unchanged",
			(prompts[1] ?? "") === BIG_PROMPT,
			"raw context preserved",
		);
		record(
			"and the reason is visible rather than silent",
			result.notices.some((notice) => notice.includes("not compacted")),
			JSON.stringify(
				result.notices.find((n) => n.includes("not compacted"))?.slice(0, 55),
			),
		);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

async function testDisabledByDefault(): Promise<void> {
	heading("6. Off by default: no compaction, no extra call, no noise");
	const dir = await makeProject({ enabled: false, maxTokens: 1024 });
	try {
		const { factory, prompts } = makeFactory({
			failing: { alpha: { message: GROQ_TPM, times: 5 } },
		});
		let compressorCalls = 0;

		const session = await OpenProviderSession.create({
			projectDir: dir,
			credentials: stubCredentials,
			disableContext: true,
			trackQuota: false,
			agentFactory: factory,
			switchPolicy: "ask",
			onProviderSwitch: (): SwitchDecision => "switch",
			sleep: async () => {},
			compactionRunner: async () => {
				compressorCalls += 1;
				return SUMMARY;
			},
		});

		const result = await session.run(BIG_PROMPT, { verify: false });

		record(
			"the compressor was never called",
			compressorCalls === 0,
			`${compressorCalls} call(s)`,
		);
		record(
			"behaviour is byte-for-byte the old one",
			result.ok && (prompts[1] ?? "") === BIG_PROMPT,
			"raw context, as before",
		);
		record(
			"and it does not chatter about being off",
			!result.notices.some((notice) => notice.includes("not compacted")),
			"no compaction notices",
		);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

async function main(): Promise<void> {
	testConfigParsing();
	testRendering();
	await testUnitFallbacks();
	await testSessionCompacts();
	await testSessionSurvivesCompactionFailure();
	await testDisabledByDefault();

	heading("Result");
	const failed = checks.filter((check) => !check.passed);
	console.log(
		`  ${checks.length - failed.length}/${checks.length} checks passed`,
	);
	console.log(`\n[compaction] ${failed.length === 0 ? "PASS" : "FAIL"}`);
	process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((error: unknown) => {
	console.error("[compaction] failed:", error);
	process.exit(1);
});
