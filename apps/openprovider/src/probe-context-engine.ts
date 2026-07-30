/**
 * Faz 1 doğrulaması — does the engine pick the right files, offline?
 *
 * Indexes a repository, runs a set of prompts against it, and prints the
 * ranking with the reason for each choice. No model is called anywhere in
 * this script, which is the property being demonstrated.
 *
 *   bun run src/probe-context-engine.ts [repo-root] [--prompt "..."]
 *
 * Defaults to this repository.
 */
import path from "node:path";
import { ContextEngine, disposeParsers } from "./context";

const DEFAULT_PROMPTS = [
	"the repo scanner is missing files that are gitignored",
	"add a test for tokenize and the stopword list",
	"how does the dependency graph resolve an import to a file",
	"provider api key resolution is picking the wrong provider",
];

function parseArgs(argv: readonly string[]): {
	root: string;
	prompts: string[];
} {
	const args = [...argv];
	const prompts: string[] = [];
	let root: string | undefined;

	while (args.length > 0) {
		const arg = args.shift();
		if (arg === "--prompt") {
			const value = args.shift();
			if (value) {
				prompts.push(value);
			}
		} else if (arg && !arg.startsWith("--")) {
			root ??= arg;
		}
	}

	return {
		// Two levels up from src/ is the app; three is the monorepo root.
		root: path.resolve(root ?? path.join(import.meta.dirname, "..")),
		prompts: prompts.length > 0 ? prompts : DEFAULT_PROMPTS,
	};
}

async function main(): Promise<void> {
	const { root, prompts } = parseArgs(process.argv.slice(2));
	console.log(`[engine] indexing ${root}\n`);

	const engine = await ContextEngine.create({
		root,
		onProgress: (message) => console.log(`  ${message}`),
	});

	const { stats } = engine;
	console.log(
		`\n[engine] index ready in ${stats.buildMs}ms — ` +
			`${stats.parsed} files, ${stats.edges} edges` +
			`${stats.usedRipgrep ? "" : "  (WARNING: ripgrep missing, .gitignore not applied)"}\n`,
	);

	for (const prompt of prompts) {
		console.log(`\n${"─".repeat(70)}`);
		console.log(`PROMPT: ${prompt}`);
		console.log("─".repeat(70));

		const startedAt = performance.now();
		const selected = engine.select(prompt, { limit: 8 });
		const elapsed = performance.now() - startedAt;

		if (selected.length === 0) {
			console.log("  (nothing matched)");
			continue;
		}

		for (const file of selected) {
			const marker = file.hops === 0 ? "●" : "○";
			console.log(
				`  ${marker} ${file.score.toFixed(1).padStart(6)}  ${file.path}`,
			);
			console.log(`           ${file.reasons.join("; ")}`);
		}
		console.log(`  selection took ${elapsed.toFixed(1)}ms (no model calls)`);
	}

	// Show what actually gets sent to the model for the first prompt.
	const sample = prompts[0];
	if (sample) {
		const { text } = await engine.buildContext(sample, { limit: 8 });
		console.log(`\n${"═".repeat(70)}`);
		console.log(`RENDERED CONTEXT for: ${sample}`);
		console.log(`${"═".repeat(70)}`);
		console.log(text);
		console.log(`\n[engine] context block: ${text.length} chars`);
	}

	disposeParsers();
}

main().catch((error: unknown) => {
	console.error("[engine] failed:", error);
	process.exit(1);
});
