/**
 * Faz 3 bitiş kriteri.
 *
 * The roadmap's bar: in a deliberately broken scenario, catch the failure,
 * make one automatic fix attempt, and report the result.
 *
 * Two halves:
 *   A. The loop itself, driven by stubs. Deterministic, no network, and it
 *      pins the rule that matters most — there is never a third attempt.
 *   B. The same fixture with a real agent and a real file-writing tool.
 *
 * The fixture is written to a temp directory, never into the repository.
 *
 *   bun run src/probe-verify.ts
 */
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Agent, createTool } from "@cline/sdk";
import { describe, MissingProviderError, resolveProvider } from "./provider-settings";
import { runVerifiedTask, verify } from "./verify";

/** `sum` returns a difference. `bun test.js` exits non-zero because of it. */
const BROKEN_SOURCE = "export function sum(a, b) {\n\treturn a - b;\n}\n";
const FIXED_SOURCE = "export function sum(a, b) {\n\treturn a + b;\n}\n";

const TEST_SOURCE = `import { sum } from "./sum.js";
import assert from "node:assert";

assert.strictEqual(sum(2, 3), 5, \`sum(2, 3) should be 5 but was \${sum(2, 3)}\`);
console.log("ok");
`;

const PACKAGE_JSON = JSON.stringify(
	{
		name: "verify-fixture",
		version: "0.0.0",
		private: true,
		type: "module",
		scripts: { test: "node test.js" },
	},
	null,
	"\t",
);

async function makeFixture(): Promise<string> {
	const dir = await mkdtemp(path.join(tmpdir(), "openprovider-verify-"));
	await writeFile(path.join(dir, "package.json"), PACKAGE_JSON, "utf8");
	await writeFile(path.join(dir, "test.js"), TEST_SOURCE, "utf8");
	await writeFile(path.join(dir, "sum.js"), BROKEN_SOURCE, "utf8");
	return dir;
}

function heading(title: string): void {
	console.log(`\n${"─".repeat(68)}\n${title}\n${"─".repeat(68)}`);
}

interface Check {
	name: string;
	passed: boolean;
	detail: string;
}

const checks: Check[] = [];
function record(name: string, passed: boolean, detail: string): void {
	checks.push({ name, passed, detail });
	console.log(`  ${passed ? "PASS" : "FAIL"}  ${name} — ${detail}`);
}

