/**
 * Faz 1, adım 4 — alaka skorlama, LLM olmadan.
 *
 * Two signals, combined:
 *
 *   1. Keyword overlap between the prompt and what a file *names* — its path,
 *      its exports, its declared symbols.
 *   2. Proximity in the dependency graph. A file the prompt never mentions but
 *      that is imported by a file it does mention is usually needed too.
 *
 * Everything here is local string work and graph walking. No model is called,
 * which is the whole point: context selection must not add latency or cost.
 */
import path from "node:path";
import { type DependencyGraph, expandNeighbourhood } from "./graph";
import type { FileFacts } from "./parser";

/**
 * Weights. Tuned by hand against this repo (see `probe-context-engine.ts`).
 * The ordering matters more than the absolute values: naming a file beats
 * naming something inside it, which beats merely being nearby.
 */
const WEIGHTS = {
	/** Prompt contains the file's basename, e.g. "scanner" for `scanner.ts`. */
	filenameExact: 12,
	/** Prompt token appears inside the basename, e.g. "scan" in `scanner.ts`. */
	filenamePartial: 5,
	/** Prompt token matches a directory in the path, e.g. "context". */
	pathSegment: 3,
	/** Prompt names something the file exports. */
	exportExact: 8,
	/** Prompt names a symbol declared in the file. */
	symbolExact: 4,
	/** A prompt token is a piece of a symbol, e.g. "expand" in `expandNeighbourhood`. */
	symbolPartial: 1,
} as const;

/** Score a neighbour inherits, per hop away from a seed. */
const HOP_DECAY = 0.35;

/** Only the strongest direct hits are used as expansion seeds. */
const MAX_SEEDS = 12;

/** Tokens this short carry no signal and match far too much. */
const MIN_TOKEN_LENGTH = 3;

/**
 * Words that appear in almost every coding request. Left out of matching so
 * "add a test for the parser" seeds on `parser`, not on `add` and `test`.
 * Turkish entries are here because prompts on this project are written in
 * Turkish.
 */
const STOPWORDS = new Set([
	// English
	"the", "and", "for", "with", "this", "that", "from", "into", "how", "why",
	"what", "when", "where", "add", "fix", "make", "use", "using", "get", "set",
	"new", "old", "can", "should", "would", "please", "need", "want", "file",
	"files", "code", "function", "class", "method", "test", "tests", "write",
	"update", "change", "create", "remove", "delete", "run", "all", "any", "not",
	// Turkish
	"bir", "bu", "şu", "ve", "ile", "için", "gibi", "daha", "çok", "ama",
	"yap", "yaz", "ekle", "sil", "değiştir", "düzelt", "olsun", "olan",
	"nasıl", "neden", "hangi", "dosya", "dosyayı", "kod", "fonksiyon", "sınıf",
	"bana", "bende", "sonra", "önce", "kadar", "yani", "işte",
]);

/**
 * Splits a string into comparable tokens.
 *
 * Identifiers are broken apart as well as kept whole, so `expandNeighbourhood`
 * contributes `expandneighbourhood`, `expand`, and `neighbourhood`. That lets
 * a prompt saying "expand the neighbourhood" reach it without the user having
 * to type the identifier exactly.
 */
export function tokenize(input: string): Set<string> {
	const tokens = new Set<string>();

	for (const raw of input.split(/[^\p{L}\p{N}_$.-]+/u)) {
		if (!raw) {
			continue;
		}
		// Keep a dotted filename whole ("scanner.ts") and also its stem.
		const cleaned = raw.replace(/^[.\-_]+|[.\-_]+$/g, "");
		if (!cleaned) {
			continue;
		}

		const whole = cleaned.toLowerCase();
		if (whole.length >= MIN_TOKEN_LENGTH && !STOPWORDS.has(whole)) {
			tokens.add(whole);
		}

		for (const part of splitIdentifier(cleaned)) {
			const lower = part.toLowerCase();
			if (lower.length >= MIN_TOKEN_LENGTH && !STOPWORDS.has(lower)) {
				tokens.add(lower);
			}
		}
	}

	return tokens;
}

/** `getFileIndex` / `get_file_index` / `get-file-index` → get, file, index. */
function splitIdentifier(value: string): string[] {
	return value
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
		.split(/[^\p{L}\p{N}$]+/u)
		.filter(Boolean);
}

export interface ScoredFile {
	path: string;
	score: number;
	/** Human-readable explanation, for debugging and for showing the user. */
	reasons: string[];
	/** 0 for a direct keyword hit, ≥1 for a graph neighbour. */
	hops: number;
}

export interface ScoreOptions {
	/** Graph hops to expand from seeds. Roadmap asks for 1-2. Default 2. */
	depth?: number;
	/** Cap on returned files. Default 12. */
	limit?: number;
	/** Files below this score are dropped. Default 1. */
	minScore?: number;
}

interface DirectHit {
	score: number;
	reasons: string[];
}

