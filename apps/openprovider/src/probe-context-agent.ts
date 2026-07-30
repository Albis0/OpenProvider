/**
 * Faz 1 bitiş kriteri — uçtan uca.
 *
 * The roadmap's bar for Faz 1: on a real repository, given a prompt, the agent
 * reaches the right files without the user typing a single `@file`.
 *
 * This asks a question that is unanswerable from training data — it is about
 * code written tonight — with the context hook installed. A correct answer
 * means the automatic selection reached the model and was useful.
 *
 *   bun run src/probe-context-agent.ts
 */
import { Agent } from "@cline/sdk";
import { ContextEngine, createContextHook, disposeParsers } from "./context";
import { describe, MissingProviderError, resolveProvider } from "./provider-settings";

const QUESTION =
	"In this repository, which file builds the dependency graph, and which two " +
	"functions does it export? Answer in one short sentence.";

async function main(): Promise<void> {
	const provider = resolveProvider();
	console.log(`[agent] using ${describe(provider)}`);

	const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
	const engine = await ContextEngine.create({ root });
	console.log(
		`[agent] indexed ${engine.stats.parsed} files, ` +
			`${engine.stats.edges} edges, ${engine.stats.buildMs}ms\n`,
	);

	const agent = new Agent({
		providerId: provider.providerId,
		modelId: provider.modelId,
		apiKey: provider.apiKey,
		// One turn is enough to answer, but a reasoning model can spend an
		// iteration thinking; a hard limit of 1 makes the probe flaky.
		maxIterations: 3,
		hooks: {
			beforeModel: createContextHook(engine, {
				limit: 6,
				// Free tiers bill reserved output against the same quota as input.
				// Keep headroom above the model's thinking budget: reasoning models
				// spend this allowance before emitting a single visible token, and
				// a cap that is too tight fails the stream outright.
				maxOutputTokens: 4096,
				onSelect: (selected) => {
					console.log("[agent] auto-selected, with no @file from the user:");
					for (const file of selected) {
						console.log(
							`         ${file.score.toFixed(1).padStart(6)}  ${file.path}`,
						);
					}
					console.log();
				},
			}),
		},
	});

	let answer = "";
	let failure = "";
	agent.subscribe((event) => {
		if (event.type === "assistant-text-delta") {
			answer += event.text;
		}
		if (event.type === "run-failed") {
			failure = String(event.snapshot?.lastError ?? "unknown error");
		}
	});

	await agent.run(QUESTION);

	if (failure) {
		console.error(`[agent] provider error: ${failure}`);
		process.exit(1);
	}

	const trimmed = answer.trim();
	console.log(`[agent] answer: ${trimmed}\n`);

	// graph.ts exports buildGraph and expandNeighbourhood. Nothing in a
	// training set knows that; only the injected map could supply it.
	const namedFile = /graph\.ts/i.test(trimmed);
	const namedFunctions =
		/buildGraph/i.test(trimmed) && /expandNeighbourhood/i.test(trimmed);

	if (namedFile && namedFunctions) {
		console.log(
			"[agent] PASS — the agent answered from automatically selected context.",
		);
	} else {
		console.log(
			`[agent] FAIL — file named: ${namedFile}, functions named: ${namedFunctions}`,
		);
	}

	disposeParsers();
	process.exit(namedFile && namedFunctions ? 0 : 1);
}

main().catch((error: unknown) => {
	if (error instanceof MissingProviderError) {
		console.error(`[agent] ${error.message}`);
		process.exit(2);
	}
	console.error("[agent] failed:", error);
	process.exit(1);
});
