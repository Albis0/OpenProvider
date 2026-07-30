/**
 * Faz 1, adım 2 — tree-sitter entegrasyonu.
 *
 * Pulls three things out of each file, with no LLM involved:
 *   - `imports`  — raw module specifiers, for the dependency graph
 *   - `exports`  — names other files can reach
 *   - `symbols`  — every declared function/class/interface/type/enum/method
 *
 * Grammars come from `@vscode/tree-sitter-wasm` as prebuilt WASM, so there is
 * no node-gyp step. That matters here: the dev machine is Windows, and native
 * tree-sitter builds are the usual place installs die.
 *
 * The tree is walked by node type rather than matched with `.scm` queries.
 * Queries are faster, but a wrong node name in a query fails silently — a walk
 * that misses a node type simply returns less, which the tests can catch.
 */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { Language, type Node, Parser } from "web-tree-sitter";

const require = createRequire(import.meta.url);

const WASM_DIR = path.join(
	path.dirname(require.resolve("@vscode/tree-sitter-wasm/package.json")),
	"wasm",
);

type GrammarName = "typescript" | "tsx" | "javascript";

function grammarFor(relativePath: string): GrammarName | undefined {
	switch (path.extname(relativePath).toLowerCase()) {
		case ".ts":
		case ".mts":
		case ".cts":
			return "typescript";
		case ".tsx":
			return "tsx";
		case ".js":
		case ".jsx":
		case ".mjs":
		case ".cjs":
			return "javascript";
		default:
			return undefined;
	}
}

export interface FileFacts {
	/** Repo-relative, POSIX separators. */
	path: string;
	/** Module specifiers exactly as written, e.g. `./foo`, `node:fs`, `react`. */
	imports: string[];
	exports: string[];
	symbols: string[];
}

/**
 * Grammar loading is the expensive part (WASM compile), so parsers are built
 * once and reused for the life of the process.
 */
class ParserPool {
	private initialized?: Promise<void>;
	private readonly parsers = new Map<GrammarName, Parser>();

	private async ensureInitialized(): Promise<void> {
		this.initialized ??= Parser.init();
		await this.initialized;
	}

	async get(grammar: GrammarName): Promise<Parser> {
		await this.ensureInitialized();
		const existing = this.parsers.get(grammar);
		if (existing) {
			return existing;
		}
		const language = await Language.load(
			path.join(WASM_DIR, `tree-sitter-${grammar}.wasm`),
		);
		const parser = new Parser();
		parser.setLanguage(language);
		this.parsers.set(grammar, parser);
		return parser;
	}

	dispose(): void {
		for (const parser of this.parsers.values()) {
			parser.delete();
		}
		this.parsers.clear();
	}
}

const POOL = new ParserPool();

/** Frees the WASM parsers. Call when a long-lived process is done indexing. */
export function disposeParsers(): void {
	POOL.dispose();
}

