/**
 * Faz 4 bitiş kriteri.
 *
 * One `session.run()` should route to a provider, inject the right files, run,
 * verify, and hand back a single summary.
 *
 * Almost all of it is checked with a stub agent, for two reasons: the
 * assertions become deterministic, and the free-tier quota is small enough
 * that spending it on plumbing tests would leave none for real work. Exactly
 * one live call runs at the end to prove the default path is wired.
 *
 *   bun run src/probe-session.ts
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AgentModelRequest } from "@cline/agents";
import {
	type AgentFactory,
	MissingProviderError,
	OpenProviderSession,
} from "./index";
import type { CredentialSource } from "./provider-settings";
import { resolveProvider } from "./provider-settings";

const BROKEN = "export function sum(a, b) {\n\treturn a - b;\n}\n";
const FIXED = "export function sum(a, b) {\n\treturn a + b;\n}\n";
const TEST_SOURCE = `import { sum } from "./sum.js";
import assert from "node:assert";
assert.strictEqual(sum(2, 3), 5);
console.log("ok");
`;

/** Two providers with keys, so fallback has somewhere to go. */
const stubCredentials: CredentialSource = {
	listAvailable: () => ["alpha", "beta"],
	get: (providerId) =>
		["alpha", "beta"].includes(providerId)
			? { providerId, apiKey: `${providerId}-key`, model: `${providerId}-model` }
			: undefined,
};

const STUB_CONFIG = {
	defaultMode: "code" as const,
	modes: {
		plan: { provider: "alpha" },
		review: { provider: "alpha" },
		code: { provider: "beta" },
		docs: { provider: "beta" },
	},
	fallback: ["beta", "alpha"],
	disabled: [] as string[],
	maxOutputTokens: 2048,
};

async function makeFixture(): Promise<string> {
	const dir = await mkdtemp(path.join(tmpdir(), "openprovider-session-"));
	await writeFile(
		path.join(dir, "package.json"),
		JSON.stringify(
			{ name: "fx", private: true, type: "module", scripts: { test: "node test.js" } },
			null,
			"\t",
		),
		"utf8",
	);
	await writeFile(path.join(dir, "test.js"), TEST_SOURCE, "utf8");
	await writeFile(path.join(dir, "sum.js"), BROKEN, "utf8");
	await writeFile(
		path.join(dir, "openprovider.config.json"),
		JSON.stringify(STUB_CONFIG, null, "\t"),
		"utf8",
	);
	return dir;
}

/** A request shaped like the one the runtime hands to `beforeModel`. */
function fakeRequest(prompt: string): AgentModelRequest {
	return {
		systemPrompt: "",
		messages: [
			{
				id: "u1",
				role: "user",
				content: [{ type: "text", text: prompt }],
				createdAt: Date.now(),
			},
		],
		tools: [],
		options: {},
	} as unknown as AgentModelRequest;
}

const checks: Array<{ name: string; passed: boolean; detail: string }> = [];
function record(name: string, passed: boolean, detail: string): void {
	checks.push({ name, passed, detail });
	console.log(`  ${passed ? "PASS" : "FAIL"}  ${name} — ${detail}`);
}

function heading(title: string): void {
	console.log(`\n${"─".repeat(68)}\n${title}\n${"─".repeat(68)}`);
}

/**
 * Stub agent. Runs the composed hook against a fake request so the test can
 * see exactly what the pipeline produced, then behaves as told.
 */
function makeStubFactory(behaviour: {
	failOn?: (providerId: string, attempt: number) => string | undefined;
	onAttempt?: (providerId: string, attempt: number) => Promise<void> | void;
	capture?: (info: { providerId: string; patched: unknown }) => void;
}): AgentFactory {
	let attempt = 0;
	return (input) => ({
		async run(prompt: string) {
			attempt += 1;
			const patched = await input.beforeModel({
				request: fakeRequest(prompt),
			} as Parameters<typeof input.beforeModel>[0]);
			behaviour.capture?.({ providerId: input.providerId, patched });
			await behaviour.onAttempt?.(input.providerId, attempt);
			const error = behaviour.failOn?.(input.providerId, attempt);
			return { text: `stub answer from ${input.providerId}`, error };
		},
	});
}

