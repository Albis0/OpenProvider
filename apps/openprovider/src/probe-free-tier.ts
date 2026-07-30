/**
 * Faz 0 — why "Request too large" happens on Groq's free tier, and the fix.
 *
 * Symptom: a two-word prompt fails with
 *   "TPM: Limit 8000, Requested 32074, please reduce your message size"
 *
 * The message is misleading. The prompt is ~100 tokens; the other ~32,000 are
 * the *output* budget. When no explicit cap is given, the gateway synthesizes
 * `maxTokens` from the model catalog (`resolveGatewayRequestMaxTokens` in
 * `sdk/packages/llms/src/providers/gateway.ts`), and Groq bills reserved output
 * against the same per-minute budget as input.
 *
 * Neither `maxTokensPerTurn` nor the constructor's `options` reaches that path
 * on the plain `Agent`. What does reach it is a per-request option returned
 * from `beforeModel` — the runtime merges it into the outgoing request
 * (`agent-runtime.ts`, `mergeModelOptions`).
 *
 * Run: OPENPROVIDER_PROVIDER=groq bun run src/probe-free-tier.ts
 */
import { Agent } from "@cline/sdk";
import { describe, MissingProviderError, resolveProvider } from "./provider-settings";

const PROMPT = "Say hello in exactly 4 words.";

interface Attempt {
	label: string;
	ok: boolean;
	detail: string;
}

async function attempt(
	label: string,
	maxTokens: number | undefined,
): Promise<Attempt> {
	const provider = resolveProvider();
	const agent = new Agent({
		providerId: provider.providerId,
		modelId: provider.modelId,
		apiKey: provider.apiKey,
		maxIterations: 1,
		hooks:
			maxTokens === undefined
				? undefined
				: { beforeModel: () => ({ options: { maxTokens } }) },
	});

	let text = "";
	let failure = "";
	agent.subscribe((event) => {
		if (event.type === "assistant-text-delta") {
			text += event.text;
		}
		// Provider errors surface as an event; `run()` still resolves.
		if (event.type === "run-failed") {
			failure = String(event.snapshot?.lastError ?? "unknown error");
		}
	});

	await agent.run(PROMPT);

	return failure
		? { label, ok: false, detail: failure.split("\n")[0].slice(0, 120) }
		: { label, ok: true, detail: JSON.stringify(text.trim()) };
}

async function main(): Promise<void> {
	console.log(`[free-tier] using ${describe(resolveProvider())}\n`);

	const results: Attempt[] = [];
	results.push(await attempt("no cap (SDK default)", undefined));
	results.push(await attempt("beforeModel maxTokens=1024", 1024));

	for (const result of results) {
		console.log(`  ${result.ok ? "OK  " : "FAIL"}  ${result.label}`);
		console.log(`        ${result.detail}`);
	}

	const [uncapped, capped] = results;
	console.log(
		!uncapped.ok && capped.ok
			? "\n[free-tier] Confirmed: capping output via beforeModel makes the free tier usable."
			: "\n[free-tier] Inconclusive on this provider — see the results above.",
	);
}

main().catch((error: unknown) => {
	if (error instanceof MissingProviderError) {
		console.error(`[free-tier] ${error.message}`);
		process.exit(2);
	}
	console.error("[free-tier] run failed:", error);
	process.exit(1);
});
