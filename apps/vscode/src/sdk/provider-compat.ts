/**
 * Per-provider request compatibility — what each API will and will not accept.
 *
 * ## Why this exists as a table
 *
 * "OpenAI-compatible" is not a contract, it is a family resemblance. Providers
 * in that family disagree with each other about the *same field*, and the
 * disagreements only surface on the second request of a tool loop, which is why
 * they read as random breakage in use:
 *
 *   - Groq and Cerebras **reject** `reasoning_content` in assistant history —
 *     the field their own models just produced.
 *   - DeepSeek **requires** it back: drop it and thinking-mode tool calls fail
 *     with 400.
 *   - Gemini requires its thought *signature* back, and that signature rides on
 *     the very reasoning parts a naive strip would delete.
 *
 * So the obvious simplification — "reasoning in history is trouble, strip it
 * everywhere" — is not a safe default. It fixes Groq and breaks DeepSeek and
 * Gemini, and it breaks them in the same invisible, second-request way. The
 * policy therefore has three states and no implicit fallback to stripping.
 *
 * ## Why provider-keyed and not model-keyed
 *
 * The rejection comes from the provider's request validator, not the model.
 * Groq refuses `reasoning_content` whichever model produced it, which is why
 * switching models never helped the user who reported it (2026-08-12).
 *
 * ## What "unknown" costs, and why that is acceptable
 *
 * A provider absent from this table is left alone. That is the conservative
 * choice — we never silently degrade a provider we have not measured — and it
 * used to mean an unknown provider's quirk simply ended the task. It no longer
 * does: `noteReasoningHistoryRejected` lets the runtime record a provider that
 * rejects reasoning the first time it says so, and the repair path retries.
 * The table is the fast path; discovery is the safety net.
 *
 * ## Keys are SDK provider ids
 *
 * Two call sites read this table and they hold different spellings: the session
 * factory has the extension's id, the config builder has the SDK's. They agree
 * for every provider listed here today, but `openai` → `openai-compatible` and
 * `nousresearch` → `nousResearch` do differ, so every lookup is normalized
 * rather than left to coincide.
 */
import { toSdkProviderId } from "./model-catalog/sdk-provider-id"

/**
 * What to do with `reasoning` parts sitting in assistant history.
 *
 * - `strip`   — the provider rejects them; remove before sending.
 * - `require` — the provider needs them back; never remove.
 * - unset     — not measured; leave the SDK's behaviour alone.
 */
export type ReasoningHistoryPolicy = "strip" | "require"

/**
 * How much we actually know about an entry.
 *
 * Kept explicit because the two are not equally trustworthy and the difference
 * decides what to do when an entry seems wrong: a `measured` entry that
 * misbehaves means the provider changed, a `reported` one may simply have been
 * wrong from the start.
 */
type CompatSource =
	/** We hit this ourselves against the live API. */
	| "measured"
	/** Reproduced publicly by others; not yet confirmed here. */
	| "reported"

export interface ProviderCompat {
	reasoningHistory?: ReasoningHistoryPolicy
	/**
	 * Output ceiling to apply when the user has not set one.
	 *
	 * Only meaningful for providers that bill *reserved* output against the same
	 * quota as input: there, an uncapped request reserves the model's full
	 * context (32k+) and is refused outright for a prompt that would have used a
	 * few hundred tokens. Elsewhere a cap only truncates good answers, so it is
	 * left unset.
	 */
	maxOutputTokens?: number
	note: string
	source: CompatSource
	/** When the `measured` claim was taken. These limits move. */
	measuredOn?: string
}

const PROVIDER_COMPAT: Record<string, ProviderCompat> = {
	groq: {
		reasoningHistory: "strip",
		// 8000 TPM shared between input and *reserved* output, confirmed against
		// Groq's own x-ratelimit headers. An uncapped agent request reserves the
		// model's full output window and is rejected before it runs.
		maxOutputTokens: 2048,
		note:
			"Rejects the reasoning_content its own models emit; only bites from the " +
			"second request, so single-turn chat looks healthy while tool loops die. " +
			"Counts reserved output against an 8000 TPM budget.",
		source: "measured",
		measuredOn: "2026-07-31",
	},
	cerebras: {
		reasoningHistory: "strip",
		note:
			"Same rejection as Groq and the same second-turn shape, reported " +
			"independently for both gpt-oss-120b and zai-glm-4.7. Cerebras emits " +
			"reasoning_content and refuses it on input.",
		source: "reported",
	},
	deepseek: {
		// The exact opposite of Groq. Listed explicitly rather than left unset so
		// that a future "strip everywhere" shortcut has to delete a line that says
		// why it must not.
		reasoningHistory: "require",
		note:
			"Requires reasoning_content to be passed back on every subsequent " +
			"request once tools are in play; stripping it produces 400 'the " +
			"reasoning_content in the thinking mode must be passed back'.",
		source: "reported",
	},
	gemini: {
		// Gemini's thought signature is carried on the reasoning part itself (see
		// sdk/packages/llms/src/providers/compat.ts, where a reasoning event's
		// `signature` is read from metadata.thoughtSignature). Dropping the part
		// drops the signature, and Gemini 3.x rejects the next tool turn with
		// "missing thought_signature in functionCall parts".
		reasoningHistory: "require",
		note:
			"Thought signatures ride on reasoning parts and must be returned " +
			"verbatim on the next tool turn. Free tier is ~20 requests/day, which " +
			"one agent session can exhaust.",
		source: "reported",
	},
}

