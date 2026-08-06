/**
 * Faz 5, adım 2 — sağlayıcı yetenek ve tuhaflık tablosu.
 *
 * Free-tier providers are not interchangeable, and the ways they differ are
 * not in any catalog: one rejects a field its own model produced, another
 * counts reserved output against the input quota, a third caps daily requests
 * low enough that one session exhausts it.
 *
 * Every entry here was measured against the live API, not read from docs.
 * `measuredOn` says when, because these limits change.
 */

export interface ProviderQuirks {
	/**
	 * Strip `reasoning` parts from assistant messages before sending.
	 *
	 * Groq's `gpt-oss-120b` emits reasoning, the AI SDK serialises it back as
	 * `reasoning_content` on the next request, and Groq then rejects its own
	 * field:
	 *
	 *   'messages.1' : for 'role:assistant' the following must be satisfied
	 *   [('messages.1' : property 'reasoning_content' is unsupported)]
	 *
	 * Only bites on the second request, so single-turn chat looks fine and
	 * tool-using loops fail.
	 */
	stripReasoning?: boolean;
	/**
	 * Output cap that keeps the free tier usable. Providers that bill reserved
	 * output against a per-minute quota need this or a one-line prompt can be
	 * refused for requesting 32k tokens it will never use.
	 */
	defaultMaxOutputTokens?: number;
	/** False when tool-using agent loops are known not to work. */
	supportsTools?: boolean;
	/** Free-tier ceiling, for the quota work in Faz 6. */
	limits?: {
		tokensPerMinute?: number;
		requestsPerDay?: number;
	};
	/** Human-readable caveat surfaced in diagnostics. */
	note?: string;
	measuredOn?: string;
}

