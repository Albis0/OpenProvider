/**
 * Multi-agent, adım 3 — zincir seçimi.
 *
 * Decides which roles run for a turn, before any model is called.
 *
 * The rule that matters is the *skip*: a one-file, one-step request runs the
 * executor alone. Three roles is three round trips and roughly three times
 * the tokens, and on the free tiers this project targets that is not a
 * rounding error — it is the difference between finishing inside a per-minute
 * quota and hitting a 429 on your own second call.
 *
 * As with mode selection, the decision is a keyword and shape test, never a
 * model call. Asking a model "is this task complex?" would add exactly the
 * latency and cost the chain-skip exists to avoid, and would be its own
 * failure point when the classifying provider is the rate-limited one.
 */
import type { RoleConfig } from "./config";
import { CORE_ROLE, type Role, ROLES } from "./roles";

export interface ChainPlan {
	roles: Role[];
	/** True when planner/reviewer were dropped for being unnecessary. */
	skipped: boolean;
	/** Why, in one line. Shown to the user. */
	reason: string;
}

/** Only the executor. The pre-multi-agent behaviour, exactly. */
function soloPlan(reason: string, skipped: boolean): ChainPlan {
	return { roles: [CORE_ROLE], skipped, reason };
}

/**
 * Signals that a request is more than a single edit.
 *
 * Turkish and English, for the same reason `modes.ts` carries both: prompts on
 * this project are written in Turkish, and an English-only table silently
 * degrades to "nothing is ever complex".
 */
const COMPLEX_PATTERNS: RegExp[] = [
	// Explicit multi-step language.
	/\b(önce|sonra|ardından|then|after\s+that|first.*then|step\s*\d|adım\s*\d)\b/iu,
	// Breadth words.
	/\b(refactor\w*|yeniden\s+yaz\w*|migrat\w*|taşı\w*|rewrite|redesign|mimari|architect\w*)\b/iu,
	// Explicitly plural work.
	/\b(hepsi|tüm\s+\w+|tum\s+\w+|bütün|butun|all\s+the\s+\w+|every\s+\w+|across\s+the)\b/iu,
	// Planning language: if they asked for a plan, they want a planner.
	/\b(planla\w*|plan\s+out|tasarla\w*|strateji)\b/iu,
];

/** Path-shaped tokens, to count how many files a prompt names. */
const FILE_MENTION =
	/\b[\w.-]+(?:[/\\][\w.-]+)+(?:\.\w{1,6})?\b|\b[\w-]+\.(?:ts|tsx|js|jsx|json|md|mjs|cjs|css|proto)\b/g;

/** Prompts longer than this are treated as substantial regardless of keywords. */
const LONG_PROMPT_CHARS = 400;

export interface ComplexitySignal {
	complex: boolean;
	reason: string;
}

/**
 * Whether a request looks like it needs more than one seat.
 *
 * Exported because the probe asserts on it directly — the skip is the part of
 * this feature most likely to be wrong in a way that costs the user money, so
 * it is testable without running a chain.
 */
export function assessComplexity(prompt: string): ComplexitySignal {
	for (const pattern of COMPLEX_PATTERNS) {
		const match = pattern.exec(prompt);
		if (match) {
			return { complex: true, reason: `multi-step wording ("${match[0]}")` };
		}
	}

	const files = new Set(prompt.match(FILE_MENTION) ?? []);
	if (files.size > 1) {
		return { complex: true, reason: `${files.size} files named` };
	}

	if (prompt.trim().length > LONG_PROMPT_CHARS) {
		return { complex: true, reason: "long request" };
	}

	return { complex: false, reason: "single-step request" };
}

export interface PlanChainOptions {
	/**
	 * Forces the full chain even when the request looks simple. For a caller
	 * who knows better than the keyword table.
	 */
	force?: boolean;
}

/**
 * Works out the roles for a turn.
 *
 * The executor is always present and always last-but-one: a chain with no
 * executor would plan and review work that nobody did.
 */
export function planChain(
	prompt: string,
	config: RoleConfig,
	options: PlanChainOptions = {},
): ChainPlan {
	if (!config.enabled) {
		return soloPlan("role chain is disabled in the config", false);
	}

	const enabled = ROLES.filter((role) => {
		if (role === CORE_ROLE) {
			return true;
		}
		const target = config.roles[role];
		// A role has to be both present and not switched off. Absent means the
		// user never configured it, which is not the same as wanting it.
		return target !== undefined && target.enabled !== false;
	});

	if (enabled.length === 1) {
		return soloPlan("only the executor is configured", false);
	}

	if (options.force) {
		return { roles: enabled, skipped: false, reason: "chain forced by caller" };
	}

	const signal = assessComplexity(prompt);
	if (!signal.complex) {
		return soloPlan(`skipped planner/reviewer — ${signal.reason}`, true);
	}

	return { roles: enabled, skipped: false, reason: signal.reason };
}

/** Human-readable one-liner for the event log. */
export function describeChain(plan: ChainPlan): string {
	return `chain: ${plan.roles.join(" → ")} (${plan.reason})`;
}