/**
 * Providers discovered to reject reasoning history while running.
 *
 * Separate from the table on purpose: the table is a reviewed claim with a
 * source, this is an observation from one machine in one session. Keeping them
 * apart means a runtime guess never gets mistaken for something we measured.
 *
 * Not persisted. A wrong entry costs one failed request next session, whereas a
 * wrong *persisted* entry would silently degrade a provider forever with no
 * obvious way for the user to clear it.
 */
const learnedRejectors = new Set<string>()

export function compatFor(providerId: string | undefined): ProviderCompat | undefined {
	return providerId ? PROVIDER_COMPAT[toSdkProviderId(providerId)] : undefined
}

/**
 * Whether reasoning must be stripped from history before sending.
 *
 * A provider that `require`s reasoning is never stripped, even if it somehow
 * produced a rejection at runtime — the table is a reviewed claim and a single
 * error is not enough to overturn it. Getting this backwards on DeepSeek would
 * turn a working provider into a broken one.
 */
export function shouldStripReasoningHistory(providerId: string | undefined): boolean {
	if (!providerId) {
		return false
	}
	const declared = compatFor(providerId)?.reasoningHistory
	if (declared) {
		return declared === "strip"
	}
	return learnedRejectors.has(toSdkProviderId(providerId))
}

/**
 * Records that a provider rejected reasoning history, so the next request on it
 * strips. Returns false when the note changes nothing — already known, or the
 * table says this provider needs reasoning kept — which is what stops the
 * repair path from retrying a request it cannot actually repair.
 */
export function noteReasoningHistoryRejected(providerId: string | undefined): boolean {
	if (!providerId || compatFor(providerId)?.reasoningHistory) {
		return false
	}
	const key = toSdkProviderId(providerId)
	if (learnedRejectors.has(key)) {
		return false
	}
	learnedRejectors.add(key)
	return true
}

/** Test seam. Runtime discovery must not leak between test cases. */
export function resetLearnedRejectors(): void {
	learnedRejectors.clear()
}

/**
 * Recognises "you sent me reasoning and I refuse it".
 *
 * Matched on the field name plus a rejection word rather than on any one
 * provider's sentence, because every provider words it differently:
 *
 *   Groq      property 'reasoning_content' is unsupported
 *   Cerebras  messages.2.assistant.reasoning_content: property ... unsupported
 *
 * Deliberately narrow in one respect: DeepSeek's complaint that reasoning
 * "must be passed back" also names the field, and treating that as a rejection
 * would make us strip the very thing it is asking for. That phrasing is
 * excluded explicitly.
 */
export function isReasoningHistoryRejection(error: unknown): boolean {
	const message = extractMessage(error).toLowerCase()
	if (!message.includes("reasoning_content")) {
		return false
	}
	// DeepSeek asking for it back is the opposite problem; stripping would make
	// it worse.
	if (/must be (?:fully )?passed back|must be included|is required/.test(message)) {
		return false
	}
	return /unsupported|not supported|unrecognized|unexpected|unknown (?:field|property|parameter)|invalid/.test(message)
}

function extractMessage(error: unknown): string {
	if (typeof error === "string") {
		return error
	}
	if (error instanceof Error) {
		return error.message
	}
	if (error && typeof error === "object") {
		const record = error as Record<string, unknown>
		const candidate = record.message ?? record.error ?? record.detail
		if (typeof candidate === "string") {
			return candidate
		}
		// Providers nest the useful sentence one level down often enough that
		// giving up at the top level would miss most real rejections.
		try {
			return JSON.stringify(error)
		} catch {
			return ""
		}
	}
	return String(error ?? "")
}

/**
 * Output cap for a provider, or undefined to let the gateway decide.
 *
 * Only consulted after the user's own setting, which always wins — a cap the
 * user did not ask for silently truncating their long answers is worse than the
 * quota error it was meant to prevent.
 */
export function defaultMaxOutputTokens(providerId: string | undefined): number | undefined {
	return compatFor(providerId)?.maxOutputTokens
}

/** Provider ids with a reviewed entry. For diagnostics and tests. */
export function providersWithCompatEntries(): string[] {
	return Object.keys(PROVIDER_COMPAT)
}