const QUIRKS: Record<string, ProviderQuirks> = {
	groq: {
		stripReasoning: true,
		defaultMaxOutputTokens: 2048,
		supportsTools: true,
		// Both confirmed against Groq's own x-ratelimit headers in Faz 6.
		limits: { tokensPerMinute: 8000, requestsPerDay: 1000 },
		note:
			"Counts reserved output against TPM, so an uncapped request can be " +
			"refused outright. Emits reasoning it will not accept back. " +
			"Publishes x-ratelimit headers, so quota is exact rather than estimated.",
		measuredOn: "2026-07-31",
	},
	gemini: {
		// Reasoning models spend this allowance before the first visible token,
		// so a tight cap fails the stream rather than truncating it.
		defaultMaxOutputTokens: 4096,
		supportsTools: true,
		limits: { requestsPerDay: 20 },
		note: "Free tier allows 20 requests/day; one agent session exhausts it.",
		measuredOn: "2026-07-31",
	},
	cerebras: {
		defaultMaxOutputTokens: 4096,
		supportsTools: true,
	},
	openrouter: {
		defaultMaxOutputTokens: 4096,
		supportsTools: true,
	},
	nvidia: {
		defaultMaxOutputTokens: 4096,
		supportsTools: true,
		note: "Not wired into the VS Code extension yet.",
	},
	// --- Faz 8, grup 1 denetimi (2026-08-01/02) — untested skeletons only. ---
	// No network calls were made for any entry below; `measuredOn` is
	// deliberately absent. Added because the default model's catalog price is
	// 0 (free/subscription) or the provider is an explicit "-coding-plan" /
	// "-token-plan" subscription family, and it advertises "tools" capability.
	anyapi: {
		supportsTools: true,
		note:
			"Default model (deepseek/deepseek-v4-flash) is priced at 0 in the catalog " +
			"and has 'reasoning' capability — may carry the same reasoning_content " +
			"rejection risk seen on Groq. Not tested against the live API.",
	},
	blueclaw: {
		supportsTools: true,
		note:
			"Default model (Qwen3.6-27B) is priced at 0 in the catalog and has " +
			"'reasoning' capability — same reasoning_content rejection risk as Groq " +
			"is possible. Not tested against the live API.",
	},
	"alibaba-coding-plan": {
		supportsTools: true,
		note:
			"Subscription family ('-coding-plan'), not pay-per-token — default model " +
			"priced at 0 in the catalog. Default model (qwen3.7-plus) has 'reasoning' " +
			"capability; same reasoning_content rejection risk as Groq is possible. " +
			"Not tested against the live API.",
	},
	"alibaba-coding-plan-cn": {
		supportsTools: true,
		note:
			"China-region mirror of alibaba-coding-plan; same subscription/pricing " +
			"and untested reasoning-capability caveats apply.",
	},
	"alibaba-token-plan": {
		supportsTools: true,
		note:
			"Subscription family ('-token-plan'), not pay-per-token — default model " +
			"priced at 0 in the catalog. Default model (qwen3.8-max-preview) has " +
			"'reasoning' capability; same reasoning_content rejection risk as Groq is " +
			"possible. Not tested against the live API.",
	},
	"alibaba-token-plan-cn": {
		supportsTools: true,
		note:
			"China-region mirror of alibaba-token-plan; same subscription/pricing " +
			"and untested reasoning-capability caveats apply.",
	},
	chutes: {
		supportsTools: true,
		note:
			"Default model (zai-org/GLM-5.2-TEE) is cheap (~$1.4/$4.4 per M tokens) " +
			"rather than free, but the catalog lists many GLM/Kimi models on this " +
			"provider that may be cheaper still. Has 'reasoning' capability; same " +
			"reasoning_content rejection risk as Groq is possible. Not tested " +
			"against the live API.",
	},
	// --- Faz 8, grup 4 denetimi (2026-08-02) — untested skeletons only. ---
	// No network calls were made for any entry below; `measuredOn` is
	// deliberately absent. `openrouter` and `nvidia` already had entries above
	// (added in earlier phases) and were left untouched.
	nebius: {
		supportsTools: true,
		note:
			"Sign-up credit, GLM-5.2 in the catalog, first-class in ApiProvider " +
			"union already — but no quirk ever measured against the live API.",
	},
	"nano-gpt": {
		supportsTools: true,
		note:
			"Very cheap default model (~$0.4/$2 per M tokens), 193 models — the " +
			"largest catalog in this group. Generic openai-compatible form only " +
			"(not first-class). Not tested against the live API.",
	},
	modelscope: {
		supportsTools: true,
		note:
			"Catalog price is 0, but a China-region account may be required to " +
			"actually use it — free-tier accessibility from elsewhere unconfirmed. " +
			"Not tested against the live API.",
	},
	ollama: {
		note:
			"Local/OAuth provider — no token-quota concept applies. Model list is " +
			"fetched live from the local Ollama server (/api/tags), not the static " +
			"catalog; catalog shows 0 models by design.",
	},
	opencode: {
		note:
			"Local/OAuth provider (OpenCode SDK multi-provider runtime) — no " +
			"token-quota concept applies the way it does for hosted free tiers.",
	},
	// --- Faz 8, grup 3 denetimi (2026-08-02) — untested skeletons only. ---
	// No network calls were made for any entry below; `measuredOn` is
	// deliberately absent. `mistral` and `minimax` are first-class in the
	// ApiProvider union already but had no quirk entry before this pass.
	huggingface: {
		supportsTools: true,
		note:
			"Router over many hosted models; Hugging Face grants a small monthly " +
			"free inference credit on top of pay-per-token pricing. 49 models in " +
			"the catalog, several likely free/near-free. Not tested against the " +
			"live API.",
	},
	llama: {
		supportsTools: true,
		note:
			"Meta's own first-party API (not a third-party reseller of Llama " +
			"models). Previews of new Llama releases have historically been free " +
			"for a limited window; unclear if still the case. Not tested against " +
			"the live API.",
	},
	mistral: {
		supportsTools: true,
		note:
			"Has a free tier (La Plateforme) plus 'codestral' code-specialised " +
			"models. First-class in the ApiProvider union already, but no quirk " +
			"had been recorded. Not tested against the live API.",
	},
	litellm: {
		note:
			"Self-hosted proxy in front of an arbitrary backend model — any quirk " +
			"(reasoning stripping, rate limits, tool support) depends entirely on " +
			"whatever model the user has configured behind it, not on LiteLLM " +
			"itself. A quirk entry here would be meaningless on its own.",
	},
	lmstudio: {
		note:
			"Local proxy in front of whatever GGUF/MLX model the user has loaded " +
			"— same as litellm, behavior depends entirely on the local model, not " +
			"on LM Studio itself. Model list is fetched live from the local " +
			"server, not the static catalog (0 models there by design).",
	},
	// --- Faz 8, grup 5 denetimi (2026-08-01/02) — untested skeletons only. ---
	// No network calls were made for any entry below; `measuredOn` is
	// deliberately absent. Scope: poe, poolside, privatemode-ai, qihang-ai,
	// qiniu-ai, qwen, qwen-code, regolo-ai, requesty, routing-run, sakana,
	// sambanova, sapaicore, sarvam, scaleway, siliconflow, siliconflow-cn,
	// snowflake-cortex, stackit, stepfun*, subconscious, submodel, synthetic,
	// tencent-*. Only entries flagged in the task as plausibly free/cheap are
	// included; the rest are confirmed-paid or subscription-only and get no
	// entry (see 2026-08-01-grup5-provider-denetimi.md for the full table).
	siliconflow: {
		supportsTools: true,
		note:
			"Catalog price is cheap ($1.4/$4.4 per M tokens) rather than free, but " +
			"low enough to be worth a real test. Not tested against the live API.",
	},
	"siliconflow-cn": {
		supportsTools: true,
		note:
			"China-region mirror of siliconflow, same pricing and default model " +
			"in the catalog. Not tested against the live API.",
	},
	"qiniu-ai": {
		supportsTools: true,
		note:
			"Catalog price is 0 and it has the largest model list in this group " +
			"(81 models), but price 0 does not confirm a free tier — untested. " +
			"Settings UI may be Chinese-language only. Not tested against the " +
			"live API.",
	},
	"snowflake-cortex": {
		supportsTools: true,
		note:
			"Catalog price is 0, but Snowflake Cortex requires an existing " +
			"Snowflake account/warehouse — 'free' in the catalog is unlikely to " +
			"mean a public free tier. Base URL contains a SNOWFLAKE_ACCOUNT " +
			"placeholder that must be filled in manually. Not tested against " +
			"the live API.",
	},
	sambanova: {
		supportsTools: true,
		note:
			"Known to have a free tier, but the catalog lists 0 models for it — " +
			"the model id must be entered manually (first-class in the " +
			"ApiProvider union already, e.g. 'default'). Not tested against the " +
			"live API.",
	},
	// --- Faz 8, grup 6 denetimi (2026-08-02) — untested skeletons only. ---
	// No network calls were made for any entry below; `measuredOn` is
	// deliberately absent.
	together: {
		supportsTools: true,
		note:
			"Has a signup credit (amount not verified here). Catalog (17 models) " +
			"hosts third-party copies of GLM and Kimi-K2 family models, e.g. " +
			"`zai-org/GLM-5.2` and `moonshotai/Kimi-K2.7-Code` / " +
			"`moonshotai/Kimi-K2.6` — useful to compare against zai's own hosting " +
			"of the same GLM lineage. First-class in the ApiProvider union " +
			"already. Not tested against the live API.",
	},
	zai: {
		supportsTools: true,
		note:
			"The original/first-party GLM model provider (docs.z.ai), useful as a " +
			"comparison baseline against NVIDIA- or Together-hosted copies of the " +
			"same GLM models. First-class in the ApiProvider union already. Not " +
			"tested against the live API.",
	},
	xai: {
		supportsTools: true,
		note:
			"Grok provider (first-party, docs.x.ai). Free-tier status is " +
			"unclear/unverified — catalog price is not 0. First-class in the " +
			"ApiProvider union already. Not tested against the live API.",
	},
	"vercel-ai-gateway": {
		note:
			"Passthrough gateway to whatever backing model is configured behind " +
			"it (e.g. `google/gemini-3.5-flash-lite` as the catalog default) — no " +
			"quirks of its own; any reasoning/tool-loop behavior depends on the " +
			"routed model, not the gateway. First-class in the ApiProvider union " +
			"already. Not tested against the live API.",
	},
	"the-grid-ai": {
		note:
			"Henüz test edilmedi, the-grid-ai için ücretsiz katman durumu " +
			"belirsiz. Catalog default model (agent-max) prices at 0, but that " +
			"may just mean the catalog has no price data, not that it's free.",
	},
	trustedrouter: {
		note:
			"Henüz test edilmedi, trustedrouter için ücretsiz katman durumu " +
			"belirsiz. Catalog default model (synth) prices at 0, but that may " +
			"just mean the catalog has no price data, not that it's free.",
	},
	zeldoc: {
		note:
			"Henüz test edilmedi, zeldoc için ücretsiz katman durumu belirsiz. " +
			"Catalog default model (z-code) prices at 0, but that may just mean " +
			"the catalog has no price data, not that it's free.",
	},
	"umans-ai-coding-plan": {
		note:
			"Subscription family ('-coding-plan'), not pay-per-token. Henüz test " +
			"edilmedi, gerçek kullanım limitleri belirsiz.",
	},
	"xiaomi-token-plan-ams": {
		note:
			"Subscription family ('-token-plan'), region-locked to Europe (AMS). " +
			"Henüz test edilmedi, gerçek kullanım limitleri belirsiz.",
	},
	"xiaomi-token-plan-cn": {
		note:
			"Subscription family ('-token-plan'), region-locked to China (CN). " +
			"Henüz test edilmedi, gerçek kullanım limitleri belirsiz.",
	},
	"xiaomi-token-plan-sgp": {
		note:
			"Subscription family ('-token-plan'), region-locked to Singapore " +
			"(SGP). Henüz test edilmedi, gerçek kullanım limitleri belirsiz.",
	},
	"zhipuai-coding-plan": {
		note:
			"Subscription family ('-coding-plan'), not pay-per-token. Henüz test " +
			"edilmedi, gerçek kullanım limitleri belirsiz.",
	},
	// --- Faz 8, grup 2 denetimi (2026-08-02) — untested skeletons only. ---
	// No network calls were made for any entry below; `measuredOn` is
	// deliberately absent. Scope: cloudferro-sherlock, cloudflare-workers-ai,
	// cortecs, crof, crossmodel, daoxe, databricks, deepseek, dify,
	// digitalocean, dinference, doubao, drun, ebcloud, empiriolabs, evroc,
	// fastrouter, fireworks, freemodel, friendli, frogbot, gemini,
	// github-copilot, github-models, gmicloud, groq, helicone, hicap, hpc-ai.
	// Only entries with a real free/zero-price or reasoning-default signal are
	// included; deepseek/gemini/groq/gemini already had entries or are
	// first-class with no new signal found. freemodel and frogbot were
	// checked and are NOT free despite their names (freemodel's default model
	// prices at $10/$50 per M tokens, frogbot's at $1.25/$2.5) — no entry
	// added for either. See 2026-08-01-grup2-provider-denetimi.md for the
	// full table.
	"github-models": {
		supportsTools: true,
		note:
			"All 49 catalog models are priced at 0 (GitHub Models is a genuinely " +
			"free tier gated by GITHUB_TOKEN, not just an unpriced catalog entry). " +
			"Default model is 'deepseek/deepseek-r1-0528', a reasoning model — " +
			"same 'reasoning_content field rejected by the API' risk observed on " +
			"Groq's gpt-oss-120b is plausible here too, since GitHub Models proxies " +
			"third-party reasoning models over an OpenAI-compatible endpoint. Not " +
			"first-class in the ApiProvider union (generic form only). Not tested " +
			"against the live API.",
	},
	deepseek: {
		supportsTools: true,
		note:
			"First-class in the ApiProvider union already, but had no quirk entry " +
			"before this pass. Default catalog model is 'deepseek-v4-flash' " +
			"(cheap, $0.14/$0.28 per M tokens, not free). DeepSeek's own reasoning " +
			"model is 'deepseek-reasoner' (not the default here) and is known " +
			"elsewhere to emit a 'reasoning_content' field — the same rejection " +
			"risk seen on Groq's gpt-oss-120b applies if a user selects it. Not " +
			"tested against the live API.",
	},
};

/** Everything known about a provider. Empty object for unknown ones. */
export function quirksFor(providerId: string): ProviderQuirks {
	return QUIRKS[providerId] ?? {};
}

/** True unless a provider is explicitly known to break on tool loops. */
export function supportsTools(providerId: string): boolean {
	return quirksFor(providerId).supportsTools !== false;
}

/**
 * Output cap to use, preferring an explicit config value over the measured
 * default. Undefined means "let the gateway decide", which is only safe on
 * providers that do not bill reserved output.
 */
export function resolveOutputCap(
	providerId: string,
	configured?: number,
): number | undefined {
	return configured ?? quirksFor(providerId).defaultMaxOutputTokens;
}

/** Provider ids with a recorded quirk. For diagnostics. */
export function knownProviders(): string[] {
	return Object.keys(QUIRKS);
}
