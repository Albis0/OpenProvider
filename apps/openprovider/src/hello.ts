/**
 * Faz 0, adım 3 — "hello world": send one prompt through the SDK, get an answer.
 *
 * The point is not the answer. It is proving that an application *outside* the
 * VS Code extension can drive the Cline SDK with a free-tier provider, which is
 * the premise the whole roadmap rests on.
 */
import { Agent } from "@cline/sdk";
import { describe, MissingProviderError, resolveProvider } from "./provider-settings";

async function main(): Promise<void> {
	const provider = resolveProvider();
	console.log(`[openprovider] using ${describe(provider)}\n`);

	const agent = new Agent({
		providerId: provider.providerId,
		modelId: provider.modelId,
		apiKey: provider.apiKey,
		// No tools are registered, so one iteration is all it can take.
		maxIterations: 1,
	});

	agent.subscribe((event) => {
		if (event.type === "assistant-text-delta") {
			process.stdout.write(event.text);
		}
	});

	const result = await agent.run(
		"Reply with exactly one short sentence confirming you are reachable.",
	);

	console.log(
		`\n\n[openprovider] done — ${result.iterations} iteration(s), ` +
			`${result.usage.inputTokens} in / ${result.usage.outputTokens} out tokens`,
	);
}

main().catch((error: unknown) => {
	if (error instanceof MissingProviderError) {
		console.error(`[openprovider] ${error.message}`);
		process.exit(2);
	}
	console.error("[openprovider] run failed:", error);
	process.exit(1);
});
