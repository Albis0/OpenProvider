/**
 * Faz 3, adım 2 — hata geri besleme, tek retry.
 *
 * Run a task, verify it, and on failure hand the build/test output back to the
 * agent exactly once. If the second attempt also fails, stop and show the
 * human the error.
 *
 * The cap is one retry, and it is enforced by structure rather than by a
 * counter that a future edit could raise. An agent that cannot fix its own
 * output in one guided attempt is usually wrong about the problem, and each
 * further round burns a free-tier quota to repeat the same mistake.
 */
import {
	formatFailureFeedback,
	formatReport,
	verify,
	type VerificationReport,
} from "./verifier";

export interface TaskAttempt {
	prompt: string;
	/** 1 for the first attempt, 2 for the retry. */
	attempt: number;
}

/** Runs one attempt. Errors are returned, not thrown. */
export type TaskRunner = (
	input: TaskAttempt,
) => Promise<{ text: string; error?: string }>;

export interface VerifiedTaskResult {
	ok: boolean;
	/** 1 when the first attempt verified, 2 when a retry was needed. */
	attempts: number;
	retried: boolean;
	/** Model output per attempt, in order. */
	outputs: string[];
	/** Verification after the final attempt. */
	report: VerificationReport;
	/** Verification after the first attempt, when a retry followed. */
	firstReport?: VerificationReport;
	/** Ready-to-print summary. */
	summary: string;
}

export interface RunVerifiedTaskOptions {
	prompt: string;
	projectDir: string;
	run: TaskRunner;
	timeoutMs?: number;
	onEvent?: (message: string) => void;
}

function buildRetryPrompt(originalPrompt: string, feedback: string): string {
	return [
		"Your previous change did not pass verification.",
		"",
		feedback,
		"",
		"Fix the underlying cause. The original request was:",
		"",
		originalPrompt,
	].join("\n");
}

export async function runVerifiedTask(
	options: RunVerifiedTaskOptions,
): Promise<VerifiedTaskResult> {
	const { prompt, projectDir, run, timeoutMs, onEvent } = options;
	const outputs: string[] = [];

	onEvent?.("attempt 1: running task");
	const first = await run({ prompt, attempt: 1 });
	outputs.push(first.text);
	if (first.error) {
		onEvent?.(`attempt 1 reported an error: ${first.error}`);
	}

	onEvent?.("attempt 1: verifying");
	const firstReport = await verify({
		projectDir,
		timeoutMs,
		onStep: (message) => onEvent?.(`  ${message}`),
	});

	if (firstReport.ok) {
		onEvent?.("verification passed on the first attempt");
		return {
			ok: true,
			attempts: 1,
			retried: false,
			outputs,
			report: firstReport,
			summary: formatReport(firstReport),
		};
	}

	const feedback = formatFailureFeedback(firstReport);
	onEvent?.("verification failed — feeding the output back for one retry");

	const second = await run({
		prompt: buildRetryPrompt(prompt, feedback),
		attempt: 2,
	});
	outputs.push(second.text);
	if (second.error) {
		onEvent?.(`attempt 2 reported an error: ${second.error}`);
	}

	onEvent?.("attempt 2: verifying");
	const secondReport = await verify({
		projectDir,
		timeoutMs,
		onStep: (message) => onEvent?.(`  ${message}`),
	});

	// Deliberately terminal: there is no third attempt, whatever happened.
	if (!secondReport.ok) {
		onEvent?.("still failing after the retry — stopping and reporting");
	}

	return {
		ok: secondReport.ok,
		attempts: 2,
		retried: true,
		outputs,
		report: secondReport,
		firstReport,
		summary: [
			formatReport(secondReport),
			"",
			secondReport.ok
				? "Recovered on the automatic retry."
				: "Still failing after one automatic retry — needs a human.",
		].join("\n"),
	};
}
