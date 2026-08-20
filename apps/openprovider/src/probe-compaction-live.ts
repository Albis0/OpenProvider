/**
 * Compaction, against a real model.
 *
 * `probe-compaction.ts` proves the mechanism: it shrinks, and every failure
 * path falls back to the raw context. What it cannot prove is whether the
 * summary is any *good* — every runner in it is a stub returning a fixed
 * string.
 *
 * That gap matters more than it looks. A compaction that drops the file paths,
 * or the error text, or what has already been done, hands the next provider a
 * brief it cannot act on. The task would continue, look healthy, and quietly
 * redo or abandon work. So this asks a real model and checks the brief for the
 * things a receiving model actually needs.
 *
 * Needs a Groq key in ~/.cline/data/settings/providers.json (or wherever the
 * SDK keeps it). Skips cleanly when there is none, so it is safe to run
 * anywhere.
 *
 *   bun run src/probe-compaction-live.ts
 */
import {
	type CompactionRunner,
	compactForHandover,
	defaultAgentFactory,
} from "./index";
import { createCredentialSource } from "./provider-settings";

const checks: Array<{ name: string; passed: boolean; detail: string }> = [];
function record(name: string, passed: boolean, detail: string): void {
	checks.push({ name, passed, detail });
	console.log(`  ${passed ? "PASS" : "FAIL"}  ${name} — ${detail}`);
}
function heading(title: string): void {
	console.log(`\n${"─".repeat(68)}\n${title}\n${"─".repeat(68)}`);
}

/**
 * A stalled turn, shaped like a real one: a goal, work already done with
 * concrete paths, a specific error, and an explicit constraint. Each of those
 * is something the receiving model cannot reconstruct if the summary loses it.
 */
const STALLED_TASK = [
	"Fix the failing rate-limit test in the OpenProvider extension.",
	"",
	"The user's original request was: the failover tests are red after the",
	"reasoning-sanitizer change, work out why and fix it without loosening",
	"the assertions.",
	"",
	"=== WORK PRODUCED SO FAR ===",
	"I read apps/vscode/src/sdk/failover/failure-classifier.ts and confirmed the",
	"layered design: http status, then error code, then phrases, then repetition.",
	"",
	"I then read apps/vscode/src/sdk/reasoning-sanitizer.ts, which strips",
	"reasoning parts from assistant messages before they are replayed.",
	"",
	"I ran: bunx vitest run src/sdk/failover/ --config vitest.config.ts",
	"and got this failure:",
	"",
	"  FAIL src/sdk/failover/failover-chain.test.ts > walks down the chain",
	"  AssertionError: expected 'groq' to be 'gemini'",
	"    at src/sdk/failover/failover-chain.test.ts:139:41",
	"",
	"I established that the chain test seeds providers in the order",
	"[nvidia, groq, gemini] and that selectNextProvider skips a provider that is",
	"in the exhausted set, but the sanitizer change made recordFailure run twice",
	"for a single failure, so groq was never marked exhausted.",
	"",
	"IMPORTANT CONSTRAINT from the user: do not change the test assertions.",
	"The fix has to be in the source, not the expectations.",
	"",
	"Remaining: make recordFailure idempotent within one turn, then re-run",
	"the failover suite and confirm all four files pass.",
	"",
	"=== FILES READ WHILE INVESTIGATING ===",
	// Padding that mirrors the bulk of a real stalled turn: a pile of
	// low-signal file listings the summary is expected to drop, so the probe
	// also shows whether it keeps the signal and discards the noise.
	...Array.from(
		{ length: 40 },
		(_, i) =>
			`  - apps/vscode/src/sdk/failover/support/helper-${i}.ts (no relevant symbols; ` +
			`scanned for recordFailure references, found none)`,
	),
].join("\n");

