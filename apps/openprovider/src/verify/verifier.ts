/**
 * Faz 3, adım 1 ve 3 — doğrulama ve rapor.
 *
 * After a task finishes, run whatever the project already defines for build
 * and test, then summarise what happened alongside the files that changed.
 *
 * The roadmap is explicit that a project without those scripts is skipped
 * **silently**. Most repositories do not have both, and an agent that
 * complains about a missing `build` script every single turn is an agent
 * people switch off.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
	buildScriptCommand,
	type CommandResult,
	detectPackageManager,
	runCommand,
} from "./runner";

/** Script names tried, in order, for each step. First match wins. */
const BUILD_SCRIPTS = ["build", "compile"] as const;
const TEST_SCRIPTS = ["test", "test:unit"] as const;
/** A typecheck is a cheap stand-in when there is no build script. */
const TYPECHECK_SCRIPTS = ["typecheck", "check-types", "check"] as const;

export type StepName = "build" | "test";

export interface StepResult {
	step: StepName;
	/** Undefined when no matching script existed — the step was skipped. */
	result?: CommandResult;
	skippedReason?: string;
}

export interface VerificationReport {
	steps: StepResult[];
	changedFiles: string[];
	/** False when any step that ran failed. Skipped steps do not fail it. */
	ok: boolean;
	durationMs: number;
}

async function readScripts(
	projectDir: string,
): Promise<Record<string, string> | undefined> {
	try {
		const text = await readFile(path.join(projectDir, "package.json"), "utf8");
		const parsed = JSON.parse(text) as { scripts?: Record<string, string> };
		return parsed.scripts ?? {};
	} catch {
		return undefined;
	}
}

function pickScript(
	scripts: Record<string, string>,
	candidates: readonly string[],
): string | undefined {
	return candidates.find((name) => typeof scripts[name] === "string");
}

/** Files git reports as modified. Empty when the directory is not a repo. */
export async function changedFiles(projectDir: string): Promise<string[]> {
	const result = await runCommand(["git", "status", "--porcelain"], {
		cwd: projectDir,
		timeoutMs: 15_000,
	});
	if (!result.ok) {
		return [];
	}
	return result.output
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
		// Porcelain format is "XY path"; the status letters are not wanted here.
		.map((line) => line.replace(/^\S+\s+/, ""));
}

export interface VerifyOptions {
	projectDir: string;
	timeoutMs?: number;
	onStep?: (message: string) => void;
}

/** Runs build and test where they exist, and collects the changed files. */
export async function verify(
	options: VerifyOptions,
): Promise<VerificationReport> {
	const startedAt = Date.now();
	const scripts = await readScripts(options.projectDir);
	const steps: StepResult[] = [];

	if (!scripts) {
		// No package.json at all: nothing to verify, and that is not a failure.
		return {
			steps: [
				{ step: "build", skippedReason: "no package.json" },
				{ step: "test", skippedReason: "no package.json" },
			],
			changedFiles: await changedFiles(options.projectDir),
			ok: true,
			durationMs: Date.now() - startedAt,
		};
	}

	const manager = detectPackageManager(options.projectDir);

	const plan: Array<{ step: StepName; candidates: readonly string[] }> = [
		{ step: "build", candidates: [...BUILD_SCRIPTS, ...TYPECHECK_SCRIPTS] },
		{ step: "test", candidates: TEST_SCRIPTS },
	];

	for (const { step, candidates } of plan) {
		const script = pickScript(scripts, candidates);
		if (!script) {
			steps.push({ step, skippedReason: `no ${step} script` });
			continue;
		}
		options.onStep?.(`running ${manager} run ${script}`);
		const result = await runCommand(buildScriptCommand(manager, script), {
			cwd: options.projectDir,
			timeoutMs: options.timeoutMs,
		});
		steps.push({ step, result });
	}

	return {
		steps,
		changedFiles: await changedFiles(options.projectDir),
		ok: steps.every((entry) => entry.result === undefined || entry.result.ok),
		durationMs: Date.now() - startedAt,
	};
}

/** One-line status per step, for the human-facing summary. */
function describeStep(entry: StepResult): string {
	if (!entry.result) {
		return `${entry.step}: skipped (${entry.skippedReason})`;
	}
	if (entry.result.timedOut) {
		return `${entry.step}: TIMED OUT after ${entry.result.durationMs}ms`;
	}
	return `${entry.step}: ${entry.result.ok ? "passed" : "FAILED"} (${entry.result.durationMs}ms)`;
}

/** Faz 3, adım 3 — the short summary shown when a task ends. */
export function formatReport(report: VerificationReport): string {
	const lines: string[] = ["Task summary", "------------"];

	lines.push(
		report.changedFiles.length > 0
			? `changed files (${report.changedFiles.length}):`
			: "changed files: none",
	);
	for (const file of report.changedFiles.slice(0, 20)) {
		lines.push(`  ${file}`);
	}
	if (report.changedFiles.length > 20) {
		lines.push(`  …and ${report.changedFiles.length - 20} more`);
	}

	for (const entry of report.steps) {
		lines.push(describeStep(entry));
	}

	return lines.join("\n");
}

/**
 * The failure text handed back to the model on a retry.
 *
 * Only failing steps are included, and only their output — a passing build's
 * log is noise that costs tokens the free tier does not have.
 */
export function formatFailureFeedback(report: VerificationReport): string {
	const failures = report.steps.filter(
		(entry) => entry.result && !entry.result.ok,
	);
	if (failures.length === 0) {
		return "";
	}

	const sections = failures.map((entry) => {
		const result = entry.result as CommandResult;
		const reason = result.timedOut
			? `timed out after ${result.durationMs}ms`
			: `exited with code ${result.exitCode}`;
		return `### ${entry.step} failed (${result.command}, ${reason})\n\n\`\`\`\n${result.output}\n\`\`\``;
	});

	return [
		"The change did not pass verification. Fix the cause of these failures.",
		"",
		...sections,
	].join("\n");
}
