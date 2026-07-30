/**
 * OpenProvider verification — run the project's own build and tests after a
 * task, feed failures back once, and report.
 *
 * ```ts
 * const result = await runVerifiedTask({
 *   prompt: "make the tests pass",
 *   projectDir,
 *   run: async ({ prompt }) => ({ text: await agent.run(prompt).then(r => r.text) }),
 * })
 * console.log(result.summary)
 * ```
 */
export {
	type RunVerifiedTaskOptions,
	runVerifiedTask,
	type TaskAttempt,
	type TaskRunner,
	type VerifiedTaskResult,
} from "./retry";
export {
	buildScriptCommand,
	type CommandResult,
	detectPackageManager,
	type PackageManager,
	runCommand,
	type RunOptions,
} from "./runner";
export {
	changedFiles,
	formatFailureFeedback,
	formatReport,
	type StepName,
	type StepResult,
	verify,
	type VerificationReport,
	type VerifyOptions,
} from "./verifier";
