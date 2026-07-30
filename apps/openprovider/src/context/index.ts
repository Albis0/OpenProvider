/**
 * OpenProvider context engine — automatic, static-analysis file selection.
 *
 * Usage:
 *
 * ```ts
 * const engine = await ContextEngine.create({ root: process.cwd() })
 * const agent = new Agent({
 *   providerId, modelId, apiKey,
 *   hooks: { beforeModel: createContextHook(engine, { maxOutputTokens: 1024 }) },
 * })
 * ```
 */
export { ContextEngine, type IndexStats, type RenderOptions } from "./engine";
export {
	buildGraph,
	type DependencyGraph,
	expandNeighbourhood,
} from "./graph";
export { createContextHook, type ContextHookOptions } from "./hook";
export {
	disposeParsers,
	type FileFacts,
	parseFile,
	parseFiles,
} from "./parser";
export { rankFiles, type ScoredFile, type ScoreOptions, tokenize } from "./score";
export {
	scanRepo,
	type ScanOptions,
	type ScanResult,
	type ScannedFile,
	SOURCE_EXTENSIONS,
} from "./scanner";