async function testPipeline(): Promise<void> {
	heading("1. One hook does context injection and the output cap");
	const dir = await makeFixture();
	try {
		let captured: { providerId: string; patched: unknown } | undefined;
		const session = await OpenProviderSession.create({
			projectDir: dir,
			// Index this app so there is real code to select from.
			contextRoot: path.join(import.meta.dirname, ".."),
			credentials: stubCredentials,
			agentFactory: makeStubFactory({ capture: (info) => (captured = info) }),
		});

		const result = await session.run(
			"how does the dependency graph resolve an import to a file",
			{ verify: false },
		);

		const patched = captured?.patched as
			| { messages?: Array<{ content: Array<{ text?: string }> }>; options?: Record<string, unknown> }
			| undefined;
		const firstText = patched?.messages?.[0]?.content?.[0]?.text ?? "";

		record(
			"context injected as the first message",
			firstText.includes("Repository map"),
			`first message starts "${firstText.slice(0, 40).replace(/\n/g, " ")}…"`,
		);
		record(
			"selection found graph.ts",
			result.selectedFiles.some((file) => file.path.endsWith("graph.ts")),
			result.selectedFiles.slice(0, 3).map((file) => file.path).join(", "),
		);
		record(
			"output cap applied in the same hook",
			patched?.options?.maxTokens === STUB_CONFIG.maxOutputTokens,
			`maxTokens=${String(patched?.options?.maxTokens)}`,
		);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

async function testRouting(): Promise<void> {
	heading("2. Mode decides the provider");
	const dir = await makeFixture();
	try {
		const session = await OpenProviderSession.create({
			projectDir: dir,
			credentials: stubCredentials,
			disableContext: true,
			agentFactory: makeStubFactory({}),
		});

		const plan = await session.run("tasarla bir mimari", { verify: false });
		const code = await session.run("düzelt şu hatayı", { verify: false });

		record(
			"plan mode routed to alpha",
			plan.mode === "plan" && plan.providerId === "alpha",
			`${plan.mode} -> ${plan.providerId}`,
		);
		record(
			"code mode routed to beta",
			code.mode === "code" && code.providerId === "beta",
			`${code.mode} -> ${code.providerId}`,
		);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

async function testFailureReroute(): Promise<void> {
	heading("3. A failed provider is knocked out and the retry moves");
	const dir = await makeFixture();
	try {
		const session = await OpenProviderSession.create({
			projectDir: dir,
			credentials: stubCredentials,
			disableContext: true,
			agentFactory: makeStubFactory({
				// beta fails; alpha is fine. The retry must not land on beta again.
				failOn: (providerId) =>
					providerId === "beta" ? "rate limited (429)" : undefined,
				onAttempt: async (providerId, attempt) => {
					if (providerId === "alpha" && attempt === 2) {
						await writeFile(path.join(dir, "sum.js"), FIXED, "utf8");
					}
				},
			}),
		});

		const result = await session.run("fix the failing test");

		record(
			"second attempt used a different provider",
			result.providersUsed.length === 2 &&
				result.providersUsed[0] !== result.providersUsed[1],
			result.providersUsed.join(" -> "),
		);
		record(
			"the switch was explained",
			result.notices.some((notice) => notice.includes("failed earlier")),
			JSON.stringify(result.notices.at(-1) ?? ""),
		);
		// Since Faz 7 the switch happens inside the attempt, so a provider
		// failure no longer spends one of the two verification attempts. That
		// matters: the single retry is meant for "the code is wrong", not for
		// "the provider was down".
		record(
			"verification passed without spending the retry on the outage",
			result.ok && result.attempts === 1,
			`ok=${result.ok}, attempts=${result.attempts}`,
		);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

async function testSingleSummary(): Promise<void> {
	heading("4. One call returns one summary");
	const dir = await makeFixture();
	try {
		const session = await OpenProviderSession.create({
			projectDir: dir,
			credentials: stubCredentials,
			disableContext: true,
			agentFactory: makeStubFactory({
				onAttempt: async () => {
					await writeFile(path.join(dir, "sum.js"), FIXED, "utf8");
				},
			}),
		});

		const result = await session.run("make the tests pass");
		console.log(`\n${result.summary}\n`);

		record(
			"summary reports build, test and changed files",
			result.summary.includes("test:") && result.summary.includes("changed files"),
			result.summary.split("\n").filter(Boolean).length + " lines",
		);
		record(
			"verification attached to the result",
			result.verification !== undefined && result.ok,
			`ok=${result.ok}`,
		);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

async function testLive(): Promise<void> {
	heading("5. One real call through the default path");
	const provider = resolveProvider();
	console.log(`  provider: ${provider.providerId} / ${provider.modelId}`);

	const dir = await makeFixture();
	try {
		const session = await OpenProviderSession.create({
			projectDir: dir,
			contextRoot: path.join(import.meta.dirname, ".."),
			// The fixture carries the stub config (alpha/beta); the real routing
			// table lives with the app.
			configDir: path.join(import.meta.dirname, ".."),
			onEvent: (message) => console.log(`  · ${message}`),
		});

		// verify:false — this checks the wiring, not the retry loop, and the
		// fixture is deliberately broken so verification would burn a retry.
		const result = await session.run(
			"Name the file that builds the dependency graph. One short sentence.",
			{ verify: false, contextLimit: 5 },
		);

		console.log(`  answer: ${result.outputs[0]?.trim().slice(0, 160)}`);
		record(
			"live run routed, injected context and answered",
			result.ok && result.selectedFiles.length > 0,
			`provider=${result.providerId}, files=${result.selectedFiles.length}`,
		);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

async function main(): Promise<void> {
	await testPipeline();
	await testRouting();
	await testFailureReroute();
	await testSingleSummary();

	try {
		await testLive();
	} catch (error) {
		if (error instanceof MissingProviderError) {
			console.log(`\n  (skipping live test: ${error.message})`);
		} else {
			throw error;
		}
	}

	heading("Result");
	const failed = checks.filter((check) => !check.passed);
	console.log(`  ${checks.length - failed.length}/${checks.length} checks passed`);
	console.log(`\n[session] ${failed.length === 0 ? "PASS" : "FAIL"}`);
	process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((error: unknown) => {
	console.error("[session] failed:", error);
	process.exit(1);
});
