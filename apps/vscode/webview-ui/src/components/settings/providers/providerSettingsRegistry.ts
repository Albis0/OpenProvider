import type { ProviderListing } from "@shared/proto/cline/models"
import type { GenericProviderSettingsProps } from "./GenericProviderSettings"

type GenericProviderSettingsConfig = Omit<GenericProviderSettingsProps, "currentMode" | "isPopup" | "showModelOptions">

type GenericProviderPresentationOverride = Pick<GenericProviderSettingsConfig, "signupUrl" | "baseUrlField"> &
	Partial<Pick<GenericProviderSettingsConfig, "allowsCustomIds">>

const CUSTOM_PROVIDER_SETTINGS_IDS = new Set([
	"aihubmix",
	"anthropic",
	"asksage",
	"bedrock",
	"claude-code",
	"cline",
	"cline-pass",
	"dify",
	"hicap",
	"litellm",
	"lmstudio",
	"moonshot",
	"oca",
	"ollama",
	"openai",
	"openai-codex",
	"openai-native",
	"openrouter",
	"qwen",
	"qwen-code",
	"requesty",
	"sapaicore",
	"vertex",
	"vscode-lm",
	"xai",
	"zai",
])

const GENERIC_PROVIDER_PRESENTATION_OVERRIDES: Record<string, GenericProviderPresentationOverride> = {
	baseten: {
		signupUrl: "https://app.baseten.co/settings/api_keys",
	},
	deepseek: {
		signupUrl: "https://www.deepseek.com/",
	},
	doubao: {
		signupUrl: "https://console.volcengine.com/home",
	},
	fireworks: {
		signupUrl: "https://fireworks.ai/",
	},
	groq: {
		signupUrl: "https://console.groq.com/keys",
	},
	poolside: {},
	cerebras: {
		signupUrl: "https://cloud.cerebras.ai/",
	},
	nvidia: {
		signupUrl: "https://build.nvidia.com/",
	},
	gemini: {
		signupUrl: "https://aistudio.google.com/apikey",
	},
	huggingface: {
		signupUrl: "https://huggingface.co/settings/tokens",
	},
	"huawei-cloud-maas": {
		signupUrl: "https://support.huaweicloud.com/intl/zh-cn/usermanual-maas/maas_01_0001.html",
	},
	minimax: {
		signupUrl: "https://www.minimax.io/platform/user-center/basic-information/interface-key",
		baseUrlField: {
			label: "Base URL",
			placeholder: "https://api.minimax.io/anthropic",
		},
	},
	mistral: {
		signupUrl: "https://console.mistral.ai/codestral",
	},
	nebius: {
		signupUrl: "https://auth.tokenfactory.nebius.com/ui/login",
	},
	nousResearch: {},
	sambanova: {
		signupUrl: "https://docs.sambanova.ai/cloud/docs/get-started/overview",
	},
	together: {
		allowsCustomIds: true,
		signupUrl: "https://api.together.ai/settings/api-keys",
		baseUrlField: {
			label: "Base URL",
			placeholder: "https://api.together.xyz/v1",
		},
	},
	"vercel-ai-gateway": {
		signupUrl: "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai",
	},
	v0: {},
	wandb: {
		signupUrl: "https://wandb.ai",
	},
	xiaomi: {},
	"tencent-tokenhub": {
		signupUrl: "https://cloud.tencent.com/document/product/1823/130050",
	},
	"zai-coding-plan": {},
}

const GENERIC_PROVIDER_PROTOCOLS = new Set(["anthropic", "gemini", "openai-chat", "openai-responses"])

export function hasCustomProviderSettings(providerId: string): boolean {
	return CUSTOM_PROVIDER_SETTINGS_IDS.has(providerId)
}

/**
 * True when we ship a curated "generic" settings form for this provider id
 * (presentation override or fallback name). Providers that are neither here nor
 * in {@link hasCustomProviderSettings} are user-configured/custom and should use
 * the richer OpenAI-compatible form instead.
 */
export function isKnownGenericProvider(providerId: string): boolean {
	return providerId in GENERIC_PROVIDER_PRESENTATION_OVERRIDES || providerId in FALLBACK_GENERIC_PROVIDER_NAMES
}

export function isGenericProviderListing(listing: ProviderListing | undefined): listing is ProviderListing {
	if (!listing) {
		return false
	}

	return (
		!hasCustomProviderSettings(listing.id) && Boolean(listing.name) && GENERIC_PROVIDER_PROTOCOLS.has(listing.protocol ?? "")
	)
}

export function getGenericProviderSettings(
	providerId: string,
	listing?: ProviderListing,
): GenericProviderSettingsConfig | undefined {
	if (!isGenericProviderListing(listing) || listing.id !== providerId) {
		return undefined
	}

	const overrides = GENERIC_PROVIDER_PRESENTATION_OVERRIDES[providerId]

	return {
		...overrides,
		allowsCustomIds: overrides?.allowsCustomIds ?? listing.allowsCustomModelIds,
		providerId: listing.id,
		providerName: listing.name,
	}
}

