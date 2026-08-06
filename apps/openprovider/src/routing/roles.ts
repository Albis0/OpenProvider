/**
 * Multi-agent, adım 1 — rol tanımları.
 *
 * A *mode* says what kind of work a turn is. A *role* says which seat in the
 * pipeline is doing that work. They are deliberately separate axes:
 *
 *   mode  = plan | code | docs | review   (what the user asked for)
 *   role  = planner | executor | reviewer (who is handling it right now)
 *
 * A single "fix the scanner bug" turn is mode `code`, but it can still pass
 * through a planner seat first. Collapsing the two would mean a planning role
 * could only ever run planning-mode work, which is exactly backwards — the
 * point of a planner is to plan *someone else's* task.
 *
 * ## Neden SDK'nın AgentTeam'i doğrudan kullanılmadı
 *
 * `@cline/sdk` re-exports `@cline/core`, which does ship `AgentTeam` with a
 * `runPipeline(pipeline, message, messageTransformer)` — inspected before
 * writing any of this, because the roadmap requires building on it if it fits.
 *
 * What fits, and is reused as-is conceptually: `AgentConfig` carries a
 * per-agent `providerId` / `modelId` / `apiKey`, so "each role on a different
 * provider" needs no invention. The pipeline shape below is modelled directly
 * on `runPipeline`.
 *
 * What does not fit, and is why the execution is ours:
 *
 *  1. `runPipeline` `break`s the whole chain the moment one agent throws. This
 *     project's entire reason to exist is that a rate-limited provider should
 *     move to the next provider, not end the task. Per-role failover is
 *     unreachable through that method.
 *  2. `AgentTeam.addAgent` constructs a `SessionRuntime` internally. That
 *     bypasses this project's `AgentFactory` seam, which is what lets the
 *     session run end-to-end with a stub and no network — and it bypasses the
 *     `beforeModel` hook chain (context injection, output cap, sanitizer).
 *
 * So: the *shape* is borrowed, the *execution* stays on `Router` +
 * `AgentFactory`, which already know how to fail over. Swapping in
 * `AgentTeam.runPipeline` later would mean giving up both, so this is not a
 * stepping stone to it.
 */

export const ROLES = ["planner", "executor", "reviewer"] as const;
export type Role = (typeof ROLES)[number];

/**
 * The seat that does the actual work. A chain always contains it; planner and
 * reviewer are optional wrappers around it.
 */
export const CORE_ROLE: Role = "executor";

export function isRole(value: string): value is Role {
	return (ROLES as readonly string[]).includes(value);
}

/**
 * Per-role system prompt.
 *
 * Kept short on purpose. These are prepended to whatever the caller already
 * sends, and free-tier providers bill the system prompt against the same
 * per-minute token budget as the user's actual request (NOTES.md §6), so a
 * 40-line role preamble is a real cost on every turn, not a free instruction.
 *
 * The planner prompt asks for a specific output shape because the next role
 * has to parse it — see `handoff.ts`. It is phrased as a request rather than a
 * strict schema because free-tier models comply with formats unevenly, and the
 * parser is written to degrade rather than fail when they do not.
 */
export const ROLE_PROMPTS: Record<Role, string> = {
	planner: [
		"You are the planner. Do not write the final code.",
		"Break the request into a short ordered list of concrete steps.",
		"Name the files you expect each step to touch.",
		"Format each step as a line starting with a number, e.g. `1. ...`.",
		"Keep it under 8 steps. Be specific, not general.",
	].join(" "),
	executor: [
		"You are the executor. Carry out the work.",
		"If a plan is supplied, follow its steps in order.",
		"Prefer making the change over describing it.",
	].join(" "),
	reviewer: [
		"You are the reviewer. Do not rewrite the work.",
		"Check the result against the original request and report only real problems:",
		"bugs, missed requirements, obvious breakage.",
		"If it is correct, say so in one line and stop.",
	].join(" "),
};
