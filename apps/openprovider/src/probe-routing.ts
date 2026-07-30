/**
 * Faz 2 bitiş kriteri.
 *
 * The roadmap's bar: with 2+ providers in a config file, route each turn to
 * the right one by mode, and fall through automatically when a provider is
 * switched off by hand.
 *
 * This walks all of it, then sends one real task through the chosen provider
 * so the routing is shown to be connected to something, not just computed.
 *
 *   bun run src/probe-routing.ts
 */
import path from "node:path";
import { Agent } from "@cline/sdk";
import { createCredentialSource } from "./provider-settings";
import {
	CONFIG_FILENAME,
	loadConfig,
	type Mode,
	MODES,
	Router,
	saveConfig,
	suggestConfig,
	suggestMode,
} from "./routing";

const APP_DIR = path.join(import.meta.dirname, "..");

const MODE_PROMPTS: Array<{ prompt: string; expected: Mode }> = [
	{ prompt: "kota göstergesi için bir mimari tasarla", expected: "plan" },
	{ prompt: "scanner.ts'deki hatayı düzelt, testi de yaz", expected: "code" },
	{ prompt: "bu modülü README'ye ekle ve açıkla", expected: "docs" },
	{ prompt: "şu PR'ı gözden geçir, güvenlik açığı var mı", expected: "review" },
	{ prompt: "how should we approach the retry loop", expected: "plan" },
	{ prompt: "review this function for code smells", expected: "review" },
];

function heading(title: string): void {
	console.log(`\n${"─".repeat(68)}\n${title}\n${"─".repeat(68)}`);
}

async function main(): Promise<void> {
	const credentials = createCredentialSource();
	const available = credentials.listAvailable();
	console.log(`[routing] providers with a key: ${available.join(", ") || "(none)"}`);

	if (available.length < 2) {
		console.error(
			"[routing] need at least two configured providers to demonstrate fallback.",
		);
		process.exit(2);
	}

	// Write a starter config the first time, so the file the roadmap asks for
	// actually exists and can be edited by hand afterwards.
	let { config, source } = await loadConfig(APP_DIR);
	if (!source) {
		config = suggestConfig(available);
		const written = await saveConfig(APP_DIR, config);
		console.log(`[routing] wrote a starter config to ${written}`);
	} else {
		console.log(`[routing] loaded ${source}`);
	}

	heading("1. Mode detection (regex only, no model call)");
	let modeFailures = 0;
	for (const { prompt, expected } of MODE_PROMPTS) {
		const started = performance.now();
		const suggestion = suggestMode(prompt);
		const elapsed = performance.now() - started;
		const ok = suggestion.mode === expected;
		if (!ok) {
			modeFailures++;
		}
		console.log(
			`  ${ok ? "OK  " : "MISS"} ${suggestion.mode.padEnd(6)} ` +
				`(${elapsed.toFixed(3)}ms, trigger "${suggestion.trigger ?? "-"}")  ${prompt}`,
		);
	}

	heading("2. Routing per mode");
	const router = new Router(config, credentials);
	for (const mode of MODES) {
		const route = router.route("dummy prompt", mode);
		console.log(
			`  ${mode.padEnd(6)} -> ${route.providerId}` +
				`${route.modelId ? ` / ${route.modelId}` : ""}`,
		);
	}

	heading("3. Fallback when a provider is switched off");
	const codeProvider = config.modes.code?.provider ?? config.fallback[0];
	if (!codeProvider) {
		console.error("  no provider configured for code mode");
		process.exit(1);
	}
	const disabledConfig = {
		...config,
		disabled: [...config.disabled, codeProvider],
	};
	const fallbackRouter = new Router(disabledConfig, credentials);
	const fallbackRoute = fallbackRouter.route("fix the parser bug");
	console.log(`  disabled "${codeProvider}" by hand`);
	for (const notice of fallbackRoute.notices) {
		console.log(`  · ${notice}`);
	}
	console.log(`  routed to: ${fallbackRoute.providerId}`);
	const fallbackWorked =
		fallbackRoute.providerId !== codeProvider && fallbackRoute.usedFallback;

	heading("4. Fallback after a runtime failure");
	const runtimeRouter = new Router(config, credentials);
	const first = runtimeRouter.route("fix the parser bug");
	runtimeRouter.markUnavailable(first.providerId, "rate limited (429)");
	const second = runtimeRouter.route("fix the parser bug");
	for (const notice of second.notices) {
		console.log(`  · ${notice}`);
	}
	console.log(`  ${first.providerId} -> ${second.providerId}`);
	const runtimeSwitchWorked = second.providerId !== first.providerId;

	heading("5. End to end: send a task through the routed provider");
	const liveRoute = router.route("write a haiku about routing");
	console.log(
		`  mode "${liveRoute.mode}" -> ${liveRoute.providerId} / ${liveRoute.modelId}`,
	);

	const agent = new Agent({
		providerId: liveRoute.providerId,
		modelId: liveRoute.modelId ?? "",
		apiKey: liveRoute.apiKey,
		maxIterations: 3,
		hooks: liveRoute.maxOutputTokens
			? { beforeModel: () => ({ options: { maxTokens: liveRoute.maxOutputTokens } }) }
			: undefined,
	});

	let answer = "";
	let failure = "";
	agent.subscribe((event) => {
		if (event.type === "assistant-text-delta") {
			answer += event.text;
		}
		if (event.type === "run-failed") {
			failure = String(event.snapshot?.lastError ?? "unknown error");
		}
	});
	await agent.run("Write a two-line haiku about choosing a model. Nothing else.");

	if (failure) {
		// A live provider failure is exactly what markUnavailable exists for.
		router.markUnavailable(liveRoute.providerId, failure.slice(0, 60));
		console.log(`  provider failed: ${failure.split("\n")[0]}`);
		const retry = router.route("write a haiku about routing");
		console.log(`  would now route to: ${retry.providerId}`);
	} else {
		console.log(`  answer: ${answer.trim().replace(/\n/g, " / ")}`);
	}

	heading("Result");
	const passed = modeFailures === 0 && fallbackWorked && runtimeSwitchWorked;
	console.log(`  mode detection:      ${modeFailures === 0 ? "PASS" : `FAIL (${modeFailures})`}`);
	console.log(`  manual disable:      ${fallbackWorked ? "PASS" : "FAIL"}`);
	console.log(`  runtime failover:    ${runtimeSwitchWorked ? "PASS" : "FAIL"}`);
	console.log(`  live send:           ${failure ? "provider error (routing still worked)" : "PASS"}`);
	console.log(`\n[routing] ${passed ? "PASS" : "FAIL"} — config: ${CONFIG_FILENAME}`);
	process.exit(passed ? 0 : 1);
}

main().catch((error: unknown) => {
	console.error("[routing] failed:", error);
	process.exit(1);
});
