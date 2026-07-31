/**
 * Faz 5 bitiş kriteri.
 *
 * The sanitizer's job is small and easy to get subtly wrong, so most of this
 * pins the behaviour without a network: which messages it touches, which it
 * leaves alone, and what it does when stripping would empty a message.
 *
 * The last section is the one that matters to the product — Groq running a
 * tool-using loop through `OpenProviderSession`, which was impossible before
 * this phase.
 *
 *   bun run src/probe-provider-compat.ts
 */
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AgentMessage, AgentModelRequest } from "@cline/agents";
import { createTool } from "@cline/sdk";
import {
	createSanitizerTransform,
	MissingProviderError,
	OpenProviderSession,
	quirksFor,
	resolveOutputCap,
	resolveProvider,
	supportsTools,
} from "./index";

const checks: Array<{ name: string; passed: boolean; detail: string }> = [];
function record(name: string, passed: boolean, detail: string): void {
	checks.push({ name, passed, detail });
	console.log(`  ${passed ? "PASS" : "FAIL"}  ${name} — ${detail}`);
}
function heading(title: string): void {
	console.log(`\n${"─".repeat(68)}\n${title}\n${"─".repeat(68)}`);
}

function message(
	role: AgentMessage["role"],
	parts: AgentMessage["content"],
): AgentMessage {
	return { id: `m${Math.random()}`, role, content: parts, createdAt: 0 };
}

function requestWith(messages: AgentMessage[]): AgentModelRequest {
	return {
		systemPrompt: "",
		messages,
		tools: [],
		options: {},
	} as unknown as AgentModelRequest;
}

async function testSanitizer(): Promise<void> {
	heading("1. Sanitizer (deterministic, no network)");

	const transform = createSanitizerTransform({ providerId: "groq" });
	if (!transform) {
		record("groq has a sanitizer", false, "none was built");
		return;
	}
	record("groq has a sanitizer", true, transform.name);

	// Reasoning in an assistant message is what Groq rejects on the next turn.
	{
		const messages = [
			message("user", [{ type: "text", text: "hello" }]),
			message("assistant", [
				{ type: "reasoning", text: "thinking out loud" },
				{ type: "text", text: "hi" },
			]),
		];
		const patch = await transform.apply({
			request: requestWith(messages),
			applied: [],
		});
		const assistant = patch?.messages?.[1];
		const kinds = assistant?.content.map((part) => part.type) ?? [];
		record(
			"strips reasoning from assistant messages",
			!kinds.includes("reasoning") && kinds.includes("text"),
			`parts now: ${kinds.join(", ")}`,
		);
		record(
			"leaves the user message untouched",
			patch?.messages?.[0] === messages[0],
			"same object reference",
		);
	}

	// An assistant turn can be reasoning only. Emptying it would trade one
	// provider rejection for another.
	{
		const patch = await transform.apply({
			request: requestWith([
				message("assistant", [{ type: "reasoning", text: "only thinking" }]),
			]),
			applied: [],
		});
		const content = patch?.messages?.[0]?.content ?? [];
		record(
			"never leaves an assistant message with no content",
			content.length === 1 && content[0]?.type === "text",
			`parts now: ${content.map((part) => part.type).join(", ") || "(none)"}`,
		);
	}

	// Nothing to do means no patch, so the pipeline can skip the copy.
	{
		const patch = await transform.apply({
			request: requestWith([
				message("user", [{ type: "text", text: "hello" }]),
				message("assistant", [{ type: "text", text: "hi" }]),
			]),
			applied: [],
		});
		record(
			"no-ops when there is no reasoning to remove",
			patch === undefined,
			`patch=${patch === undefined ? "undefined" : "returned"}`,
		);
	}

	// Providers without the quirk should not carry a no-op transform.
	record(
		"builds no sanitizer for providers that do not need one",
		createSanitizerTransform({ providerId: "gemini" }) === undefined,
		"gemini -> undefined",
	);
}

function testQuirkTable(): void {
	heading("2. Quirk table");

	record(
		"groq's measured TPM limit is recorded",
		quirksFor("groq").limits?.tokensPerMinute === 8000,
		`tokensPerMinute=${quirksFor("groq").limits?.tokensPerMinute}`,
	);
	record(
		"gemini's daily request cap is recorded",
		quirksFor("gemini").limits?.requestsPerDay === 20,
		`requestsPerDay=${quirksFor("gemini").limits?.requestsPerDay}`,
	);
	record(
		"config beats the measured default",
		resolveOutputCap("groq", 512) === 512 && resolveOutputCap("groq") === 2048,
		`configured=512 -> ${resolveOutputCap("groq", 512)}, default -> ${resolveOutputCap("groq")}`,
	);
	record(
		"unknown providers get no cap and are assumed tool-capable",
		resolveOutputCap("made-up") === undefined && supportsTools("made-up"),
		"cap=undefined, supportsTools=true",
	);
}

const BROKEN = "export function sum(a, b) {\n\treturn a - b;\n}\n";
const TEST_SOURCE = `import { sum } from "./sum.js";
import assert from "node:assert";
assert.strictEqual(sum(2, 3), 5);
console.log("ok");
`;

async function testLiveToolLoop(): Promise<void> {
	heading("3. A tool-using loop on the provider that used to break");

	const provider = resolveProvider();
	console.log(`  provider: ${provider.providerId} / ${provider.modelId}`);
	const quirks = quirksFor(provider.providerId);
	if (quirks.note) {
		console.log(`  known:    ${quirks.note}`);
	}

	const dir = await mkdtemp(path.join(tmpdir(), "openprovider-compat-"));
	try {
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

		const guard = (target: string): boolean =>
			path.resolve(dir, target).startsWith(path.resolve(dir));

		const tools = [
			createTool({
				name: "read_file",
				description: "Read a file from the project.",
				inputSchema: {
					type: "object",
					properties: { path: { type: "string" } },
					required: ["path"],
				},
				execute: async (input: { path: string }) => {
					if (!guard(input.path)) {
						return { ok: false, error: "path escapes the project" };
					}
					try {
						return { ok: true, contents: await readFile(path.resolve(dir, input.path), "utf8") };
					} catch (error) {
						return { ok: false, error: String(error) };
					}
				},
			}),
			createTool({
				name: "write_file",
				description: "Overwrite a file in the project.",
				inputSchema: {
					type: "object",
					properties: {
						path: { type: "string" },
						contents: { type: "string" },
					},
					required: ["path", "contents"],
				},
				execute: async (input: { path: string; contents: string }) => {
					if (!guard(input.path)) {
						return { ok: false, error: "path escapes the project" };
					}
					await writeFile(path.resolve(dir, input.path), input.contents, "utf8");
					return { ok: true };
				},
			}),
		];

		const session = await OpenProviderSession.create({
			projectDir: dir,
			configDir: path.join(import.meta.dirname, ".."),
			disableContext: true,
			tools,
			onEvent: (msg) => console.log(`  · ${msg}`),
		});

		const result = await session.run(
			"The test suite fails. Read sum.js and test.js, work out why, and write " +
				"the corrected sum.js using the tools.",
			{ mode: "code" },
		);

		console.log(`\n${result.summary}\n`);
		record(
			"session ran a tool loop and verification passed",
			result.ok,
			`provider=${result.providerId}, attempts=${result.attempts}`,
		);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

async function main(): Promise<void> {
	await testSanitizer();
	testQuirkTable();

	try {
		await testLiveToolLoop();
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
	console.log(`\n[compat] ${failed.length === 0 ? "PASS" : "FAIL"}`);
	process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((error: unknown) => {
	console.error("[compat] failed:", error);
	process.exit(1);
});
