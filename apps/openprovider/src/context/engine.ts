/**
 * Faz 1 — the pieces wired together.
 *
 * Build the index once, then answer "which files matter for this prompt?"
 * repeatedly. Indexing is the slow part (tree-sitter over every source file);
 * selection afterwards is string matching and a short graph walk, so it is
 * cheap enough to run on every turn.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildGraph, type DependencyGraph } from "./graph";
import { type FileFacts, parseFiles } from "./parser";
import { rankFiles, type ScoredFile, type ScoreOptions } from "./score";
import { scanRepo, type ScanOptions } from "./scanner";

export interface IndexStats {
	/** Files ripgrep returned before filtering. */
	indexed: number;
	/** Files that survived filtering and parsed successfully. */
	parsed: number;
	/** Edges in the dependency graph. */
	edges: number;
	/** Wall-clock time to build the index. */
	buildMs: number;
	/** False when the SDK's non-.gitignore-aware fallback walk ran. */
	usedRipgrep: boolean;
}

export interface RenderOptions {
	/**
	 * Total character budget for the rendered block. Free-tier providers make
	 * this the binding constraint, so it is enforced, not advisory.
	 * Default 12000 (~3k tokens).
	 */
	maxChars?: number;
	/**
	 * Inline the full text of this many top-ranked files. The rest appear as
	 * map entries only. Default 0 — map only.
	 */
	inlineTopFiles?: number;
}

export class ContextEngine {
	private constructor(
		readonly root: string,
		private readonly facts: readonly FileFacts[],
		private readonly graph: DependencyGraph,
		readonly stats: IndexStats,
	) {}

	/** Scans, parses and indexes a repository. */
	static async create(
		options: ScanOptions & { onProgress?: (message: string) => void },
	): Promise<ContextEngine> {
		const startedAt = Date.now();

		const scan = await scanRepo(options);
		options.onProgress?.(
			`scanned ${scan.files.length} source files (${scan.totalIndexed} indexed)`,
		);

		const facts = await parseFiles(
			options.root,
			scan.files.map((file) => file.path),
		);
		options.onProgress?.(`parsed ${facts.length} files`);

		const graph = buildGraph(facts);
		let edges = 0;
		for (const targets of graph.imports.values()) {
			edges += targets.size;
		}

		return new ContextEngine(options.root, facts, graph, {
			indexed: scan.totalIndexed,
			parsed: facts.length,
			edges,
			buildMs: Date.now() - startedAt,
			usedRipgrep: scan.usedRipgrep,
		});
	}

	/** Ranked files for a prompt. Empty when nothing matched. */
	select(prompt: string, options?: ScoreOptions): ScoredFile[] {
		return rankFiles(this.facts, this.graph, prompt, options);
	}

	private factsFor(filePath: string): FileFacts | undefined {
		return this.facts.find((file) => file.path === filePath);
	}

	/**
	 * Renders the selection as a compact repo map.
	 *
	 * Full file contents would be the obvious thing to send, and the wrong one:
	 * on an 8k-token-per-minute free tier a handful of files exhausts the
	 * budget before the model has read the question. Listing each file with the
	 * names it exports gives the model enough to decide what to open with its
	 * own tools, at a fraction of the size — the approach Aider calls a
	 * repository map.
	 */
	async render(
		selected: readonly ScoredFile[],
		options: RenderOptions = {},
	): Promise<string> {
		if (selected.length === 0) {
			return "";
		}

		const maxChars = options.maxChars ?? 12_000;
		const inlineCount = options.inlineTopFiles ?? 0;

		const lines: string[] = [
			"# Repository map (auto-selected)",
			"",
			"These files were chosen automatically for this task by static analysis",
			"of the repository — no model was consulted. Read them with your tools",
			"if you need their contents.",
			"",
		];

		let budget = maxChars - lines.join("\n").length;
		const inlined: string[] = [];

		for (const [position, file] of selected.entries()) {
			const facts = this.factsFor(file.path);
			const exports = facts?.exports ?? [];
			const summary =
				exports.length > 0
					? `exports: ${exports.slice(0, 8).join(", ")}${exports.length > 8 ? ", …" : ""}`
					: (facts?.symbols.slice(0, 6).join(", ") ?? "");

			const entry = `- ${file.path}${summary ? `\n    ${summary}` : ""}`;
			if (entry.length > budget) {
				break;
			}
			lines.push(entry);
			budget -= entry.length + 1;

			if (position < inlineCount) {
				inlined.push(file.path);
			}
		}

		for (const filePath of inlined) {
			let content: string;
			try {
				content = await readFile(path.join(this.root, filePath), "utf8");
			} catch {
				continue;
			}
			const block = `\n## ${filePath}\n\n\`\`\`\n${content}\n\`\`\``;
			if (block.length > budget) {
				break;
			}
			lines.push(block);
			budget -= block.length;
		}

		return lines.join("\n");
	}

	/** Convenience: select and render in one call. */
	async buildContext(
		prompt: string,
		options: ScoreOptions & RenderOptions = {},
	): Promise<{ text: string; selected: ScoredFile[] }> {
		const selected = this.select(prompt, options);
		const text = await this.render(selected, options);
		return { text, selected };
	}
}
