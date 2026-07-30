/**
 * Faz 1, adım 3 — bağımlılık grafiği.
 *
 * Nodes are files, edges are "A imports B". Only imports that resolve to a
 * file inside the repo become edges; `react` and `node:fs` are recorded as
 * external and otherwise ignored.
 *
 * Cycles are not a problem here and are not detected: the graph is only ever
 * walked outward from a starting set, with a visited set, so a cycle simply
 * stops early.
 */
import path from "node:path";
import type { FileFacts } from "./parser";

/** Tried in order when an import has no extension. */
const RESOLUTION_EXTENSIONS = [
	".ts",
	".tsx",
	".mts",
	".cts",
	".js",
	".jsx",
	".mjs",
	".cjs",
] as const;

const INDEX_BASENAMES = ["index"] as const;

export interface DependencyGraph {
	/** Every file that is a node in the graph. */
	files: readonly string[];
	/** file → files it imports (inside the repo). */
	imports: ReadonlyMap<string, ReadonlySet<string>>;
	/** file → files that import it. Reverse of `imports`. */
	importedBy: ReadonlyMap<string, ReadonlySet<string>>;
	/** Bare specifiers that never resolved locally, e.g. `react`, `node:fs`. */
	external: ReadonlyMap<string, ReadonlySet<string>>;
}

function isRelative(specifier: string): boolean {
	return specifier.startsWith("./") || specifier.startsWith("../");
}

function toPosix(value: string): string {
	return value.split(path.sep).join("/");
}

/**
 * Maps an import specifier onto a real file in the index.
 *
 * TypeScript lets `./foo` mean `foo.ts`, `foo/index.ts`, and — because ESM
 * requires extensions — `./foo.js` written for a file that is really
 * `foo.ts`. All three are handled. Path aliases from `tsconfig` are not;
 * those files just stay unlinked, which costs recall but never correctness.
 */
function resolveSpecifier(
	fromFile: string,
	specifier: string,
	index: ReadonlySet<string>,
): string | undefined {
	if (!isRelative(specifier)) {
		return undefined;
	}

	const base = toPosix(path.posix.join(path.posix.dirname(fromFile), specifier));

	if (index.has(base)) {
		return base;
	}

	for (const ext of RESOLUTION_EXTENSIONS) {
		if (index.has(base + ext)) {
			return base + ext;
		}
	}

	// `./foo.js` compiled from `foo.ts`.
	const withoutExt = base.replace(/\.[cm]?jsx?$/i, "");
	if (withoutExt !== base) {
		for (const ext of RESOLUTION_EXTENSIONS) {
			if (index.has(withoutExt + ext)) {
				return withoutExt + ext;
			}
		}
	}

	for (const indexName of INDEX_BASENAMES) {
		for (const ext of RESOLUTION_EXTENSIONS) {
			const candidate = `${base}/${indexName}${ext}`;
			if (index.has(candidate)) {
				return candidate;
			}
		}
	}

	return undefined;
}

export function buildGraph(facts: readonly FileFacts[]): DependencyGraph {
	const index = new Set(facts.map((file) => file.path));
	const imports = new Map<string, Set<string>>();
	const importedBy = new Map<string, Set<string>>();
	const external = new Map<string, Set<string>>();

	for (const file of facts) {
		imports.set(file.path, new Set());
		external.set(file.path, new Set());
	}
	for (const file of facts) {
		importedBy.set(file.path, new Set());
	}

	for (const file of facts) {
		for (const specifier of file.imports) {
			const resolved = resolveSpecifier(file.path, specifier, index);
			if (!resolved) {
				external.get(file.path)?.add(specifier);
				continue;
			}
			if (resolved === file.path) {
				continue; // self-import, nothing to learn
			}
			imports.get(file.path)?.add(resolved);
			importedBy.get(resolved)?.add(file.path);
		}
	}

	return {
		files: facts.map((file) => file.path),
		imports,
		importedBy,
		external,
	};
}

export interface NeighbourhoodOptions {
	/** How many hops to expand. Roadmap asks for 1-2. */
	depth: number;
	/** Follow "imports" edges. */
	followImports?: boolean;
	/** Follow "imported by" edges. */
	followImportedBy?: boolean;
}

/**
 * Breadth-first expansion from a seed set.
 *
 * Returns hop distance per file, so the caller can decay a score by distance
 * instead of treating a 2-hop neighbour like a direct hit. Seeds are at 0 and
 * are included in the result.
 */
export function expandNeighbourhood(
	graph: DependencyGraph,
	seeds: Iterable<string>,
	options: NeighbourhoodOptions,
): Map<string, number> {
	const followImports = options.followImports ?? true;
	const followImportedBy = options.followImportedBy ?? true;

	const distance = new Map<string, number>();
	let frontier: string[] = [];

	for (const seed of seeds) {
		if (!distance.has(seed)) {
			distance.set(seed, 0);
			frontier.push(seed);
		}
	}

	for (let hop = 1; hop <= options.depth; hop++) {
		const next: string[] = [];
		for (const file of frontier) {
			const neighbours: string[] = [];
			if (followImports) {
				neighbours.push(...(graph.imports.get(file) ?? []));
			}
			if (followImportedBy) {
				neighbours.push(...(graph.importedBy.get(file) ?? []));
			}
			for (const neighbour of neighbours) {
				if (distance.has(neighbour)) {
					continue;
				}
				distance.set(neighbour, hop);
				next.push(neighbour);
			}
		}
		if (next.length === 0) {
			break;
		}
		frontier = next;
	}

	return distance;
}