/** `"./foo"` and `'./foo'` both arrive with their quotes attached. */
function unquote(text: string): string {
	return text.replace(/^["'`]|["'`]$/g, "");
}

function namedChild(node: Node, field: string): Node | null {
	return node.childForFieldName(field);
}

/**
 * `const { a, b } = ...` and `const [x] = ...` declare several names at once.
 * Identifiers nested in the pattern are collected; anything else is ignored.
 */
function collectPatternNames(node: Node | null, into: Set<string>): void {
	if (!node) {
		return;
	}
	if (node.type === "identifier" || node.type === "shorthand_property_identifier_pattern") {
		into.add(node.text);
		return;
	}
	for (const child of node.namedChildren) {
		if (child) {
			collectPatternNames(child, into);
		}
	}
}

interface Collector {
	imports: Set<string>;
	exports: Set<string>;
	symbols: Set<string>;
}

/** Declarations that carry a plain `name` field. */
const NAMED_DECLARATIONS = new Set([
	"function_declaration",
	"generator_function_declaration",
	"class_declaration",
	"abstract_class_declaration",
	"interface_declaration",
	"type_alias_declaration",
	"enum_declaration",
	"module",
	"internal_module",
]);

/**
 * Records the names a declaration introduces. Returns them so an enclosing
 * `export_statement` can mark the same names as exported.
 */
function declaredNames(node: Node, collector: Collector): string[] {
	const found: string[] = [];

	if (NAMED_DECLARATIONS.has(node.type)) {
		const name = namedChild(node, "name");
		if (name) {
			found.push(name.text);
		}
	} else if (
		node.type === "lexical_declaration" ||
		node.type === "variable_declaration"
	) {
		for (const declarator of node.namedChildren) {
			if (declarator?.type !== "variable_declarator") {
				continue;
			}
			const names = new Set<string>();
			collectPatternNames(namedChild(declarator, "name"), names);
			found.push(...names);
		}
	}

	for (const name of found) {
		collector.symbols.add(name);
	}
	return found;
}

function handleExportStatement(node: Node, collector: Collector): void {
	// `export ... from "./x"` re-exports, which is a real dependency edge.
	const source = namedChild(node, "source");
	if (source) {
		collector.imports.add(unquote(source.text));
	}

	// `export { a, b as c }`
	for (const child of node.namedChildren) {
		if (child?.type !== "export_clause") {
			continue;
		}
		for (const specifier of child.namedChildren) {
			if (specifier?.type !== "export_specifier") {
				continue;
			}
			const alias = namedChild(specifier, "alias");
			const name = namedChild(specifier, "name");
			const exported = alias?.text ?? name?.text;
			if (exported) {
				collector.exports.add(exported);
			}
		}
	}

	// `export function foo() {}`, `export const bar = ...`, etc.
	const declaration = namedChild(node, "declaration");
	if (declaration) {
		for (const name of declaredNames(declaration, collector)) {
			collector.exports.add(name);
		}
		return;
	}

	// `export default ...` — the name, when there is one, is worth keeping.
	const value = namedChild(node, "value");
	if (value) {
		const name = namedChild(value, "name");
		collector.exports.add(name?.text ?? "default");
	} else if (node.text.startsWith("export default")) {
		collector.exports.add("default");
	}
}

function walk(node: Node, collector: Collector): void {
	switch (node.type) {
		case "import_statement": {
			const source = namedChild(node, "source");
			if (source) {
				collector.imports.add(unquote(source.text));
			}
			break;
		}
		case "export_statement":
			handleExportStatement(node, collector);
			break;
		case "call_expression": {
			// CommonJS `require("./x")` and dynamic `import("./x")`.
			const fn = namedChild(node, "function");
			if (fn && (fn.text === "require" || fn.type === "import")) {
				const args = namedChild(node, "arguments");
				const first = args?.namedChildren[0];
				if (first?.type === "string") {
					collector.imports.add(unquote(first.text));
				}
			}
			break;
		}
		case "method_definition":
		case "public_field_definition": {
			const name = namedChild(node, "name");
			if (name) {
				collector.symbols.add(name.text);
			}
			break;
		}
		default:
			if (NAMED_DECLARATIONS.has(node.type)) {
				declaredNames(node, collector);
			} else if (
				node.type === "lexical_declaration" ||
				node.type === "variable_declaration"
			) {
				// Only top-level-ish declarations are interesting; locals inside a
				// function body add noise without adding signal.
				if (node.parent?.type === "program" || node.parent?.type === "statement_block") {
					declaredNames(node, collector);
				}
			}
			break;
	}

	for (const child of node.namedChildren) {
		if (child) {
			walk(child, collector);
		}
	}
}

/**
 * Parses one file. Returns `undefined` for unsupported extensions or files
 * that cannot be read — a scan should never fail because one file is odd.
 */
export async function parseFile(
	root: string,
	relativePath: string,
): Promise<FileFacts | undefined> {
	const grammar = grammarFor(relativePath);
	if (!grammar) {
		return undefined;
	}

	let source: string;
	try {
		source = await readFile(path.join(root, relativePath), "utf8");
	} catch {
		return undefined;
	}

	const parser = await POOL.get(grammar);
	const tree = parser.parse(source);
	if (!tree) {
		return undefined;
	}

	const collector: Collector = {
		imports: new Set(),
		exports: new Set(),
		symbols: new Set(),
	};

	try {
		walk(tree.rootNode, collector);
	} finally {
		tree.delete();
	}

	return {
		path: relativePath,
		imports: [...collector.imports],
		exports: [...collector.exports],
		symbols: [...collector.symbols],
	};
}

/** Parses many files, keeping only the ones that yielded facts. */
export async function parseFiles(
	root: string,
	relativePaths: readonly string[],
): Promise<FileFacts[]> {
	const results: FileFacts[] = [];
	// Parsing is CPU-bound in WASM; a plain sequential loop keeps memory flat
	// and is fast enough (a few thousand files in a couple of seconds).
	for (const relativePath of relativePaths) {
		const facts = await parseFile(root, relativePath);
		if (facts) {
			results.push(facts);
		}
	}
	return results;
}