function scoreOneFile(
	facts: FileFacts,
	promptTokens: ReadonlySet<string>,
): DirectHit {
	let score = 0;
	const reasons: string[] = [];

	const basename = path.posix.basename(facts.path);
	const stem = basename.replace(/\.[^.]+$/, "");
	const stemTokens = new Set(
		splitIdentifier(stem).map((part) => part.toLowerCase()),
	);
	const stemLower = stem.toLowerCase();

	if (promptTokens.has(stemLower) || promptTokens.has(basename.toLowerCase())) {
		score += WEIGHTS.filenameExact;
		reasons.push(`filename "${basename}"`);
	} else {
		for (const token of promptTokens) {
			if (stemTokens.has(token)) {
				score += WEIGHTS.filenamePartial;
				reasons.push(`filename part "${token}"`);
				break;
			}
		}
	}

	const segments = path.posix.dirname(facts.path).split("/");
	for (const segment of segments) {
		if (segment && segment !== "." && promptTokens.has(segment.toLowerCase())) {
			score += WEIGHTS.pathSegment;
			reasons.push(`directory "${segment}"`);
			break;
		}
	}

	const exportHits = matchSymbols(facts.exports, promptTokens);
	if (exportHits.exact.length > 0) {
		score += WEIGHTS.exportExact * exportHits.exact.length;
		reasons.push(`exports ${quoteList(exportHits.exact)}`);
	}

	const symbolHits = matchSymbols(facts.symbols, promptTokens);
	if (symbolHits.exact.length > 0) {
		score += WEIGHTS.symbolExact * symbolHits.exact.length;
		reasons.push(`defines ${quoteList(symbolHits.exact)}`);
	}
	if (symbolHits.partial.length > 0) {
		score += WEIGHTS.symbolPartial * symbolHits.partial.length;
		reasons.push(`mentions ${quoteList(symbolHits.partial)}`);
	}

	return { score, reasons };
}

function matchSymbols(
	names: readonly string[],
	promptTokens: ReadonlySet<string>,
): { exact: string[]; partial: string[] } {
	const exact: string[] = [];
	const partial: string[] = [];

	for (const name of names) {
		if (promptTokens.has(name.toLowerCase())) {
			exact.push(name);
			continue;
		}
		const parts = splitIdentifier(name).map((part) => part.toLowerCase());
		if (parts.length > 1 && parts.some((part) => promptTokens.has(part))) {
			partial.push(name);
		}
	}

	// Long lists are noise in a reason string; the score already counted them.
	return { exact: exact.slice(0, 4), partial: partial.slice(0, 4) };
}

function quoteList(names: readonly string[]): string {
	return names.map((name) => `\`${name}\``).join(", ");
}

/**
 * Ranks files for a prompt.
 *
 * Direct keyword hits are scored first. The strongest of them seed a walk
 * through the dependency graph, and each file reached inherits a share of the
 * seed's score, decayed per hop. A file can be both — it keeps the larger
 * contribution rather than double-counting.
 */
export function rankFiles(
	facts: readonly FileFacts[],
	graph: DependencyGraph,
	prompt: string,
	options: ScoreOptions = {},
): ScoredFile[] {
	const depth = options.depth ?? 2;
	const limit = options.limit ?? 12;
	const minScore = options.minScore ?? 1;

	const promptTokens = tokenize(prompt);
	if (promptTokens.size === 0) {
		return [];
	}

	const factsByPath = new Map(facts.map((file) => [file.path, file]));
	const direct = new Map<string, DirectHit>();

	for (const file of facts) {
		const hit = scoreOneFile(file, promptTokens);
		if (hit.score > 0) {
			direct.set(file.path, hit);
		}
	}

	const results = new Map<string, ScoredFile>();
	for (const [filePath, hit] of direct) {
		results.set(filePath, {
			path: filePath,
			score: hit.score,
			reasons: hit.reasons,
			hops: 0,
		});
	}

	const seeds = [...direct.entries()]
		.sort((a, b) => b[1].score - a[1].score)
		.slice(0, MAX_SEEDS);

	for (const [seedPath, seedHit] of seeds) {
		const distances = expandNeighbourhood(graph, [seedPath], { depth });
		for (const [neighbour, hops] of distances) {
			if (hops === 0 || !factsByPath.has(neighbour)) {
				continue;
			}
			const inherited = seedHit.score * HOP_DECAY ** hops;
			const existing = results.get(neighbour);

			if (!existing) {
				results.set(neighbour, {
					path: neighbour,
					score: inherited,
					reasons: [`${hops} hop from ${path.posix.basename(seedPath)}`],
					hops,
				});
				continue;
			}

			// Already present: a direct hit keeps its own reasons, but still
			// benefits from being near a strong seed.
			existing.score += inherited;
			if (existing.hops > 0 && hops < existing.hops) {
				existing.hops = hops;
			}
		}
	}

	return [...results.values()]
		.filter((file) => file.score >= minScore)
		.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
		.slice(0, limit);
}