const FALLBACK_GENERIC_PROVIDER_NAMES = {
	deepseek: "DeepSeek",
	doubao: "Doubao",
	gemini: "Gemini",
	"huawei-cloud-maas": "Huawei Cloud MaaS",
	minimax: "MiniMax",
	mistral: "Mistral",
	nousResearch: "NousResearch",
	nvidia: "NVIDIA Build",
	poolside: "Poolside",
	together: "Together",
	v0: "Vercel v0",
	wandb: "W&B",
	xiaomi: "Xiaomi",
	"tencent-tokenhub": "Tencent TokenHub",
	"zai-coding-plan": "Z.AI Coding Plan",
	// Grup 5 provider audit (2026-08-01) — generic openai-compatible providers
	// with no presentation override. Without a fallback name here, the
	// settings form briefly renders the raw OpenAI-compatible custom form
	// before the async provider-listing gRPC call resolves (initial state is
	// an empty array), because isCustomProvider only clears once a live
	// listing name is available. See providerSettingsRegistry.test.ts for the
	// pattern this follows.
	poe: "Poe",
	"privatemode-ai": "Privatemode AI",
	"qihang-ai": "QiHang",
	"qiniu-ai": "Qiniu",
	"regolo-ai": "Regolo AI",
	"routing-run": "routing.run",
	sakana: "Sakana AI",
	sarvam: "Sarvam AI",
	scaleway: "Scaleway",
	siliconflow: "SiliconFlow",
	"siliconflow-cn": "SiliconFlow (China)",
	"snowflake-cortex": "Snowflake Cortex",
	stackit: "STACKIT",
	stepfun: "StepFun (China)",
	"stepfun-ai": "StepFun (Global)",
	"stepfun-ai-step-plan": "StepFun Step Plan (Global)",
	"stepfun-step-plan": "StepFun Step Plan (China)",
	subconscious: "Subconscious",
	submodel: "submodel",
	synthetic: "Synthetic",
	"tencent-coding-plan": "Tencent Coding Plan (China)",
	"tencent-token-plan": "Tencent Token Plan",
	// Grup 6 provider audit (2026-08-02) — same reasoning as the grup 5 batch
	// above: generic openai-compatible providers with no presentation override
	// and no fallback name yet.
	"the-grid-ai": "The Grid AI",
	thinkingmachines: "Thinking Machines",
	tinfoil: "Tinfoil",
	trustedrouter: "TrustedRouter",
	"umans-ai": "Umans AI",
	"umans-ai-coding-plan": "Umans AI Coding Plan",
	unorouter: "UnoRouter",
	upstage: "Upstage",
	vivgrid: "Vivgrid",
	vultr: "Vultr",
	"wafer.ai": "Wafer",
	"xiaomi-token-plan-ams": "Xiaomi Token Plan (Europe)",
	"xiaomi-token-plan-cn": "Xiaomi Token Plan (China)",
	"xiaomi-token-plan-sgp": "Xiaomi Token Plan (Singapore)",
	xpersona: "Xpersona",
	zeldoc: "Zeldoc",
	zenifra: "Zenifra",
	zenmux: "ZenMux",
	zhipuai: "Zhipu AI",
	"zhipuai-coding-plan": "Zhipu AI Coding Plan",
	// Grup 2 provider audit (2026-08-02) — same reasoning as the grup 5/6
	// batches above: generic openai-compatible (or, for freemodel, anthropic
	// family) providers with no presentation override and no fallback name yet.
	"cloudferro-sherlock": "CloudFerro Sherlock",
	"cloudflare-workers-ai": "Cloudflare Workers AI",
	cortecs: "Cortecs",
	crof: "CrofAI",
	crossmodel: "CrossModel",
	daoxe: "DaoXE",
	databricks: "Databricks",
	digitalocean: "DigitalOcean",
	dinference: "DInference",
	drun: "D.Run (China)",
	ebcloud: "EBCloud",
	empiriolabs: "EmpirioLabs AI",
	evroc: "evroc",
	fastrouter: "FastRouter",
	freemodel: "FreeModel",
	friendli: "Friendli",
	frogbot: "FrogBot",
	"github-copilot": "GitHub Copilot",
	"github-models": "GitHub Models",
	gmicloud: "GMI Cloud",
	helicone: "Helicone",
	"hpc-ai": "HPC-AI",
} as const

export function getFallbackGenericProviderSettings(providerId: string): GenericProviderSettingsConfig | undefined {
	const providerName = FALLBACK_GENERIC_PROVIDER_NAMES[providerId as keyof typeof FALLBACK_GENERIC_PROVIDER_NAMES]
	if (!providerName) {
		return undefined
	}

	const overrides = GENERIC_PROVIDER_PRESENTATION_OVERRIDES[providerId]

	return {
		...overrides,
		allowsCustomIds: overrides?.allowsCustomIds ?? false,
		providerId,
		providerName,
	}
}
