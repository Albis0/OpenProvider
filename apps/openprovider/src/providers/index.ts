/**
 * Provider compatibility — what each free-tier provider actually does, and how
 * to keep a request acceptable to it.
 */
export {
	knownProviders,
	type ProviderQuirks,
	quirksFor,
	resolveOutputCap,
	supportsTools,
} from "./quirks";
export {
	createSanitizerTransform,
	type SanitizerOptions,
} from "./sanitizer";