/** What a usable brief has to carry through. */
const MUST_SURVIVE: Array<{ label: string; test: (s: string) => boolean }> = [
	{
		label: "the goal (the failing failover test)",
		test: (s) => /failover|rate.?limit|failing test/i.test(s),
	},
	{
		label: "at least one concrete file path",
		test: (s) =>
			/failure-classifier\.ts|failover-chain\.test\.ts|reasoning-sanitizer\.ts/i.test(
				s,
			),
	},
	{
		label: "the actual assertion error",
		test: (s) =>
			/expected\s+'?groq'?\s+to\s+be\s+'?gemini'?|groq.*gemini/i.test(s),
	},
	{
		label: "the diagnosis (recordFailure running twice)",
		test: (s) => /recordfailure/i.test(s),
	},
	{
		label: "the user's constraint (do not touch assertions)",
		test: (s) => /assertion|expectation/i.test(s),
	},
	{
		label: "the remaining work",
		test: (s) => /idempotent|re-?run|remaining|next/i.test(s),
	},
];

async function main(): Promise<void> {
	heading("Live compaction — is the brief actually usable?");

	const credentials = createCredentialSource();
	const groq = credentials.get("groq");
	if (!groq) {
		console.log("\n  SKIP — no Groq key configured; nothing to measure.");
		console.log("\n[compaction-live] SKIP");
		process.exit(0);
	}

	const model = process.env.PROBE_GROQ_MODEL ?? "openai/gpt-oss-safeguard-20b";
	console.log(`  compressing with groq / ${model}\n`);

	// The real runner: same path the session uses, minus the session.
	const run: CompactionRunner = async ({
		providerId,
		modelId,
		maxTokens,
		systemPrompt,
		prompt,
	}) => {
		const agent = defaultAgentFactory({
			providerId,
			modelId,
			apiKey: groq.apiKey,
			beforeModel: async () => ({ options: { maxTokens } }),
			maxIterations: 1,
		});
		const outcome = await agent.run(`${systemPrompt}\n\n${prompt}`);
		if (outcome.error) {
			throw new Error(outcome.error);
		}
		return outcome.text;
	};

	const started = Date.now();
	const result = await compactForHandover(
		{
			prompt: STALLED_TASK,
			fromProviderId: "nvidia",
			toProviderId: "gemini",
			priorOutputs: [],
		},
		{
			config: { provider: "groq", model, enabled: true, maxTokens: 1024 },
			run,
			hasCredentials: () => true,
			onEvent: (message) => console.log(`  [event] ${message}`),
		},
	);
	const elapsed = Date.now() - started;

	console.log(`\n${"─".repeat(68)}\nTHE BRIEF IT PRODUCED\n${"─".repeat(68)}`);
	console.log(result.compacted ? result.prompt : "(not compacted)");
	console.log("─".repeat(68));

	heading("Verdict");

	record(
		"a real model actually compacted it",
		result.compacted,
		result.compacted
			? `${result.originalChars} → ${result.compactedChars} chars in ${elapsed}ms`
			: `not compacted: ${result.reason}`,
	);

	if (!result.compacted) {
		console.log(
			"\n  Nothing further to check — the call did not produce a brief.",
		);
		console.log("\n[compaction-live] FAIL");
		process.exit(1);
	}

	const brief = result.prompt;
	for (const { label, test } of MUST_SURVIVE) {
		record(`keeps ${label}`, test(brief), test(brief) ? "present" : "LOST");
	}

	// Shrinking is the point, but a brief that saves nothing is not worth a call.
	const ratio = result.compactedChars / result.originalChars;
	record(
		"the saving is worth the round trip",
		ratio < 0.75,
		`${Math.round(ratio * 100)}% of the original`,
	);

	heading("Result");
	const failed = checks.filter((check) => !check.passed);
	console.log(
		`  ${checks.length - failed.length}/${checks.length} checks passed`,
	);
	if (failed.length > 0) {
		console.log("\n  Lost or weak:");
		for (const check of failed) {
			console.log(`    - ${check.name}`);
		}
	}
	console.log(`\n[compaction-live] ${failed.length === 0 ? "PASS" : "FAIL"}`);
	process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((error: unknown) => {
	console.error("[compaction-live] failed:", error);
	process.exit(1);
});
