/**
 * "Is this failure worth switching providers over?"
 *
 * ## Neden ayrı bir katman
 *
 * The first version of this decision was a single regex list inside
 * `ClineError.getErrorType()`. It missed NVIDIA's real wording —
 * `ResourceExhausted: Worker local total request limit reached (32/32)` —
 * because the pattern wanted a space in "resource exhausted" and NVIDIA writes
 * the gRPC status name camel-cased. No 429, no "rate limit" anywhere in the
 * string.
 *
 * The bug itself was one character of regex. The *lesson* was structural: a
 * single list of phrasings makes every unfamiliar provider a **silent**
 * failure, and silent is the worst kind — the user believes failover is
 * running and it simply is not. Adding NVIDIA's phrasing to the list fixes
 * NVIDIA and leaves the next provider exactly as broken.
 *
 * So the decision is layered, cheapest and most reliable signal first:
 *
 *   1. HTTP status      — a number, no wording involved
 *   2. Error / status code — machine-readable, provider-independent
 *   3. Known phrasings  — regex, last resort
 *   4. Repetition       — "unknown, but it just failed twice"
 *
 * Layer 4 is the safety net that makes the other three non-critical: a
 * provider whose wording nobody has ever seen still fails over on its second
 * attempt, instead of ending the task. That is the property the regex list
 * could never have.
 *
 * This module answers *what happened*. It deliberately does not decide *what
 * to do* — that is `provider-failover.ts` (which provider next) and
 * `sdk-failover-coordinator.ts` (ask/auto/stop).
 */
import { ClineError, ClineErrorType } from "@/services/error/ClineError"
import { parseRetryDelay } from "./rate-limit"

/** What kind of failure this is, as far as failover is concerned. */
export type FailureKind =
	/** Throttled. Another provider will very likely work right now. */
	| "rate-limit"
	/** Provider is up but refusing work (overloaded, capacity). Also worth moving. */
	| "overloaded"
	/** Unknown, but this provider has now failed repeatedly in one turn. */
	| "repeated-failure"
	/** Something failover cannot help with — bad key, bad request, our own bug. */
	| "not-failover-worthy"

export interface FailureClassification {
	kind: FailureKind
	/** True for every kind except `not-failover-worthy`. */
	shouldFailover: boolean
	/** Which layer decided, for logs and tests. */
	signal: "http-status" | "error-code" | "phrase" | "repetition" | "none"
	/** How long the provider asked us to wait, when it said. */
	retryAfterMs?: number
	/** One line, for the user. */
	summary: string
}

export interface ClassifyInput {
	/** The raw error, as thrown or as carried on an agent error event. */
	error: unknown
	/** Provider that produced it, when known. */
	providerId?: string
	modelId?: string
	/**
	 * How many times this provider has already failed during the current turn,
	 * not counting this failure. Drives layer 4.
	 */
	priorFailuresThisTurn?: number
}

/**
 * HTTP statuses that mean "come back later", not "you did something wrong".
 *
 * 402 is deliberately absent: out of credit is a real dead end that switching
 * cannot fix, and moving the user onto a different paid provider silently
 * would spend money they did not agree to spend.
 */
const RETRYABLE_STATUS: Record<number, FailureKind> = {
	429: "rate-limit",
	// Anthropic's "overloaded_error" surfaces as 529; the rest are standard.
	500: "overloaded",
	502: "overloaded",
	503: "overloaded",
	504: "overloaded",
	529: "overloaded",
}

/**
 * Machine-readable codes, checked before any prose.
 *
 * gRPC status names arrive in several spellings depending on how the provider
 * serializes them (`RESOURCE_EXHAUSTED`, `ResourceExhausted`, `resource-exhausted`),
 * so they are matched on a normalized form rather than listed one by one.
 */
const RATE_LIMIT_CODES = new Set([
	"resourceexhausted",
	"ratelimitexceeded",
	"ratelimited",
	"toomanyrequests",
	"quotaexceeded",
	"insufficientquota",
	"429",
])

const OVERLOADED_CODES = new Set(["unavailable", "overloaded", "overloadederror", "serverbusy", "capacityexceeded"])

/** Strips case, spaces, underscores and dashes so all spellings collapse to one. */
function normalizeCode(value: unknown): string | undefined {
	if (typeof value !== "string" || value.length === 0) {
		return undefined
	}
	return value.toLowerCase().replace(/[\s_-]/g, "")
}

/**
 * Phrasings, the last resort before repetition.
 *
 * Kept here rather than in `ClineError` so that adding a provider's wording is
 * a change to the failover feature, not to the shared error type used by
 * unrelated UI. `ClineError.getErrorType()` still has its own list for the
 * error banner; the two answer different questions and are allowed to differ.
 */
const RATE_LIMIT_PHRASES = [
	/rate[\s_-]?limit/i,
	/too many requests/i,
	/quota (?:exceeded|exhausted|reached)/i,
	/resource[\s_-]?exhausted/i,
	// NVIDIA. Mentions neither rate nor quota, so it needs its own entry.
	/request limit reached/i,
	/limit reached \(\d+\s*\/\s*\d+\)/i,
	/out of capacity/i,
]

const OVERLOADED_PHRASES = [/overloaded/i, /server is busy/i, /temporarily unavailable/i, /try again later/i]

/**
 * Failures switching cannot fix. Checked first so a repeated auth failure is
 * never mistaken for a capacity problem by layer 4 — walking an expired key
 * across five providers produces five identical errors and hides the real one.
 */