/** A. The loop, with stubbed attempts. */
async function testLoop(): Promise<void> {
	heading("A. Retry loop (stubbed attempts, no model)");

	// A1 — broken, fixed on the retry.
	{
		const dir = await makeFixture();
		try {
			const result = await runVerifiedTask({
				prompt: "make the tests pass",
				projectDir: dir,
				run: async ({ attempt }) => {
					// The first attempt changes nothing, so verification must fail
					// and the failure output must come back as attempt 2.
					if (attempt === 2) {
						await writeFile(path.join(dir, "sum.js"), FIXED_SOURCE, "utf8");
					}
					return { text: `attempt ${attempt}` };
				},
			});
			record(
				"recovers on the automatic retry",
				result.ok && result.attempts === 2 && result.retried,
				`ok=${result.ok}, attempts=${result.attempts}`,
			);
			record(
				"first failure was captured before the retry",
				result.firstReport?.ok === false,
				`firstReport.ok=${result.firstReport?.ok}`,
			);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	}

	// A2 — never fixed. The point is that it stops at two.
	{
		const dir = await makeFixture();
		let attemptCount = 0;
		try {
			const result = await runVerifiedTask({
				prompt: "make the tests pass",
				projectDir: dir,
				run: async ({ attempt }) => {
					attemptCount = Math.max(attemptCount, attempt);
					return { text: `attempt ${attempt} did nothing` };
				},
			});
			record(
				"stops after one retry instead of looping",
				!result.ok && result.attempts === 2 && attemptCount === 2,
				`ok=${result.ok}, attempts=${result.attempts}, runner calls=${attemptCount}`,
			);
			record(
				"reports the failure to the human",
				result.summary.includes("needs a human"),
				JSON.stringify(result.summary.split("\n").at(-1)),
			);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	}

	// A3 — already correct. No retry should happen at all.
	{
		const dir = await makeFixture();
		try {
			await writeFile(path.join(dir, "sum.js"), FIXED_SOURCE, "utf8");
			const result = await runVerifiedTask({
				prompt: "make the tests pass",
				projectDir: dir,
				run: async ({ attempt }) => ({ text: `attempt ${attempt}` }),
			});
			record(
				"does not retry when the first attempt verifies",
				result.ok && result.attempts === 1 && !result.retried,
				`ok=${result.ok}, attempts=${result.attempts}`,
			);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	}

	// A4 — a project with no scripts must be skipped silently, not failed.
	{
		const dir = await mkdtemp(path.join(tmpdir(), "openprovider-empty-"));
		try {
			const report = await verify({ projectDir: dir });
			record(
				"skips silently when there is nothing to run",
				report.ok && report.steps.every((step) => step.result === undefined),
				report.steps.map((step) => `${step.step}:${step.skippedReason}`).join(", "),
			);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	}
}

/** B. The same fixture, driven by a real model with a real tool. */
async function testWithAgent(): Promise<void> {
	heading("B. Real agent fixing a deliberately broken repo");

	const provider = resolveProvider();
	console.log(`  provider: ${describe(provider)}`);

	const dir = await makeFixture();
	console.log(`  fixture:  ${dir}`);
	console.log(`  sum.js:   ${BROKEN_SOURCE.trim().replace(/\n\t?/g, " ")}\n`);

	try {
		const writeFileTool = createTool({
			name: "write_file",
			description:
				"Overwrite a file in the project with new contents. Paths are relative to the project root.",
			inputSchema: {
				type: "object",
				properties: {
					path: { type: "string", description: "Relative file path" },
					contents: { type: "string", description: "Full new file contents" },
				},
				required: ["path", "contents"],
			},
			execute: async (input: { path: string; contents: string }) => {
				// Confine writes to the fixture; a path escape here would let a
				// model edit the real repository.
				const target = path.resolve(dir, input.path);
				if (!target.startsWith(path.resolve(dir))) {
					return { ok: false, error: "path escapes the project directory" };
				}
				await writeFile(target, input.contents, "utf8");
				return { ok: true, path: input.path };
			},
		});

		const readFileTool = createTool({
			name: "read_file",
			description: "Read a file from the project.",
			inputSchema: {
				type: "object",
				properties: { path: { type: "string" } },
				required: ["path"],
			},
			execute: async (input: { path: string }) => {
				const target = path.resolve(dir, input.path);
				if (!target.startsWith(path.resolve(dir))) {
					return { ok: false, error: "path escapes the project directory" };
				}
				try {
					return { ok: true, contents: await readFile(target, "utf8") };
				} catch (error) {
					return { ok: false, error: String(error) };
				}
			},
		});

		let providerErrors = 0;
		const result = await runVerifiedTask({
			prompt:
				"The test suite in this project fails. Read sum.js and test.js, work out " +
				"why, and write the corrected sum.js. Use the tools; do not just describe " +
				"the fix.",
			projectDir: dir,
			onEvent: (message) => console.log(`  · ${message}`),
			run: async ({ prompt }) => {
				const agent = new Agent({
					providerId: provider.providerId,
					modelId: provider.modelId,
					apiKey: provider.apiKey,
					maxIterations: 6,
					tools: [readFileTool, writeFileTool],
					hooks: { beforeModel: () => ({ options: { maxTokens: 4096 } }) },
				});
				const run = await agent.run(prompt);
				// `AgentRunResult` carries `status` and `error`, so a failed run is
				// visible without subscribing to events.
				if (run.status === "failed") {
					providerErrors += 1;
					return {
						text: run.outputText ?? "",
						error: run.error?.message ?? "run failed",
					};
				}
				return { text: run.outputText ?? "" };
			},
		});

		console.log(`\n${result.summary}\n`);
		const finalSource = await readFile(path.join(dir, "sum.js"), "utf8");
		console.log(`  final sum.js: ${finalSource.trim().replace(/\n\t?/g, " ")}`);

		// A provider that rejects the request never gets to attempt a fix. That
		// is a provider problem, not a failure of the verification loop, and
		// conflating the two would hide whichever one is real.
		if (!result.ok && providerErrors === result.attempts) {
			console.log(
				`  BLOCKED  the provider rejected every request — not a loop failure`,
			);
			record(
				"loop caught the failure, retried once, and stopped",
				result.attempts === 2 && result.summary.includes("needs a human"),
				`attempts=${result.attempts}, provider errors=${providerErrors}`,
			);
			return;
		}

		record(
			"agent fixed the broken repo and verification passed",
			result.ok,
			`ok=${result.ok}, attempts=${result.attempts}`,
		);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

async function main(): Promise<void> {
	await testLoop();

	try {
		await testWithAgent();
	} catch (error) {
		if (error instanceof MissingProviderError) {
			console.log(`\n  (skipping part B: ${error.message})`);
		} else {
			throw error;
		}
	}

	heading("Result");
	const failed = checks.filter((check) => !check.passed);
	console.log(`  ${checks.length - failed.length}/${checks.length} checks passed`);
	console.log(`\n[verify] ${failed.length === 0 ? "PASS" : "FAIL"}`);
	process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((error: unknown) => {
	console.error("[verify] failed:", error);
	process.exit(1);
});
