/**
 * Multi-agent, adım 2 — roller arası devir.
 *
 * The planner's answer arrives as prose, because that is the only thing a
 * chat completion returns. Passing that prose straight to the executor —
 * which is what `AgentTeam.runPipeline` does by default, prefixing it with
 * "Previous agent output:" — throws away the structure the planner was asked
 * to produce and leaves the next role to re-read it.
 *
 * So the text is parsed into a `Handoff` here, and the executor is handed the
 * parsed steps. Nothing new goes over the wire: the transport stays
 * `AgentRunOutcome.text`, exactly the field the single-agent path already
 * uses, so no proto message and no new SDK type is involved. This is a
 * projection of an existing message, not a new one.
 *
 * ## Neden serbest metin ayrıştırılıyor, JSON istenmiyor
 *
 * Asking for JSON and parsing it would be stricter. It was rejected: the
 * providers this project targets are free tiers running small models, and
 * measured behaviour on them (NOTES.md, Groq tool loops) is that structured
 * output compliance is uneven — a model that wraps its JSON in prose, or
 * emits a trailing comma, would take the whole chain down. A numbered list is
 * the format models are most reliable at, and the parser below degrades to
 * "one step containing everything" rather than failing when the shape is not
 * what was asked for.
 */
import type { Role } from "./roles";

export interface HandoffStep {
	/** 1-based, as the planner numbered it. Renumbered if the model skipped. */
	index: number;
	text: string;
	/** File paths mentioned in the step, if any. */
	files: string[];
}

export interface Handoff {
	/** Role that produced this. */
	from: Role;
	steps: HandoffStep[];
	/** The original text, kept so nothing is lost when parsing under-reads. */
	raw: string;
	/**
	 * True when the text actually looked like a plan. False means the parser
	 * fell back to treating the whole output as one step — worth surfacing,
	 * because it usually means the planner ignored the format.
	 */
	structured: boolean;
}

/**
 * Lines like `1. do the thing` / `2) do the other`.
 *
 * Bullets (`-`, `*`) are deliberately not matched: models use them for
 * sub-points inside a step far more often than for the steps themselves, and
 * treating those as top-level steps shreds a good plan into fragments.
 */
const STEP_LINE = /^\s{0,3}(\d{1,2})[.)]\s+(.*)$/;

/**
 * Path-shaped tokens: at least one slash or a known code extension.
 *
 * Kept loose. A false positive costs a wrong hint in the executor's prompt; a
 * false negative costs the file not being mentioned. Neither is fatal, so a
 * simple pattern beats a strict one that misses `apps/x/y.ts` variants.
 */
const FILE_TOKEN =
	/\b[\w.-]+(?:[/\\][\w.-]+)+(?:\.\w{1,6})?\b|\b[\w-]+\.(?:ts|tsx|js|jsx|json|md|mjs|cjs|css|proto)\b/g;

function extractFiles(text: string): string[] {
	const matches = text.match(FILE_TOKEN);
	if (!matches) {
		return [];
	}
	// Backticks are how models fence paths; strip them so the same file does
	// not appear twice in two spellings.
	const cleaned = matches.map((match) => match.replace(/[`'"]/g, ""));
	return [...new Set(cleaned)];
}

/** Turns a planner's prose into steps. Never throws. */
export function parseHandoff(from: Role, raw: string): Handoff {
	const steps: HandoffStep[] = [];

	for (const line of raw.split(/\r?\n/)) {
		const match = STEP_LINE.exec(line);
		if (!match) {
			continue;
		}
		const text = (match[2] ?? "").trim();
		if (text.length === 0) {
			continue;
		}
		steps.push({
			// Renumbered rather than trusting the model's own numbering, which
			// is often "1. 2. 2. 3." on smaller models.
			index: steps.length + 1,
			text,
			files: extractFiles(text),
		});
	}

	if (steps.length === 0) {
		const trimmed = raw.trim();
		return {
			from,
			raw,
			structured: false,
			steps:
				trimmed.length > 0
					? [{ index: 1, text: trimmed, files: extractFiles(trimmed) }]
					: [],
		};
	}

	return { from, raw, structured: true, steps };
}

/** Every file the plan expects to touch, deduplicated. */
export function handoffFiles(handoff: Handoff): string[] {
	return [...new Set(handoff.steps.flatMap((step) => step.files))];
}

/**
 * Renders a handoff into the next role's prompt.
 *
 * The original request is repeated above the plan on purpose. The executor is
 * a separate agent with no shared transcript — it has never seen what the
 * user actually asked for, only what the planner made of it, and a plan that
 * drifted would otherwise be the executor's only source of truth.
 */
export function renderHandoff(
	handoff: Handoff,
	originalPrompt: string,
): string {
	const lines: string[] = [
		"Original request:",
		originalPrompt.trim(),
		"",
	];

	if (!handoff.structured) {
		lines.push(
			`Notes from the ${handoff.from} (unstructured):`,
			handoff.raw.trim(),
		);
		return lines.join("\n");
	}

	lines.push(`Plan from the ${handoff.from}:`);
	for (const step of handoff.steps) {
		lines.push(`${step.index}. ${step.text}`);
	}

	const files = handoffFiles(handoff);
	if (files.length > 0) {
		lines.push("", `Files the plan expects to touch: ${files.join(", ")}`);
	}

	lines.push("", "Carry out the plan. Follow the steps in order.");
	return lines.join("\n");
}

/**
 * Renders the reviewer's prompt.
 *
 * Separate from `renderHandoff` because the reviewer's job is a comparison,
 * not a continuation: it needs the request and the result side by side, and
 * must not be told to "carry out" anything.
 */
export function renderReviewPrompt(
	originalPrompt: string,
	executorOutput: string,
	plan?: Handoff,
): string {
	const lines: string[] = ["Original request:", originalPrompt.trim(), ""];

	if (plan?.structured) {
		lines.push("Plan that was followed:");
		for (const step of plan.steps) {
			lines.push(`${step.index}. ${step.text}`);
		}
		lines.push("");
	}

	lines.push(
		"Result produced:",
		executorOutput.trim(),
		"",
		"Review the result against the request. Report only real problems.",
	);
	return lines.join("\n");
}