const TERMINAL_PHRASES = [
	/(?:in)?valid[\s_-]?(?:api[\s_-]?)?(?:token|key)/i,
	/authentication[\s_-]?failed/i,
	/unauthorized/i,
	/permission denied/i,
	/insufficient (?:funds|credit|balance)/i,
	/model not found/i,
	/unsupported parameter/i,
]

/** Digs a message string out of whatever shape the error arrived in. */
function extractMessage(error: unknown): string {
	if (typeof error === "string") {
		return error
	}
	if (error instanceof Error) {
		return error.message
	}
	if (error && typeof error === "object") {
		const record = error as Record<string, unknown>
		const candidate = record.message ?? record.error ?? record.detail ?? record.title
		if (typeof candidate === "string") {
			return candidate
		}
	}
	return String(error ?? "")
}

/** Pulls an HTTP status out of the several places providers put it. */
function extractStatus(error: unknown): number | undefined {
	if (!error || typeof error !== "object") {
		return undefined
	}
	const record = error as Record<string, any>
	const candidates = [record.status, record.statusCode, record.response?.status, record.error?.status]
	for (const candidate of candidates) {
		if (typeof candidate === "number" && Number.isFinite(candidate)) {
			return candidate
		}
	}
	return undefined
}

/** Pulls a code or gRPC status name out of the error, or off the message prefix. */
function extractCode(error: unknown, message: string): string | undefined {
	if (error && typeof error === "object") {
		const record = error as Record<string, any>
		const direct = record.code ?? record.error?.code ?? record.cause?.code ?? record.status_code ?? record.grpcStatus
		const normalized = normalizeCode(direct)
		if (normalized) {
			return normalized
		}
	}
	// gRPC-style errors commonly arrive as "ResourceExhausted: <detail>", where
	// the status name is only ever present as the message prefix.
	const prefix = /^\s*([A-Za-z][A-Za-z0-9_-]{2,40})\s*:/.exec(message)
	return normalizeCode(prefix?.[1])
}

function firstLine(message: string): string {
	return message.split("\n")[0]?.trim() || message.trim()
}

/**
 * Decides whether a failure is worth moving the task to another provider.
 *
 * Never throws: a classifier that crashes would take down the error path it
 * was added to protect.
 */
export function classifyFailure(input: ClassifyInput): FailureClassification {
	const message = extractMessage(input.error)
	const summary = firstLine(message) || "Provider request failed"
	const retryAfterMs = parseRetryDelay(message)

	const terminate = (): FailureClassification => ({
		kind: "not-failover-worthy",
		shouldFailover: false,
		signal: "none",
		retryAfterMs,
		summary,
	})

	// Terminal first. A wrong key that fails on every provider must not be
	// promoted to "repeated failure" by layer 4 and dragged across the chain.
	if (TERMINAL_PHRASES.some((pattern) => pattern.test(message))) {
		return terminate()
	}

	// Layer 1 — status code. A number cannot be phrased wrong.
	const status = extractStatus(input.error)
	if (status !== undefined) {
		const kind = RETRYABLE_STATUS[status]
		if (kind) {
			return { kind, shouldFailover: true, signal: "http-status", retryAfterMs, summary }
		}
		// A 4xx that is not 429 is our request being wrong; another provider
		// would reject it the same way.
		if (status >= 400 && status < 500) {
			return terminate()
		}
	}

	// Layer 2 — machine-readable code.
	const code = extractCode(input.error, message)
	if (code) {
		if (RATE_LIMIT_CODES.has(code)) {
			return { kind: "rate-limit", shouldFailover: true, signal: "error-code", retryAfterMs, summary }
		}
		if (OVERLOADED_CODES.has(code)) {
			return { kind: "overloaded", shouldFailover: true, signal: "error-code", retryAfterMs, summary }
		}
	}

	// Layer 3 — known phrasings.
	if (RATE_LIMIT_PHRASES.some((pattern) => pattern.test(message))) {
		return { kind: "rate-limit", shouldFailover: true, signal: "phrase", retryAfterMs, summary }
	}
	if (OVERLOADED_PHRASES.some((pattern) => pattern.test(message))) {
		return { kind: "overloaded", shouldFailover: true, signal: "phrase", retryAfterMs, summary }
	}

	// The shared classifier gets a say too, so anything it already recognises
	// (and any future addition to it) keeps working here.
	try {
		if (ClineError.transform(input.error, input.modelId, input.providerId).isErrorType(ClineErrorType.RateLimit)) {
			return { kind: "rate-limit", shouldFailover: true, signal: "phrase", retryAfterMs, summary }
		}
	} catch {
		// Transform is best-effort; its failure must not break classification.
	}

	// Layer 4 — repetition. Nothing above recognised this, but the provider has
	// now failed more than once in a single turn, so staying is the worse bet.
	if ((input.priorFailuresThisTurn ?? 0) >= 1) {
		return { kind: "repeated-failure", shouldFailover: true, signal: "repetition", retryAfterMs, summary }
	}

	return terminate()
}

/** Wording for the "why did/didn't it switch" line shown to the user. */
export function describeFailureKind(kind: FailureKind): string {
	switch (kind) {
		case "rate-limit":
			return "hit its rate limit"
		case "overloaded":
			return "is overloaded"
		case "repeated-failure":
			return "failed twice in a row"
		case "not-failover-worthy":
			return "returned an error that switching cannot fix"
	}
}
