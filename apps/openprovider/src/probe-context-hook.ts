/**
 * Faz 0, adım 4 — the experiment that decides how Faz 1 gets built.
 *
 * The roadmap asks one question: does the SDK give us a place to inject
 * context automatically, without an extra LLM call? Reading the source says
 * yes — `AgentRuntimeHooks.beforeModel` may return `messages`, and
 * `agent-runtime.ts` replaces the outgoing request with them. This proves it
 * end to end instead of trusting the read.
 *
 * Method: invent a fact the model cannot possibly know, inject it *only* from
 * the hook, then ask a question that is unanswerable without it. If the answer
 * comes back correct, injection works and Faz 1 has its integration point.
 */
import { Agent } from "@cline/sdk";
import { describe, MissingProviderError, resolveProvider } from "./provider-settings";

/** Nothing in any training set links this codename to this module. */
const SECRET_FACT =
	'The internal codename of the "quota-meter" module is ZURNA-7.';
const QUESTION =
	'What is the internal codename of the "quota-meter" module? ' +
	"Reply with the codename only, nothing else.";

/**
 * `AgentMessage` lives in `@cline/shared` and is not re-exported by
 * `@cline/sdk`, so the shape is written out and inferred rather than imported.
 */
function makeMessage(text: string) {
	return {
		id: `injected-${Date.now()}`,
		role: "user" as const,
		content: [{ type: "text" as const, text }],
		createdAt: Date.now(),
	};
}

async function main(): Promise<void> {
	const provider = resolveProvider();
	console.log(`[probe] using ${describe(provider)}`);

	let hookFired = 0;
	let messagesBefore = 0;
	let messagesAfter = 0;

	const agent = new Agent({
		providerId: provider.providerId,
		modelId: provider.modelId,
		apiKey: provider.apiKey,
		maxIterations: 1,
		hooks: {
			beforeModel: ({ request }) => {
				hookFired += 1;
				messagesBefore = request.messages.length;

				// Prepend the "retrieved context" ahead of the real conversation,
				// which is exactly the shape Faz 1's repo map will take.
				const injected = [
					makeMessage(`[context]\n${SECRET_FACT}\n[/context]`),
					...request.messages,
				];
				messagesAfter = injected.length;
				return { messages: injected };
			},
		},
	});

	let answer = "";
	agent.subscribe((event) => {
		if (event.type === "assistant-text-delta") {
			answer += event.text;
		}
	});

	await agent.run(QUESTION);

	const trimmed = answer.trim();
	const passed = /ZURNA-7/i.test(trimmed);

	console.log(`[probe] beforeModel fired: ${hookFired}x`);
	console.log(`[probe] request messages: ${messagesBefore} -> ${messagesAfter}`);
	console.log(`[probe] model answered: ${JSON.stringify(trimmed)}`);
	console.log(
		passed
			? "[probe] PASS — injected context reached the model. Faz 1 can hook here."
			: "[probe] FAIL — the model did not use the injected context.",
	);

	process.exit(passed ? 0 : 1);
}

main().catch((error: unknown) => {
	if (error instanceof MissingProviderError) {
		console.error(`[probe] ${error.message}`);
		process.exit(2);
	}
	console.error("[probe] run failed:", error);
	process.exit(1);
});
