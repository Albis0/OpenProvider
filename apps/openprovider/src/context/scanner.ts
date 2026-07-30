/**
 * Faz 1, adım 1 — repo tarayıcı.
 *
 * The SDK already ships the hard part. `getFileIndex` shells out to
 * `rg --files --hidden -g '!.git'`, and ripgrep honours `.gitignore` by
 * default, so ignored files never reach us. It caches for 15s and runs in a
 * worker thread.
 *
 * What is left for us: keep only files a parser can do something with, and
 * drop anything too large to be worth reading.
 *
 * Caveat inherited from the SDK: when ripgrep is missing it falls back to a
 * plain directory walk that does *not* read `.gitignore`, only a fixed exclude
 * list. `usedRipgrep` reports which path ran so callers can warn.
 */
import { stat } from "node:fs/promises";
import path from "node:path";
import { getFileIndex } from "@cline/sdk";

/** Extensions the parser understands today. Faz 1 is JS/TS only by design. */
export const SOURCE_EXTENSIONS = [
	".ts",
	".tsx",
	".mts",
	".cts",
	".js",
	".jsx",
	".mjs",
	".cjs",
] as const;

/**
 * Directories ripgrep will happily return but that never help context
 * selection — build output and vendored copies. `.gitignore` usually covers
 * these; this is the safety net for repos that commit them.
 */
const NOISE_SEGMENTS = new Set([
	"node_modules",
	"dist",
	"build",
	"out",
	"coverage",
	".next",
	".turbo",
	".cache",
	"vendor",
	"generated",
]);

/** Minified and generated bundles blow the budget and teach us nothing. */
const NOISE_FILE_PATTERN = /\.(min|bundle|generated)\.[cm]?[jt]sx?$/i;

export interface ScanOptions {
	/** Absolute path of the repository root. */
	root: string;
	/** Files larger than this are skipped. Default 512 KB. */
	maxFileBytes?: number;
	/** Overrides `SOURCE_EXTENSIONS` when provided. */
	extensions?: readonly string[];
}

export interface ScannedFile {
	/** Repo-relative, POSIX separators. */
	path: string;
	bytes: number;
}

export interface ScanResult {
	files: ScannedFile[];
	/** Total entries ripgrep returned, before any filtering. */
	totalIndexed: number;
	/** False when the SDK fell back to its non-.gitignore-aware walk. */
	usedRipgrep: boolean;
}

function hasNoiseSegment(relativePath: string): boolean {
	return relativePath
		.split("/")
		.some((segment) => NOISE_SEGMENTS.has(segment));
}

function isSourceFile(
	relativePath: string,
	extensions: readonly string[],
): boolean {
	if (hasNoiseSegment(relativePath) || NOISE_FILE_PATTERN.test(relativePath)) {
		return false;
	}
	const ext = path.extname(relativePath).toLowerCase();
	return extensions.includes(ext);
}

/**
 * The SDK's fallback walk always yields `node_modules`-free output but keeps
 * gitignored files. Presence of a gitignored-by-convention path is a good
 * enough signal that ripgrep did not run.
 */
function looksLikeFallbackWalk(indexed: Set<string>): boolean {
	for (const file of indexed) {
		if (file.startsWith(".git/")) {
			return true;
		}
	}
	return false;
}

/**
 * Keeps the event loop alive across an await.
 *
 * `getFileIndex` resolves from a worker thread, and the SDK calls `unref()` on
 * both that worker and its fallback timeout — deliberately, so indexing can
 * never delay a host's shutdown. The side effect is that nothing ref'd is
 * pending while we wait: under Bun, a program whose entry point is
 * `main().catch(...)` rather than a top-level `await` simply exits 0 mid-scan,
 * with no error and no output.
 *
 * A ref'd timer for the duration of the call removes the sharp edge, so
 * callers do not have to know about it.
 */
async function withEventLoopHeld<T>(operation: () => Promise<T>): Promise<T> {
	const held = setInterval(() => {}, 1000);
	try {
		return await operation();
	} finally {
		clearInterval(held);
	}
}

export async function scanRepo(options: ScanOptions): Promise<ScanResult> {
	const maxFileBytes = options.maxFileBytes ?? 512 * 1024;
	const extensions = options.extensions ?? SOURCE_EXTENSIONS;

	const indexed = await withEventLoopHeld(() => getFileIndex(options.root));
	const candidates = [...indexed].filter((file) =>
		isSourceFile(file, extensions),
	);

	// Sizes come from stat because the index carries paths only. Unreadable
	// entries are dropped rather than thrown on — a repo being scanned is
	// allowed to change underneath us.
	const sized = await Promise.all(
		candidates.map(async (relativePath): Promise<ScannedFile | undefined> => {
			try {
				const info = await stat(path.join(options.root, relativePath));
				if (!info.isFile() || info.size > maxFileBytes || info.size === 0) {
					return undefined;
				}
				return { path: relativePath, bytes: info.size };
			} catch {
				return undefined;
			}
		}),
	);

	const files = sized.filter((file): file is ScannedFile => file !== undefined);
	files.sort((a, b) => a.path.localeCompare(b.path));

	return {
		files,
		totalIndexed: indexed.size,
		usedRipgrep: !looksLikeFallbackWalk(indexed),
	};
}
