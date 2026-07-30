/**
 * Faz 3, adım 1 — komut çalıştırma.
 *
 * Runs a project's build/test command and captures what it said. Two things
 * matter beyond "spawn a process":
 *
 *   - **A timeout that actually kills.** A hung build must not hang the agent
 *     loop, and on Windows killing the shell does not kill its children, so
 *     the whole process tree is taken down.
 *   - **Bounded output.** A failing test suite can emit megabytes; only the
 *     tail is kept, because the end of a log is where the error is.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

/** Kept from the end of the output. Roughly 400 lines of typical log. */
const MAX_OUTPUT_CHARS = 16_000;

export interface CommandResult {
	command: string;
	/** Exit code, or null when the process was killed. */
	exitCode: number | null;
	ok: boolean;
	/** stdout and stderr interleaved, tail-truncated. */
	output: string;
	durationMs: number;
	timedOut: boolean;
}

export type PackageManager = "bun" | "pnpm" | "yarn" | "npm";

/**
 * Picks the package manager from the lockfile actually present.
 *
 * Guessing wrong is not cosmetic: running `npm test` in a Bun workspace can
 * rewrite the lockfile and pull a different dependency tree.
 */
export function detectPackageManager(projectDir: string): PackageManager {
	const lockfiles: Array<[string, PackageManager]> = [
		["bun.lock", "bun"],
		["bun.lockb", "bun"],
		["pnpm-lock.yaml", "pnpm"],
		["yarn.lock", "yarn"],
		["package-lock.json", "npm"],
	];
	for (const [file, manager] of lockfiles) {
		if (existsSync(path.join(projectDir, file))) {
			return manager;
		}
	}
	return "npm";
}

export function buildScriptCommand(
	manager: PackageManager,
	script: string,
): string[] {
	// `npm` needs `run` for everything except its built-in aliases; the others
	// accept `run` uniformly, so it is always used for predictability.
	return [manager, "run", script];
}

function truncateTail(text: string): string {
	if (text.length <= MAX_OUTPUT_CHARS) {
		return text;
	}
	return `…(${text.length - MAX_OUTPUT_CHARS} characters trimmed)…\n${text.slice(-MAX_OUTPUT_CHARS)}`;
}

export interface RunOptions {
	cwd: string;
	/** Milliseconds before the process tree is killed. Default 5 minutes. */
	timeoutMs?: number;
}

export function runCommand(
	argv: readonly string[],
	options: RunOptions,
): Promise<CommandResult> {
	const [file, ...args] = argv;
	const command = argv.join(" ");
	const timeoutMs = options.timeoutMs ?? 5 * 60_000;
	const startedAt = Date.now();

	return new Promise<CommandResult>((resolve) => {
		if (!file) {
			resolve({
				command,
				exitCode: null,
				ok: false,
				output: "empty command",
				durationMs: 0,
				timedOut: false,
			});
			return;
		}

		const child = spawn(file, args, {
			cwd: options.cwd,
			// `shell` is required on Windows to find `npm.cmd`/`bun.exe` on PATH.
			shell: true,
			windowsHide: true,
			stdio: ["ignore", "pipe", "pipe"],
		});

		let output = "";
		let timedOut = false;

		const append = (chunk: Buffer | string): void => {
			output += chunk.toString();
			// Trim as we go so a runaway process cannot exhaust memory.
			if (output.length > MAX_OUTPUT_CHARS * 4) {
				output = output.slice(-MAX_OUTPUT_CHARS * 2);
			}
		};
		child.stdout?.on("data", append);
		child.stderr?.on("data", append);

		const timer = setTimeout(() => {
			timedOut = true;
			// A shell-spawned child has its own children; killing only the shell
			// leaves the real build running.
			if (process.platform === "win32" && child.pid !== undefined) {
				spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
					windowsHide: true,
					stdio: "ignore",
				});
			} else {
				child.kill("SIGKILL");
			}
		}, timeoutMs);

		const finish = (exitCode: number | null): void => {
			clearTimeout(timer);
			resolve({
				command,
				exitCode,
				ok: !timedOut && exitCode === 0,
				output: truncateTail(output.trim()),
				durationMs: Date.now() - startedAt,
				timedOut,
			});
		};

		child.on("error", (error: Error) => {
			output += `\n${error.message}`;
			finish(null);
		});
		child.on("close", finish);
	});
}
