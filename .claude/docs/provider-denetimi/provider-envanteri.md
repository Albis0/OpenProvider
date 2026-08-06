# Ek — Sağlayıcı / Model Envanteri

> **Bu dosya elle yazılmadı.** `getProviderIds()` → `getProvider(id)` + `getModelsForProvider(id)`
> çağrılarak SDK'nın kendi kataloğundan üretildi — yani ayarlar ekranındaki listenin
> birebir aynısı (`listLocalProviders`, `sdk/packages/core/src/services/providers/local-provider-service.ts:676`).
> Üretim tarihi: **2026-08-01**. Katalog `bun run build:sdk` ile değişebilir; değişirse yeniden üret.

**174 sağlayıcı, 4287 model.**

Sütunların anlamı:

| Sütun | Ne demek |
|---|---|
| **VS Code** | ✅ = `ApiProvider` union'ında, yani kendi ayar formu / kendi state key'i var. ⬜ = sadece jenerik formdan seçilebiliyor (çalışır, ama model id'si ortak `planModeApiModelId` slotunu paylaşır) |
| **Fiyat** | Kataloğun **varsayılan modeli** için yazdığı \$/1M giriş / çıkış. Ücretsiz *katman* bilgisi DEĞİL — katalogda öyle bir alan yok |
| **Sınıf** | `Katalogda 0` = fiyat 0 · `Abonelik` = id'si `-plan` ile biten paket · `Ücretli` · `Yerel` · `Bilinmiyor` = varsayılan model kataloğda yok |
| **Ek alan** | `apiKey` + `baseUrl` dışında istenen zorunlu alanlar. Boşsa sadece key yeter |

## 1. Tam liste (model sayısına göre)

| # | id | Ad | Model | VS Code | Varsayılan model | Fiyat (\$/1M) | Sınıf | Ek alan |
|---:|---|---|---:|:---:|---|---|---|---|
| 1 | `cline` | Cline Usage-Billing | 270 | ✅ | `anthropic/claude-sonnet-5` | 2 / 10 | Ücretli | — |
| 2 | `openrouter` | OpenRouter | 267 | ✅ | `anthropic/claude-sonnet-4.6` | 3 / 15 | Ücretli | — |
| 3 | `kilo` | Kilo Gateway | 261 | ⬜ | `gpt-4o` | ? | Bilinmiyor | — |
| 4 | `nano-gpt` | NanoGPT | 193 | ⬜ | `mistral-code-agent-latest` | 0.4 / 2 | Ücretli | — |
| 5 | `vercel-ai-gateway` | Vercel AI Gateway | 180 | ✅ | `alibaba/qwen3.6-plus` | 0.5 / 3 | Ücretli | — |
| 6 | `llmgateway` | LLM Gateway | 150 | ⬜ | `kimi-k3` | 3 / 15 | Ücretli | — |
| 7 | `poe` | Poe | 124 | ⬜ | `anthropic/claude-opus-4.8` | 4.2929 / 21.4646 | Ücretli | — |
| 8 | `zenmux` | ZenMux | 120 | ⬜ | `moonshotai/kimi-k3` | 3 / 15 | Ücretli | — |
| 9 | `bedrock` | AWS Bedrock | 109 | ✅ | `minimax.minimax-m2.5` | 0.3 / 1.2 | Ücretli | aws.authentication, aws.region, aws.profile, aws.accessKey, aws.secretKey, aws.sessionToken, aws.endpoint, aws.useCrossRegionInference, aws.useGlobalInference, aws.usePromptCache |
| 10 | `302ai` | 302.AI | 92 | ⬜ | `claude-opus-4-7` | 5 / 25 | Ücretli | — |
| 11 | `abacus` | Abacus | 92 | ⬜ | `gpt-5.6-luna` | 1 / 6 | Ücretli | — |
| 12 | `qiniu-ai` | Qiniu | 81 | ⬜ | `qwen3.5-397b-a17b` | 0 / 0 | Katalogda 0 | — |
| 13 | `alibaba-cn` | Alibaba (China) | 79 | ⬜ | `glm-5.2` | 1.1 / 3.851 | Ücretli | — |
| 14 | `orcarouter` | OrcaRouter | 79 | ⬜ | `google/gemini-flash-latest` | 1.5 / 9 | Ücretli | — |
| 15 | `pioneer` | Pioneer | 73 | ⬜ | `sakana/fugu-ultra` | 5 / 30 | Ücretli | — |
| 16 | `helicone` | Helicone | 72 | ⬜ | `claude-4.5-opus` | 5 / 25 | Ücretli | — |
| 17 | `novita-ai` | NovitaAI | 72 | ⬜ | `moonshotai/kimi-k3` | 3 / 15 | Ücretli | — |
| 18 | `aihubmix` | AI Hub Mix | 67 | ✅ | `gpt-4o` | ? | Bilinmiyor | — |
| 19 | `digitalocean` | DigitalOcean | 60 | ⬜ | `glm-5.2` | 1.05 / 4.4 | Ücretli | — |
| 20 | `jiekou` | Jiekou.AI | 58 | ⬜ | `claude-opus-4-6` | 5 / 25 | Ücretli | — |
| 21 | `opencode` | OpenCode | 58 | ⬜ | `openai/gpt-5.6-sol` | ? | Bilinmiyor | — |
| 22 | `cortecs` | Cortecs | 55 | ⬜ | `glm-5.2` | 1.44 / 4.53 | Ücretli | — |
| 23 | `github-models` | GitHub Models | 49 | ⬜ | `deepseek/deepseek-r1-0528` | 0 / 0 | Katalogda 0 | — |
| 24 | `huggingface` | Hugging Face | 49 | ✅ | `zai-org/GLM-5.2` | 1.4 / 4.4 | Ücretli | — |
| 25 | `siliconflow` | SiliconFlow | 49 | ⬜ | `zai-org/GLM-5.2` | 1.4 / 4.4 | Ücretli | — |
| 26 | `alibaba` | Alibaba | 46 | ⬜ | `qwen3.7-plus` | 0.5 / 3 | Ücretli | — |
| 27 | `openai-native` | OpenAI | 46 | ✅ | `gpt-5.4` | 2.5 / 15 | Ücretli | — |
| 28 | `siliconflow-cn` | SiliconFlow (China) | 45 | ⬜ | `zai-org/GLM-5.2` | 1.4 / 4.4 | Ücretli | — |
| 29 | `crossmodel` | CrossModel | 44 | ⬜ | `moonshot/kimi-k3` | 3 / 15 | Ücretli | — |
| 30 | `nvidia` | Nvidia | 43 | ✅ | `z-ai/glm-5.2` | 0 / 0 | Katalogda 0 | — |
| 31 | `empiriolabs` | EmpirioLabs AI | 37 | ⬜ | `kimi-k3` | 3 / 15 | Ücretli | — |
| 32 | `requesty` | Requesty | 37 | ✅ | `openai/gpt-5.4` | 2.5 / 15 | Ücretli | — |
| 33 | `neon` | Neon | 36 | ⬜ | `claude-opus-4-8` | 5 / 25 | Ücretli | baseUrl'de `${...}` |
| 34 | `fastrouter` | FastRouter | 34 | ⬜ | `anthropic/claude-opus-4.8` | 5 / 25 | Ücretli | — |
| 35 | `nearai` | NEAR AI Cloud | 33 | ⬜ | `google/gemini-3.5-flash` | 1.5 / 9 | Ücretli | — |
| 36 | `sapaicore` | SAP AI Core | 31 | ✅ | `anthropic--claude-3.5-sonnet` | ? | Bilinmiyor | — |
| 37 | `databricks` | Databricks | 30 | ⬜ | `databricks-gpt-5-6-luna` | 1 / 6 | Ücretli | baseUrl'de `${...}` |
| 38 | `github-copilot` | GitHub Copilot | 28 | ⬜ | `gpt-5.6-luna` | 1 / 6 | Ücretli | — |
| 39 | `vertex` | Google Vertex AI | 28 | ✅ | `claude-sonnet-5@default` | 2 / 10 | Ücretli | gcp.projectId, gcp.region |
| 40 | `anyapi` | AnyAPI | 27 | ⬜ | `deepseek/deepseek-v4-flash` | 0 / 0 | Katalogda 0 | — |
| 41 | `frogbot` | FrogBot | 26 | ⬜ | `grok-4-3` | 1.25 / 2.5 | Ücretli | — |
| 42 | `wandb` | Weights & Biases | 25 | ✅ | `zai-org/GLM-5.2` | 1.39 / 4.4 | Ücretli | — |
| 43 | `unorouter` | UnoRouter | 23 | ⬜ | `claude-sonnet-5` | 1.44 / 7.2 | Ücretli | — |
| 44 | `kenari` | Kenari | 22 | ⬜ | `glm-5-2` | 0 / 0 | Katalogda 0 | — |
| 45 | `mistral` | Mistral | 21 | ✅ | `mistral-medium-2604` | 1.5 / 7.5 | Ücretli | — |
| 46 | `snowflake-cortex` | Snowflake Cortex | 21 | ⬜ | `openai-gpt-5.6-luna` | 0 / 0 | Katalogda 0 | baseUrl'de `${...}` |
| 47 | `nebius` | Nebius Token Factory | 20 | ✅ | `zai-org/GLM-5.2` | 1.4 / 4.4 | Ücretli | — |
| 48 | `crof` | CrofAI | 19 | ⬜ | `glm-5.2` | 0.5 / 2.2 | Ücretli | — |
| 49 | `meganova` | Meganova | 18 | ⬜ | `MiniMaxAI/MiniMax-M2.5` | 0.3 / 1.2 | Ücretli | — |
| 50 | `neuralwatt` | Neuralwatt | 18 | ⬜ | `glm-5.2` | 1.45 / 4.5 | Ücretli | — |
| 51 | `perplexity-agent` | Perplexity Agent | 18 | ⬜ | `openai/gpt-5.5` | 5 / 30 | Ücretli | — |
| 52 | `io-net` | IO.NET | 17 | ⬜ | `Qwen/Qwen3-235B-A22B-Thinking-2507` | 0.11 / 0.6 | Ücretli | — |
| 53 | `together` | Together AI | 17 | ✅ | `Qwen/Qwen3.5-397B-A17B` | ? | Bilinmiyor | — |
| 54 | `vivgrid` | Vivgrid | 17 | ⬜ | `gpt-5.6-luna` | 1 / 6 | Ücretli | — |
| 55 | `fireworks` | Fireworks AI | 16 | ✅ | `accounts/fireworks/routers/glm-5p2-fast` | 2.1 / 6.6 | Ücretli | — |
| 56 | `alibaba-token-plan` | Alibaba Token Plan | 15 | ⬜ | `qwen3.8-max-preview` | 0 / 0 | Abonelik | — |
| 57 | `alibaba-token-plan-cn` | Alibaba Token Plan (China) | 15 | ⬜ | `qwen3.8-max-preview` | 0 / 0 | Abonelik | — |
| 58 | `auriko` | Auriko | 15 | ⬜ | `deepseek-v4-flash` | 0.14 / 0.28 | Ücretli | — |
| 59 | `model-oracle-ai` | Model Oracle AI | 15 | ⬜ | `claude-sonnet-5` | 0 / 0 | Katalogda 0 | — |
| 60 | `opencode-go` | OpenCode Go | 15 | ⬜ | `kimi-k3` | 3 / 15 | Ücretli | — |
| 61 | `routing-run` | routing.run | 15 | ⬜ | `gpt-5.6-luna` | 0.7 / 4.2 | Ücretli | — |
| 62 | `cline-pass` | ClinePass | 14 | ✅ | `cline-pass/glm-5.2` | 0.8078 / 2.5388 | Ücretli | — |
| 63 | `gemini` | Google Gemini | 14 | ✅ | `gemini-3.5-flash-lite` | 0.3 / 2.5 | Ücretli | — |
| 64 | `iflowcn` | iFlow | 14 | ⬜ | `kimi-k2-0905` | 0 / 0 | Katalogda 0 | — |
| 65 | `zai` | Z.AI | 14 | ✅ | `glm-5v-turbo` | 1.2 / 4 | Ücretli | — |
| 66 | `cloudflare-workers-ai` | Cloudflare Workers AI | 13 | ⬜ | `@cf/zai-org/glm-5.2` | 1.4 / 4.4 | Ücretli | baseUrl'de `${...}` |
| 67 | `gmicloud` | GMI Cloud | 13 | ⬜ | `zai-org/GLM-5.2-FP8` | 0.979 / 3.08 | Ücretli | — |
| 68 | `scaleway` | Scaleway | 13 | ⬜ | `glm-5.2` | 1.8 / 5.5 | Ücretli | — |
| 69 | `zhipuai` | Zhipu AI | 13 | ⬜ | `glm-5.2` | 1.4 / 4.4 | Ücretli | — |
| 70 | `alibaba-coding-plan` | Alibaba Coding Plan | 12 | ⬜ | `qwen3.7-plus` | 0 / 0 | Abonelik | — |
| 71 | `alibaba-coding-plan-cn` | Alibaba Coding Plan (China) | 12 | ⬜ | `qwen3.7-plus` | 0 / 0 | Abonelik | — |
| 72 | `anthropic` | Anthropic | 12 | ✅ | `claude-sonnet-5` | 2 / 10 | Ücretli | — |
| 73 | `baseten` | Baseten | 12 | ✅ | `thinkingmachines/inkling` | 1 / 4.05 | Ücretli | — |
| 74 | `chutes` | Chutes | 12 | ⬜ | `zai-org/GLM-5.2-TEE` | 1.4 / 4.4 | Ücretli | — |
| 75 | `ovhcloud` | OVHcloud AI Endpoints | 11 | ⬜ | `qwen3.6-27b` | 0.47 / 3.19 | Ücretli | — |
| 76 | `clarifai` | Clarifai | 10 | ⬜ | `moonshotai/chat-completion/models/Kimi-K2_6` | 0.95 / 4 | Ücretli | — |
| 77 | `freemodel` | FreeModel | 10 | ⬜ | `claude-fable-5` | 10 / 50 | Ücretli | — |
| 78 | `moonshot` | Moonshot AI | 10 | ✅ | `kimi-k3` | 3 / 15 | Ücretli | — |
| 79 | `moonshotai-cn` | Moonshot AI (China) | 10 | ⬜ | `kimi-k3` | 3 / 15 | Ücretli | — |
| 80 | `regolo-ai` | Regolo AI | 10 | ⬜ | `mistral-small-4-119b` | 0.75 / 3 | Ücretli | — |
| 81 | `vultr` | Vultr | 10 | ⬜ | `zai-org/GLM-5.2-FP8` | 0.85 / 3.1 | Ücretli | — |
| 82 | `ambient` | Ambient | 9 | ⬜ | `ambient/large` | 1.05 / 4.4 | Ücretli | — |
| 83 | `daoxe` | DaoXE | 9 | ⬜ | `grok-4.5` | 2 / 6 | Ücretli | — |
| 84 | `evroc` | evroc | 9 | ⬜ | `zai-org/GLM-5.2` | 1.4375 / 5.75 | Ücretli | — |
| 85 | `hpc-ai` | HPC-AI | 9 | ⬜ | `zai-org/glm-5.2` | 1.4 / 4.4 | Ücretli | — |
| 86 | `qihang-ai` | QiHang | 9 | ⬜ | `gemini-2.5-flash` | 0.09 / 0.71 | Ücretli | — |
| 87 | `submodel` | submodel | 9 | ⬜ | `deepseek-ai/DeepSeek-R1-0528` | 0.5 / 2.15 | Ücretli | — |
| 88 | `the-grid-ai` | The Grid AI | 9 | ⬜ | `agent-max` | 0 / 0 | Katalogda 0 | — |
| 89 | `berget` | Berget.AI | 8 | ⬜ | `zai-org/GLM-5.2` | 1.54 / 4.84 | Ücretli | — |
| 90 | `groq` | Groq | 8 | ✅ | `moonshotai/kimi-k2-instruct-0905` | ? | Bilinmiyor | — |
| 91 | `inference` | Inference | 8 | ⬜ | `google/gemma-3` | 0.15 / 0.3 | Ücretli | — |
| 92 | `tencent-coding-plan` | Tencent Coding Plan (China) | 8 | ⬜ | `hunyuan-2.0-instruct` | 0 / 0 | Abonelik | — |
| 93 | `llama` | Llama | 7 | ⬜ | `cerebras-llama-4-maverick-17b-128e-instruct` | 0 / 0 | Katalogda 0 | — |
| 94 | `minimax` | MiniMax | 7 | ✅ | `MiniMax-M2.5` | 0.3 / 1.2 | Ücretli | — |
| 95 | `minimax-cn` | MiniMax (minimaxi.com) | 7 | ⬜ | `MiniMax-M3` | 0.3 / 1.2 | Ücretli | — |
| 96 | `minimax-cn-coding-plan` | MiniMax Token Plan (minimaxi.com) | 7 | ⬜ | `MiniMax-M3` | 0 / 0 | Abonelik | — |
| 97 | `minimax-coding-plan` | MiniMax Token Plan (minimax.io) | 7 | ⬜ | `MiniMax-M3` | 0 / 0 | Abonelik | — |
| 98 | `modelscope` | ModelScope | 7 | ⬜ | `ZhipuAI/GLM-4.6` | 0 / 0 | Katalogda 0 | — |
| 99 | `openai-codex` | OpenAI ChatGPT Subscription | 7 | ✅ | `gpt-5.4` | 2.5 / 15 | Ücretli | — |
| 100 | `synthetic` | Synthetic | 7 | ⬜ | `hf:zai-org/GLM-5.2` | 1.4 / 4.4 | Ücretli | — |
| 101 | `trustedrouter` | TrustedRouter | 7 | ⬜ | `synth` | 0 / 0 | Katalogda 0 | — |
| 102 | `zhipuai-coding-plan` | Zhipu AI Coding Plan | 7 | ⬜ | `glm-5.2` | 0 / 0 | Abonelik | — |
| 103 | `friendli` | Friendli | 6 | ⬜ | `zai-org/GLM-5.2` | 1.4 / 4.4 | Ücretli | — |
| 104 | `inceptron` | Inceptron | 6 | ⬜ | `zai-org/GLM-5.2` | 1.2 / 4.2 | Ücretli | — |
| 105 | `inferx` | InferX | 6 | ⬜ | `qwen/qwen3.6-27b-fp8` | 0 / 0 | Katalogda 0 | — |
| 106 | `tinfoil` | Tinfoil | 6 | ⬜ | `glm-5-2` | 1.5 / 5.25 | Ücretli | — |
| 107 | `umans-ai-coding-plan` | Umans AI Coding Plan | 6 | ⬜ | `umans-glm-5.2` | 0 / 0 | Abonelik | — |
| 108 | `zai-coding-plan` | Z.AI Coding Plan | 6 | ✅ | `glm-5.2` | 0 / 0 | Abonelik | — |
| 109 | `ai-router` | AI-ROUTER | 5 | ⬜ | `gpt-5.6-luna` | 1 / 6 | Ücretli | — |
| 110 | `cloudferro-sherlock` | CloudFerro Sherlock | 5 | ⬜ | `MiniMaxAI/MiniMax-M2.5` | 0.3 / 1.2 | Ücretli | — |
| 111 | `dinference` | DInference | 5 | ⬜ | `glm-5.1` | 1.25 / 3.89 | Ücretli | — |
| 112 | `mixlayer` | Mixlayer | 5 | ⬜ | `qwen/qwen3.5-122b-a10b` | 0.4 / 3.2 | Ücretli | — |
| 113 | `stackit` | STACKIT | 5 | ⬜ | `Qwen/Qwen3.6-27B` | 0.53 / 0.76 | Ücretli | — |
| 114 | `stepfun` | StepFun (China) | 5 | ⬜ | `step-3.7-flash` | 0.185 / 1.11 | Ücretli | — |
| 115 | `stepfun-ai` | StepFun (Global) | 5 | ⬜ | `step-3.7-flash` | 0.185 / 1.11 | Ücretli | — |
| 116 | `umans-ai` | Umans AI | 5 | ⬜ | `umans-glm-5.2` | 1.4 / 4.4 | Ücretli | — |
| 117 | `wafer.ai` | Wafer | 5 | ⬜ | `GLM-5.2` | 1.2 / 4.1 | Ücretli | — |
| 118 | `xai` | xAI | 5 | ✅ | `grok-4.20-0309-non-reasoning` | 1.25 / 2.5 | Ücretli | — |
| 119 | `deepseek` | DeepSeek | 4 | ✅ | `deepseek-v4-flash` | 0.14 / 0.28 | Ücretli | — |
| 120 | `ebcloud` | EBCloud | 4 | ⬜ | `DeepSeek-V4-Flash` | 0.143 / 0.2857 | Ücretli | — |
| 121 | `lilac` | Lilac | 4 | ⬜ | `zai-org/glm-5.2` | 0.9 / 3 | Ücretli | — |
| 122 | `lucidquery` | LucidQuery | 4 | ⬜ | `lucidquery-agi-01-frontier` | 4.5 / 22 | Ücretli | — |
| 123 | `stepfun-step-plan` | StepFun Step Plan (China) | 4 | ⬜ | `step-3.7-flash` | 0 / 0 | Abonelik | — |
| 124 | `atomic-chat` | Atomic Chat | 3 | ⬜ | `Qwen3_5-9B-MLX-4bit` | 0 / 0 | Katalogda 0 | — |
| 125 | `cerebras` | Cerebras | 3 | ✅ | `zai-glm-4.7` | 2.25 / 2.75 | Ücretli | — |
| 126 | `claude-code` | Claude Code | 3 | ✅ | `sonnet` | 2 / 10 | Ücretli | — |
| 127 | `drun` | D.Run (China) | 3 | ⬜ | `public/minimax-m25` | 0.29 / 1.16 | Ücretli | — |
| 128 | `kimi-for-coding` | Kimi For Coding | 3 | ⬜ | `k3` | 0 / 0 | Abonelik | — |
| 129 | `lmstudio` | LM Studio | 3 | ✅ | `openai/gpt-oss-20b` | 0 / 0 | Yerel | — |
| 130 | `poolside` | Poolside | 3 | ✅ | `poolside/laguna-xs-2.1` | 0 / 0 | Katalogda 0 | — |
| 131 | `sakana` | Sakana AI | 3 | ⬜ | `fugu` | 0 / 0 | Katalogda 0 | — |
| 132 | `stepfun-ai-step-plan` | StepFun Step Plan (Global) | 3 | ⬜ | `step-3.7-flash` | 0 / 0 | Abonelik | — |
| 133 | `upstage` | Upstage | 3 | ⬜ | `solar-pro3` | 0.25 / 0.25 | Ücretli | — |
| 134 | `v0` | Vercel V0 | 3 | ✅ | `v0-1.5-md` | 3 / 15 | Ücretli | — |
| 135 | `xiaomi` | Xiaomi | 3 | ✅ | `mimo-v2.5-pro-ultraspeed` | 1.305 / 2.61 | Ücretli | — |
| 136 | `xpersona` | Xpersona | 3 | ⬜ | `claude-fable-5` | 3 / 18 | Ücretli | — |
| 137 | `blueclaw` | Blue Claw | 2 | ⬜ | `Qwen3.6-27B` | 0 / 0 | Katalogda 0 | — |
| 138 | `claudinio` | Claudinio | 2 | ⬜ | `claudinio` | 0.5 / 2 | Ücretli | — |
| 139 | `moark` | Moark | 2 | ⬜ | `MiniMax-M2.1` | 2.1 / 8.4 | Ücretli | — |
| 140 | `nova` | Nova | 2 | ⬜ | `nova-2-pro-v1` | 0 / 0 | Katalogda 0 | — |
| 141 | `privatemode-ai` | Privatemode AI | 2 | ⬜ | `kimi-k2.6` | 0 / 0 | Katalogda 0 | — |
| 142 | `sarvam` | Sarvam AI | 2 | ⬜ | `sarvam-105b` | 0 / 0 | Katalogda 0 | — |
| 143 | `subconscious` | Subconscious | 2 | ⬜ | `subconscious/glm-5.2` | 1.4 / 4.4 | Ücretli | — |
| 144 | `tencent-tokenhub` | Tencent TokenHub | 2 | ✅ | `hy3` | 0 / 0 | Katalogda 0 | — |
| 145 | `xiaomi-token-plan-ams` | Xiaomi Token Plan (Europe) | 2 | ⬜ | `mimo-v2.5` | 0 / 0 | Abonelik | — |
| 146 | `xiaomi-token-plan-cn` | Xiaomi Token Plan (China) | 2 | ⬜ | `mimo-v2.5` | 0 / 0 | Abonelik | — |
| 147 | `xiaomi-token-plan-sgp` | Xiaomi Token Plan (Singapore) | 2 | ⬜ | `mimo-v2.5` | 0 / 0 | Abonelik | — |
| 148 | `abliteration-ai` | abliteration.ai | 1 | ⬜ | `abliterated-model` | 3 / 3 | Ücretli | — |
| 149 | `asksage` | AskSage | 1 | ✅ | `gpt-4o` | ? | Bilinmiyor | — |
| 150 | `bailing` | Bailing | 1 | ⬜ | `Ling-1T` | 0.57 / 2.29 | Ücretli | — |
| 151 | `dify` | Dify | 1 | ✅ | `default` | ? | Bilinmiyor | — |
| 152 | `doubao` | Doubao | 1 | ✅ | `doubao-1-5-pro-256k-250115` | ? | Bilinmiyor | — |
| 153 | `hicap` | HiCap | 1 | ✅ | `hicap-pro` | ? | Bilinmiyor | — |
| 154 | `huawei-cloud-maas` | Huawei Cloud MaaS | 1 | ✅ | `DeepSeek-R1` | ? | Bilinmiyor | — |
| 155 | `inception` | Inception | 1 | ⬜ | `mercury-2` | 0.25 / 0.75 | Ücretli | — |
| 156 | `kuae-cloud-coding-plan` | KUAE Cloud Coding Plan | 1 | ⬜ | `GLM-4.7` | 0 / 0 | Abonelik | — |
| 157 | `litellm` | LiteLLM | 1 | ✅ | `gpt-5.4` | ? | Bilinmiyor | — |
| 158 | `llmtr` | LLMTR | 1 | ⬜ | `qwen3-6-35b` | 5 / 10 | Ücretli | — |
| 159 | `longcat` | LongCat | 1 | ⬜ | `LongCat-2.0` | 0.75 / 2.95 | Ücretli | — |
| 160 | `lynkr` | Lynkr | 1 | ⬜ | `lynkr-auto` | 0 / 0 | Katalogda 0 | — |
| 161 | `meta` | Meta | 1 | ⬜ | `muse-spark-1.1` | 1.25 / 4.25 | Ücretli | — |
| 162 | `nousResearch` | Nous Research | 1 | ✅ | `DeepHermes-3-Llama-3-3-70B-Preview` | ? | Bilinmiyor | — |
| 163 | `oca` | Oracle Code Assist | 1 | ✅ | `anthropic/claude-3-7-sonnet-20250219` | ? | Bilinmiyor | oca.mode, oca.usePromptCache |
| 164 | `openai-codex-cli` | OpenAI Codex CLI | 1 | ⬜ | `gpt-5.6-sol` | ? | Bilinmiyor | — |
| 165 | `openai-compatible` | OpenAI Compatible | 1 | ✅ | `gpt-4o` | ? | Bilinmiyor | — |
| 166 | `qwen` | Alibaba Qwen | 1 | ✅ | `qwen-plus-latest` | ? | Bilinmiyor | apiLine |
| 167 | `qwen-code` | Alibaba Qwen Code | 1 | ✅ | `qwen3-coder-plus` | ? | Bilinmiyor | apiLine |
| 168 | `tencent-token-plan` | Tencent Token Plan | 1 | ⬜ | `hy3` | 0 / 0 | Abonelik | — |
| 169 | `thinkingmachines` | Thinking Machines | 1 | ⬜ | `inkling` | 3.74 / 9.36 | Ücretli | — |
| 170 | `zeldoc` | Zeldoc | 1 | ⬜ | `z-code` | 0 / 0 | Katalogda 0 | — |
| 171 | `zenifra` | Zenifra | 1 | ⬜ | `alibaba/qwen3.6-35b-a3b` | 0.19 / 0.48 | Ücretli | — |
| 172 | `morph` | Morph | 0 | ⬜ | `default` | ? | Bilinmiyor | — |
| 173 | `ollama` | Ollama | 0 | ✅ | `default` | ? | Yerel | — |
| 174 | `sambanova` | SambaNova | 0 | ✅ | `default` | ? | Bilinmiyor | — |

## 2. Her sağlayıcının model listesi

Alfabetik. Katalogda 0 modeli olanlar (`sambanova`, `ollama`, `morph`) modellerini
**canlı** çekiyor — liste ancak geçerli bir key girildikten sonra doluyor.

### `302ai` — 302.AI

`https://api.302.ai/v1` · 92 model · protokol: `openai-chat`

- `claude-opus-4-7`  ← varsayılan
- `glm-5.1`
- `glm-5v-turbo`
- `gpt-5.4-mini`
- `gpt-5.4-mini-2026-03-17`
- `gpt-5.4-nano`
- `gpt-5.4-nano-2026-03-17`
- `MiniMax-M2.7`
- `MiniMax-M2.7-highspeed`
- `glm-5-turbo`
- `grok-4.20-beta-0309-non-reasoning`
- `grok-4.20-beta-0309-reasoning`
- `grok-4.20-multi-agent-beta-0309`
- `gpt-5.4`
- `gpt-5.4-pro`
- `claude-sonnet-4-6`
- `claude-sonnet-4-6-thinking`
- `glm-5`
- `claude-opus-4-6`
- `claude-opus-4-6-thinking`
- `glm-4.7-flashx`
- `glm-4.7`
- `MiniMax-M2.1`
- `doubao-seed-1-8-251215`
- `gemini-3-flash-preview`
- `ministral-14b-2512`
- `mistral-large-2512`
- `gpt-5.2`
- `gpt-5.2-chat-latest`
- `glm-4.6v`
- `deepseek-v3.2`
- `deepseek-v3.2-thinking`
- `claude-opus-4-5`
- `claude-opus-4-5-20251101`
- `claude-opus-4-5-20251101-thinking`
- `grok-4-1-fast-non-reasoning`
- `grok-4-1-fast-reasoning`
- `gemini-3-pro-preview`
- `grok-4.1`
- `gpt-5.1`
- `gpt-5.1-chat-latest`
- `doubao-seed-code-preview-251028`
- `MiniMax-M2`
- `claude-haiku-4-5`
- `claude-haiku-4-5-20251001`
- `gpt-5-pro`
- `claude-sonnet-4-5`
- `claude-sonnet-4-5-20250929`
- `claude-sonnet-4-5-20250929-thinking`
- `doubao-seed-1-6-vision-250815`
- `glm-4.6`
- `glm-for-coding`
- `gemini-2.5-flash-lite-preview-09-2025`
- `gemini-2.5-flash-preview-09-2025`
- `qwen3-max-2025-09-23`
- `grok-4-fast-non-reasoning`
- `grok-4-fast-reasoning`
- `kimi-k2-0905-preview`
- `kimi-k2-thinking`
- `kimi-k2-thinking-turbo`
- `glm-4.5v`
- `gpt-5`
- `gpt-5-mini`
- `gpt-5-thinking`
- `claude-opus-4-1-20250805`
- `qwen3-235b-a22b-instruct-2507`
- `glm-4.5`
- `glm-4.5-air`
- `glm-4.5-airx`
- `glm-4.5-x`
- `qwen-flash`
- `qwen3-coder-480b-a35b-instruct`
- `doubao-seed-1-6-thinking-250715`
- `gemini-2.5-flash-nothink`
- `gemini-2.5-flash`
- `gemini-2.5-pro`
- `MiniMax-M1`
- `claude-opus-4-1-20250805-thinking`
- `claude-opus-4-20250514`
- `claude-sonnet-4-20250514`
- `qwen3-235b-a22b`
- `qwen3-30b-a3b`
- `gpt-4.1`
- `gpt-4.1-mini`
- `gpt-4.1-nano`
- `deepseek-reasoner`
- `deepseek-chat`
- `claude-3-5-haiku-20241022`
- `claude-3-5-haiku-latest`
- `qwen-plus`
- `gpt-4o`
- `qwen-max-latest`

### `abacus` — Abacus

`https://routellm.abacus.ai/v1` · 92 model · protokol: `openai-chat`

- `gpt-5.6-luna`  ← varsayılan
- `gpt-5.6-sol`
- `gpt-5.6-terra`
- `grok-4.5`
- `claude-sonnet-5`
- `zai-org/GLM-5.2`
- `claude-fable-5`
- `MiniMaxAI/MiniMax-M3`
- `claude-opus-4-8`
- `gemini-3.5-flash`
- `gemini-3.1-flash-lite`
- `deepseek-ai/DeepSeek-V4-Flash`
- `deepseek-ai/DeepSeek-V4-Pro`
- `gpt-5.5`
- `Qwen/Qwen3.6-27B`
- `moonshotai/Kimi-K2.6`
- `grok-4.3`
- `claude-opus-4-7`
- `muse-spark-1.1`
- `zai-org/GLM-5.1`
- `google/gemma-4-31b-it`
- `mimo-v2-pro`
- `MiniMaxAI/MiniMax-M2.7`
- `gpt-5.4-mini`
- `gpt-5.4-nano`
- `gpt-5.4`
- `gemini-3.1-flash-lite-preview`
- `gpt-5.3-chat-latest`
- `gemini-3.1-pro-preview`
- `claude-sonnet-4-6`
- `zai-org/GLM-5`
- `claude-opus-4-6`
- `gpt-5.3-codex`
- `gpt-5.3-codex-xhigh`
- `gpt-5.2-chat-latest`
- `kimi-k2.5`
- `zai-org/GLM-4.7`
- `gemini-3-flash-preview`
- `gpt-5.2`
- `gpt-5.2-codex`
- `grok-4-1-fast-non-reasoning`
- `gpt-5.1`
- `gpt-5.1-chat-latest`
- `gpt-5.1-codex`
- `gpt-5.1-codex-max`
- `claude-opus-4-5-20251101`
- `claude-haiku-4-5-20251001`
- `zai-org/GLM-4.6`
- `claude-sonnet-4-5-20250929`
- `gpt-5-codex`
- `grok-code-fast-1`
- `gpt-5`
- `gpt-5-mini`
- `gpt-5-nano`
- `claude-opus-4-1-20250805`
- `openai/gpt-oss-120b`
- `zai-org/GLM-4.5`
- `grok-4-0709`
- `grok-4-fast-non-reasoning`
- `kimi-k2-turbo-preview`
- `Qwen/Qwen3-235B-A22B-Instruct-2507`
- `gemini-2.5-flash`
- `gemini-2.5-pro`
- `deepseek-ai/DeepSeek-V3.2`
- `o3-pro`
- `deepseek-ai/DeepSeek-V3.1-Terminus`
- `qwen3-max`
- `claude-opus-4-20250514`
- `claude-sonnet-4-20250514`
- `o3`
- `o4-mini`
- `gpt-4.1`
- `gpt-4.1-mini`
- `gpt-4.1-nano`
- `meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8`
- `Qwen/Qwen3-32B`
- `Qwen/Qwen3-Coder-480B-A35B-Instruct`
- `claude-3-7-sonnet-20250219`
- `deepseek-ai/DeepSeek-R1`
- `deepseek/deepseek-v3.1`
- `o3-mini`
- `llama-3.3-70b-versatile`
- `meta-llama/Meta-Llama-3.3-70B-Instruct`
- `Qwen/QwQ-32B`
- `gpt-4o-2024-11-20`
- `qwen-2.5-coder-32b`
- `Qwen/Qwen2.5-72B-Instruct`
- `meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo`
- `meta-llama/Meta-Llama-3.1-8B-Instruct`
- `gpt-4o-mini`
- `gpt-4o`
- `route-llm`

### `abliteration-ai` — abliteration.ai

`https://api.abliteration.ai/v1` · 1 model · protokol: `openai-chat`

- `abliterated-model`  ← varsayılan

### `ai-router` — AI-ROUTER

`https://api.ai-router.dev/v1` · 5 model · protokol: `openai-chat`

- `gpt-5.6-luna`  ← varsayılan
- `gpt-5.6-sol`
- `gpt-5.6-terra`
- `gpt-5.5`
- `gpt-5.4`

### `aihubmix` — AI Hub Mix

`https://api.aihubmix.com/v1` · 67 model · protokol: `openai-chat`

- `gpt-5.6-luna`
- `gpt-5.6-sol`
- `gpt-5.6-terra`
- `grok-4.5`
- `claude-sonnet-5`
- `glm-5.2`
- `kimi-k2.7-code`
- `kimi-k2.7-code-highspeed`
- `claude-fable-5`
- `qwen3.7-plus`
- `claude-opus-4-8`
- `claude-opus-4-8-think`
- `qwen3.7-max`
- `gemini-3.5-flash`
- `glm-5v-turbo`
- `qwen3.6-max-preview`
- `qwen3.6-plus`
- `gemini-3.1-flash-lite`
- `grok-4.3`
- `doubao-seed-2-0-lite-260428`
- `doubao-seed-2-0-mini-260428`
- `alicloud-deepseek-v4-flash`
- `alicloud-deepseek-v4-pro`
- `deep-deepseek-v4-flash`
- `deep-deepseek-v4-pro`
- `gpt-5.5`
- `coding-xiaomi-mimo-v2.5`
- `coding-xiaomi-mimo-v2.5-pro`
- `xiaomi-mimo-v2.5`
- `xiaomi-mimo-v2.5-free`
- `xiaomi-mimo-v2.5-pro`
- `xiaomi-mimo-v2.5-pro-free`
- `kimi-k2.6`
- `hy3-preview`
- `claude-opus-4-7`
- `claude-opus-4-7-think`
- `grok-build-0.1`
- `coding-glm-5.1`
- `coding-glm-5.1-free`
- `qwen3.6-flash`
- `alicloud-glm-5.1`
- `zai-glm-5.1`
- `coding-minimax-m2.7`
- `coding-minimax-m2.7-free`
- `coding-minimax-m2.7-highspeed`
- `minimax-m2.7`
- `gpt-5.4-mini`
- `gpt-5.4`
- `gemini-3.1-pro-preview`
- `gemini-3.1-pro-preview-customtools`
- `claude-sonnet-4-6`
- `claude-sonnet-4-6-think`
- `doubao-seed-2-0-code-preview`
- `doubao-seed-2-0-pro`
- `claude-opus-4-6`
- `claude-opus-4-6-think`
- `gpt-5.3-codex`
- `kimi-k2.5`
- `gemini-3-flash-preview`
- `gpt-5.2`
- `gpt-5.2-codex`
- `gpt-5.1`
- `gpt-5.1-codex`
- `gpt-5.1-codex-mini`
- `gemini-2.5-flash`
- `gemini-2.5-pro`
- `gpt-4o`  ← varsayılan

### `alibaba` — Alibaba

`https://dashscope-intl.aliyuncs.com/compatible-mode/v1` · 46 model · protokol: `openai-chat`

- `qwen3.7-plus`  ← varsayılan
- `qwen3.7-max`
- `qwen3.6-flash`
- `qwen3.6-27b`
- `qwen3.6-max-preview`
- `qwen3.6-35b-a3b`
- `qwen3.6-plus`
- `qwen3.5-122b-a10b`
- `qwen3.5-27b`
- `qwen3.5-35b-a3b`
- `qwen3.5-plus`
- `qwen3.5-397b-a17b`
- `qwen3-max`
- `qwen3-vl-plus`
- `qwen3-omni-flash`
- `qwen3-omni-flash-realtime`
- `qwen3-next-80b-a3b-instruct`
- `qwen3-next-80b-a3b-thinking`
- `qwen-flash`
- `qwen3-coder-flash`
- `qwen3-coder-plus`
- `qwen-omni-turbo-realtime`
- `qwen3-14b`
- `qwen3-235b-a22b`
- `qwen3-32b`
- `qwen3-8b`
- `qwen3-coder-30b-a3b-instruct`
- `qwen3-coder-480b-a35b-instruct`
- `qwen3-vl-235b-a22b`
- `qwen3-vl-30b-a3b`
- `qvq-max`
- `qwq-plus`
- `qwen-omni-turbo`
- `qwen2-5-omni-7b`
- `qwen-turbo`
- `qwen2-5-14b-instruct`
- `qwen2-5-32b-instruct`
- `qwen2-5-72b-instruct`
- `qwen2-5-7b-instruct`
- `qwen2-5-vl-72b-instruct`
- `qwen2-5-vl-7b-instruct`
- `qwen-vl-max`
- `qwen-max`
- `qwen-plus`
- `qwen-vl-plus`
- `qwen-plus-character-ja`

### `alibaba-cn` — Alibaba (China)

`https://dashscope.aliyuncs.com/compatible-mode/v1` · 79 model · protokol: `openai-chat`

- `glm-5.2`  ← varsayılan
- `qwen3.7-plus`
- `qwen3.7-max`
- `qwen3.6-flash`
- `deepseek-v4-flash`
- `deepseek-v4-pro`
- `kimi-k2.6`
- `qwen3.6-max-preview`
- `glm-5.1`
- `qwen3.6-plus`
- `MiniMax/MiniMax-M2.7`
- `qwen3.5-flash`
- `qwen3.5-397b-a17b`
- `qwen3.5-plus`
- `MiniMax-M2.5`
- `glm-5`
- `kimi-k2.5`
- `kimi/kimi-k2.5`
- `siliconflow/deepseek-v3.2`
- `kimi-k2-thinking`
- `siliconflow/deepseek-v3.1-terminus`
- `qwen3-max`
- `qwen3-vl-plus`
- `qwen3-omni-flash`
- `qwen3-omni-flash-realtime`
- `qwen3-next-80b-a3b-instruct`
- `qwen3-next-80b-a3b-thinking`
- `qwen-flash`
- `qwen3-coder-flash`
- `qwen3-coder-plus`
- `deepseek-r1-0528`
- `siliconflow/deepseek-r1-0528`
- `qwen-omni-turbo-realtime`
- `qwen3-14b`
- `qwen3-235b-a22b`
- `qwen3-32b`
- `qwen3-8b`
- `qwen3-coder-30b-a3b-instruct`
- `qwen3-coder-480b-a35b-instruct`
- `qwen3-vl-235b-a22b`
- `qwen3-vl-30b-a3b`
- `qvq-max`
- `qwq-plus`
- `qwen-long`
- `qwen-omni-turbo`
- `deepseek-r1`
- `deepseek-r1-distill-llama-70b`
- `deepseek-r1-distill-llama-8b`
- `deepseek-r1-distill-qwen-1-5b`
- `deepseek-r1-distill-qwen-14b`
- `deepseek-r1-distill-qwen-32b`
- `deepseek-r1-distill-qwen-7b`
- `deepseek-v3-1`
- `deepseek-v3-2-exp`
- `moonshot-kimi-k2-instruct`
- `siliconflow/deepseek-v3-0324`
- `deepseek-v3`
- `qwen2-5-omni-7b`
- `qwq-32b`
- `qwen-turbo`
- `qwen2-5-coder-32b-instruct`
- `qwen2-5-coder-7b-instruct`
- `qwen-math-turbo`
- `qwen2-5-14b-instruct`
- `qwen2-5-32b-instruct`
- `qwen2-5-72b-instruct`
- `qwen2-5-7b-instruct`
- `qwen2-5-math-72b-instruct`
- `qwen2-5-math-7b-instruct`
- `qwen2-5-vl-72b-instruct`
- `qwen2-5-vl-7b-instruct`
- `qwen-math-plus`
- `qwen-vl-max`
- `qwen-max`
- `qwen-plus`
- `qwen-vl-plus`
- `qwen-deep-research`
- `qwen-doc-turbo`
- `qwen-plus-character`

### `alibaba-coding-plan` — Alibaba Coding Plan

`https://coding-intl.dashscope.aliyuncs.com/v1` · 12 model · protokol: `openai-chat`

- `qwen3.7-plus`  ← varsayılan
- `qwen3.7-max`
- `qwen3.6-flash`
- `qwen3.6-plus`
- `qwen3.5-plus`
- `MiniMax-M2.5`
- `glm-5`
- `qwen3-coder-next`
- `kimi-k2.5`
- `qwen3-max-2026-01-23`
- `glm-4.7`
- `qwen3-coder-plus`

### `alibaba-coding-plan-cn` — Alibaba Coding Plan (China)

`https://coding.dashscope.aliyuncs.com/v1` · 12 model · protokol: `openai-chat`

- `qwen3.7-plus`  ← varsayılan
- `qwen3.7-max`
- `qwen3.6-flash`
- `qwen3.6-plus`
- `qwen3.5-plus`
- `MiniMax-M2.5`
- `glm-5`
- `qwen3-coder-next`
- `kimi-k2.5`
- `qwen3-max-2026-01-23`
- `glm-4.7`
- `qwen3-coder-plus`

### `alibaba-token-plan` — Alibaba Token Plan

`https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1` · 15 model · protokol: `openai-chat`

- `qwen3.8-max-preview`  ← varsayılan
- `glm-5.2`
- `kimi-k2.7-code`
- `qwen3.7-plus`
- `qwen3.7-max`
- `qwen3.6-flash`
- `deepseek-v4-flash`
- `deepseek-v4-pro`
- `kimi-k2.6`
- `glm-5.1`
- `qwen3.6-plus`
- `glm-5`
- `MiniMax-M2.5`
- `kimi-k2.5`
- `deepseek-v3.2`

### `alibaba-token-plan-cn` — Alibaba Token Plan (China)

`https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1` · 15 model · protokol: `openai-chat`

- `qwen3.8-max-preview`  ← varsayılan
- `glm-5.2`
- `kimi-k2.7-code`
- `qwen3.7-plus`
- `qwen3.7-max`
- `qwen3.6-flash`
- `deepseek-v4-flash`
- `deepseek-v4-pro`
- `kimi-k2.6`
- `glm-5.1`
- `qwen3.6-plus`
- `glm-5`
- `MiniMax-M2.5`
- `kimi-k2.5`
- `deepseek-v3.2`

### `ambient` — Ambient

`https://api.ambient.xyz/v1` · 9 model · protokol: `openai-chat`

- `ambient/large`  ← varsayılan
- `z-ai/glm-5.2`
- `zai-org/GLM-5.2-FP8`
- `moonshotai/kimi-k2.7-code`
- `stepfun/step-3.7-flash`
- `deepseek/deepseek-v4-flash`
- `xiaomi/mimo-v2.5`
- `moonshotai/kimi-k2.6`
- `zai-org/GLM-5.1-FP8`

### `anthropic` — Anthropic

`https://api.anthropic.com/v1` · 12 model · protokol: `anthropic`

- `claude-sonnet-5`  ← varsayılan
- `claude-fable-5`
- `claude-opus-4-8`
- `claude-opus-4-7`
- `claude-sonnet-4-6`
- `claude-opus-4-6`
- `claude-opus-4-5`
- `claude-opus-4-5-20251101`
- `claude-haiku-4-5`
- `claude-haiku-4-5-20251001`
- `claude-sonnet-4-5`
- `claude-sonnet-4-5-20250929`

### `anyapi` — AnyAPI

`https://api.anyapi.ai/v1` · 27 model · protokol: `openai-chat`

- `deepseek/deepseek-v4-flash`  ← varsayılan
- `deepseek/deepseek-v4-pro`
- `xai/grok-4.3`
- `anthropic/claude-opus-4-7`
- `openai/gpt-5.4`
- `anthropic/claude-sonnet-4-6`
- `anthropic/claude-opus-4-6`
- `google/gemini-3-flash-preview`
- `openai/gpt-5.2`
- `deepseek/deepseek-chat`
- `deepseek/deepseek-r1`
- `google/gemini-3-pro-preview`
- `openai/gpt-5.1`
- `anthropic/claude-haiku-4-5`
- `anthropic/claude-sonnet-4-5`
- `openai/gpt-5`
- `openai/gpt-5-mini`
- `google/gemini-2.5-flash`
- `google/gemini-2.5-flash-lite`
- `google/gemini-2.5-pro`
- `openai/o3`
- `openai/o4-mini`
- `openai/gpt-4.1`
- `openai/gpt-4.1-mini`
- `openai/o3-mini`
- `mistralai/mistral-large-2512`
- `cohere/command-r-plus-08-2024`

### `asksage` — AskSage

`https://api.asksage.ai/server` · 1 model · protokol: `openai-chat`

- `gpt-4o`  ← varsayılan

### `atomic-chat` — Atomic Chat

`http://127.0.0.1:1337/v1` · 3 model · protokol: `openai-chat`

- `Qwen3_5-9B-MLX-4bit`  ← varsayılan
- `Qwen3_5-9B-Q4_K_M`
- `Meta-Llama-3_1-8B-Instruct-GGUF`

### `auriko` — Auriko

`https://api.auriko.ai/v1` · 15 model · protokol: `openai-chat`

- `deepseek-v4-flash`  ← varsayılan
- `deepseek-v4-pro`
- `kimi-k2.6`
- `grok-4.3`
- `claude-opus-4-7`
- `glm-5.1`
- `qwen-3.6-plus`
- `minimax-m2-7`
- `minimax-m2-7-highspeed`
- `gemini-3.1-pro-preview`
- `claude-sonnet-4-6`
- `claude-opus-4-6`
- `kimi-k2.5`
- `gemini-2.5-flash`
- `gemini-2.5-pro`

### `bailing` — Bailing

`https://api.tbox.cn/api/llm/v1/chat/completions` · 1 model · protokol: `openai-chat`

- `Ling-1T`  ← varsayılan

### `baseten` — Baseten

`https://inference.baseten.co/v1` · 12 model · protokol: `openai-chat`

- `thinkingmachines/inkling`  ← varsayılan
- `zai-org/GLM-5.2`
- `moonshotai/Kimi-K2.7-Code`
- `nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B`
- `deepseek-ai/DeepSeek-V4-Pro`
- `moonshotai/Kimi-K2.6`
- `zai-org/GLM-5.1`
- `nvidia/Nemotron-120B-A12B`
- `zai-org/GLM-5`
- `moonshotai/Kimi-K2.5`
- `zai-org/GLM-4.7`
- `openai/gpt-oss-120b`

### `bedrock` — AWS Bedrock

`—` · 109 model · protokol: `anthropic`

- `openai.gpt-5.6-luna`
- `openai.gpt-5.6-sol`
- `openai.gpt-5.6-terra`
- `anthropic.claude-sonnet-5`
- `au.anthropic.claude-sonnet-5`
- `eu.anthropic.claude-sonnet-5`
- `global.anthropic.claude-sonnet-5`
- `jp.anthropic.claude-sonnet-5`
- `us.anthropic.claude-sonnet-5`
- `anthropic.claude-fable-5`
- `eu.anthropic.claude-fable-5`
- `global.anthropic.claude-fable-5`
- `us.anthropic.claude-fable-5`
- `anthropic.claude-opus-4-8`
- `au.anthropic.claude-opus-4-8`
- `eu.anthropic.claude-opus-4-8`
- `global.anthropic.claude-opus-4-8`
- `jp.anthropic.claude-opus-4-8`
- `us.anthropic.claude-opus-4-8`
- `openai.gpt-5.5`
- `xai.grok-4.3`
- `anthropic.claude-opus-4-7`
- `eu.anthropic.claude-opus-4-7`
- `global.anthropic.claude-opus-4-7`
- `jp.anthropic.claude-opus-4-7`
- `us.anthropic.claude-opus-4-7`
- `minimax.minimax-m2.5`  ← varsayılan
- `zai.glm-5`
- `nvidia.nemotron-super-3-120b`
- `openai.gpt-5.4`
- `anthropic.claude-sonnet-4-6`
- `au.anthropic.claude-sonnet-4-6`
- `eu.anthropic.claude-sonnet-4-6`
- `global.anthropic.claude-sonnet-4-6`
- `jp.anthropic.claude-sonnet-4-6`
- `mistral.devstral-2-123b`
- `us.anthropic.claude-sonnet-4-6`
- `deepseek.v3.2`
- `moonshotai.kimi-k2.5`
- `qwen.qwen3-coder-next`
- `anthropic.claude-opus-4-6-v1`
- `au.anthropic.claude-opus-4-6-v1`
- `eu.anthropic.claude-opus-4-6-v1`
- `global.anthropic.claude-opus-4-6-v1`
- `us.anthropic.claude-opus-4-6-v1`
- `zai.glm-4.7-flash`
- `minimax.minimax-m2.1`
- `nvidia.nemotron-nano-3-30b`
- `zai.glm-4.7`
- `mistral.magistral-small-2509`
- `mistral.ministral-3-3b-instruct`
- `mistral.mistral-large-3-675b-instruct`
- `moonshot.kimi-k2-thinking`
- `anthropic.claude-opus-4-5-20251101-v1:0`
- `eu.anthropic.claude-opus-4-5-20251101-v1:0`
- `global.anthropic.claude-opus-4-5-20251101-v1:0`
- `us.anthropic.claude-opus-4-5-20251101-v1:0`
- `openai.gpt-oss-safeguard-120b`
- `openai.gpt-oss-safeguard-20b`
- `minimax.minimax-m2`
- `anthropic.claude-haiku-4-5-20251001-v1:0`
- `au.anthropic.claude-haiku-4-5-20251001-v1:0`
- `eu.anthropic.claude-haiku-4-5-20251001-v1:0`
- `global.anthropic.claude-haiku-4-5-20251001-v1:0`
- `jp.anthropic.claude-haiku-4-5-20251001-v1:0`
- `us.anthropic.claude-haiku-4-5-20251001-v1:0`
- `qwen.qwen3-vl-235b-a22b`
- `anthropic.claude-sonnet-4-5-20250929-v1:0`
- `au.anthropic.claude-sonnet-4-5-20250929-v1:0`
- `eu.anthropic.claude-sonnet-4-5-20250929-v1:0`
- `global.anthropic.claude-sonnet-4-5-20250929-v1:0`
- `jp.anthropic.claude-sonnet-4-5-20250929-v1:0`
- `us.anthropic.claude-sonnet-4-5-20250929-v1:0`
- `deepseek.v3-v1:0`
- `qwen.qwen3-235b-a22b-2507-v1:0`
- `qwen.qwen3-32b-v1:0`
- `qwen.qwen3-coder-30b-a3b-v1:0`
- `qwen.qwen3-coder-480b-a35b-v1:0`
- `qwen.qwen3-next-80b-a3b`
- `anthropic.claude-opus-4-1-20250805-v1:0`
- `openai.gpt-oss-120b`
- `openai.gpt-oss-120b-1:0`
- `openai.gpt-oss-20b`
- `openai.gpt-oss-20b-1:0`
- `us.anthropic.claude-opus-4-1-20250805-v1:0`
- `google.gemma-3-27b-it`
- `mistral.voxtral-small-24b-2507`
- `writer.palmyra-x4-v1:0`
- `writer.palmyra-x5-v1:0`
- `mistral.pixtral-large-2502-v1:0`
- `meta.llama4-maverick-17b-instruct-v1:0`
- `meta.llama4-scout-17b-instruct-v1:0`
- `us.meta.llama4-maverick-17b-instruct-v1:0`
- `us.meta.llama4-scout-17b-instruct-v1:0`
- `deepseek.r1-v1:0`
- `us.deepseek.r1-v1:0`
- `meta.llama3-3-70b-instruct-v1:0`
- `amazon.nova-lite-v1:0`
- `amazon.nova-micro-v1:0`
- `amazon.nova-pro-v1:0`
- `amazon.nova-2-lite-v1:0`
- `google.gemma-3-4b-it`
- `mistral.ministral-3-14b-instruct`
- `mistral.ministral-3-8b-instruct`
- `mistral.voxtral-mini-3b-2507`
- `nvidia.nemotron-nano-12b-v2`
- `nvidia.nemotron-nano-9b-v2`
- `meta.llama3-1-70b-instruct-v1:0`
- `meta.llama3-1-8b-instruct-v1:0`

### `berget` — Berget.AI

`https://api.berget.ai/v1` · 8 model · protokol: `openai-chat`

- `zai-org/GLM-5.2`  ← varsayılan
- `moonshotai/Kimi-K2.6`
- `mistralai/Mistral-Medium-3.5-128B`
- `google/gemma-4-31B-it`
- `zai-org/GLM-4.7`
- `mistralai/Mistral-Small-3.2-24B-Instruct-2506`
- `openai/gpt-oss-120b`
- `meta-llama/Llama-3.3-70B-Instruct`

### `blueclaw` — Blue Claw

`https://openai.blueclaw.network/v1` · 2 model · protokol: `openai-chat`

- `Qwen3.6-27B`  ← varsayılan
- `Qwen/Qwen3.6-35B-A3B-FP8`

### `cerebras` — Cerebras

`https://api.cerebras.ai/v1` · 3 model · protokol: `openai-chat`

- `gemma-4-31b`
- `zai-glm-4.7`  ← varsayılan
- `gpt-oss-120b`

### `chutes` — Chutes

`https://llm.chutes.ai/v1` · 12 model · protokol: `openai-chat`

- `zai-org/GLM-5.2-TEE`  ← varsayılan
- `Qwen/Qwen3.6-27B-TEE`
- `moonshotai/Kimi-K2.6-TEE`
- `zai-org/GLM-5.1-TEE`
- `google/gemma-4-31B-turbo-TEE`
- `Qwen/Qwen3.5-397B-A17B-TEE`
- `MiniMaxAI/MiniMax-M2.5-TEE`
- `zai-org/GLM-5-TEE`
- `moonshotai/Kimi-K2.5-TEE`
- `deepseek-ai/DeepSeek-V3.2-TEE`
- `Qwen/Qwen3-235B-A22B-Thinking-2507-TEE`
- `Qwen/Qwen3-32B-TEE`

### `clarifai` — Clarifai

`https://api.clarifai.com/v2/ext/openai/v1` · 10 model · protokol: `openai-chat`

- `moonshotai/chat-completion/models/Kimi-K2_6`  ← varsayılan
- `minimaxai/chat-completion/models/MiniMax-M2_5-high-throughput`
- `arcee_ai/AFM/models/trinity-mini`
- `mistralai/completion/models/Ministral-3-14B-Reasoning-2512`
- `mistralai/completion/models/Ministral-3-3B-Reasoning-2512`
- `openai/chat-completion/models/gpt-oss-120b-high-throughput`
- `openai/chat-completion/models/gpt-oss-20b`
- `qwen/qwenCoder/models/Qwen3-Coder-30B-A3B-Instruct`
- `qwen/qwenLM/models/Qwen3-30B-A3B-Thinking-2507`
- `qwen/qwenLM/models/Qwen3-30B-A3B-Instruct-2507`

### `claude-code` — Claude Code

`` · 3 model · protokol: `openai-chat`

- `opus`
- `sonnet`  ← varsayılan
- `haiku`

### `claudinio` — Claudinio

`https://api.claudin.io/v1` · 2 model · protokol: `openai-chat`

- `claudinio`  ← varsayılan
- `claudius`

### `cline` — Cline Usage-Billing

`https://api.cline.bot/api/v1` · 270 model · protokol: `openai-chat`

- `google/gemini-3.5-flash-lite`
- `google/gemini-3.6-flash`
- `meituan/longcat-2.0`
- `moonshotai/kimi-k3`
- `thinkingmachines/inkling`
- `kwaipilot/kat-coder-air-v2.5`
- `kwaipilot/kat-coder-pro-v2.5`
- `openai/gpt-5.6-luna`
- `openai/gpt-5.6-luna-pro`
- `openai/gpt-5.6-sol`
- `openai/gpt-5.6-sol-pro`
- `openai/gpt-5.6-terra`
- `openai/gpt-5.6-terra-pro`
- `~x-ai/grok-latest`
- `x-ai/grok-4.5`
- `aion-labs/aion-3.0`
- `aion-labs/aion-3.0-mini`
- `tencent/hy3`
- `poolside/laguna-xs-2.1`
- `poolside/laguna-xs-2.1:free`
- `anthropic/claude-sonnet-5`  ← varsayılan
- `nex-agi/nex-n2-mini`
- `sakana/fugu-ultra`
- `cohere/north-mini-code:free`
- `moonshotai/kimi-k2.7-code`
- `~anthropic/claude-fable-latest`
- `anthropic/claude-fable-5`
- `nex-agi/nex-n2-pro`
- `nvidia/nemotron-3-ultra-550b-a55b`
- `nvidia/nemotron-3-ultra-550b-a55b:free`
- `qwen/qwen3.7-plus`
- `minimax/minimax-m3`
- `stepfun/step-3.7-flash`
- `anthropic/claude-opus-4.8`
- `anthropic/claude-opus-4.8-fast`
- `google/gemini-3-pro-image`
- `qwen/qwen3.7-max`
- `google/gemini-3.5-flash`
- `inclusionai/ring-2.6-1t`
- `google/gemini-3.1-flash-lite`
- `openai/gpt-chat-latest`
- `ibm-granite/granite-4.1-8b`
- `mistralai/mistral-medium-3-5`
- `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`
- `poolside/laguna-m.1`
- `poolside/laguna-m.1:free`
- `~anthropic/claude-haiku-latest`
- `~anthropic/claude-sonnet-latest`
- `~google/gemini-flash-latest`
- `~google/gemini-pro-latest`
- `~moonshotai/kimi-latest`
- `~openai/gpt-latest`
- `~openai/gpt-mini-latest`
- `qwen/qwen3.5-plus-20260420`
- `qwen/qwen3.6-flash`
- `deepseek/deepseek-v4-flash`
- `deepseek/deepseek-v4-pro`
- `inclusionai/ling-2.6-1t`
- `openai/gpt-5.5`
- `openai/gpt-5.5-pro`
- `qwen/qwen3.6-27b`
- `xiaomi/mimo-v2.5`
- `xiaomi/mimo-v2.5-pro`
- `~anthropic/claude-opus-latest`
- `inclusionai/ling-2.6-flash`
- `moonshotai/kimi-k2.6`
- `qwen/qwen3.6-max-preview`
- `tencent/hy3-preview`
- `qwen/qwen3.6-35b-a3b`
- `x-ai/grok-4.3`
- `anthropic/claude-opus-4.7`
- `anthropic/claude-opus-4.7-fast`
- `x-ai/grok-build-0.1`
- `meta/muse-spark-1.1`
- `google/gemma-4-26b-a4b-it`
- `google/gemma-4-26b-a4b-it:free`
- `google/gemma-4-31b-it`
- `google/gemma-4-31b-it:free`
- `qwen/qwen3.6-plus`
- `arcee-ai/trinity-large-thinking`
- `x-ai/grok-4.20`
- `kwaipilot/kat-coder-pro-v2`
- `rekaai/reka-edge`
- `minimax/minimax-m2.7`
- `openai/gpt-5.4-mini`
- `openai/gpt-5.4-nano`
- `mistralai/mistral-small-2603`
- `nvidia/nemotron-3-super-120b-a12b`
- `nvidia/nemotron-3-super-120b-a12b:free`
- `bytedance-seed/seed-2.0-lite`
- `openai/gpt-5.4`
- `openai/gpt-5.4-pro`
- `inception/mercury-2`
- `google/gemini-3.1-flash-lite-preview`
- `openai/gpt-5.3-chat`
- `bytedance-seed/seed-2.0-mini`
- `qwen/qwen3.5-flash-02-23`
- `aion-labs/aion-2.0`
- `qwen/qwen3.5-122b-a10b`
- `qwen/qwen3.5-27b`
- `qwen/qwen3.5-35b-a3b`
- `qwen/qwen3.5-9b`
- `google/gemini-3.1-pro-preview`
- `google/gemini-3.1-pro-preview-customtools`
- `anthropic/claude-sonnet-4.6`
- `qwen/qwen3.5-plus-02-15`
- `qwen/qwen3.5-397b-a17b`
- `minimax/minimax-m2.5`
- `qwen/qwen3-max-thinking`
- `anthropic/claude-opus-4.6`
- `openai/gpt-5.3-codex`
- `qwen/qwen3-coder-next`
- `openrouter/free`
- `stepfun/step-3.5-flash`
- `upstage/solar-pro-3`
- `openai/gpt-audio`
- `openai/gpt-audio-mini`
- `moonshotai/kimi-k2.5`
- `bytedance-seed/seed-1.6`
- `bytedance-seed/seed-1.6-flash`
- `minimax/minimax-m2.1`
- `google/gemini-3-flash-preview`
- `nvidia/nemotron-3-nano-30b-a3b`
- `nvidia/nemotron-3-nano-30b-a3b:free`
- `openai/gpt-5.2`
- `openai/gpt-5.2-codex`
- `openai/gpt-5.2-pro`
- `openai/gpt-5.2-chat`
- `relace/relace-search`
- `amazon/nova-2-lite-v1`
- `mistralai/ministral-14b-2512`
- `mistralai/ministral-3b-2512`
- `mistralai/ministral-8b-2512`
- `deepseek/deepseek-chat`
- `deepseek/deepseek-v3.2`
- `anthropic/claude-opus-4.5`
- `openai/gpt-5.1`
- `openai/gpt-5.1-chat`
- `openai/gpt-5.1-codex`
- `openai/gpt-5.1-codex-max`
- `openai/gpt-5.1-codex-mini`
- `moonshotai/kimi-k2-thinking`
- `amazon/nova-premier-v1`
- `mistralai/voxtral-small-24b-2507`
- `openai/gpt-oss-safeguard-20b`
- `nvidia/nemotron-nano-12b-v2-vl:free`
- `minimax/minimax-m2`
- `qwen/qwen3-vl-32b-instruct`
- `anthropic/claude-haiku-4.5`
- `qwen/qwen3-vl-8b-instruct`
- `qwen/qwen3-vl-8b-thinking`
- `openai/gpt-5-pro`
- `qwen/qwen3-vl-30b-a3b-instruct`
- `qwen/qwen3-vl-30b-a3b-thinking`
- `anthropic/claude-sonnet-4.5`
- `deepseek/deepseek-v3.2-exp`
- `qwen/qwen3-max`
- `qwen/qwen3-vl-235b-a22b-instruct`
- `qwen/qwen3-vl-235b-a22b-thinking`
- `deepseek/deepseek-v3.1-terminus`
- `openai/gpt-5-codex`
- `qwen/qwen-plus-2025-07-28`
- `qwen/qwen-plus-2025-07-28:thinking`
- `moonshotai/kimi-k2-0905`
- `qwen/qwen3-next-80b-a3b-instruct`
- `qwen/qwen3-next-80b-a3b-thinking`
- `qwen/qwen3-30b-a3b-thinking-2507`
- `deepseek/deepseek-chat-v3.1`
- `nvidia/nemotron-nano-9b-v2:free`
- `mistralai/mistral-medium-3.1`
- `ai21/jamba-large-1.7`
- `openai/gpt-5`
- `openai/gpt-5-mini`
- `openai/gpt-5-nano`
- `anthropic/claude-opus-4.1`
- `openai/gpt-oss-120b`
- `openai/gpt-oss-20b`
- `openai/gpt-oss-20b:free`
- `mistralai/codestral-2508`
- `qwen/qwen3-30b-a3b-instruct-2507`
- `qwen/qwen3-coder-flash`
- `qwen/qwen3-235b-a22b-thinking-2507`
- `qwen/qwen3-coder`
- `qwen/qwen3-coder-plus`
- `qwen/qwen3-235b-a22b-2507`
- `moonshotai/kimi-k2`
- `mistralai/mistral-small-3.2-24b-instruct`
- `google/gemini-2.5-flash`
- `google/gemini-2.5-flash-lite`
- `google/gemini-2.5-pro`
- `minimax/minimax-m1`
- `openai/o3-pro`
- `google/gemini-2.5-pro-preview`
- `deepseek/deepseek-r1-0528`
- `anthropic/claude-opus-4`
- `anthropic/claude-sonnet-4`
- `google/gemini-2.5-pro-preview-05-06`
- `mistralai/mistral-medium-3`
- `arcee-ai/virtuoso-large`
- `qwen/qwen3-14b`
- `qwen/qwen3-30b-a3b`
- `qwen/qwen3-8b`
- `openai/o3`
- `openai/o4-mini`
- `openai/o4-mini-high`
- `openai/gpt-4.1`
- `openai/gpt-4.1-mini`
- `openai/gpt-4.1-nano`
- `meta-llama/llama-4-maverick`
- `meta-llama/llama-4-scout`
- `qwen/qwen3-235b-a22b`
- `qwen/qwen3-32b`
- `qwen/qwen3-coder-30b-a3b-instruct`
- `deepseek/deepseek-chat-v3-0324`
- `google/gemma-3-12b-it`
- `google/gemma-3-27b-it`
- `mistralai/mistral-saba`
- `openai/o3-mini-high`
- `deepseek/deepseek-r1`
- `openai/o3-mini`
- `meta-llama/llama-3.3-70b-instruct`
- `amazon/nova-lite-v1`
- `amazon/nova-micro-v1`
- `amazon/nova-pro-v1`
- `openai/o1`
- `openai/gpt-4o-2024-11-20`
- `mistralai/mistral-large-2407`
- `thedrummer/unslopnemo-12b`
- `mistralai/mistral-large-2512`
- `qwen/qwen-2.5-7b-instruct`
- `qwen/qwen-2.5-72b-instruct`
- `cohere/command-r-08-2024`
- `cohere/command-r-plus-08-2024`
- `sao10k/l3.1-euryale-70b`
- `openai/gpt-4o-2024-08-06`
- `meta-llama/llama-3.1-70b-instruct`
- `meta-llama/llama-3.1-8b-instruct`
- `openai/gpt-4o-mini`
- `openai/gpt-4o-mini-2024-07-18`
- `mistralai/mistral-nemo`
- `openai/o3-deep-research`
- `openai/o4-mini-deep-research`
- `openai/gpt-4o`
- `openai/gpt-4o-2024-05-13`
- `mistralai/mixtral-8x22b-instruct`
- `anthropic/claude-3-haiku`
- `mistralai/mistral-large`
- `openai/gpt-3.5-turbo-0613`
- `openai/gpt-4-turbo-preview`
- `qwen/qwen-plus`
- `openrouter/auto`
- `openai/gpt-4`
- `openai/gpt-4-turbo`
- `openai/gpt-3.5-turbo-16k`
- `openai/gpt-3.5-turbo`
- `zai/glm-5.2-fast`
- `zai/glm-5.2`
- `zai/glm-5.1`
- `zai/glm-5v-turbo`
- `zai/glm-5-turbo`
- `zai/glm-5`
- `zai/glm-4.7-flash`
- `zai/glm-4.7-flashx`
- `zai/glm-4.7`
- `zai/glm-4.6`
- `zai/glm-4.6v`
- `zai/glm-4.6v-flash`
- `zai/glm-4.5v`
- `zai/glm-4.5`
- `zai/glm-4.5-air`

### `cline-pass` — ClinePass

`https://api.cline.bot/api/v1` · 14 model · protokol: `openai-chat`

- `cline-pass/kimi-k3`
- `cline-pass/glm-5.2`  ← varsayılan
- `cline-pass/kimi-k2.7-code`
- `cline-pass/qwen3.7-plus`
- `cline-pass/minimax-m3`
- `stepfun/step-3.7-flash`
- `cline-pass/qwen3.7-max`
- `poolside/laguna-m.1:free`
- `cline-pass/deepseek-v4-flash`
- `cline-pass/deepseek-v4-pro`
- `deepseek/deepseek-v4-flash`
- `cline-pass/mimo-v2.5`
- `cline-pass/mimo-v2.5-pro`
- `cline-pass/kimi-k2.6`

### `cloudferro-sherlock` — CloudFerro Sherlock

`https://api-sherlock.cloudferro.com/openai/v1` · 5 model · protokol: `openai-chat`

- `MiniMaxAI/MiniMax-M2.5`  ← varsayılan
- `openai/gpt-oss-120b`
- `speakleash/Bielik-11B-v2.6-Instruct`
- `speakleash/Bielik-11B-v3.0-Instruct`
- `meta-llama/Llama-3.3-70B-Instruct`

### `cloudflare-workers-ai` — Cloudflare Workers AI

`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/v1` · 13 model · protokol: `openai-chat`

- `@cf/zai-org/glm-5.2`  ← varsayılan
- `@cf/moonshotai/kimi-k2.7-code`
- `@cf/moonshotai/kimi-k2.6`
- `@cf/google/gemma-4-26b-a4b-it`
- `@cf/nvidia/nemotron-3-120b-a12b`
- `@cf/zai-org/glm-4.7-flash`
- `@cf/ibm-granite/granite-4.0-h-micro`
- `@cf/openai/gpt-oss-120b`
- `@cf/openai/gpt-oss-20b`
- `@cf/qwen/qwen3-30b-a3b-fp8`
- `@cf/meta/llama-4-scout-17b-16e-instruct`
- `@cf/mistralai/mistral-small-3.1-24b-instruct`
- `@cf/meta/llama-3.3-70b-instruct-fp8-fast`

### `cortecs` — Cortecs

`https://api.cortecs.ai/v1` · 55 model · protokol: `openai-chat`

- `glm-5.2`  ← varsayılan
- `kimi-k2.7-code`
- `minimax-m3`
- `claude-opus4-8`
- `deepseek-v4-flash`
- `deepseek-v4-pro`
- `kimi-k2.6`
- `claude-opus4-7`
- `glm-5.1`
- `glm-5v-turbo`
- `minimax-m2.7`
- `glm-5-turbo`
- `nemotron-3-super-120b-a12b`
- `gpt-5.4`
- `qwen3.5-122b-a10b`
- `claude-4-6-sonnet`
- `qwen3.5-397b-a17b`
- `minimax-m2.5`
- `glm-5`
- `claude-opus4-6`
- `qwen3-coder-next`
- `kimi-k2.5`
- `minimax-m2.1`
- `glm-4.7`
- `devstral-2512`
- `kimi-k2-thinking`
- `deepseek-v3.2`
- `mistral-large-2512`
- `intellect-3`
- `claude-opus4-5`
- `minimax-m2`
- `claude-haiku-4-5`
- `claude-4-5-sonnet`
- `qwen3-next-80b-a3b-thinking`
- `hermes-4-70b`
- `glm-4.7-flash`
- `gpt-oss-120b`
- `glm-4.5-air`
- `qwen3-coder-30b-a3b-instruct`
- `codestral-2508`
- `glm-4.5`
- `qwen3-coder-480b-a35b-instruct`
- `qwen3-235b-a22b-instruct-2507`
- `kimi-k2-instruct`
- `deepseek-r1-0528`
- `claude-sonnet-4`
- `qwen3-32b`
- `gpt-4.1`
- `llama-4-maverick`
- `deepseek-v3-0324`
- `gemini-2.5-pro`
- `llama-3.3-70b-instruct`
- `nova-pro-v1`
- `qwen-2.5-72b-instruct`
- `llama-3.1-405b-instruct`

### `crof` — CrofAI

`https://crof.ai/v1` · 19 model · protokol: `openai-chat`

- `glm-5.2`  ← varsayılan
- `kimi-k2.7-code`
- `deepseek-v4-flash`
- `deepseek-v4-pro`
- `deepseek-v4-pro-lightning`
- `mimo-v2.5-pro`
- `qwen3.6-27b`
- `kimi-k2.6`
- `glm-5.1`
- `gemma-4-31b-it`
- `qwen3.5-9b`
- `qwen3.5-397b-a17b`
- `glm-5`
- `minimax-m2.5`
- `kimi-k2.5-lightning`
- `glm-4.7-flash`
- `kimi-k2.5`
- `glm-4.7`
- `deepseek-v3.2`

### `crossmodel` — CrossModel

`https://api.crossmodel.ai/v1` · 44 model · protokol: `openai-chat`

- `moonshot/kimi-k3`  ← varsayılan
- `openai/gpt-5.6-luna`
- `openai/gpt-5.6-sol`
- `openai/gpt-5.6-terra`
- `x-ai/grok-4.5`
- `anthropic/claude-sonnet-5`
- `z-ai/glm-5.2`
- `moonshot/kimi-k2.7-code`
- `anthropic/claude-fable-5`
- `qwen/qwen3.7-plus`
- `minimax/minimax-m3`
- `anthropic/claude-opus-4-8`
- `qwen/qwen3.7-max`
- `gemini/gemini-3.5-flash`
- `qwen/qwen3.6-flash`
- `deepseek/deepseek-v4-flash`
- `deepseek/deepseek-v4-pro`
- `openai/gpt-5.5`
- `openai/gpt-5.5-pro`
- `xiaomi/mimo-v2.5`
- `xiaomi/mimo-v2.5-pro`
- `moonshot/kimi-k2.6`
- `tencent/hy3-preview`
- `x-ai/grok-4.3`
- `anthropic/claude-opus-4-7`
- `x-ai/grok-build-0.1`
- `z-ai/glm-5.1`
- `qwen/qwen3.6-plus`
- `minimax/minimax-m2.7`
- `openai/gpt-5.4-mini`
- `openai/gpt-5.4-nano`
- `z-ai/glm-5-turbo`
- `openai/gpt-5.4`
- `gemini/gemini-3.1-pro-preview`
- `anthropic/claude-sonnet-4-6`
- `z-ai/glm-5`
- `moonshot/kimi-k2.5`
- `z-ai/glm-4.7`
- `gemini/gemini-3-flash-preview`
- `anthropic/claude-haiku-4-5`
- `gemini/gemini-2.5-flash`
- `gemini/gemini-2.5-flash-lite`
- `gemini/gemini-2.5-pro`
- `openai/gpt-4o-mini`

### `daoxe` — DaoXE

`https://daoxe.com/v1` · 9 model · protokol: `openai-chat`

- `grok-4.5`  ← varsayılan
- `claude-opus-4-8`
- `gpt-5.5`
- `grok-4.3`
- `gpt-5.4`
- `gemini-3.1-pro-preview`
- `claude-sonnet-4-6`
- `kimi-k2.5`
- `claude-haiku-4-5-20251001`

### `databricks` — Databricks

`https://${DATABRICKS_HOST}/ai-gateway/mlflow/v1` · 30 model · protokol: `openai-chat`

- `databricks-gpt-5-6-luna`  ← varsayılan
- `databricks-gpt-5-6-sol`
- `databricks-gpt-5-6-terra`
- `databricks-glm-5-2`
- `databricks-kimi-k2-7-code`
- `databricks-gpt-5-5`
- `databricks-claude-opus-4-7`
- `databricks-gpt-5-4-mini`
- `databricks-gpt-5-4-nano`
- `databricks-gpt-5-4`
- `databricks-gemini-3-1-flash-lite`
- `databricks-gemini-3-1-pro`
- `databricks-claude-sonnet-4-6`
- `databricks-claude-opus-4-6`
- `databricks-gemini-3-flash`
- `databricks-gpt-5-2`
- `databricks-claude-opus-4-5`
- `databricks-gemini-3-pro`
- `databricks-gpt-5-1`
- `databricks-claude-haiku-4-5`
- `databricks-claude-sonnet-4`
- `databricks-claude-sonnet-4-5`
- `databricks-gpt-5`
- `databricks-gpt-5-mini`
- `databricks-gpt-5-nano`
- `databricks-claude-opus-4-1`
- `databricks-gpt-oss-120b`
- `databricks-gpt-oss-20b`
- `databricks-gemini-2-5-flash`
- `databricks-gemini-2-5-pro`

### `deepseek` — DeepSeek

`https://api.deepseek.com/v1` · 4 model · protokol: `openai-chat`

- `deepseek-v4-flash`  ← varsayılan
- `deepseek-v4-pro`
- `deepseek-chat`
- `deepseek-reasoner`

### `dify` — Dify

`—` · 1 model · protokol: `openai-chat`

- `default`  ← varsayılan

### `digitalocean` — DigitalOcean

`https://inference.do-ai.run/v1` · 60 model · protokol: `openai-chat`

- `glm-5.2`  ← varsayılan
- `anthropic-claude-fable-5`
- `nemotron-3-ultra-550b`
- `anthropic-claude-opus-4.8`
- `deepseek-4-flash`
- `nemotron-3-nano-omni`
- `deepseek-v4-pro`
- `openai-gpt-5.5`
- `gemma-4-31B-it`
- `kimi-k2.6`
- `anthropic-claude-opus-4.7`
- `glm-5.1`
- `arcee-trinity-large-thinking`
- `openai-gpt-5.4-mini`
- `openai-gpt-5.4-nano`
- `nvidia-nemotron-3-super-120b`
- `openai-gpt-5.4`
- `openai-gpt-5.4-pro`
- `anthropic-claude-4.6-sonnet`
- `qwen3.5-397b-a17b`
- `minimax-m2.5`
- `glm-5`
- `anthropic-claude-opus-4.6`
- `openai-gpt-5.3-codex`
- `kimi-k2.5`
- `ministral-3-8b-instruct-2512`
- `mistral-3-14B`
- `openai-gpt-5.2`
- `openai-gpt-5.2-pro`
- `deepseek-3.2`
- `nemotron-nano-12b-v2-vl`
- `anthropic-claude-opus-4.5`
- `openai-gpt-5.1-codex-max`
- `anthropic-claude-4.5-haiku`
- `anthropic-claude-haiku-4.5`
- `anthropic-claude-4.5-sonnet`
- `openai-gpt-5`
- `openai-gpt-5-mini`
- `openai-gpt-5-nano`
- `anthropic-claude-4.1-opus`
- `openai-gpt-oss-120b`
- `openai-gpt-oss-20b`
- `qwen3-coder-flash`
- `anthropic-claude-opus-4`
- `anthropic-claude-sonnet-4`
- `alibaba-qwen3-32b`
- `openai-o3`
- `nemotron-3-nano-30b`
- `openai-gpt-4.1`
- `llama-4-maverick`
- `deepseek-r1-distill-llama-70b`
- `deepseek-v3`
- `openai-o3-mini`
- `llama3.3-70b-instruct`
- `openai-o1`
- `qwen-2.5-14b-instruct`
- `llama3-8b-instruct`
- `openai-gpt-4o-mini`
- `mistral-7b-instruct-v0.3`
- `openai-gpt-4o`

### `dinference` — DInference

`https://api.dinference.com/v1` · 5 model · protokol: `openai-chat`

- `glm-5.1`  ← varsayılan
- `glm-5`
- `minimax-m2.5`
- `glm-4.7`
- `gpt-oss-120b`

### `doubao` — Doubao

`https://ark.cn-beijing.volces.com/api/v3` · 1 model · protokol: `openai-chat`

- `doubao-1-5-pro-256k-250115`  ← varsayılan

### `drun` — D.Run (China)

`https://chat.d.run/v1` · 3 model · protokol: `openai-chat`

- `public/minimax-m25`  ← varsayılan
- `public/deepseek-r1`
- `public/deepseek-v3`

### `ebcloud` — EBCloud

`https://maas-api.ebcloud.com/v1` · 4 model · protokol: `openai-chat`

- `DeepSeek-V4-Flash`  ← varsayılan
- `DeepSeek-V4-Pro`
- `Kimi-K2.6`
- `GLM-5.1`

### `empiriolabs` — EmpirioLabs AI

`https://api.empiriolabs.ai/v1` · 37 model · protokol: `openai-chat`

- `kimi-k3`  ← varsayılan
- `fugu-ultra`
- `glm-5-2`
- `kimi-k2-7-code`
- `kimi-k2-7-code-highspeed`
- `qwen3-7-plus`
- `minimax-m3`
- `step-3-7-flash`
- `qwen3-7-max`
- `qwen3-6-flash`
- `deepseek-v4-flash`
- `deepseek-v4-pro`
- `mimo-v2-5`
- `mimo-v2-5-pro`
- `qwen3-6-27b`
- `kimi-k2-6`
- `qwen3-6-max-preview`
- `muse-spark-1-1`
- `glm-5-1`
- `gemma-4-26b-a4b`
- `qwen3-6-plus`
- `step-3-5-flash-2603`
- `minimax-m2-7`
- `minimax-m2-7-highspeed`
- `mistral-small-4`
- `qwen3-5-4b`
- `qwen3-5-122b-a10b`
- `qwen3-5-27b`
- `qwen3-5-35b-a3b`
- `qwen3-5-9b`
- `qwen3-5-plus`
- `qwen3-5-397b-a17b`
- `step-3-5-flash`
- `glm-4-7-flash`
- `qwen3-max`
- `glm-4-5-flash`
- `mistral-medium-3`

### `evroc` — evroc

`https://models.think.evroc.com/v1` · 9 model · protokol: `openai-chat`

- `zai-org/GLM-5.2`  ← varsayılan
- `evroc/roc`
- `mistralai/Mistral-Medium-3.5-128B`
- `moonshotai/Kimi-K2.6`
- `Qwen/Qwen3.6-35B-A3B-FP8`
- `google/gemma-4-26B-A4B-it`
- `openai/gpt-oss-120b`
- `Qwen/Qwen3-VL-30B-A3B-Instruct`
- `nvidia/Llama-3.3-70B-Instruct-FP8`

### `fastrouter` — FastRouter

`https://go.fastrouter.ai/api/v1` · 34 model · protokol: `openai-chat`

- `anthropic/claude-opus-4.8`  ← varsayılan
- `google/gemini-3.5-flash`
- `deepseek/deepseek-v4-pro`
- `openai/gpt-5.5`
- `openai/gpt-5.5-pro`
- `moonshotai/kimi-k2.6`
- `x-ai/grok-4.3`
- `x-ai/grok-build-0.1`
- `z-ai/glm-5.1`
- `google/gemma-4-31b-it`
- `minimax/minimax-m2.7`
- `minimax/minimax-m2.7-highspeed`
- `openai/gpt-5.4-mini`
- `openai/gpt-5.4-nano`
- `google/gemini-3.1-pro-preview`
- `sarvam/sarvam-30b`
- `anthropic/claude-sonnet-4.6`
- `z-ai/glm-5`
- `openai/gpt-5.3-codex`
- `sarvam/sarvam-105b`
- `openai/gpt-5`
- `openai/gpt-5-mini`
- `openai/gpt-5-nano`
- `anthropic/claude-opus-4.1`
- `openai/gpt-oss-120b`
- `openai/gpt-oss-20b`
- `qwen/qwen3-coder`
- `moonshotai/kimi-k2`
- `x-ai/grok-4`
- `google/gemini-2.5-flash`
- `google/gemini-2.5-pro`
- `openai/gpt-realtime-1.5`
- `anthropic/claude-sonnet-4`
- `openai/gpt-4.1`

### `fireworks` — Fireworks AI

`https://api.fireworks.ai/inference/v1` · 16 model · protokol: `openai-chat`

- `accounts/fireworks/routers/glm-5p2-fast`  ← varsayılan
- `accounts/fireworks/models/glm-5p2`
- `accounts/fireworks/models/kimi-k2p7-code`
- `accounts/fireworks/models/minimax-m3`
- `accounts/fireworks/models/qwen3p7-plus`
- `accounts/fireworks/routers/kimi-k2p7-code-fast`
- `accounts/fireworks/models/deepseek-v4-flash`
- `accounts/fireworks/models/deepseek-v4-pro`
- `accounts/fireworks/models/kimi-k2p6`
- `accounts/fireworks/routers/kimi-k2p6-fast`
- `accounts/fireworks/routers/kimi-k2p6-turbo`
- `accounts/fireworks/models/minimax-m2p7`
- `accounts/fireworks/models/glm-5p1`
- `accounts/fireworks/routers/glm-5p1-fast`
- `accounts/fireworks/models/gpt-oss-120b`
- `accounts/fireworks/models/gpt-oss-20b`

### `freemodel` — FreeModel

`https://cc.freemodel.dev/v1` · 10 model · protokol: `anthropic`

- `claude-fable-5`  ← varsayılan
- `claude-opus-4-8`
- `gpt-5.5`
- `claude-opus-4-7`
- `gpt-5.4-mini`
- `gpt-5.4`
- `claude-sonnet-4-6`
- `claude-opus-4-6`
- `gpt-5.3-codex`
- `claude-haiku-4-5-20251001`

### `friendli` — Friendli

`https://api.friendli.ai/serverless/v1` · 6 model · protokol: `openai-chat`

- `zai-org/GLM-5.2`  ← varsayılan
- `zai-org/GLM-5.1`
- `google/gemma-4-31B-it`
- `MiniMaxAI/MiniMax-M2.5`
- `deepseek-ai/DeepSeek-V3.2`
- `Qwen/Qwen3-235B-A22B-Instruct-2507`

### `frogbot` — FrogBot

`https://app.frogbot.ai/api/v1` · 26 model · protokol: `openai-chat`

- `grok-4-3`  ← varsayılan
- `deepseek-v4-pro`
- `claude-opus-4-7`
- `qwen-3-6-plus`
- `minimax-m2-7`
- `gpt-5-4-mini`
- `gpt-5-5`
- `gemini-3-1-pro-preview`
- `claude-sonnet-4-6`
- `gpt-5-3-codex`
- `claude-opus-4-6`
- `gemini-3-flash-preview`
- `grok-4-1-fast-non-reasoning`
- `grok-4-1-fast-reasoning`
- `claude-haiku-4-5`
- `grok-code-fast-1`
- `gpt-5-4-nano`
- `gemini-2.5-flash`
- `gemini-2.5-pro`
- `zai-glm-5-1`
- `minimax-m2-5`
- `gpt-4o`
- `gpt-oss-120b`
- `gpt-oss-20b`
- `kimi-k2-6`
- `kimi-k2.5`

### `gemini` — Google Gemini

`https://generativelanguage.googleapis.com/v1beta` · 14 model · protokol: `gemini`

- `gemini-3.5-flash-lite`  ← varsayılan
- `gemini-3.6-flash`
- `gemini-3.5-flash`
- `gemini-flash-latest`
- `gemini-3.1-flash-lite`
- `gemini-flash-lite-latest`
- `gemma-4-26b-a4b-it`
- `gemma-4-31b-it`
- `gemini-3.1-pro-preview`
- `gemini-3.1-pro-preview-customtools`
- `gemini-3-flash-preview`
- `gemini-2.5-flash`
- `gemini-2.5-flash-lite`
- `gemini-2.5-pro`

### `github-copilot` — GitHub Copilot

`https://api.githubcopilot.com` · 28 model · protokol: `openai-chat`

- `gpt-5.6-luna`  ← varsayılan
- `gpt-5.6-sol`
- `gpt-5.6-terra`
- `claude-sonnet-5`
- `kimi-k2.7-code`
- `claude-fable-5`
- `mai-code-1-flash-picker`
- `claude-opus-4.8`
- `gemini-3.5-flash`
- `gpt-5.5`
- `claude-opus-4.7`
- `gpt-5.4-mini`
- `gpt-5.4-nano`
- `gpt-5.4`
- `gemini-3.1-pro-preview`
- `claude-sonnet-4.6`
- `claude-opus-4.6`
- `gpt-5.3-codex`
- `gemini-3-flash-preview`
- `gpt-5.2`
- `gpt-5.2-codex`
- `claude-opus-4.5`
- `claude-haiku-4.5`
- `claude-sonnet-4.5`
- `gpt-5-mini`
- `gemini-2.5-pro`
- `claude-sonnet-4`
- `gpt-4.1`

### `github-models` — GitHub Models

`https://models.github.ai/inference` · 49 model · protokol: `openai-chat`

- `deepseek/deepseek-r1-0528`  ← varsayılan
- `mistral-ai/mistral-medium-2505`
- `openai/gpt-4.1`
- `openai/gpt-4.1-mini`
- `openai/gpt-4.1-nano`
- `deepseek/deepseek-v3-0324`
- `mistral-ai/mistral-small-2503`
- `meta/llama-4-maverick-17b-128e-instruct-fp8`
- `meta/llama-4-scout-17b-16e-instruct`
- `deepseek/deepseek-r1`
- `microsoft/mai-ds-r1`
- `mistral-ai/codestral-2501`
- `microsoft/phi-4`
- `microsoft/phi-4-mini-instruct`
- `microsoft/phi-4-mini-reasoning`
- `microsoft/phi-4-multimodal-instruct`
- `microsoft/phi-4-reasoning`
- `xai/grok-3`
- `xai/grok-3-mini`
- `meta/llama-3.3-70b-instruct`
- `cohere/cohere-command-a`
- `mistral-ai/mistral-large-2411`
- `mistral-ai/ministral-3b`
- `meta/llama-3.2-11b-vision-instruct`
- `meta/llama-3.2-90b-vision-instruct`
- `ai21-labs/ai21-jamba-1.5-large`
- `ai21-labs/ai21-jamba-1.5-mini`
- `microsoft/phi-3.5-mini-instruct`
- `microsoft/phi-3.5-moe-instruct`
- `microsoft/phi-3.5-vision-instruct`
- `cohere/cohere-command-r-08-2024`
- `cohere/cohere-command-r-plus-08-2024`
- `meta/meta-llama-3.1-405b-instruct`
- `meta/meta-llama-3.1-70b-instruct`
- `meta/meta-llama-3.1-8b-instruct`
- `mistral-ai/mistral-nemo`
- `openai/gpt-4o-mini`
- `openai/gpt-4o`
- `microsoft/phi-3-medium-128k-instruct`
- `microsoft/phi-3-medium-4k-instruct`
- `microsoft/phi-3-mini-128k-instruct`
- `microsoft/phi-3-mini-4k-instruct`
- `microsoft/phi-3-small-128k-instruct`
- `microsoft/phi-3-small-8k-instruct`
- `meta/meta-llama-3-70b-instruct`
- `meta/meta-llama-3-8b-instruct`
- `cohere/cohere-command-r-plus`
- `cohere/cohere-command-r`
- `core42/jais-30b-chat`

### `gmicloud` — GMI Cloud

`https://api.gmi-serving.com/v1` · 13 model · protokol: `openai-chat`

- `zai-org/GLM-5.2-FP8`  ← varsayılan
- `moonshotai/kimi-k2.7-code-highspeed`
- `anthropic/claude-opus-4.8`
- `Qwen/Qwen3.7-Max`
- `deepseek-ai/DeepSeek-V4-Flash`
- `deepseek-ai/DeepSeek-V4-Pro`
- `openai/gpt-5.5`
- `moonshotai/Kimi-K2.6`
- `anthropic/claude-opus-4.7`
- `zai-org/GLM-5.1-FP8`
- `anthropic/claude-sonnet-4.6`
- `zai-org/GLM-5-FP8`
- `anthropic/claude-opus-4.6`

### `groq` — Groq

`https://api.groq.com/openai/v1` · 8 model · protokol: `openai-chat`

- `openai/gpt-oss-safeguard-20b`
- `openai/gpt-oss-120b`
- `openai/gpt-oss-20b`
- `qwen/qwen3-32b`
- `meta-llama/llama-4-scout-17b-16e-instruct`
- `llama-3.3-70b-versatile`
- `llama-3.1-8b-instant`
- `moonshotai/kimi-k2-instruct-0905`  ← varsayılan

### `helicone` — Helicone

`https://ai-gateway.helicone.ai/v1` · 72 model · protokol: `openai-chat`

- `claude-4.5-opus`  ← varsayılan
- `gemini-3-pro-preview`
- `grok-4-1-fast-non-reasoning`
- `grok-4-1-fast-reasoning`
- `kimi-k2-thinking`
- `claude-4.5-haiku`
- `claude-haiku-4-5-20251001`
- `claude-4.5-sonnet`
- `claude-sonnet-4-5-20250929`
- `qwen3-vl-235b-a22b-instruct`
- `deepseek-v3.1-terminus`
- `deepseek-v3.2`
- `grok-4-fast-non-reasoning`
- `kimi-k2-0905`
- `grok-4-fast-reasoning`
- `claude-opus-4-1`
- `claude-opus-4-1-20250805`
- `qwen3-coder-30b-a3b-instruct`
- `qwen3-coder`
- `gemini-2.5-flash-lite`
- `deepseek-tng-r1t2-chimera`
- `mistral-small`
- `gemini-2.5-flash`
- `gemini-2.5-pro`
- `qwen3-30b-a3b`
- `claude-opus-4`
- `claude-sonnet-4`
- `qwen3-32b`
- `gpt-4.1`
- `gpt-4.1-mini`
- `gpt-4.1-mini-2025-04-14`
- `gpt-4.1-nano`
- `claude-3.7-sonnet`
- `deepseek-r1-distill-llama-70b`
- `gpt-5`
- `gpt-5-codex`
- `gpt-5-mini`
- `gpt-5-nano`
- `gpt-5.1`
- `gpt-5.1-chat-latest`
- `gpt-5.1-codex`
- `gpt-5.1-codex-mini`
- `kimi-k2-0711`
- `llama-4-maverick`
- `llama-4-scout`
- `qwen3-next-80b-a3b-instruct`
- `deepseek-v3`
- `llama-3.3-70b-instruct`
- `llama-3.3-70b-versatile`
- `claude-3.5-haiku`
- `claude-3.5-sonnet-v2`
- `gpt-5-chat-latest`
- `grok-code-fast-1`
- `chatgpt-4o-latest`
- `mistral-large-2411`
- `llama-3.1-8b-instruct`
- `llama-3.1-8b-instruct-turbo`
- `glm-4.6`
- `gpt-4o-mini`
- `grok-4`
- `llama-3.1-8b-instant`
- `gpt-oss-120b`
- `gpt-oss-20b`
- `grok-3`
- `grok-3-mini`
- `o3`
- `o3-pro`
- `o4-mini`
- `hermes-2-pro-llama-3-8b`
- `gpt-4o`
- `claude-3-haiku-20240307`
- `o3-mini`

### `hicap` — HiCap

`https://api.hicap.ai/v1` · 1 model · protokol: `openai-chat`

- `hicap-pro`  ← varsayılan

### `hpc-ai` — HPC-AI

`https://api.hpc-ai.com/inference/v1` · 9 model · protokol: `openai-chat`

- `zai-org/glm-5.2`  ← varsayılan
- `moonshotai/kimi-k2.7-code`
- `deepseek/deepseek-v4-flash`
- `deepseek/deepseek-v4-pro`
- `openai/gpt-5.5`
- `anthropic/claude-opus-4.7`
- `zai-org/glm-5.1`
- `minimax/minimax-m2.5`
- `moonshotai/kimi-k2.5`

### `huawei-cloud-maas` — Huawei Cloud MaaS

`https://infer-modelarts.cn-southwest-2.myhuaweicloud.com/v1` · 1 model · protokol: `openai-chat`

- `DeepSeek-R1`  ← varsayılan

### `huggingface` — Hugging Face

`https://router.huggingface.co/v1` · 49 model · protokol: `openai-chat`

- `zai-org/GLM-5.2`  ← varsayılan
- `moonshotai/Kimi-K2.7-Code`
- `MiniMaxAI/MiniMax-M3`
- `stepfun-ai/Step-3.7-Flash`
- `deepseek-ai/DeepSeek-V4-Flash`
- `deepseek-ai/DeepSeek-V4-Pro`
- `Qwen/Qwen3.6-27B`
- `XiaomiMiMo/MiMo-V2.5-Pro`
- `moonshotai/Kimi-K2.6`
- `Qwen/Qwen3.6-35B-A3B`
- `zai-org/GLM-5.1`
- `google/gemma-4-26B-A4B-it`
- `google/gemma-4-31B-it`
- `MiniMaxAI/MiniMax-M2.7`
- `Qwen/Qwen3.5-122B-A10B`
- `Qwen/Qwen3.5-27B`
- `Qwen/Qwen3.5-35B-A3B`
- `Qwen/Qwen3.5-9B`
- `MiniMaxAI/MiniMax-M2.5`
- `zai-org/GLM-5`
- `Qwen/Qwen3-Coder-Next`
- `Qwen/Qwen3.5-397B-A17B`
- `stepfun-ai/Step-3.5-Flash`
- `moonshotai/Kimi-K2.5`
- `MiniMaxAI/MiniMax-M2.1`
- `zai-org/GLM-4.7`
- `XiaomiMiMo/MiMo-V2-Flash`
- `deepseek-ai/DeepSeek-V3.2`
- `moonshotai/Kimi-K2-Thinking`
- `MiniMaxAI/MiniMax-M2`
- `zai-org/GLM-4.6`
- `Qwen/Qwen3-Next-80B-A3B-Instruct`
- `Qwen/Qwen3-Next-80B-A3B-Thinking`
- `moonshotai/Kimi-K2-Instruct-0905`
- `zai-org/GLM-4.5V`
- `zai-org/GLM-4.7-Flash`
- `openai/gpt-oss-120b`
- `openai/gpt-oss-20b`
- `zai-org/GLM-4.5`
- `zai-org/GLM-4.5-Air`
- `Qwen/Qwen3-235B-A22B-Thinking-2507`
- `Qwen/Qwen3-Coder-480B-A35B-Instruct`
- `moonshotai/Kimi-K2-Instruct`
- `deepseek-ai/DeepSeek-R1-0528`
- `Qwen/Qwen3-235B-A22B`
- `Qwen/Qwen3-32B`
- `Qwen/Qwen3-Coder-30B-A3B-Instruct`
- `deepseek-ai/DeepSeek-R1`
- `meta-llama/Llama-3.3-70B-Instruct`

### `iflowcn` — iFlow

`https://apis.iflow.cn/v1` · 14 model · protokol: `openai-chat`

- `kimi-k2-0905`  ← varsayılan
- `qwen3-235b-a22b-instruct`
- `qwen3-235b-a22b-thinking-2507`
- `qwen3-coder-plus`
- `deepseek-r1`
- `deepseek-v3.2`
- `qwen3-max`
- `qwen3-max-preview`
- `qwen3-vl-plus`
- `deepseek-v3`
- `glm-4.6`
- `kimi-k2`
- `qwen3-235b`
- `qwen3-32b`

### `inception` — Inception

`https://api.inceptionlabs.ai/v1` · 1 model · protokol: `openai-chat`

- `mercury-2`  ← varsayılan

### `inceptron` — Inceptron

`https://api.inceptron.io/v1` · 6 model · protokol: `openai-chat`

- `zai-org/GLM-5.2`  ← varsayılan
- `moonshotai/Kimi-K2.7-Code`
- `moonshotai/Kimi-K2.6`
- `moonshotai/Kimi-K2.6-Fast`
- `zai-org/GLM-5.1-FP8`
- `MiniMaxAI/MiniMax-M2.5`

### `inference` — Inference

`https://inference.net/v1` · 8 model · protokol: `openai-chat`

- `google/gemma-3`  ← varsayılan
- `meta/llama-3.1-8b-instruct`
- `meta/llama-3.2-11b-vision-instruct`
- `meta/llama-3.2-1b-instruct`
- `meta/llama-3.2-3b-instruct`
- `mistral/mistral-nemo-12b-instruct`
- `osmosis/osmosis-structure-0.6b`
- `qwen/qwen-2.5-7b-vision-instruct`

### `inferx` — InferX

`https://model.inferx.net/endpoints/v1` · 6 model · protokol: `openai-chat`

- `qwen/qwen3.6-27b-fp8`  ← varsayılan
- `qwen/qwen3.6-35b-a3b-fp8`
- `google/gemma-4-31b-it-fp8`
- `qwen/qwen3.5-122b-a10b-nvfp4`
- `qwen/qwen3-coder-next-fp8`
- `qwen/qwen3-coder-next-fp8-1m`

### `io-net` — IO.NET

`https://api.intelligence.io.solutions/api/v1` · 17 model · protokol: `openai-chat`

- `Qwen/Qwen3-235B-A22B-Thinking-2507`  ← varsayılan
- `mistralai/Magistral-Small-2506`
- `mistralai/Devstral-Small-2505`
- `deepseek-ai/DeepSeek-R1-0528`
- `Intel/Qwen3-Coder-480B-A35B-Instruct-int4-mixed-ar`
- `meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8`
- `Qwen/Qwen3-Next-80B-A3B-Instruct`
- `meta-llama/Llama-3.3-70B-Instruct`
- `openai/gpt-oss-120b`
- `openai/gpt-oss-20b`
- `zai-org/GLM-4.6`
- `mistralai/Mistral-Large-Instruct-2411`
- `moonshotai/Kimi-K2-Thinking`
- `Qwen/Qwen2.5-VL-32B-Instruct`
- `meta-llama/Llama-3.2-90B-Vision-Instruct`
- `moonshotai/Kimi-K2-Instruct-0905`
- `mistralai/Mistral-Nemo-Instruct-2407`

### `jiekou` — Jiekou.AI

`https://api.jiekou.ai/openai` · 58 model · protokol: `openai-chat`

- `claude-opus-4-6`  ← varsayılan
- `gpt-5.1`
- `qwen/qwen3-coder-next`
- `baidu/ernie-4.5-300b-a47b-paddle`
- `baidu/ernie-4.5-vl-424b-a47b`
- `claude-haiku-4-5-20251001`
- `claude-opus-4-1-20250805`
- `claude-opus-4-20250514`
- `claude-opus-4-5-20251101`
- `claude-sonnet-4-20250514`
- `claude-sonnet-4-5-20250929`
- `deepseek/deepseek-r1-0528`
- `deepseek/deepseek-v3-0324`
- `deepseek/deepseek-v3.1`
- `gemini-2.5-flash`
- `gemini-2.5-flash-lite`
- `gemini-2.5-flash-lite-preview-06-17`
- `gemini-2.5-flash-lite-preview-09-2025`
- `gemini-2.5-flash-preview-05-20`
- `gemini-2.5-pro`
- `gemini-2.5-pro-preview-06-05`
- `gemini-3-flash-preview`
- `gemini-3-pro-preview`
- `gpt-5-chat-latest`
- `gpt-5-codex`
- `gpt-5-mini`
- `gpt-5-nano`
- `gpt-5-pro`
- `gpt-5.1-codex`
- `gpt-5.1-codex-max`
- `gpt-5.1-codex-mini`
- `gpt-5.2`
- `gpt-5.2-codex`
- `gpt-5.2-pro`
- `grok-4-0709`
- `grok-4-1-fast-non-reasoning`
- `grok-4-1-fast-reasoning`
- `grok-4-fast-non-reasoning`
- `grok-4-fast-reasoning`
- `grok-code-fast-1`
- `minimax/minimax-m2.1`
- `minimaxai/minimax-m1-80k`
- `moonshotai/kimi-k2-0905`
- `moonshotai/kimi-k2-instruct`
- `moonshotai/kimi-k2.5`
- `o3`
- `o3-mini`
- `o4-mini`
- `qwen/qwen3-235b-a22b-instruct-2507`
- `qwen/qwen3-235b-a22b-thinking-2507`
- `qwen/qwen3-coder-480b-a35b-instruct`
- `qwen/qwen3-next-80b-a3b-instruct`
- `qwen/qwen3-next-80b-a3b-thinking`
- `xiaomimimo/mimo-v2-flash`
- `zai-org/glm-4.5`
- `zai-org/glm-4.5v`
- `zai-org/glm-4.7`
- `zai-org/glm-4.7-flash`

### `kenari` — Kenari

`https://kenari.id/v1` · 22 model · protokol: `openai-chat`

- `glm-5-2`  ← varsayılan
- `kimi-k2-7-code`
- `qwen3-7-plus`
- `minimax-m3`
- `claude-opus-4-8`
- `deepseek-v4-flash`
- `deepseek-v4-flash:free`
- `deepseek-v4-pro`
- `deepseek-v4-pro:free`
- `gpt-5-5`
- `mimo-v2-5`
- `mimo-v2-5-pro`
- `kimi-k2-6`
- `grok-4-3`
- `claude-opus-4-7`
- `grok-build-0-1`
- `glm-5-1`
- `gemma-4-31b-it`
- `gpt-5-4-mini`
- `claude-sonnet-4-6`
- `gpt-oss-120b`
- `gpt-oss-20b`

### `kilo` — Kilo Gateway

`https://api.kilo.ai/api/gateway` · 261 model · protokol: `openai-responses`

- `minimax/minimax-m3`
- `x-ai/grok-build-0.1`
- `~google/gemini-flash-latest`
- `google/gemini-3.5-flash`
- `anthropic/claude-opus-4.7-fast`
- `inclusionai/ring-2.6-1t`
- `google/gemini-3.1-flash-lite`
- `baidu/cobuddy:free`
- `openai/gpt-chat-latest`
- `x-ai/grok-4.3`
- `ibm-granite/granite-4.1-8b`
- `mistralai/mistral-medium-3-5`
- `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`
- `openrouter/owl-alpha`
- `poolside/laguna-m.1:free`
- `poolside/laguna-xs.2:free`
- `~google/gemini-pro-latest`
- `~moonshotai/kimi-latest`
- `qwen/qwen3.5-plus-20260420`
- `qwen/qwen3.6-27b`
- `qwen/qwen3.6-flash`
- `qwen/qwen3.6-max-preview`
- `~openai/gpt-latest`
- `deepseek/deepseek-v4-flash`
- `deepseek/deepseek-v4-pro`
- `openai/gpt-5.5`
- `openai/gpt-5.5-pro`
- `inclusionai/ling-2.6-1t`
- `tencent/hy3-preview`
- `xiaomi/mimo-v2.5`
- `xiaomi/mimo-v2.5-pro`
- `inclusionai/ling-2.6-flash`
- `moonshotai/kimi-k2.6`
- `~anthropic/claude-opus-latest`
- `anthropic/claude-opus-4.7`
- `stealth/claude-opus-4.7`
- `anthropic/claude-opus-4.6-fast`
- `google/gemma-4-26b-a4b-it`
- `google/gemma-4-31b-it`
- `arcee-ai/trinity-large-thinking`
- `z-ai/glm-5v-turbo`
- `x-ai/grok-4.20`
- `kwaipilot/kat-coder-pro-v2`
- `z-ai/glm-5.1`
- `rekaai/reka-edge`
- `minimax/minimax-m2.7`
- `xiaomi/mimo-v2-omni`
- `xiaomi/mimo-v2-pro`
- `~openai/gpt-mini-latest`
- `openai/gpt-5.4-mini`
- `openai/gpt-5.4-nano`
- `mistralai/mistral-small-2603`
- `kilo-auto/balanced`
- `kilo-auto/free`
- `kilo-auto/frontier`
- `kilo-auto/small`
- `openrouter/auto`
- `z-ai/glm-5-turbo`
- `nvidia/nemotron-3-super-120b-a12b:free`
- `nvidia/nemotron-3-super-120b-a12b`
- `bytedance-seed/seed-2.0-lite`
- `qwen/qwen3.5-9b`
- `openai/gpt-5.4`
- `openai/gpt-5.4-pro`
- `openai/gpt-5.3-chat`
- `google/gemini-3.1-flash-lite-preview`
- `bytedance-seed/seed-2.0-mini`
- `google/gemini-3.1-pro-preview-customtools`
- `qwen/qwen3.5-122b-a10b`
- `qwen/qwen3.5-27b`
- `qwen/qwen3.5-35b-a3b`
- `qwen/qwen3.5-flash-02-23`
- `openai/gpt-5.3-codex`
- `inception/mercury-2`
- `google/gemini-3.1-pro-preview`
- `~anthropic/claude-sonnet-latest`
- `anthropic/claude-sonnet-4.6`
- `stealth/claude-sonnet-4.6`
- `qwen/qwen3.5-397b-a17b`
- `qwen/qwen3.5-plus-02-15`
- `minimax/minimax-m2.5`
- `z-ai/glm-5`
- `anthropic/claude-opus-4.6`
- `stealth/claude-opus-4.6`
- `qwen/qwen3-coder-next`
- `openrouter/free`
- `stepfun/step-3.5-flash`
- `moonshotai/kimi-k2.5`
- `upstage/solar-pro-3`
- `qwen/qwen3-max-thinking`
- `z-ai/glm-4.7-flash`
- `openai/gpt-5.2-codex`
- `mistralai/mistral-small-24b-instruct-2501`
- `bytedance-seed/seed-1.6-flash`
- `minimax/minimax-m2.1`
- `z-ai/glm-4.7`
- `google/gemini-3-flash-preview`
- `mistralai/ministral-14b-2512`
- `xiaomi/mimo-v2-flash`
- `openai/gpt-5.2`
- `openai/gpt-5.2-chat`
- `openai/gpt-5.2-pro`
- `relace/relace-search`
- `essentialai/rnj-1-instruct`
- `mistralai/ministral-3b-2512`
- `mistralai/ministral-8b-2512`
- `arcee-ai/trinity-mini`
- `deepseek/deepseek-v3.2`
- `prime-intellect/intellect-3`
- `anthropic/claude-opus-4.5`
- `openai/gpt-5.1`
- `openai/gpt-5.1-chat`
- `openai/gpt-5.1-codex`
- `openai/gpt-5.1-codex-max`
- `openai/gpt-5.1-codex-mini`
- `moonshotai/kimi-k2-thinking`
- `amazon/nova-premier-v1`
- `openai/gpt-oss-safeguard-20b`
- `minimax/minimax-m2`
- `qwen/qwen3-vl-32b-instruct`
- `openai/gpt-5-image-mini`
- `~anthropic/claude-haiku-latest`
- `anthropic/claude-haiku-4.5`
- `qwen/qwen3-vl-8b-instruct`
- `qwen/qwen3-vl-8b-thinking`
- `openai/gpt-5-image`
- `qwen/qwen3-vl-30b-a3b-thinking`
- `openai/gpt-5-pro`
- `qwen/qwen3-vl-30b-a3b-instruct`
- `z-ai/glm-4.6`
- `z-ai/glm-4.6v`
- `anthropic/claude-sonnet-4.5`
- `google/gemini-2.5-flash-lite-preview-09-2025`
- `qwen/qwen3-vl-235b-a22b-thinking`
- `qwen/qwen3-vl-235b-a22b-instruct`
- `deepseek/deepseek-v3.1-terminus`
- `openai/gpt-5-codex`
- `mistralai/devstral-2512`
- `qwen/qwen3-next-80b-a3b-instruct`
- `qwen/qwen3-next-80b-a3b-thinking`
- `qwen/qwen-plus-2025-07-28`
- `qwen/qwen-plus-2025-07-28:thinking`
- `moonshotai/kimi-k2-0905`
- `qwen/qwen3-max`
- `bytedance-seed/seed-1.6`
- `qwen/qwen3.6-plus`
- `qwen/qwen3.7-max`
- `deepseek/deepseek-chat-v3.1`
- `nvidia/nemotron-nano-9b-v2`
- `openai/gpt-4o-audio-preview`
- `mistralai/mistral-medium-3.1`
- `z-ai/glm-4.5v`
- `ai21/jamba-large-1.7`
- `openai/gpt-5`
- `openai/gpt-5-mini`
- `openai/gpt-5-nano`
- `anthropic/claude-opus-4.1`
- `openai/gpt-oss-120b`
- `openai/gpt-oss-20b`
- `mistralai/codestral-2508`
- `qwen/qwen3-coder-30b-a3b-instruct`
- `qwen/qwen3-30b-a3b-instruct-2507`
- `qwen/qwen3-30b-a3b-thinking-2507`
- `z-ai/glm-4.5`
- `z-ai/glm-4.5-air`
- `qwen/qwen3-235b-a22b-thinking-2507`
- `z-ai/glm-4-32b`
- `qwen/qwen3-coder`
- `qwen/qwen3-coder-flash`
- `google/gemini-2.5-flash`
- `moonshotai/kimi-k2`
- `mistralai/devstral-medium`
- `mistralai/voxtral-small-24b-2507`
- `qwen/qwen3-coder-plus`
- `baidu/ernie-4.5-21b-a3b`
- `baidu/ernie-4.5-vl-28b-a3b`
- `mistralai/mistral-small-3.2-24b-instruct`
- `google/gemini-2.5-flash-lite`
- `minimax/minimax-m1`
- `google/gemini-2.5-pro-preview`
- `deepseek/deepseek-r1-0528`
- `anthropic/claude-opus-4`
- `anthropic/claude-sonnet-4`
- `mistralai/devstral-small`
- `mistralai/mistral-medium-3`
- `arcee-ai/virtuoso-large`
- `google/gemini-2.5-pro-preview-05-06`
- `openai/o4-mini-high`
- `openai/o3`
- `openai/o3-pro`
- `openai/o4-mini`
- `openai/gpt-4.1`
- `openai/gpt-4.1-mini`
- `openai/gpt-4.1-nano`
- `meta-llama/llama-4-maverick`
- `meta-llama/llama-4-scout`
- `qwen/qwen3-14b`
- `qwen/qwen3-235b-a22b-2507`
- `qwen/qwen3-30b-a3b`
- `qwen/qwen3-8b`
- `deepseek/deepseek-chat-v3-0324`
- `google/gemini-2.5-pro`
- `nvidia/llama-3.3-nemotron-super-49b-v1.5`
- `google/gemma-3-27b-it`
- `mistralai/mistral-saba`
- `openai/o3-mini-high`
- `deepseek/deepseek-r1`
- `deepseek/deepseek-v3.2-exp`
- `nex-agi/deepseek-v3.1-nex-n1`
- `openai/o3-mini`
- `google/gemini-2.0-flash-001`
- `google/gemini-2.0-flash-lite-001`
- `amazon/nova-lite-v1`
- `amazon/nova-micro-v1`
- `openai/o1`
- `amazon/nova-pro-v1`
- `cohere/command-r7b-12-2024`
- `amazon/nova-2-lite-v1`
- `deepseek/deepseek-chat`
- `nvidia/nemotron-3-nano-30b-a3b`
- `qwen/qwen3-235b-a22b`
- `qwen/qwen3-32b`
- `openai/gpt-4o-2024-11-20`
- `mistralai/mistral-large-2407`
- `mistralai/pixtral-large-2411`
- `thedrummer/unslopnemo-12b`
- `mistralai/mistral-large-2512`
- `anthropic/claude-3.5-haiku`
- `thedrummer/rocinante-12b`
- `qwen/qwen-2.5-72b-instruct`
- `qwen/qwen-2.5-7b-instruct`
- `cohere/command-r-08-2024`
- `cohere/command-r-plus-08-2024`
- `sao10k/l3.1-euryale-70b`
- `openai/gpt-4o-2024-08-06`
- `meta-llama/llama-3.3-70b-instruct`
- `mistralai/mistral-large`
- `mistralai/mistral-large-2411`
- `meta-llama/llama-3.1-8b-instruct`
- `openai/gpt-4o-mini`
- `openai/gpt-4o-mini-2024-07-18`
- `meta-llama/llama-3.1-70b-instruct`
- `mistralai/mistral-nemo`
- `openai/o3-deep-research`
- `openai/o4-mini-deep-research`
- `sao10k/l3-euryale-70b`
- `openai/gpt-4o`
- `openai/gpt-4o-2024-05-13`
- `meta-llama/llama-3-8b-instruct`
- `mistralai/mixtral-8x22b-instruct`
- `anthropic/claude-3-haiku`
- `openai/gpt-4-turbo-preview`
- `qwen/qwen-plus`
- `openai/gpt-4-1106-preview`
- `openai/gpt-4-turbo`
- `openai/gpt-3.5-turbo-16k`
- `openai/gpt-3.5-turbo-0613`
- `openai/gpt-4-0314`
- `openai/gpt-4`
- `openai/gpt-3.5-turbo`
- `gpt-4o`  ← varsayılan

### `kimi-for-coding` — Kimi For Coding

`https://api.kimi.com/coding/v1` · 3 model · protokol: `anthropic`

- `k3`  ← varsayılan
- `kimi-for-coding`
- `kimi-for-coding-highspeed`

### `kuae-cloud-coding-plan` — KUAE Cloud Coding Plan

`https://coding-plan-endpoint.kuaecloud.net/v1` · 1 model · protokol: `openai-chat`

- `GLM-4.7`  ← varsayılan

### `lilac` — Lilac

`https://api.getlilac.com/v1` · 4 model · protokol: `openai-chat`

- `zai-org/glm-5.2`  ← varsayılan
- `minimaxai/minimax-m3`
- `moonshotai/kimi-k2.6`
- `google/gemma-4-31b-it`

### `litellm` — LiteLLM

`http://localhost:4000/v1` · 1 model · protokol: `openai-responses`

- `gpt-5.4`  ← varsayılan

### `llama` — Llama

`https://api.llama.com/compat/v1` · 7 model · protokol: `openai-chat`

- `cerebras-llama-4-maverick-17b-128e-instruct`  ← varsayılan
- `cerebras-llama-4-scout-17b-16e-instruct`
- `groq-llama-4-maverick-17b-128e-instruct`
- `llama-4-maverick-17b-128e-instruct-fp8`
- `llama-4-scout-17b-16e-instruct-fp8`
- `llama-3.3-70b-instruct`
- `llama-3.3-8b-instruct`

### `llmgateway` — LLM Gateway

`https://api.llmgateway.io/v1` · 150 model · protokol: `openai-chat`

- `kimi-k3`  ← varsayılan
- `gpt-5.6-luna`
- `gpt-5.6-sol`
- `gpt-5.6-terra`
- `grok-4-5`
- `fugu-ultra`
- `glm-5.2`
- `kimi-k2.7-code`
- `kimi-k2.7-code-highspeed`
- `claude-fable-5`
- `nemotron-3-ultra-550b`
- `qwen3.7-plus`
- `minimax-m3`
- `claude-opus-4-8`
- `qwen3.7-max`
- `gemini-3.5-flash`
- `gemini-3.1-flash-lite`
- `qwen3.6-flash`
- `deepseek-v4-flash`
- `deepseek-v4-pro`
- `gpt-5.5`
- `gpt-5.5-pro`
- `mimo-v2.5`
- `mimo-v2.5-pro`
- `kimi-k2.6`
- `qwen3.6-max-preview`
- `grok-4-3`
- `qwen3.6-35b-a3b`
- `claude-opus-4-7`
- `grok-build-0-1`
- `muse-spark-1.1`
- `glm-5.1`
- `gemma-4-26b-a4b-it`
- `gemma-4-31b-it`
- `qwen3.6-plus`
- `minimax-m2.7`
- `minimax-m2.7-highspeed`
- `gpt-5.4-mini`
- `gpt-5.4-nano`
- `grok-4-20-beta-0309-non-reasoning`
- `grok-4-20-beta-0309-reasoning`
- `grok-4-20-non-reasoning`
- `grok-4-20-reasoning`
- `gpt-5.4`
- `gpt-5.4-pro`
- `gpt-5.3-chat-latest`
- `gemini-pro-latest`
- `qwen3.5-9b`
- `gemini-3.1-pro-preview`
- `claude-sonnet-4-6`
- `qwen35-397b-a17b`
- `minimax-m2.5-highspeed`
- `glm-5`
- `minimax-m2.5`
- `claude-opus-4-6`
- `gpt-5.3-codex`
- `glm-4.7-flash`
- `glm-4.7-flashx`
- `kimi-k2.5`
- `minimax-m2.1`
- `glm-4.7`
- `seed-1-8-251228`
- `gemini-3-flash-preview`
- `gpt-5.2`
- `gpt-5.2-chat-latest`
- `gpt-5.2-codex`
- `gpt-5.2-pro`
- `glm-4.6v`
- `glm-4.6v-flashx`
- `grok-4-1-fast-non-reasoning`
- `grok-4-1-fast-reasoning`
- `gpt-5.1`
- `gpt-5.1-codex`
- `gpt-5.1-codex-mini`
- `kimi-k2-thinking`
- `claude-opus-4-5-20251101`
- `minimax-m2`
- `claude-haiku-4-5`
- `claude-haiku-4-5-20251001`
- `claude-haiku-4-5-free`
- `qwen3-coder-next`
- `qwen3-vl-flash`
- `gpt-5-pro`
- `qwen3-vl-30b-a3b-instruct`
- `glm-4.6`
- `claude-sonnet-4-5`
- `claude-sonnet-4-5-20250929`
- `deepseek-v3.2`
- `qwen3-max`
- `qwen3-vl-plus`
- `qwen3-vl-235b-a22b-instruct`
- `qwen3-vl-235b-a22b-thinking`
- `seed-1-6-250915`
- `qwen3-next-80b-a3b-instruct`
- `qwen3-next-80b-a3b-thinking`
- `glm-4.5v`
- `gpt-5`
- `gpt-5-mini`
- `gpt-5-nano`
- `claude-opus-4-1-20250805`
- `gpt-oss-120b`
- `gpt-oss-20b`
- `glm-4.5`
- `glm-4.5-air`
- `glm-4.5-airx`
- `glm-4.5-x`
- `qwen-flash`
- `qwen3-coder-flash`
- `seed-1-6-flash-250715`
- `qwen3-coder-plus`
- `kimi-k2`
- `grok-4`
- `qwen3-235b-a22b-instruct-2507`
- `qwen3-235b-a22b-thinking-2507`
- `qwen3-30b-a3b-instruct-2507`
- `seed-1-6-250615`
- `mistral-small-2506`
- `gemini-2.5-flash`
- `gemini-2.5-flash-lite`
- `gemini-2.5-pro`
- `qwen3-235b-a22b-fp8`
- `o3`
- `o4-mini`
- `glm-4-32b-0414-128k`
- `gpt-4.1`
- `gpt-4.1-mini`
- `gpt-4.1-nano`
- `qwen3-32b`
- `qwen3-coder-30b-a3b-instruct`
- `qwen3-coder-480b-a35b-instruct`
- `qwen2-5-vl-32b-instruct`
- `qwen-max-latest`
- `qwen-plus-latest`
- `qwen-omni-turbo`
- `o3-mini`
- `llama-3.3-70b-instruct`
- `o1`
- `mistral-large-2512`
- `mistral-large-latest`
- `qwen-coder-plus`
- `qwen2-5-vl-72b-instruct`
- `gpt-4o-mini`
- `gpt-4o`
- `qwen-max`
- `claude-3-opus`
- `qwen-plus`
- `auto`
- `custom`
- `gpt-4`
- `gpt-4-turbo`

### `llmtr` — LLMTR

`https://llmtr.com/v1` · 1 model · protokol: `openai-chat`

- `qwen3-6-35b`  ← varsayılan

### `lmstudio` — LM Studio

`http://localhost:1234/v1` · 3 model · protokol: `openai-chat`

- `openai/gpt-oss-20b`  ← varsayılan
- `qwen/qwen3-30b-a3b-2507`
- `qwen/qwen3-coder-30b`

### `longcat` — LongCat

`https://api.longcat.chat/openai` · 1 model · protokol: `openai-chat`

- `LongCat-2.0`  ← varsayılan

### `lucidquery` — LucidQuery

`https://api.lucidquery.com/v1` · 4 model · protokol: `openai-chat`

- `lucidquery-agi-01-frontier`  ← varsayılan
- `lucidquery-agi-01-swift`
- `lucidquery-nexus-coder`
- `lucidnova-rf1-100b`

### `lynkr` — Lynkr

`http://127.0.0.1:8081/v1` · 1 model · protokol: `openai-chat`

- `lynkr-auto`  ← varsayılan

### `meganova` — Meganova

`https://api.meganova.ai/v1` · 18 model · protokol: `openai-chat`

- `MiniMaxAI/MiniMax-M2.5`  ← varsayılan
- `zai-org/GLM-5`
- `Qwen/Qwen3.5-Plus`
- `moonshotai/Kimi-K2.5`
- `MiniMaxAI/MiniMax-M2.1`
- `zai-org/GLM-4.7`
- `XiaomiMiMo/MiMo-V2-Flash`
- `deepseek-ai/DeepSeek-V3.2`
- `moonshotai/Kimi-K2-Thinking`
- `deepseek-ai/DeepSeek-V3.2-Exp`
- `zai-org/GLM-4.6`
- `deepseek-ai/DeepSeek-V3.1`
- `Qwen/Qwen3-235B-A22B-Instruct-2507`
- `mistralai/Mistral-Small-3.2-24B-Instruct-2506`
- `deepseek-ai/DeepSeek-V3-0324`
- `Qwen/Qwen2.5-VL-32B-Instruct`
- `meta-llama/Llama-3.3-70B-Instruct`
- `mistralai/Mistral-Nemo-Instruct-2407`

### `meta` — Meta

`https://api.meta.ai/v1` · 1 model · protokol: `openai-responses`

- `muse-spark-1.1`  ← varsayılan

### `minimax` — MiniMax

`https://api.minimax.io/anthropic/v1` · 7 model · protokol: `anthropic`

- `MiniMax-M3`
- `MiniMax-M2.7`
- `MiniMax-M2.7-highspeed`
- `MiniMax-M2.5-highspeed`
- `MiniMax-M2.5`  ← varsayılan
- `MiniMax-M2.1`
- `MiniMax-M2`

### `minimax-cn` — MiniMax (minimaxi.com)

`https://api.minimaxi.com/anthropic/v1` · 7 model · protokol: `anthropic`

- `MiniMax-M3`  ← varsayılan
- `MiniMax-M2.7`
- `MiniMax-M2.7-highspeed`
- `MiniMax-M2.5-highspeed`
- `MiniMax-M2.5`
- `MiniMax-M2.1`
- `MiniMax-M2`

### `minimax-cn-coding-plan` — MiniMax Token Plan (minimaxi.com)

`https://api.minimaxi.com/anthropic/v1` · 7 model · protokol: `anthropic`

- `MiniMax-M3`  ← varsayılan
- `MiniMax-M2.7`
- `MiniMax-M2.7-highspeed`
- `MiniMax-M2.5-highspeed`
- `MiniMax-M2.5`
- `MiniMax-M2.1`
- `MiniMax-M2`

### `minimax-coding-plan` — MiniMax Token Plan (minimax.io)

`https://api.minimax.io/anthropic/v1` · 7 model · protokol: `anthropic`

- `MiniMax-M3`  ← varsayılan
- `MiniMax-M2.7`
- `MiniMax-M2.7-highspeed`
- `MiniMax-M2.5-highspeed`
- `MiniMax-M2.5`
- `MiniMax-M2.1`
- `MiniMax-M2`

### `mistral` — Mistral

`https://api.mistral.ai/v1` · 21 model · protokol: `openai-chat`

- `mistral-medium-2604`  ← varsayılan
- `mistral-medium-latest`
- `mistral-small-2603`
- `mistral-small-latest`
- `mistral-medium-2508`
- `mistral-small-2506`
- `mistral-medium-2505`
- `magistral-medium-latest`
- `magistral-small`
- `mistral-large-2411`
- `mistral-large-2512`
- `mistral-large-latest`
- `pixtral-large-latest`
- `ministral-3b-latest`
- `ministral-8b-latest`
- `pixtral-12b`
- `mistral-nemo`
- `codestral-latest`
- `open-mixtral-8x22b`
- `open-mixtral-8x7b`
- `open-mistral-7b`

### `mixlayer` — Mixlayer

`https://models.mixlayer.ai/v1` · 5 model · protokol: `openai-chat`

- `qwen/qwen3.5-122b-a10b`  ← varsayılan
- `qwen/qwen3.5-27b`
- `qwen/qwen3.5-35b-a3b`
- `qwen/qwen3.5-397b-a17b`
- `qwen/qwen3.5-9b`

### `moark` — Moark

`https://moark.com/v1` · 2 model · protokol: `openai-chat`

- `MiniMax-M2.1`  ← varsayılan
- `GLM-4.7`

### `model-oracle-ai` — Model Oracle AI

`https://api.modeloracle.com/api/v1` · 15 model · protokol: `openai-chat`

- `claude-sonnet-5`  ← varsayılan
- `auto`
- `glm-5.2`
- `claude-fable-5`
- `claude-opus-4.8`
- `deepseek-v4-pro`
- `gpt-5.5`
- `gpt-5.4-mini`
- `gpt-5.4-nano`
- `gpt-5.4`
- `claude-haiku-4.5`
- `gpt-5`
- `o4-mini`
- `gpt-4.1`
- `gpt-4.1-mini`

### `modelscope` — ModelScope

`https://api-inference.modelscope.cn/v1` · 7 model · protokol: `openai-chat`

- `ZhipuAI/GLM-4.6`  ← varsayılan
- `Qwen/Qwen3-Coder-30B-A3B-Instruct`
- `Qwen/Qwen3-30B-A3B-Instruct-2507`
- `Qwen/Qwen3-30B-A3B-Thinking-2507`
- `ZhipuAI/GLM-4.5`
- `Qwen/Qwen3-235B-A22B-Thinking-2507`
- `Qwen/Qwen3-235B-A22B-Instruct-2507`

### `moonshot` — Moonshot AI

`https://api.moonshot.ai/v1` · 10 model · protokol: `openai-chat`

- `kimi-k3`  ← varsayılan
- `kimi-k2.7-code`
- `kimi-k2.7-code-highspeed`
- `kimi-k2.6`
- `kimi-k2.5`
- `kimi-k2-thinking`
- `kimi-k2-thinking-turbo`
- `kimi-k2-0905-preview`
- `kimi-k2-turbo-preview`
- `kimi-k2-0711-preview`

### `moonshotai-cn` — Moonshot AI (China)

`https://api.moonshot.cn/v1` · 10 model · protokol: `openai-chat`

- `kimi-k3`  ← varsayılan
- `kimi-k2.7-code`
- `kimi-k2.7-code-highspeed`
- `kimi-k2.6`
- `kimi-k2.5`
- `kimi-k2-thinking`
- `kimi-k2-thinking-turbo`
- `kimi-k2-0905-preview`
- `kimi-k2-turbo-preview`
- `kimi-k2-0711-preview`

### `morph` — Morph

`https://api.morphllm.com/v1` · 0 model · protokol: `openai-chat`

*Kataloğda model yok — canlı çekiliyor.*

### `nano-gpt` — NanoGPT

`https://nano-gpt.com/api/v1` · 193 model · protokol: `openai-chat`

- `mistral-code-agent-latest`  ← varsayılan
- `mistral-code-latest`
- `minimax/minimax-m3`
- `minimax/minimax-m3:thinking`
- `stepfun/step-3.7-flash:thinking`
- `anthropic/claude-opus-4.8`
- `anthropic/claude-opus-4.8:thinking`
- `TEE/gemma-4-31b-it`
- `TEE/qwen3.5-122b-a10b`
- `TEE/gemma-4-26b-a4b-uncensored`
- `TEE/qwen3.6-35b-a3b-uncensored`
- `x-ai/grok-build-0.1`
- `google/gemini-3.5-flash`
- `google/gemini-flash-latest`
- `nanogpt/coding-router`
- `nanogpt/coding-router:high`
- `nanogpt/coding-router:low`
- `nanogpt/coding-router:max`
- `nanogpt/coding-router:medium`
- `sarvam-105b`
- `sarvam-30b`
- `claw-high`
- `claw-low`
- `claw-medium`
- `hermes-high`
- `hermes-low`
- `hermes-medium`
- `inclusionai/ring-2.6-1t`
- `google/gemini-flash-lite-latest`
- `deepseek/deepseek-latest`
- `minimax/minimax-latest`
- `moonshotai/kimi-latest`
- `openai/gpt-chat-latest`
- `x-ai/grok-latest`
- `zai-org/glm-latest`
- `owl`
- `mistral/mistral-medium-3.5:thinking`
- `x-ai/grok-4.3`
- `ibm-granite/granite-4.1-8b`
- `mistral/mistral-medium-3.5`
- `TEE/deepseek-v4-pro:thinking`
- `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning`
- `poolside/laguna-m.1`
- `poolside/laguna-xs.2`
- `deepseek/deepseek-v4-pro-cheaper`
- `deepseek/deepseek-v4-pro-cheaper:thinking`
- `TEE/deepseek-v4-pro`
- `deepseek/deepseek-v4-flash`
- `deepseek/deepseek-v4-flash:thinking`
- `deepseek/deepseek-v4-pro`
- `deepseek/deepseek-v4-pro:thinking`
- `inclusionai/ling-2.6-1t`
- `openai/gpt-5.5`
- `xiaomi/mimo-v2.5`
- `xiaomi/mimo-v2.5-pro`
- `inclusionai/ling-2.6-flash`
- `TEE/kimi-k2.6`
- `TEE/glm-5.1-thinking`
- `TEE/minimax-m2.5`
- `anthropic/claude-opus-4.7`
- `anthropic/claude-opus-4.7:thinking`
- `moonshotai/kimi-k2.6`
- `moonshotai/kimi-k2.6:thinking`
- `z-ai/glm-5v-turbo:thinking`
- `arcee-ai/trinity-large-thinking`
- `z-ai/glm-5v-turbo`
- `x-ai/grok-4.20`
- `x-ai/grok-4.20-multi-agent`
- `anthropic/claude-haiku-latest`
- `anthropic/claude-opus-latest`
- `google/gemini-pro-latest`
- `openai/gpt-latest`
- `zai-org/glm-5.1`
- `zai-org/glm-5.1:thinking`
- `xiaomi/mimo-v2-omni`
- `xiaomi/mimo-v2-pro`
- `minimax/minimax-m2.7`
- `minimax/minimax-m2.7-turbo`
- `mistralai/mistral-small-4-119b-2603:thinking`
- `openai/gpt-5.4-mini`
- `openai/gpt-5.4-nano`
- `qwen/qwen3-coder`
- `mistralai/mistral-small-4-119b-2603`
- `z-ai/glm-5-turbo`
- `openai/gpt-5.4`
- `openai/gpt-5.4-pro`
- `google/gemini-3.1-flash-lite`
- `anthropic/claude-sonnet-latest`
- `nvidia/nemotron-3-super-120b-a12b`
- `nvidia/nemotron-3-super-120b-a12b:thinking`
- `google/gemini-3.1-pro-preview-customtools`
- `openai/gpt-5.3-codex`
- `google/gemini-3.1-pro-preview-high`
- `google/gemini-3.1-pro-preview-low`
- `google/gemini-3.1-pro-preview`
- `anthropic/claude-sonnet-4.6`
- `anthropic/claude-sonnet-4.6:thinking`
- `minimax/minimax-m2.5`
- `zai-org/glm-5`
- `zai-org/glm-5-original`
- `zai-org/glm-5-original:thinking`
- `zai-org/glm-5:thinking`
- `anthropic/claude-opus-4.6`
- `anthropic/claude-opus-4.6:thinking`
- `anthropic/claude-opus-4.6:thinking:low`
- `anthropic/claude-opus-4.6:thinking:max`
- `anthropic/claude-opus-4.6:thinking:medium`
- `zai-org/glm-4.7`
- `moonshotai/kimi-k2.5`
- `moonshotai/kimi-k2.5:thinking`
- `zai-org/glm-4.7-flash`
- `zai-org/glm-4.7-flash-original`
- `openai/gpt-5.2-codex`
- `openai/gpt-5.2`
- `openai/gpt-5.2-pro`
- `zai-org/glm-4.7-original`
- `zai-org/glm-4.7-original:thinking`
- `zai-org/glm-4.7:thinking`
- `minimax/minimax-m2.1`
- `google/gemini-3-flash-preview`
- `qwen/qwen3-coder-next`
- `deepseek/deepseek-v3.2`
- `deepseek/deepseek-v3.2:thinking`
- `openai/gpt-5.1`
- `openai/gpt-5.1-codex-max`
- `moonshotai/kimi-k2-thinking`
- `claude-opus-4-5-20251101`
- `claude-opus-4-5-20251101:thinking`
- `claude-haiku-4-5-20251001`
- `claude-haiku-4-5-20251001-thinking`
- `z-ai/glm-4.6`
- `claude-sonnet-4-20250514`
- `claude-sonnet-4-5-20250929`
- `claude-sonnet-4-5-20250929-thinking`
- `z-ai/glm-4.6:thinking`
- `gemini-2.5-flash-lite-preview-09-2025`
- `gemini-2.5-flash-lite-preview-09-2025-thinking`
- `gemini-2.5-flash-preview-09-2025`
- `gemini-2.5-flash-preview-09-2025-thinking`
- `moonshotai/Kimi-K2-Instruct-0905`
- `deepseek-ai/DeepSeek-V3.1-Terminus:thinking`
- `qwen/Qwen3-Next-80B-A3B-Instruct`
- `openai/gpt-4.1`
- `meta-llama/llama-4-maverick`
- `meta-llama/llama-4-scout`
- `openai/gpt-5`
- `claude-opus-4-1-20250805`
- `openai/gpt-oss-120b`
- `qwen3-coder-30b-a3b-instruct`
- `deepseek-ai/DeepSeek-V3.1-Terminus`
- `qwen/Qwen3-235B-A22B-Instruct-2507`
- `qwen/Qwen3-235B-A22B-Instruct-2507-TEE`
- `claude-opus-4-thinking`
- `moonshotai/kimi-k2-instruct-0711`
- `moonshotai/kimi-k2-instruct`
- `openai/o3-pro-2025-06-10`
- `claude-opus-4-1-thinking`
- `claude-opus-4-1-thinking:1024`
- `claude-opus-4-1-thinking:32000`
- `claude-opus-4-1-thinking:32768`
- `claude-opus-4-1-thinking:8192`
- `claude-opus-4-thinking:1024`
- `claude-opus-4-thinking:32000`
- `claude-opus-4-thinking:32768`
- `claude-opus-4-thinking:8192`
- `claude-sonnet-4-thinking:1024`
- `claude-sonnet-4-thinking:32768`
- `claude-sonnet-4-thinking:64000`
- `claude-sonnet-4-thinking:8192`
- `claude-opus-4-20250514`
- `qwen/qwen3-235b-a22b`
- `openai/o4-mini`
- `openai/o4-mini-high`
- `deepseek-chat-cheaper`
- `glm-z1-air`
- `glm-z1-airx`
- `zai-org/GLM-4.5-Air`
- `deepseek-v3-0324`
- `deepseek-chat`
- `meta-llama/llama-3.3-70b-instruct`
- `claude-sonnet-4-thinking`
- `openai/o3-mini`
- `openai/o3-mini-high`
- `openai/o3-mini-low`
- `gemini-2.0-flash-001`
- `claude-3-5-haiku-20241022`
- `cohere/command-r-plus-08-2024`
- `azure-gpt-4o-mini`
- `azure-gpt-4o`
- `holo3-35b-a3b`
- `holo3-35b-a3b:thinking`
- `mercury-2`
- `zai-org/GLM-4.5-Air:thinking`

### `nearai` — NEAR AI Cloud

`https://cloud-api.near.ai/v1` · 33 model · protokol: `openai-chat`

- `google/gemini-3.5-flash`  ← varsayılan
- `google/gemini-3.1-flash-lite`
- `openai/gpt-5.5`
- `Qwen/Qwen3.6-35B-A3B-FP8`
- `anthropic/claude-opus-4-7`
- `google/gemma-4-31B-it`
- `zai-org/GLM-5.1-FP8`
- `openai/gpt-5.4-mini`
- `openai/gpt-5.4-nano`
- `openai/gpt-5.4`
- `Qwen/Qwen3.5-122B-A10B`
- `anthropic/claude-sonnet-4-6`
- `anthropic/claude-opus-4-6`
- `openai/gpt-5.2`
- `google/gemini-3-pro`
- `openai/gpt-5.1`
- `anthropic/claude-haiku-4-5`
- `anthropic/claude-sonnet-4-5`
- `Qwen/Qwen3-VL-30B-A3B-Instruct`
- `openai/gpt-5`
- `openai/gpt-5-mini`
- `openai/gpt-5-nano`
- `openai/gpt-oss-120b`
- `Qwen/Qwen3-30B-A3B-Instruct-2507`
- `google/gemini-2.5-flash`
- `google/gemini-2.5-flash-lite`
- `google/gemini-2.5-pro`
- `openai/o3`
- `openai/o4-mini`
- `openai/gpt-4.1`
- `openai/gpt-4.1-mini`
- `openai/gpt-4.1-nano`
- `openai/o3-mini`

### `nebius` — Nebius Token Factory

`https://api.tokenfactory.nebius.com/v1` · 20 model · protokol: `openai-chat`

- `zai-org/GLM-5.2`  ← varsayılan
- `moonshotai/Kimi-K2.7-Code`
- `MiniMaxAI/MiniMax-M3`
- `deepseek-ai/DeepSeek-V4-Pro`
- `nvidia/nemotron-3-super-120b-a12b`
- `NousResearch/Hermes-4-405B`
- `NousResearch/Hermes-4-70B`
- `Qwen/Qwen3-30B-A3B-Instruct-2507`
- `Qwen/Qwen3-32B`
- `Qwen/Qwen3-Next-80B-A3B-Thinking`
- `google/gemma-3-27b-it`
- `openai/gpt-oss-120b`
- `meta-llama/Llama-3.3-70B-Instruct`
- `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B`
- `Qwen/Qwen3-235B-A22B-Instruct-2507`
- `Qwen/Qwen3.5-397B-A17B`
- `MiniMaxAI/MiniMax-M2.5`
- `nvidia/Nemotron-3-Nano-Omni`
- `Qwen/Qwen2.5-VL-72B-Instruct`
- `nvidia/Llama-3_1-Nemotron-Ultra-253B-v1`

### `neon` — Neon

`${NEON_AI_GATEWAY_BASE_URL}/v1` · 36 model · protokol: `openai-chat`

- `claude-opus-4-8`  ← varsayılan
- `gemini-3-5-flash`
- `claude-opus-4-7`
- `gpt-5-4-mini`
- `gpt-5-4-nano`
- `gpt-5-4`
- `gemini-3-1-flash-lite`
- `qwen35-122b-a10b`
- `gemini-3-1-pro`
- `claude-sonnet-4-6`
- `claude-opus-4-6`
- `gpt-5-3-codex`
- `gemini-3-flash`
- `gpt-5-2`
- `gpt-5-2-codex`
- `claude-opus-4-5`
- `gemini-3-pro`
- `gpt-5-1`
- `gpt-5-1-codex-max`
- `gpt-5-1-codex-mini`
- `claude-haiku-4-5`
- `claude-sonnet-4`
- `claude-sonnet-4-5`
- `qwen3-next-80b-a3b-instruct`
- `gpt-5`
- `gpt-5-mini`
- `gpt-5-nano`
- `claude-opus-4-1`
- `gpt-oss-120b`
- `gpt-oss-20b`
- `gemini-2-5-flash`
- `gemini-2-5-pro`
- `llama-4-maverick`
- `gemma-3-12b`
- `meta-llama-3-3-70b-instruct`
- `meta-llama-3-1-8b-instruct`

### `neuralwatt` — Neuralwatt

`https://api.neuralwatt.com/v1` · 18 model · protokol: `openai-chat`

- `glm-5.2`  ← varsayılan
- `glm-5.2-fast`
- `glm-5.2-flex`
- `glm-5.2-short`
- `glm-5.2-short-fast`
- `glm-5.2-short-fast-flex`
- `glm-5.2-short-flex`
- `kimi-k2.7-code-flex`
- `moonshotai/Kimi-K2.7-Code`
- `kimi-k2.6-fast`
- `kimi-k2.6-flex`
- `moonshotai/Kimi-K2.6`
- `Qwen/Qwen3.6-35B-A3B`
- `qwen3.6-35b-fast`
- `Qwen/Qwen3.5-397B-A17B-FP8`
- `qwen3.5-397b-fast`
- `kimi-k2.5-fast`
- `moonshotai/Kimi-K2.5`

### `nousResearch` — Nous Research

`https://inference-api.nousresearch.com/v1` · 1 model · protokol: `openai-chat`

- `DeepHermes-3-Llama-3-3-70B-Preview`  ← varsayılan

### `nova` — Nova

`https://api.nova.amazon.com/v1` · 2 model · protokol: `openai-chat`

- `nova-2-pro-v1`  ← varsayılan
- `nova-2-lite-v1`

### `novita-ai` — NovitaAI

`https://api.novita.ai/openai` · 72 model · protokol: `openai-chat`

- `moonshotai/kimi-k3`  ← varsayılan
- `zai-org/glm-5.2`
- `moonshotai/kimi-k2.7-code`
- `qwen/qwen3.7-max`
- `inclusionai/ring-2.6-1t`
- `deepseek/deepseek-v4-flash`
- `deepseek/deepseek-v4-pro`
- `inclusionai/ling-2.6-flash`
- `inclusionai/ling-2.6-1t`
- `xiaomimimo/mimo-v2.5-pro`
- `moonshotai/kimi-k2.6`
- `google/gemma-4-26b-a4b-it`
- `google/gemma-4-31b-it`
- `zai-org/glm-5.1`
- `minimax/minimax-m2.7`
- `minimax/minimax-m2.7-highspeed`
- `xiaomimimo/mimo-v2-pro`
- `qwen/qwen3.5-122b-a10b`
- `qwen/qwen3.5-27b`
- `qwen/qwen3.5-35b-a3b`
- `qwen/qwen3.5-397b-a17b`
- `minimax/minimax-m2.5`
- `minimax/minimax-m2.5-highspeed`
- `zai-org/glm-5`
- `qwen/qwen3-coder-next`
- `moonshotai/kimi-k2.5`
- `zai-org/glm-4.7-flash`
- `kwaipilot/kat-coder-pro`
- `minimax/minimax-m2.1`
- `zai-org/glm-4.7`
- `xiaomimimo/mimo-v2-flash`
- `zai-org/glm-4.6v`
- `deepseek/deepseek-v3.2`
- `baidu/ernie-4.5-vl-28b-a3b-thinking`
- `moonshotai/kimi-k2-thinking`
- `minimax/minimax-m2`
- `qwen/qwen3-vl-8b-instruct`
- `zai-org/glm-4.5-air`
- `qwen/qwen3-vl-30b-a3b-instruct`
- `qwen/qwen3-vl-30b-a3b-thinking`
- `qwen/qwen3-coder-30b-a3b-instruct`
- `zai-org/glm-4.6`
- `deepseek/deepseek-v3.2-exp`
- `qwen/qwen3-max`
- `qwen/qwen3-omni-30b-a3b-instruct`
- `qwen/qwen3-omni-30b-a3b-thinking`
- `qwen/qwen3-vl-235b-a22b-instruct`
- `deepseek/deepseek-v3.1-terminus`
- `qwen/qwen3-next-80b-a3b-instruct`
- `qwen/qwen3-next-80b-a3b-thinking`
- `moonshotai/kimi-k2-0905`
- `deepseek/deepseek-v3.1`
- `zai-org/glm-4.5v`
- `openai/gpt-oss-120b`
- `zai-org/glm-4.5`
- `qwen/qwen3-235b-a22b-thinking-2507`
- `qwen/qwen3-coder-480b-a35b-instruct`
- `qwen/qwen3-235b-a22b-instruct-2507`
- `moonshotai/kimi-k2-instruct`
- `baidu/ernie-4.5-21B-a3b`
- `baidu/ernie-4.5-vl-28b-a3b`
- `minimaxai/minimax-m1-80k`
- `deepseek/deepseek-r1-0528`
- `qwen/qwen2.5-7b-instruct`
- `deepseek/deepseek-v3-0324`
- `deepseek/deepseek-r1-turbo`
- `deepseek/deepseek-v3-turbo`
- `meta-llama/llama-3.3-70b-instruct`
- `sao10K/L3-8B-stheno-v3.2`
- `qwen/qwen-2.5-72b-instruct`
- `sao10K/l31-70b-euryale-v2.2`
- `sao10K/l3-70b-euryale-v2.1`

### `nvidia` — Nvidia

`https://integrate.api.nvidia.com/v1` · 43 model · protokol: `openai-chat`

- `z-ai/glm-5.2`  ← varsayılan
- `nvidia/nemotron-3-ultra-550b-a55b`
- `minimaxai/minimax-m3`
- `stepfun-ai/step-3.7-flash`
- `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning`
- `deepseek-ai/deepseek-v4-flash`
- `deepseek-ai/deepseek-v4-pro`
- `google/gemma-4-31b-it`
- `minimaxai/minimax-m2.7`
- `mistralai/mistral-small-4-119b-2603`
- `nvidia/nemotron-voicechat`
- `nvidia/nemotron-3-super-120b-a12b`
- `qwen/qwen3.5-122b-a10b`
- `qwen/qwen3.5-397b-a17b`
- `stepfun-ai/step-3.5-flash`
- `mistralai/mistral-large-3-675b-instruct-2512`
- `bytedance/seed-oss-36b-instruct`
- `nvidia/nvidia-nemotron-nano-9b-v2`
- `openai/gpt-oss-20b`
- `openai/gpt-oss-120b`
- `sarvamai/sarvam-m`
- `qwen/qwen3-coder-480b-a35b-instruct`
- `google/gemma-3n-e2b-it`
- `mistralai/mistral-nemotron`
- `google/gemma-3n-e4b-it`
- `meta/llama-4-maverick-17b-128e-instruct`
- `mistralai/mistral-7b-instruct-v03`
- `meta/llama-3.1-8b-instruct`
- `microsoft/phi-4-mini-instruct`
- `nvidia/nemotron-3-nano-30b-a3b`
- `qwen/qwen3-next-80b-a3b-instruct`
- `meta/llama-3.3-70b-instruct`
- `qwen/qwen2.5-coder-32b-instruct`
- `meta/llama-3.2-90b-vision-instruct`
- `meta/llama-3.2-11b-vision-instruct`
- `meta/llama-3.2-1b-instruct`
- `abacusai/dracarys-llama-3_1-70b-instruct`
- `nvidia/nemotron-mini-4b-instruct`
- `google/gemma-2-2b-it`
- `meta/llama-3.1-70b-instruct`
- `upstage/solar-10_7b-instruct`
- `mistralai/mixtral-8x22b-instruct`
- `mistralai/mixtral-8x7b-instruct`

### `oca` — Oracle Code Assist

`https://code.aiservice.us-chicago-1.oci.oraclecloud.com/20250206/app/litellm` · 1 model · protokol: `openai-chat`

- `anthropic/claude-3-7-sonnet-20250219`  ← varsayılan

### `ollama` — Ollama

`http://localhost:11434` · 0 model · protokol: `openai-chat`

*Kataloğda model yok — canlı çekiliyor.*

### `openai-codex` — OpenAI ChatGPT Subscription

`https://chatgpt.com/backend-api/codex` · 7 model · protokol: `openai-responses`

- `gpt-5.6`
- `gpt-5.6-luna`
- `gpt-5.6-sol`
- `gpt-5.6-terra`
- `gpt-5.5`
- `gpt-5.4-mini`
- `gpt-5.4`  ← varsayılan

### `openai-codex-cli` — OpenAI Codex CLI

`https://chatgpt.com/backend-api/codex` · 1 model · protokol: `openai-chat`

- `gpt-5.6-sol`  ← varsayılan

### `openai-compatible` — OpenAI Compatible

`https://api.openai.com/v1` · 1 model · protokol: `openai-chat`

- `gpt-4o`  ← varsayılan

### `openai-native` — OpenAI

`https://api.openai.com/v1` · 46 model · protokol: `openai-responses`

- `gpt-5.6`
- `gpt-5.6-luna`
- `gpt-5.6-sol`
- `gpt-5.6-terra`
- `gpt-realtime-2.1`
- `gpt-5.5`
- `gpt-5.5-pro`
- `gpt-5.4-mini`
- `gpt-5.4-nano`
- `gpt-5.4`  ← varsayılan
- `gpt-5.4-pro`
- `gpt-5.3-chat-latest`
- `gpt-5.3-codex`
- `gpt-5.3-codex-spark`
- `gpt-5.2`
- `gpt-5.2-chat-latest`
- `gpt-5.2-codex`
- `gpt-5.2-pro`
- `gpt-5.1`
- `gpt-5.1-chat-latest`
- `gpt-5.1-codex`
- `gpt-5.1-codex-max`
- `gpt-5.1-codex-mini`
- `gpt-5-pro`
- `gpt-5-codex`
- `gpt-5`
- `gpt-5-mini`
- `gpt-5-nano`
- `o3-pro`
- `o3`
- `o4-mini`
- `gpt-4.1`
- `gpt-4.1-mini`
- `gpt-4.1-nano`
- `o1-pro`
- `o3-mini`
- `o1`
- `gpt-4o-2024-11-20`
- `gpt-4o-2024-08-06`
- `gpt-4o-mini`
- `o3-deep-research`
- `o4-mini-deep-research`
- `gpt-4o`
- `gpt-4o-2024-05-13`
- `gpt-4`
- `gpt-4-turbo`

### `opencode` — OpenCode

`` · 58 model · protokol: `openai-chat`

- `gemini-3.5-flash-lite`
- `gemini-3.6-flash`
- `laguna-s-2.1-free`
- `gpt-5.6-luna`
- `gpt-5.6-sol`
- `gpt-5.6-terra`
- `grok-4.5`
- `claude-sonnet-5`
- `glm-5.2`
- `kimi-k2.7-code`
- `claude-fable-5`
- `north-mini-code-free`
- `nemotron-3-ultra-free`
- `minimax-m3`
- `claude-opus-4-8`
- `grok-build-0.1`
- `gemini-3.5-flash`
- `deepseek-v4-flash`
- `deepseek-v4-flash-free`
- `deepseek-v4-pro`
- `gpt-5.5-pro`
- `mimo-v2.5-free`
- `gpt-5.5`
- `kimi-k2.6`
- `claude-opus-4-7`
- `glm-5.1`
- `qwen3.6-plus`
- `minimax-m2.7`
- `gpt-5.4-mini`
- `gpt-5.4-nano`
- `gpt-5.4`
- `gpt-5.4-pro`
- `gpt-5.3-codex`
- `gemini-3.1-pro`
- `claude-sonnet-4-6`
- `qwen3.5-plus`
- `gpt-5.3-codex-spark`
- `minimax-m2.5`
- `glm-5`
- `claude-opus-4-6`
- `kimi-k2.5`
- `gpt-5.2-codex`
- `gemini-3-flash`
- `gpt-5.2`
- `claude-opus-4-5`
- `gpt-5.1`
- `gpt-5.1-codex`
- `gpt-5.1-codex-max`
- `gpt-5.1-codex-mini`
- `big-pickle`
- `claude-haiku-4-5`
- `claude-sonnet-4-5`
- `gpt-5-codex`
- `gpt-5`
- `gpt-5-nano`
- `claude-opus-4-1`
- `claude-sonnet-4`
- `openai/gpt-5.6-sol`  ← varsayılan

### `opencode-go` — OpenCode Go

`https://opencode.ai/zen/go/v1` · 15 model · protokol: `openai-chat`

- `kimi-k3`  ← varsayılan
- `grok-4.5`
- `glm-5.2`
- `kimi-k2.7-code`
- `qwen3.7-plus`
- `minimax-m3`
- `qwen3.7-max`
- `deepseek-v4-flash`
- `deepseek-v4-pro`
- `mimo-v2.5`
- `mimo-v2.5-pro`
- `kimi-k2.6`
- `glm-5.1`
- `qwen3.6-plus`
- `minimax-m2.7`

### `openrouter` — OpenRouter

`https://openrouter.ai/api/v1` · 267 model · protokol: `openai-chat`

- `google/gemini-3.5-flash-lite`
- `google/gemini-3.6-flash`
- `meituan/longcat-2.0`
- `moonshotai/kimi-k3`
- `thinkingmachines/inkling`
- `kwaipilot/kat-coder-air-v2.5`
- `kwaipilot/kat-coder-pro-v2.5`
- `openai/gpt-5.6-luna`
- `openai/gpt-5.6-luna-pro`
- `openai/gpt-5.6-sol`
- `openai/gpt-5.6-sol-pro`
- `openai/gpt-5.6-terra`
- `openai/gpt-5.6-terra-pro`
- `~x-ai/grok-latest`
- `x-ai/grok-4.5`
- `aion-labs/aion-3.0`
- `aion-labs/aion-3.0-mini`
- `tencent/hy3`
- `poolside/laguna-xs-2.1`
- `poolside/laguna-xs-2.1:free`
- `anthropic/claude-sonnet-5`
- `nex-agi/nex-n2-mini`
- `sakana/fugu-ultra`
- `cohere/north-mini-code:free`
- `z-ai/glm-5.2`
- `moonshotai/kimi-k2.7-code`
- `~anthropic/claude-fable-latest`
- `anthropic/claude-fable-5`
- `nex-agi/nex-n2-pro`
- `nvidia/nemotron-3-ultra-550b-a55b`
- `nvidia/nemotron-3-ultra-550b-a55b:free`
- `qwen/qwen3.7-plus`
- `minimax/minimax-m3`
- `stepfun/step-3.7-flash`
- `anthropic/claude-opus-4.8`
- `anthropic/claude-opus-4.8-fast`
- `google/gemini-3-pro-image`
- `qwen/qwen3.7-max`
- `google/gemini-3.5-flash`
- `inclusionai/ring-2.6-1t`
- `google/gemini-3.1-flash-lite`
- `openai/gpt-chat-latest`
- `ibm-granite/granite-4.1-8b`
- `mistralai/mistral-medium-3-5`
- `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`
- `poolside/laguna-m.1`
- `poolside/laguna-m.1:free`
- `~anthropic/claude-haiku-latest`
- `~anthropic/claude-sonnet-latest`
- `~google/gemini-flash-latest`
- `~google/gemini-pro-latest`
- `~moonshotai/kimi-latest`
- `~openai/gpt-latest`
- `~openai/gpt-mini-latest`
- `qwen/qwen3.5-plus-20260420`
- `qwen/qwen3.6-flash`
- `deepseek/deepseek-v4-flash`
- `deepseek/deepseek-v4-pro`
- `inclusionai/ling-2.6-1t`
- `openai/gpt-5.5`
- `openai/gpt-5.5-pro`
- `qwen/qwen3.6-27b`
- `xiaomi/mimo-v2.5`
- `xiaomi/mimo-v2.5-pro`
- `~anthropic/claude-opus-latest`
- `inclusionai/ling-2.6-flash`
- `moonshotai/kimi-k2.6`
- `qwen/qwen3.6-max-preview`
- `tencent/hy3-preview`
- `qwen/qwen3.6-35b-a3b`
- `x-ai/grok-4.3`
- `anthropic/claude-opus-4.7`
- `anthropic/claude-opus-4.7-fast`
- `x-ai/grok-build-0.1`
- `meta/muse-spark-1.1`
- `z-ai/glm-5.1`
- `google/gemma-4-26b-a4b-it`
- `google/gemma-4-26b-a4b-it:free`
- `google/gemma-4-31b-it`
- `google/gemma-4-31b-it:free`
- `qwen/qwen3.6-plus`
- `arcee-ai/trinity-large-thinking`
- `z-ai/glm-5v-turbo`
- `x-ai/grok-4.20`
- `kwaipilot/kat-coder-pro-v2`
- `rekaai/reka-edge`
- `minimax/minimax-m2.7`
- `openai/gpt-5.4-mini`
- `openai/gpt-5.4-nano`
- `mistralai/mistral-small-2603`
- `z-ai/glm-5-turbo`
- `nvidia/nemotron-3-super-120b-a12b`
- `nvidia/nemotron-3-super-120b-a12b:free`
- `bytedance-seed/seed-2.0-lite`
- `openai/gpt-5.4`
- `openai/gpt-5.4-pro`
- `inception/mercury-2`
- `google/gemini-3.1-flash-lite-preview`
- `openai/gpt-5.3-chat`
- `bytedance-seed/seed-2.0-mini`
- `qwen/qwen3.5-flash-02-23`
- `aion-labs/aion-2.0`
- `qwen/qwen3.5-122b-a10b`
- `qwen/qwen3.5-27b`
- `qwen/qwen3.5-35b-a3b`
- `qwen/qwen3.5-9b`
- `google/gemini-3.1-pro-preview`
- `google/gemini-3.1-pro-preview-customtools`
- `anthropic/claude-sonnet-4.6`  ← varsayılan
- `qwen/qwen3.5-plus-02-15`
- `qwen/qwen3.5-397b-a17b`
- `minimax/minimax-m2.5`
- `z-ai/glm-5`
- `qwen/qwen3-max-thinking`
- `anthropic/claude-opus-4.6`
- `openai/gpt-5.3-codex`
- `qwen/qwen3-coder-next`
- `openrouter/free`
- `stepfun/step-3.5-flash`
- `upstage/solar-pro-3`
- `openai/gpt-audio`
- `openai/gpt-audio-mini`
- `z-ai/glm-4.7-flash`
- `moonshotai/kimi-k2.5`
- `bytedance-seed/seed-1.6`
- `bytedance-seed/seed-1.6-flash`
- `minimax/minimax-m2.1`
- `z-ai/glm-4.7`
- `google/gemini-3-flash-preview`
- `nvidia/nemotron-3-nano-30b-a3b`
- `nvidia/nemotron-3-nano-30b-a3b:free`
- `openai/gpt-5.2`
- `openai/gpt-5.2-codex`
- `openai/gpt-5.2-pro`
- `openai/gpt-5.2-chat`
- `relace/relace-search`
- `z-ai/glm-4.6v`
- `amazon/nova-2-lite-v1`
- `mistralai/ministral-14b-2512`
- `mistralai/ministral-3b-2512`
- `mistralai/ministral-8b-2512`
- `deepseek/deepseek-chat`
- `deepseek/deepseek-v3.2`
- `anthropic/claude-opus-4.5`
- `openai/gpt-5.1`
- `openai/gpt-5.1-chat`
- `openai/gpt-5.1-codex`
- `openai/gpt-5.1-codex-max`
- `openai/gpt-5.1-codex-mini`
- `moonshotai/kimi-k2-thinking`
- `amazon/nova-premier-v1`
- `mistralai/voxtral-small-24b-2507`
- `openai/gpt-oss-safeguard-20b`
- `nvidia/nemotron-nano-12b-v2-vl:free`
- `minimax/minimax-m2`
- `qwen/qwen3-vl-32b-instruct`
- `anthropic/claude-haiku-4.5`
- `qwen/qwen3-vl-8b-instruct`
- `qwen/qwen3-vl-8b-thinking`
- `openai/gpt-5-pro`
- `qwen/qwen3-vl-30b-a3b-instruct`
- `qwen/qwen3-vl-30b-a3b-thinking`
- `z-ai/glm-4.6`
- `anthropic/claude-sonnet-4.5`
- `deepseek/deepseek-v3.2-exp`
- `qwen/qwen3-max`
- `qwen/qwen3-vl-235b-a22b-instruct`
- `qwen/qwen3-vl-235b-a22b-thinking`
- `deepseek/deepseek-v3.1-terminus`
- `openai/gpt-5-codex`
- `qwen/qwen-plus-2025-07-28`
- `qwen/qwen-plus-2025-07-28:thinking`
- `moonshotai/kimi-k2-0905`
- `qwen/qwen3-next-80b-a3b-instruct`
- `qwen/qwen3-next-80b-a3b-thinking`
- `qwen/qwen3-30b-a3b-thinking-2507`
- `deepseek/deepseek-chat-v3.1`
- `nvidia/nemotron-nano-9b-v2:free`
- `mistralai/mistral-medium-3.1`
- `z-ai/glm-4.5v`
- `ai21/jamba-large-1.7`
- `openai/gpt-5`
- `openai/gpt-5-mini`
- `openai/gpt-5-nano`
- `anthropic/claude-opus-4.1`
- `openai/gpt-oss-120b`
- `openai/gpt-oss-20b`
- `openai/gpt-oss-20b:free`
- `mistralai/codestral-2508`
- `qwen/qwen3-30b-a3b-instruct-2507`
- `qwen/qwen3-coder-flash`
- `z-ai/glm-4.5`
- `z-ai/glm-4.5-air`
- `qwen/qwen3-235b-a22b-thinking-2507`
- `qwen/qwen3-coder`
- `qwen/qwen3-coder-plus`
- `qwen/qwen3-235b-a22b-2507`
- `moonshotai/kimi-k2`
- `mistralai/mistral-small-3.2-24b-instruct`
- `google/gemini-2.5-flash`
- `google/gemini-2.5-flash-lite`
- `google/gemini-2.5-pro`
- `minimax/minimax-m1`
- `openai/o3-pro`
- `google/gemini-2.5-pro-preview`
- `deepseek/deepseek-r1-0528`
- `anthropic/claude-opus-4`
- `anthropic/claude-sonnet-4`
- `google/gemini-2.5-pro-preview-05-06`
- `mistralai/mistral-medium-3`
- `arcee-ai/virtuoso-large`
- `qwen/qwen3-14b`
- `qwen/qwen3-30b-a3b`
- `qwen/qwen3-8b`
- `openai/o3`
- `openai/o4-mini`
- `openai/o4-mini-high`
- `openai/gpt-4.1`
- `openai/gpt-4.1-mini`
- `openai/gpt-4.1-nano`
- `meta-llama/llama-4-maverick`
- `meta-llama/llama-4-scout`
- `qwen/qwen3-235b-a22b`
- `qwen/qwen3-32b`
- `qwen/qwen3-coder-30b-a3b-instruct`
- `deepseek/deepseek-chat-v3-0324`
- `google/gemma-3-12b-it`
- `google/gemma-3-27b-it`
- `mistralai/mistral-saba`
- `openai/o3-mini-high`
- `deepseek/deepseek-r1`
- `openai/o3-mini`
- `meta-llama/llama-3.3-70b-instruct`
- `amazon/nova-lite-v1`
- `amazon/nova-micro-v1`
- `amazon/nova-pro-v1`
- `openai/o1`
- `openai/gpt-4o-2024-11-20`
- `mistralai/mistral-large-2407`
- `thedrummer/unslopnemo-12b`
- `mistralai/mistral-large-2512`
- `qwen/qwen-2.5-7b-instruct`
- `qwen/qwen-2.5-72b-instruct`
- `cohere/command-r-08-2024`
- `cohere/command-r-plus-08-2024`
- `sao10k/l3.1-euryale-70b`
- `openai/gpt-4o-2024-08-06`
- `meta-llama/llama-3.1-70b-instruct`
- `meta-llama/llama-3.1-8b-instruct`
- `openai/gpt-4o-mini`
- `openai/gpt-4o-mini-2024-07-18`
- `mistralai/mistral-nemo`
- `openai/o3-deep-research`
- `openai/o4-mini-deep-research`
- `openai/gpt-4o`
- `openai/gpt-4o-2024-05-13`
- `mistralai/mixtral-8x22b-instruct`
- `anthropic/claude-3-haiku`
- `mistralai/mistral-large`
- `openai/gpt-3.5-turbo-0613`
- `openai/gpt-4-turbo-preview`
- `qwen/qwen-plus`
- `openrouter/auto`
- `openai/gpt-4`
- `openai/gpt-4-turbo`
- `openai/gpt-3.5-turbo-16k`
- `openai/gpt-3.5-turbo`

### `orcarouter` — OrcaRouter

`https://api.orcarouter.ai/v1` · 79 model · protokol: `openai-chat`

- `google/gemini-flash-latest`  ← varsayılan
- `google/gemini-flash-lite-latest`
- `deepseek/deepseek-v4-flash`
- `deepseek/deepseek-v4-pro`
- `openai/gpt-5.5`
- `openai/gpt-5.5-pro`
- `kimi/kimi-k2.6`
- `grok/grok-4.3`
- `qwen/qwen3.6-35b-a3b`
- `anthropic/claude-opus-4.7`
- `z-ai/glm-5.1`
- `google/gemma-4-26b-a4b-it`
- `google/gemma-4-31b-it`
- `qwen/qwen3.6-plus`
- `minimax/minimax-m2.7`
- `minimax/minimax-m2.7-highspeed`
- `openai/gpt-5.4-mini`
- `openai/gpt-5.4-nano`
- `openai/gpt-5.4`
- `openai/gpt-5.4-pro`
- `google/gemini-3.1-flash-lite-preview`
- `openai/gpt-5.3-chat-latest`
- `qwen/qwen3.5-122b-a10b`
- `qwen/qwen3.5-27b`
- `qwen/qwen3.5-35b-a3b`
- `google/gemini-3.1-pro-preview`
- `google/gemini-3.1-pro-preview-customtools`
- `anthropic/claude-sonnet-4.6`
- `qwen/qwen3.5-plus`
- `qwen/qwen3.5-397b-a17b`
- `minimax/minimax-m2.5-highspeed`
- `minimax/minimax-m2.5`
- `z-ai/glm-5`
- `anthropic/claude-opus-4.6`
- `openai/gpt-5.3-codex`
- `kimi/kimi-k2.5`
- `z-ai/glm-4.7`
- `google/gemini-3-flash-preview`
- `openai/gpt-5.2`
- `openai/gpt-5.2-chat-latest`
- `openai/gpt-5.2-codex`
- `openai/gpt-5.2-pro`
- `deepseek/deepseek-chat`
- `deepseek/deepseek-reasoner`
- `anthropic/claude-opus-4.5`
- `google/gemini-3-pro-preview`
- `openai/gpt-5.1`
- `openai/gpt-5.1-chat-latest`
- `openai/gpt-5.1-codex`
- `openai/gpt-5.1-codex-max`
- `openai/gpt-5.1-codex-mini`
- `anthropic/claude-haiku-4.5`
- `openai/gpt-5-pro`
- `z-ai/glm-4.6`
- `anthropic/claude-sonnet-4.5`
- `qwen/qwen3-max`
- `openai/gpt-5-codex`
- `openai/gpt-5`
- `openai/gpt-5-mini`
- `openai/gpt-5-nano`
- `anthropic/claude-opus-4.1`
- `z-ai/glm-4.5`
- `z-ai/glm-4.5-air`
- `google/gemini-2.5-flash`
- `google/gemini-2.5-flash-lite`
- `google/gemini-2.5-pro`
- `anthropic/claude-opus-4`
- `anthropic/claude-sonnet-4`
- `openai/gpt-4.1`
- `openai/gpt-4.1-mini`
- `openai/gpt-4.1-nano`
- `orcarouter/auto`
- `openai/gpt-4o-2024-11-20`
- `openai/gpt-4o-2024-08-06`
- `openai/gpt-4o-mini`
- `openai/gpt-4o`
- `openai/gpt-4o-2024-05-13`
- `openai/gpt-4`
- `openai/gpt-4-turbo`

### `ovhcloud` — OVHcloud AI Endpoints

`https://oai.endpoints.kepler.ai.cloud.ovh.net/v1` · 11 model · protokol: `openai-chat`

- `qwen3.6-27b`  ← varsayılan
- `qwen3.5-397b-a17b`
- `qwen3.5-9b`
- `qwen3-coder-30b-a3b-instruct`
- `gpt-oss-120b`
- `gpt-oss-20b`
- `mistral-small-3.2-24b-instruct-2506`
- `qwen3-32b`
- `meta-llama-3_3-70b-instruct`
- `mistral-7b-instruct-v0.3`
- `mistral-nemo-instruct-2407`

### `perplexity-agent` — Perplexity Agent

`https://api.perplexity.ai/v1` · 18 model · protokol: `openai-responses`

- `openai/gpt-5.5`  ← varsayılan
- `anthropic/claude-opus-4-7`
- `nvidia/nemotron-3-super-120b-a12b`
- `openai/gpt-5.4`
- `google/gemini-3.1-pro-preview`
- `anthropic/claude-sonnet-4-6`
- `anthropic/claude-opus-4-6`
- `google/gemini-3-flash-preview`
- `openai/gpt-5.2`
- `anthropic/claude-opus-4-5`
- `xai/grok-4-1-fast-non-reasoning`
- `openai/gpt-5.1`
- `anthropic/claude-haiku-4-5`
- `anthropic/claude-sonnet-4-5`
- `openai/gpt-5-mini`
- `google/gemini-2.5-flash`
- `google/gemini-2.5-pro`
- `perplexity/sonar`

### `pioneer` — Pioneer

`https://api.pioneer.ai/v1` · 73 model · protokol: `openai-chat`

- `sakana/fugu-ultra`  ← varsayılan
- `zai-org/GLM-5.2`
- `moonshotai/Kimi-K2.7-Code`
- `nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B-BF16`
- `qwen3.7-plus`
- `MiniMaxAI/MiniMax-M3`
- `google/diffusiongemma-26B-A4B-it`
- `google/gemma-4-12B-it`
- `claude-opus-4-8`
- `qwen3.7-max`
- `gemini-3.5-flash`
- `fastino/gliguard-LLMGuardrails-300M`
- `fastino/gliner2-privacy-filter-PII-multi`
- `mistral-medium-3.5`
- `qwen3.6-flash`
- `deepseek-ai/DeepSeek-V4-Flash`
- `deepseek-ai/DeepSeek-V4-Pro`
- `gpt-5.5`
- `Qwen/Qwen3.6-27B`
- `XiaomiMiMo/MiMo-V2.5`
- `XiaomiMiMo/MiMo-V2.5-Pro`
- `moonshotai/Kimi-K2.6`
- `qwen3.6-max-preview`
- `Qwen/Qwen3.6-35B-A3B`
- `claude-opus-4-7`
- `zai-org/GLM-5.1`
- `google/gemma-4-31B-it`
- `google/gemma-4-E2B-it`
- `google/gemma-4-E4B-it`
- `qwen3.6-plus`
- `MiniMaxAI/MiniMax-M2.7`
- `gpt-5.4-mini`
- `gpt-5.4-nano`
- `mistralai/Mistral-Small-4-119B-2603`
- `nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-FP8`
- `gpt-5.4`
- `Qwen/Qwen3.5-9B`
- `gemini-3.1-pro`
- `claude-sonnet-4-6`
- `claude-opus-4-6`
- `gpt-5.3-codex`
- `gemini-3-flash`
- `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16`
- `fastino/gliner2-multi-large-v1`
- `fastino/gliner2-multi-v1`
- `claude-opus-4-5`
- `gpt-5.1`
- `claude-haiku-4-5`
- `claude-sonnet-4-5`
- `gpt-5-mini`
- `gpt-5-nano`
- `claude-opus-4-1`
- `openai/gpt-oss-120b`
- `openai/gpt-oss-20b`
- `Qwen/Qwen3-4B-Instruct-2507`
- `fastino/gliner2-base-v1`
- `fastino/gliner2-large-v1`
- `HuggingFaceTB/SmolLM3-3B-Base`
- `gpt-4.1`
- `gpt-4.1-mini`
- `gpt-4.1-nano`
- `Qwen/Qwen3-32B`
- `Qwen/Qwen3-1.7B-Base`
- `Qwen/Qwen3-4B-Base`
- `Qwen/Qwen3-8B`
- `google/gemma-3-4b-pt`
- `meta-llama/Llama-3.3-70B-Instruct`
- `gpt-4o-mini`
- `mistralai/Mistral-Nemo-Instruct-2407`
- `meta-llama/Llama-3.1-8B-Instruct`
- `gpt-4o`
- `pioneer/auto`
- `mistralai/Mistral-7B-Instruct-v0.3`

### `poe` — Poe

`https://api.poe.com/v1` · 124 model · protokol: `openai-chat`

- `anthropic/claude-opus-4.8`  ← varsayılan
- `google/gemini-3.5-flash`
- `empiriolabs/deepseek-v4-flash-el`
- `empiriolabs/deepseek-v4-pro-el`
- `novita/kimi-k2.6`
- `anthropic/claude-opus-4.7`
- `openai/gpt-5.5`
- `openai/gpt-5.5-pro`
- `google/gemma-4-31b`
- `xai/grok-4.20-multi-agent`
- `openai/gpt-5.4-mini`
- `openai/gpt-5.4-nano`
- `openai/gpt-5.4-pro`
- `openai/gpt-5.3-codex-spark`
- `openai/gpt-5.3-instant`
- `openai/gpt-5.4`
- `google/gemini-3.1-pro`
- `google/gemini-3.1-flash-lite`
- `novita/glm-5`
- `openai/gpt-5.3-codex`
- `anthropic/claude-sonnet-4.6`
- `anthropic/claude-opus-4.6`
- `fireworks-ai/kimi-k2.5-fw`
- `novita/kimi-k2.5`
- `novita/glm-4.7-flash`
- `openai/gpt-5.2-codex`
- `novita/minimax-m2.1`
- `novita/glm-4.7-n`
- `openai/gpt-5.2-instant`
- `openai/gpt-5.2-pro`
- `novita/glm-4.6v`
- `openai/gpt-5.1-codex-max`
- `openai/gpt-5.2`
- `novita/deepseek-v3.2`
- `poetools/claude-code`
- `anthropic/claude-opus-4.5`
- `google/nano-banana-pro`
- `xai/grok-4.1-fast-non-reasoning`
- `xai/grok-4.1-fast-reasoning`
- `openai/gpt-5.1`
- `openai/gpt-5.1-codex`
- `openai/gpt-5.1-codex-mini`
- `openai/gpt-5.1-instant`
- `novita/kimi-k2-thinking`
- `anthropic/claude-haiku-4.5`
- `google/veo-3.1`
- `google/veo-3.1-fast`
- `google/veo-3-fast`
- `google/gemini-3-flash`
- `openai/gpt-5-pro`
- `openai/sora-2`
- `openai/sora-2-pro`
- `novita/glm-4.6`
- `anthropic/claude-sonnet-4.5`
- `openai/gpt-5-codex`
- `xai/grok-4-fast-non-reasoning`
- `xai/grok-4-fast-reasoning`
- `elevenlabs/elevenlabs-music`
- `openai/gpt-image-1-mini`
- `xai/grok-code-fast-1`
- `google/nano-banana`
- `openai/gpt-5-chat`
- `cerebras/gpt-oss-120b-cs`
- `anthropic/claude-opus-4.1`
- `openai/gpt-5`
- `openai/gpt-5-nano`
- `xai/grok-4`
- `openai/o3-deep-research`
- `openai/o4-mini-deep-research`
- `google/imagen-4-fast`
- `openai/gpt-5-mini`
- `google/gemini-2.5-flash-lite`
- `openai/o3-pro`
- `elevenlabs/elevenlabs-v3`
- `google/lyria`
- `google/imagen-4-ultra`
- `google/imagen-4`
- `anthropic/claude-opus-4`
- `anthropic/claude-sonnet-4`
- `google/veo-3`
- `cerebras/llama-3.1-8b-cs`
- `runwayml/runway-gen-4-turbo`
- `google/gemini-2.5-flash`
- `openai/o3`
- `openai/o4-mini`
- `openai/gpt-4.1-mini`
- `openai/gpt-4.1-nano`
- `openai/gpt-4.1`
- `xai/grok-3`
- `xai/grok-3-mini`
- `openai/gpt-image-1`
- `openai/o1-pro`
- `openai/gpt-4o-mini-search`
- `openai/gpt-4o-search`
- `ideogramai/ideogram-v2a`
- `ideogramai/ideogram-v2a-turbo`
- `lumalabs/ray2`
- `anthropic/claude-sonnet-3.7`
- `google/gemini-2.0-flash-lite`
- `google/gemini-2.5-pro`
- `openai/o3-mini`
- `openai/o3-mini-high`
- `openai/o1`
- `google/gemini-2.0-flash`
- `topazlabs-co/topazlabs`
- `google/veo-2`
- `openai/gpt-4o-aug`
- `elevenlabs/elevenlabs-v2.5-turbo`
- `google/imagen-3-fast`
- `google/imagen-3`
- `runwayml/runway`
- `anthropic/claude-haiku-3.5`
- `ideogramai/ideogram-v2`
- `trytako/tako`
- `openai/gpt-4o-mini`
- `openai/gpt-4o`
- `ideogramai/ideogram`
- `anthropic/claude-haiku-3`
- `openai/dall-e-3`
- `openai/gpt-3.5-turbo-raw`
- `openai/gpt-3.5-turbo-instruct`
- `openai/gpt-3.5-turbo`
- `openai/gpt-4-turbo`
- `stabilityai/stablediffusionxl`

### `poolside` — Poolside

`https://inference.poolside.ai/v1` · 3 model · protokol: `openai-chat`

- `poolside/laguna-xs-2.1`  ← varsayılan
- `poolside/laguna-m.1`
- `poolside/laguna-xs.2`

### `privatemode-ai` — Privatemode AI

`http://localhost:8080/v1` · 2 model · protokol: `openai-chat`

- `kimi-k2.6`  ← varsayılan
- `gpt-oss-120b`

### `qihang-ai` — QiHang

`https://api.qhaigc.net/v1` · 9 model · protokol: `openai-chat`

- `gemini-2.5-flash`  ← varsayılan
- `gemini-3-flash-preview`
- `gpt-5.2`
- `gpt-5.2-codex`
- `gemini-3-pro-preview`
- `claude-opus-4-5-20251101`
- `claude-haiku-4-5-20251001`
- `claude-sonnet-4-5-20250929`
- `gpt-5-mini`

### `qiniu-ai` — Qiniu

`https://api.qnaigc.com/v1` · 81 model · protokol: `openai-chat`

- `qwen3.5-397b-a17b`  ← varsayılan
- `doubao-seed-2.0-code`
- `doubao-seed-2.0-lite`
- `doubao-seed-2.0-mini`
- `doubao-seed-2.0-pro`
- `minimax/minimax-m2.5-highspeed`
- `minimax/minimax-m2.5`
- `z-ai/glm-5`
- `qwen3-vl-30b-a3b-thinking`
- `meituan/longcat-flash-lite`
- `qwen3-30b-a3b-instruct-2507`
- `qwen3-30b-a3b-thinking-2507`
- `moonshotai/kimi-k2.5`
- `minimax/minimax-m2.1`
- `stepfun-ai/gelab-zero-4b-preview`
- `z-ai/autoglm-phone-9b`
- `z-ai/glm-4.7`
- `x-ai/grok-4.1-fast-non-reasoning`
- `x-ai/grok-4.1-fast-reasoning`
- `gemini-3.0-flash-preview`
- `x-ai/grok-4-fast-non-reasoning`
- `x-ai/grok-4-fast-reasoning`
- `mimo-v2-flash`
- `xiaomi/mimo-v2-flash`
- `openai/gpt-5.2`
- `deepseek/deepseek-v3.2-251201`
- `claude-4.5-opus`
- `x-ai/grok-4.1-fast`
- `gemini-3.0-pro-preview`
- `moonshotai/kimi-k2-thinking`
- `minimax/minimax-m2`
- `claude-4.5-haiku`
- `z-ai/glm-4.6`
- `claude-4.5-sonnet`
- `deepseek/deepseek-v3.2-exp`
- `qwen3-max`
- `deepseek/deepseek-v3.1-terminus`
- `x-ai/grok-4-fast`
- `openai/gpt-5`
- `qwen3-next-80b-a3b-instruct`
- `qwen3-next-80b-a3b-thinking`
- `claude-3.5-sonnet`
- `moonshotai/kimi-k2-0905`
- `qwen3-max-preview`
- `x-ai/grok-code-fast-1`
- `claude-3.5-haiku`
- `deepseek-v3.1`
- `doubao-seed-1.6`
- `doubao-seed-1.6-flash`
- `doubao-seed-1.6-thinking`
- `qwen3-coder-480b-a35b-instruct`
- `qwen3-235b-a22b-instruct-2507`
- `qwen3-235b-a22b-thinking-2507`
- `claude-4.1-opus`
- `gpt-oss-120b`
- `gpt-oss-20b`
- `claude-3.7-sonnet`
- `claude-4.0-opus`
- `claude-4.0-sonnet`
- `deepseek-r1`
- `deepseek-r1-0528`
- `deepseek-v3-0324`
- `doubao-1.5-pro-32k`
- `doubao-1.5-thinking-pro`
- `gemini-2.0-flash`
- `gemini-2.0-flash-lite`
- `gemini-2.5-flash`
- `gemini-2.5-flash-lite`
- `gemini-2.5-pro`
- `glm-4.5`
- `glm-4.5-air`
- `kimi-k2`
- `MiniMax-M1`
- `qwen-max-2025-01-25`
- `qwen-turbo`
- `qwen-vl-max-2025-01-25`
- `qwen2.5-vl-72b-instruct`
- `qwen2.5-vl-7b-instruct`
- `qwen3-235b-a22b`
- `qwen3-30b-a3b`
- `qwen3-32b`

### `qwen` — Alibaba Qwen

`https://dashscope.aliyuncs.com/compatible-mode/v1` · 1 model · protokol: `openai-chat`

- `qwen-plus-latest`  ← varsayılan

### `qwen-code` — Alibaba Qwen Code

`https://dashscope.aliyuncs.com/compatible-mode/v1` · 1 model · protokol: `openai-chat`

- `qwen3-coder-plus`  ← varsayılan

### `regolo-ai` — Regolo AI

`https://api.regolo.ai/v1` · 10 model · protokol: `openai-chat`

- `mistral-small-4-119b`  ← varsayılan
- `minimax-m2.5`
- `gpt-oss-20b`
- `qwen3-coder-next`
- `qwen3.5-122b`
- `qwen3.5-9b`
- `gpt-oss-120b`
- `llama-3.3-70b-instruct`
- `llama-3.1-8b-instruct`
- `mistral-small3.2`

### `requesty` — Requesty

`https://router.requesty.ai/v1` · 37 model · protokol: `openai-chat`

- `openai/gpt-5.4`  ← varsayılan
- `openai/gpt-5.4-pro`
- `openai/gpt-5.3-codex`
- `anthropic/claude-sonnet-4-6`
- `anthropic/claude-opus-4-6`
- `openai/gpt-5.2-codex`
- `google/gemini-3-flash-preview`
- `openai/gpt-5.2`
- `openai/gpt-5.2-chat`
- `openai/gpt-5.2-pro`
- `anthropic/claude-opus-4-5`
- `google/gemini-3-pro-preview`
- `openai/gpt-5.1`
- `openai/gpt-5.1-chat`
- `openai/gpt-5.1-codex`
- `openai/gpt-5.1-codex-max`
- `openai/gpt-5.1-codex-mini`
- `anthropic/claude-haiku-4-5`
- `openai/gpt-5-image`
- `openai/gpt-5-pro`
- `anthropic/claude-sonnet-4-5`
- `xai/grok-4-fast`
- `openai/gpt-5-codex`
- `xai/grok-4`
- `openai/gpt-5`
- `openai/gpt-5-mini`
- `openai/gpt-5-nano`
- `anthropic/claude-opus-4-1`
- `google/gemini-2.5-flash`
- `google/gemini-2.5-pro`
- `anthropic/claude-opus-4`
- `anthropic/claude-sonnet-4`
- `openai/o4-mini`
- `openai/gpt-4.1`
- `openai/gpt-4.1-mini`
- `anthropic/claude-3-7-sonnet`
- `openai/gpt-4o-mini`

### `routing-run` — routing.run

`https://api.routing.run/v1` · 15 model · protokol: `openai-chat`

- `gpt-5.6-luna`  ← varsayılan
- `gpt-5.6-sol`
- `gpt-5.6-terra`
- `glm-5.2`
- `glm-5.2-nitro`
- `kimi-k2.7-code`
- `kimi-k2.7-code-nitro`
- `nemotron-3-ultra`
- `claude-opus-4-8`
- `deepseek-v4-flash`
- `deepseek-v4-pro`
- `kimi-k2.6`
- `kimi-k2.6-nitro`
- `qwen3.5-9b`
- `claude-sonnet-4-6`

### `sakana` — Sakana AI

`https://api.sakana.ai/v1` · 3 model · protokol: `openai-chat`

- `fugu`  ← varsayılan
- `fugu-ultra`
- `fugu-ultra-20260615`

### `sambanova` — SambaNova

`https://api.sambanova.ai/v1` · 0 model · protokol: `openai-chat`

*Kataloğda model yok — canlı çekiliyor.*

### `sapaicore` — SAP AI Core

`—` · 31 model · protokol: `openai-chat`

- `anthropic--claude-4.8-opus`
- `gemini-3.5-flash`
- `gemini-3.1-flash-lite`
- `gpt-5.5`
- `anthropic--claude-4.7-opus`
- `mistralai--mistral-small`
- `gpt-5.4`
- `anthropic--claude-4.6-sonnet`
- `anthropic--claude-4.6-opus`
- `gpt-5.2`
- `amazon--nova-lite`
- `sap-abap-1`
- `anthropic--claude-4.5-opus`
- `anthropic--claude-4.5-haiku`
- `anthropic--claude-4.5-sonnet`
- `cohere--command-a-reasoning`
- `gpt-5`
- `gpt-5-mini`
- `gpt-5-nano`
- `gemini-2.5-flash-lite`
- `anthropic--claude-4-sonnet`
- `mistralai--mistral-medium-instruct`
- `gemini-2.5-flash`
- `gpt-4.1`
- `gpt-4.1-mini`
- `gpt-4.1-nano`
- `gemini-2.5-pro`
- `amazon--nova-micro`
- `amazon--nova-pro`
- `anthropic--claude-3-haiku`
- `anthropic--claude-3.5-sonnet`  ← varsayılan

### `sarvam` — Sarvam AI

`https://api.sarvam.ai/v1` · 2 model · protokol: `openai-chat`

- `sarvam-105b`  ← varsayılan
- `sarvam-30b`

### `scaleway` — Scaleway

`https://api.scaleway.ai/v1` · 13 model · protokol: `openai-chat`

- `glm-5.2`  ← varsayılan
- `qwen3.6-35b-a3b`
- `mistral-medium-3.5-128b`
- `gemma-4-26b-a4b-it`
- `qwen3.5-397b-a17b`
- `qwen3-235b-a22b-instruct-2507`
- `voxtral-small-24b-2507`
- `mistral-small-3.2-24b-instruct-2506`
- `qwen3-coder-30b-a3b-instruct`
- `llama-3.3-70b-instruct`
- `gemma-3-27b-it`
- `pixtral-12b-2409`
- `gpt-oss-120b`

### `siliconflow` — SiliconFlow

`https://api.siliconflow.com/v1` · 49 model · protokol: `openai-chat`

- `zai-org/GLM-5.2`  ← varsayılan
- `deepseek-ai/DeepSeek-V4-Flash`
- `deepseek-ai/DeepSeek-V4-Pro`
- `Qwen/Qwen3.6-27B`
- `moonshotai/Kimi-K2.6`
- `tencent/Hy3-preview`
- `Qwen/Qwen3.6-35B-A3B`
- `zai-org/GLM-5.1`
- `google/gemma-4-26B-A4B-it`
- `google/gemma-4-31B-it`
- `zai-org/GLM-5V-Turbo`
- `Qwen/Qwen3.5-9B`
- `Qwen/Qwen3.5-122B-A10B`
- `Qwen/Qwen3.5-27B`
- `Qwen/Qwen3.5-35B-A3B`
- `MiniMaxAI/MiniMax-M2.5`
- `Qwen/Qwen3.5-397B-A17B`
- `zai-org/GLM-5`
- `stepfun-ai/Step-3.5-Flash`
- `moonshotai/Kimi-K2.5`
- `deepseek-ai/DeepSeek-V3.2`
- `Qwen/Qwen3-VL-32B-Instruct`
- `Qwen/Qwen3-VL-32B-Thinking`
- `Qwen/Qwen3-VL-8B-Instruct`
- `Qwen/Qwen3-VL-30B-A3B-Thinking`
- `deepseek-ai/DeepSeek-V3.2-Exp`
- `Qwen/Qwen3-VL-30B-A3B-Instruct`
- `Qwen/Qwen3-VL-235B-A22B-Instruct`
- `Qwen/Qwen3-VL-235B-A22B-Thinking`
- `deepseek-ai/DeepSeek-V3.1-Terminus`
- `inclusionAI/Ling-flash-2.0`
- `ByteDance-Seed/Seed-OSS-36B-Instruct`
- `deepseek-ai/DeepSeek-V3.1`
- `openai/gpt-oss-120b`
- `openai/gpt-oss-20b`
- `Qwen/Qwen3-Coder-30B-A3B-Instruct`
- `Qwen/Qwen3-Coder-480B-A35B-Instruct`
- `Qwen/Qwen3-30B-A3B-Instruct-2507`
- `Qwen/Qwen3-235B-A22B-Thinking-2507`
- `zai-org/GLM-4.5-Air`
- `baidu/ERNIE-4.5-300B-A47B`
- `tencent/Hunyuan-A13B-Instruct`
- `deepseek-ai/DeepSeek-R1`
- `Qwen/Qwen3-14B`
- `Qwen/Qwen3-32B`
- `Qwen/Qwen3-8B`
- `deepseek-ai/DeepSeek-V3`
- `Qwen/Qwen2.5-72B-Instruct`
- `Qwen/Qwen2.5-7B-Instruct`

### `siliconflow-cn` — SiliconFlow (China)

`https://api.siliconflow.cn/v1` · 45 model · protokol: `openai-chat`

- `zai-org/GLM-5.2`  ← varsayılan
- `deepseek-ai/DeepSeek-V4-Flash`
- `deepseek-ai/DeepSeek-V4-Pro`
- `Pro/moonshotai/Kimi-K2.6`
- `Qwen/Qwen3.6-35B-A3B`
- `Pro/zai-org/GLM-5.1`
- `Qwen/Qwen3.5-4B`
- `Qwen/Qwen3.5-9B`
- `Qwen/Qwen3.5-122B-A10B`
- `Qwen/Qwen3.5-27B`
- `Qwen/Qwen3.5-35B-A3B`
- `Qwen/Qwen3.5-397B-A17B`
- `Pro/MiniMaxAI/MiniMax-M2.5`
- `Pro/zai-org/GLM-5`
- `stepfun-ai/Step-3.5-Flash`
- `Pro/moonshotai/Kimi-K2.5`
- `deepseek-ai/DeepSeek-V3.2`
- `Pro/deepseek-ai/DeepSeek-V3.2`
- `Qwen/Qwen3-VL-32B-Instruct`
- `Qwen/Qwen3-VL-32B-Thinking`
- `Qwen/Qwen3-VL-8B-Instruct`
- `Qwen/Qwen3-VL-30B-A3B-Thinking`
- `Qwen/Qwen3-VL-30B-A3B-Instruct`
- `Qwen/Qwen3-VL-235B-A22B-Instruct`
- `Qwen/Qwen3-VL-235B-A22B-Thinking`
- `deepseek-ai/DeepSeek-V3.1-Terminus`
- `Pro/deepseek-ai/DeepSeek-V3.1-Terminus`
- `inclusionAI/Ling-flash-2.0`
- `ByteDance-Seed/Seed-OSS-36B-Instruct`
- `Qwen/Qwen3-Coder-30B-A3B-Instruct`
- `Qwen/Qwen3-Coder-480B-A35B-Instruct`
- `Qwen/Qwen3-30B-A3B-Instruct-2507`
- `Qwen/Qwen3-235B-A22B-Thinking-2507`
- `zai-org/GLM-4.5-Air`
- `baidu/ERNIE-4.5-300B-A47B`
- `tencent/Hunyuan-A13B-Instruct`
- `deepseek-ai/DeepSeek-R1`
- `Pro/deepseek-ai/DeepSeek-R1`
- `Qwen/Qwen3-14B`
- `Qwen/Qwen3-32B`
- `Qwen/Qwen3-8B`
- `deepseek-ai/DeepSeek-V3`
- `Pro/deepseek-ai/DeepSeek-V3`
- `Qwen/Qwen2.5-72B-Instruct`
- `Qwen/Qwen2.5-7B-Instruct`

### `snowflake-cortex` — Snowflake Cortex

`https://${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/api/v2/cortex/v1` · 21 model · protokol: `openai-chat`

- `openai-gpt-5.6-luna`  ← varsayılan
- `openai-gpt-5.6-sol`
- `openai-gpt-5.6-terra`
- `claude-fable-5`
- `claude-opus-4-8`
- `openai-gpt-5.5`
- `claude-opus-4-7`
- `openai-gpt-5.4`
- `gemini-3.1-pro`
- `claude-sonnet-4-6`
- `openai-gpt-5.2`
- `openai-gpt-5.1`
- `claude-haiku-4-5`
- `claude-sonnet-4-5`
- `openai-gpt-5`
- `openai-gpt-5-mini`
- `openai-gpt-5-nano`
- `openai-gpt-4.1`
- `deepseek-r1`
- `snowflake-llama3.3-70b`
- `mistral-large2`

### `stackit` — STACKIT

`https://api.openai-compat.model-serving.eu01.onstackit.cloud/v1` · 5 model · protokol: `openai-chat`

- `Qwen/Qwen3.6-27B`  ← varsayılan
- `openai/gpt-oss-120b`
- `openai/gpt-oss-20b`
- `cortecs/Llama-3.3-70B-Instruct-FP8-Dynamic`
- `Qwen/Qwen3-VL-235B-A22B-Instruct-FP8`

### `stepfun` — StepFun (China)

`https://api.stepfun.com/v1` · 5 model · protokol: `openai-chat`

- `step-3.7-flash`  ← varsayılan
- `step-3.5-flash-2603`
- `step-3.5-flash`
- `step-1-32k`
- `step-2-16k`

### `stepfun-ai` — StepFun (Global)

`https://api.stepfun.ai/v1` · 5 model · protokol: `openai-chat`

- `step-3.7-flash`  ← varsayılan
- `step-3.5-flash-2603`
- `step-3.5-flash`
- `step-1-32k`
- `step-2-16k`

### `stepfun-ai-step-plan` — StepFun Step Plan (Global)

`https://api.stepfun.ai/step_plan/v1` · 3 model · protokol: `openai-chat`

- `step-3.7-flash`  ← varsayılan
- `step-3.5-flash-2603`
- `step-3.5-flash`

### `stepfun-step-plan` — StepFun Step Plan (China)

`https://api.stepfun.com/step_plan/v1` · 4 model · protokol: `openai-chat`

- `step-3.7-flash`  ← varsayılan
- `step-router-v1`
- `step-3.5-flash-2603`
- `step-3.5-flash`

### `subconscious` — Subconscious

`https://api.subconscious.dev/v1` · 2 model · protokol: `anthropic`

- `subconscious/glm-5.2`  ← varsayılan
- `subconscious/tim-qwen3.6-27b`

### `submodel` — submodel

`https://llm.submodel.ai/v1` · 9 model · protokol: `openai-chat`

- `deepseek-ai/DeepSeek-R1-0528`  ← varsayılan
- `deepseek-ai/DeepSeek-V3-0324`
- `deepseek-ai/DeepSeek-V3.1`
- `openai/gpt-oss-120b`
- `Qwen/Qwen3-235B-A22B-Instruct-2507`
- `Qwen/Qwen3-235B-A22B-Thinking-2507`
- `Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8`
- `zai-org/GLM-4.5-Air`
- `zai-org/GLM-4.5-FP8`

### `synthetic` — Synthetic

`https://api.synthetic.new/openai/v1` · 7 model · protokol: `openai-chat`

- `hf:zai-org/GLM-5.2`  ← varsayılan
- `hf:MiniMaxAI/MiniMax-M3`
- `hf:moonshotai/Kimi-K2.7-Code`
- `hf:Qwen/Qwen3.6-27B`
- `hf:nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4`
- `hf:zai-org/GLM-4.7-Flash`
- `hf:openai/gpt-oss-120b`

### `tencent-coding-plan` — Tencent Coding Plan (China)

`https://api.lkeap.cloud.tencent.com/coding/v3` · 8 model · protokol: `openai-chat`

- `hunyuan-2.0-instruct`  ← varsayılan
- `hunyuan-2.0-thinking`
- `hunyuan-t1`
- `hunyuan-turbos`
- `tc-code-latest`
- `minimax-m2.5`
- `glm-5`
- `kimi-k2.5`

### `tencent-token-plan` — Tencent Token Plan

`https://api.lkeap.cloud.tencent.com/plan/v3` · 1 model · protokol: `openai-chat`

- `hy3`  ← varsayılan

### `tencent-tokenhub` — Tencent TokenHub

`https://tokenhub.tencentmaas.com/v1` · 2 model · protokol: `openai-chat`

- `hy3`  ← varsayılan
- `hy3-preview`

### `the-grid-ai` — The Grid AI

`https://api.thegrid.ai/v1` · 9 model · protokol: `openai-chat`

- `agent-max`  ← varsayılan
- `agent-prime`
- `agent-standard`
- `code-max`
- `code-prime`
- `code-standard`
- `text-max`
- `text-prime`
- `text-standard`

### `thinkingmachines` — Thinking Machines

`https://tinker.thinkingmachines.dev/services/tinker-prod/oai/api/v1` · 1 model · protokol: `openai-chat`

- `inkling`  ← varsayılan

### `tinfoil` — Tinfoil

`https://inference.tinfoil.sh/v1` · 6 model · protokol: `openai-chat`

- `glm-5-2`  ← varsayılan
- `kimi-k2-6`
- `gemma4-31b`
- `gpt-oss-safeguard-120b`
- `gpt-oss-120b`
- `llama3-3-70b`

### `together` — Together AI

`https://api.together.xyz/v1` · 17 model · protokol: `openai-chat`

- `thinkingmachines/Inkling`
- `zai-org/GLM-5.2`
- `moonshotai/Kimi-K2.7-Code`
- `MiniMaxAI/MiniMax-M3`
- `nvidia/nemotron-3-ultra-550b-a55b`
- `Qwen/Qwen3.7-Max`
- `Qwen/Qwen3.6-Plus`
- `deepseek-ai/DeepSeek-V4-Pro`
- `moonshotai/Kimi-K2.6`
- `google/gemma-4-31B-it`
- `MiniMaxAI/MiniMax-M2.7`
- `Qwen/Qwen3.5-9B`
- `openai/gpt-oss-120b`
- `openai/gpt-oss-20b`
- `meta-llama/Llama-3.3-70B-Instruct-Turbo`
- `Qwen/Qwen2.5-7B-Instruct-Turbo`
- `Qwen/Qwen3.5-397B-A17B`  ← varsayılan

### `trustedrouter` — TrustedRouter

`https://api.trustedrouter.com/v1` · 7 model · protokol: `openai-chat`

- `synth`  ← varsayılan
- `synth-code`
- `e2e`
- `fast`
- `zdr`
- `auto`
- `cheap`

### `umans-ai` — Umans AI

`https://api.code.umans.ai/v1` · 5 model · protokol: `openai-chat`

- `umans-glm-5.2`  ← varsayılan
- `umans-coder`
- `umans-kimi-k2.7`
- `umans-flash`
- `umans-glm-5.1`

### `umans-ai-coding-plan` — Umans AI Coding Plan

`https://api.code.umans.ai/v1` · 6 model · protokol: `openai-chat`

- `umans-glm-5.2`  ← varsayılan
- `umans-coder`
- `umans-kimi-k2.7`
- `umans-flash`
- `umans-qwen3.6-35b-a3b`
- `umans-glm-5.1`

### `unorouter` — UnoRouter

`https://api.unorouter.com/v1` · 23 model · protokol: `openai-chat`

- `claude-sonnet-5`  ← varsayılan
- `glm-5.2`
- `glm-5.2:free`
- `nemotron-3-ultra-550b-a55b:free`
- `step-3.7-flash:free`
- `claude-opus-4-8`
- `gemini-3.5-flash`
- `deepseek-v4-flash`
- `deepseek-v4-flash:free`
- `deepseek-v4-pro`
- `deepseek-v4-pro:free`
- `gpt-5.5`
- `gpt-5.5:free`
- `kimi-k2.6`
- `gemma-4-31b-it:free`
- `minimax-m2.7`
- `minimax-m2.7:free`
- `gpt-5.4`
- `gpt-5.4:free`
- `qwen3.5-397b-a17b:free`
- `gpt-5.2`
- `claude-haiku-4-5-20251001`
- `glm-4.5-flash:free`

### `upstage` — Upstage

`https://api.upstage.ai/v1/solar` · 3 model · protokol: `openai-chat`

- `solar-pro3`  ← varsayılan
- `solar-pro2`
- `solar-mini`

### `v0` — Vercel V0

`https://api.v0.dev/v1` · 3 model · protokol: `openai-chat`

- `v0-1.5-lg`
- `v0-1.5-md`  ← varsayılan
- `v0-1.0-md`

### `vercel-ai-gateway` — Vercel AI Gateway

`https://ai-gateway.vercel.sh/v1` · 180 model · protokol: `openai-chat`

- `google/gemini-3.5-flash-lite`
- `google/gemini-3.6-flash`
- `moonshotai/kimi-k3`
- `thinkingmachines/inkling`
- `kwaipilot/kat-coder-air-v2.5`
- `kwaipilot/kat-coder-pro-v2.5`
- `meta/muse-spark-1.1`
- `openai/gpt-5.6-luna`
- `openai/gpt-5.6-sol`
- `openai/gpt-5.6-terra`
- `xai/grok-4.5`
- `anthropic/claude-fable-5`
- `anthropic/claude-sonnet-5`
- `zai/glm-5.2-fast`
- `sakana/fugu-ultra`
- `zai/glm-5.2`
- `moonshotai/kimi-k2.7-code-highspeed`
- `moonshotai/kimi-k2.7-code`
- `nvidia/nemotron-3-ultra-550b-a55b`
- `alibaba/qwen3.7-plus`
- `minimax/minimax-m3`
- `anthropic/claude-opus-4.8`
- `anthropic/claude-opus-4.8-fast`
- `stepfun/step-3.7-flash`
- `alibaba/qwen3.7-max`
- `xai/grok-build-0.1`
- `google/gemini-3.5-flash`
- `google/gemini-3.1-flash-lite`
- `xai/grok-4.3`
- `mistral/mistral-medium-3.5`
- `openai/gpt-5.5`
- `openai/gpt-5.5-pro`
- `deepseek/deepseek-v4-flash`
- `deepseek/deepseek-v4-pro`
- `alibaba/qwen3.6-27b`
- `xiaomi/mimo-v2.5`
- `xiaomi/mimo-v2.5-pro`
- `alibaba/qwen-3.6-max-preview`
- `moonshotai/kimi-k2.6`
- `anthropic/claude-opus-4.7`
- `anthropic/claude-opus-4.7-fast`
- `zai/glm-5.1`
- `alibaba/qwen3.6-plus`  ← varsayılan
- `google/gemma-4-26b-a4b-it`
- `google/gemma-4-31b-it`
- `arcee-ai/trinity-large-thinking`
- `zai/glm-5v-turbo`
- `kwaipilot/kat-coder-pro-v2`
- `minimax/minimax-m2.7`
- `minimax/minimax-m2.7-highspeed`
- `openai/gpt-5.4-mini`
- `openai/gpt-5.4-nano`
- `zai/glm-5-turbo`
- `xai/grok-4.20-multi-agent-beta`
- `xai/grok-4.20-non-reasoning-beta`
- `xai/grok-4.20-reasoning-beta`
- `xai/grok-4.20-multi-agent`
- `xai/grok-4.20-non-reasoning`
- `xai/grok-4.20-reasoning`
- `openai/gpt-5.4`
- `openai/gpt-5.4-pro`
- `google/gemini-3.1-flash-lite-preview`
- `openai/gpt-5.3-chat`
- `alibaba/qwen3.5-flash`
- `inception/mercury-2`
- `anthropic/claude-sonnet-4.6`
- `alibaba/qwen3.5-plus`
- `minimax/minimax-m2.5`
- `minimax/minimax-m2.5-highspeed`
- `zai/glm-5`
- `anthropic/claude-opus-4.6`
- `openai/gpt-5.3-codex`
- `stepfun/step-3.5-flash`
- `moonshotai/kimi-k2.5`
- `alibaba/qwen3-max-thinking`
- `zai/glm-4.7-flash`
- `zai/glm-4.7-flashx`
- `minimax/minimax-m2.1`
- `minimax/minimax-m2.1-lightning`
- `zai/glm-4.7`
- `openai/gpt-5.2-codex`
- `google/gemini-3-flash`
- `openai/gpt-5.2`
- `openai/gpt-5.2-chat`
- `openai/gpt-5.2-pro`
- `mistral/devstral-2`
- `mistral/devstral-small-2`
- `deepseek/deepseek-v3.2-thinking`
- `anthropic/claude-opus-4.5`
- `openai/gpt-5.1-codex-max`
- `xai/grok-4.1-fast-non-reasoning`
- `xai/grok-4.1-fast-reasoning`
- `google/gemini-3-pro-preview`
- `google/gemini-3.1-pro-preview`
- `openai/gpt-5.1-codex`
- `openai/gpt-5.1-codex-mini`
- `openai/gpt-5.1-instant`
- `openai/gpt-5.1-thinking`
- `moonshotai/kimi-k2-thinking`
- `openai/gpt-oss-safeguard-20b`
- `nvidia/nemotron-nano-12b-v2-vl`
- `minimax/minimax-m2`
- `anthropic/claude-haiku-4.5`
- `openai/gpt-5-pro`
- `zai/glm-4.6`
- `zai/glm-4.6v`
- `zai/glm-4.6v-flash`
- `anthropic/claude-sonnet-4.5`
- `alibaba/qwen3-235b-a22b-thinking`
- `alibaba/qwen3-max`
- `alibaba/qwen3-vl-instruct`
- `alibaba/qwen3-vl-thinking`
- `deepseek/deepseek-v3.1-terminus`
- `openai/gpt-5-codex`
- `alibaba/qwen3-next-80b-a3b-instruct`
- `alibaba/qwen3-next-80b-a3b-thinking`
- `alibaba/qwen3-max-preview`
- `bytedance/seed-1.6`
- `bytedance/seed-1.8`
- `deepseek/deepseek-v3.1`
- `nvidia/nemotron-nano-9b-v2`
- `zai/glm-4.5v`
- `openai/gpt-5`
- `openai/gpt-5-chat`
- `openai/gpt-5-mini`
- `openai/gpt-5-nano`
- `openai/gpt-oss-120b`
- `openai/gpt-oss-20b`
- `alibaba/qwen3-coder-30b-a3b`
- `zai/glm-4.5`
- `zai/glm-4.5-air`
- `alibaba/qwen3-coder-plus`
- `alibaba/qwen3-coder`
- `alibaba/qwen3-coder-next`
- `moonshotai/kimi-k2`
- `openai/o3-deep-research`
- `google/gemini-2.5-flash`
- `google/gemini-2.5-flash-lite`
- `google/gemini-2.5-pro`
- `openai/o3-pro`
- `anthropic/claude-opus-4`
- `anthropic/claude-sonnet-4`
- `mistral/mistral-medium`
- `alibaba/qwen-3-14b`
- `alibaba/qwen-3-235b`
- `alibaba/qwen-3-30b`
- `alibaba/qwen-3-32b`
- `openai/o3`
- `openai/o4-mini`
- `openai/gpt-4.1`
- `openai/gpt-4.1-mini`
- `openai/gpt-4.1-nano`
- `meta/llama-4-maverick`
- `meta/llama-4-scout`
- `mistral/magistral-medium`
- `mistral/magistral-small`
- `cohere/command-a`
- `inception/mercury-coder-small`
- `perplexity/sonar`
- `perplexity/sonar-pro`
- `deepseek/deepseek-r1`
- `deepseek/deepseek-v3`
- `openai/o3-mini`
- `meta/llama-3.3-70b`
- `openai/o1`
- `amazon/nova-lite`
- `amazon/nova-micro`
- `amazon/nova-pro`
- `mistral/ministral-3b`
- `mistral/ministral-8b`
- `mistral/mistral-small`
- `mistral/pixtral-12b`
- `meta/llama-3.1-70b`
- `meta/llama-3.1-8b`
- `mistral/mistral-nemo`
- `openai/gpt-4o-mini`
- `mistral/codestral`
- `openai/gpt-4o`
- `anthropic/claude-3-haiku`
- `openai/gpt-4-turbo`

### `vertex` — Google Vertex AI

`—` · 28 model · protokol: `gemini`

- `claude-sonnet-5@default`  ← varsayılan
- `claude-opus-4-8@default`
- `gemini-3.5-flash`
- `gemini-flash-latest`
- `gemini-3.1-flash-lite`
- `gemini-flash-lite-latest`
- `claude-opus-4-7@default`
- `gemini-3.1-pro-preview`
- `gemini-3.1-pro-preview-customtools`
- `claude-sonnet-4-6@default`
- `zai-org/glm-5-maas`
- `claude-opus-4-6@default`
- `zai-org/glm-4.7-maas`
- `deepseek-ai/deepseek-v3.2-maas`
- `gemini-3-flash-preview`
- `moonshotai/kimi-k2-thinking-maas`
- `claude-opus-4-5@20251101`
- `claude-haiku-4-5@20251001`
- `claude-sonnet-4-5@20250929`
- `deepseek-ai/deepseek-v3.1-maas`
- `qwen/qwen3-235b-a22b-instruct-2507-maas`
- `openai/gpt-oss-120b-maas`
- `openai/gpt-oss-20b-maas`
- `gemini-2.5-flash`
- `gemini-2.5-flash-lite`
- `gemini-2.5-pro`
- `meta/llama-3.3-70b-instruct-maas`
- `meta/llama-4-maverick-17b-128e-instruct-maas`

### `vivgrid` — Vivgrid

`https://api.vivgrid.com/v1` · 17 model · protokol: `openai-responses`

- `gpt-5.6-luna`  ← varsayılan
- `gpt-5.6-sol`
- `gpt-5.6-terra`
- `glm-5.2`
- `deepseek-v4-pro`
- `gpt-5.5`
- `gpt-5.4-mini`
- `gpt-5.4-nano`
- `gpt-5.4`
- `gemini-3.1-flash-lite-preview`
- `gpt-5.3-codex`
- `gemini-3.1-pro-preview`
- `gpt-5.2-codex`
- `deepseek-v3.2`
- `gpt-5.1-codex`
- `gpt-5.1-codex-max`
- `gpt-5-mini`

### `vultr` — Vultr

`https://api.vultrinference.com/v1` · 10 model · protokol: `openai-chat`

- `zai-org/GLM-5.2-FP8`  ← varsayılan
- `nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-BF16`
- `deepseek-ai/DeepSeek-V4-Flash`
- `Qwen/Qwen3.6-27B`
- `XiaomiMiMo/MiMo-V2.5-Pro`
- `moonshotai/Kimi-K2.6`
- `MiniMaxAI/MiniMax-M2.7`
- `Qwen/Qwen3.5-397B-A17B`
- `nvidia/DeepSeek-V3.2-NVFP4`
- `nvidia/Nemotron-Cascade-2-30B-A3B`

### `wafer.ai` — Wafer

`https://pass.wafer.ai/v1` · 5 model · protokol: `openai-chat`

- `GLM-5.2`  ← varsayılan
- `glm5.2-fast`
- `MiniMax-M3`
- `Kimi-K2.6`
- `GLM-5.1`

### `wandb` — Weights & Biases

`https://api.inference.wandb.ai/v1` · 25 model · protokol: `openai-chat`

- `zai-org/GLM-5.2`  ← varsayılan
- `moonshotai/Kimi-K2.7-Code`
- `nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B`
- `JetBrains/Mellum2-12B-A2.5B-Instruct`
- `ibm-granite/granite-4.1-8b`
- `deepseek-ai/DeepSeek-V4-Flash`
- `deepseek-ai/DeepSeek-V4-Pro`
- `Qwen/Qwen3.6-27B`
- `moonshotai/Kimi-K2.6`
- `Qwen/Qwen3.6-35B-A3B`
- `zai-org/GLM-5.1`
- `google/gemma-4-31B-it`
- `nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-FP8`
- `Qwen/Qwen3.5-35B-A3B`
- `MiniMaxAI/MiniMax-M2.5`
- `moonshotai/Kimi-K2.5`
- `deepseek-ai/DeepSeek-V3.1`
- `openai/gpt-oss-120b`
- `openai/gpt-oss-20b`
- `Qwen/Qwen3-30B-A3B-Instruct-2507`
- `Qwen/Qwen3-Coder-480B-A35B-Instruct`
- `OpenPipe/Qwen3-14B-Instruct`
- `meta-llama/Llama-3.3-70B-Instruct`
- `meta-llama/Llama-3.1-70B-Instruct`
- `meta-llama/Llama-3.1-8B-Instruct`

### `xai` — xAI

`https://api.x.ai/v1` · 5 model · protokol: `openai-chat`

- `grok-4.5`
- `grok-4.3`
- `grok-build-0.1`
- `grok-4.20-0309-non-reasoning`  ← varsayılan
- `grok-4.20-0309-reasoning`

### `xiaomi` — Xiaomi

`https://api.xiaomimimo.com/v1` · 3 model · protokol: `openai-chat`

- `mimo-v2.5-pro-ultraspeed`  ← varsayılan
- `mimo-v2.5`
- `mimo-v2.5-pro`

### `xiaomi-token-plan-ams` — Xiaomi Token Plan (Europe)

`https://token-plan-ams.xiaomimimo.com/v1` · 2 model · protokol: `openai-chat`

- `mimo-v2.5`  ← varsayılan
- `mimo-v2.5-pro`

### `xiaomi-token-plan-cn` — Xiaomi Token Plan (China)

`https://token-plan-cn.xiaomimimo.com/v1` · 2 model · protokol: `openai-chat`

- `mimo-v2.5`  ← varsayılan
- `mimo-v2.5-pro`

### `xiaomi-token-plan-sgp` — Xiaomi Token Plan (Singapore)

`https://token-plan-sgp.xiaomimimo.com/v1` · 2 model · protokol: `openai-chat`

- `mimo-v2.5`  ← varsayılan
- `mimo-v2.5-pro`

### `xpersona` — Xpersona

`https://www.xpersona.co/v1` · 3 model · protokol: `openai-chat`

- `claude-fable-5`  ← varsayılan
- `xpersona-gpt-5.5`
- `xpersona-frieren-coder`

### `zai` — Z.AI

`https://api.z.ai/api/paas/v4` · 14 model · protokol: `openai-chat`

- `glm-5.2`
- `glm-5.1`
- `glm-5v-turbo`  ← varsayılan
- `glm-5-turbo`
- `glm-5`
- `glm-4.7-flash`
- `glm-4.7-flashx`
- `glm-4.7`
- `glm-4.6v`
- `glm-4.6`
- `glm-4.5v`
- `glm-4.5`
- `glm-4.5-air`
- `glm-4.5-flash`

### `zai-coding-plan` — Z.AI Coding Plan

`https://api.z.ai/api/coding/paas/v4` · 6 model · protokol: `openai-chat`

- `glm-5.2`  ← varsayılan
- `glm-5v-turbo`
- `glm-5.1`
- `glm-5-turbo`
- `glm-4.7`
- `glm-4.5-air`

### `zeldoc` — Zeldoc

`https://api.zeldoc.ai/v1` · 1 model · protokol: `openai-chat`

- `z-code`  ← varsayılan

### `zenifra` — Zenifra

`https://ai.zenifra.com/v1` · 1 model · protokol: `openai-chat`

- `alibaba/qwen3.6-35b-a3b`  ← varsayılan

### `zenmux` — ZenMux

`https://zenmux.ai/api/v1` · 120 model · protokol: `openai-chat`

- `moonshotai/kimi-k3`  ← varsayılan
- `moonshotai/kimi-k3-free`
- `openai/gpt-5.6-luna`
- `openai/gpt-5.6-sol`
- `openai/gpt-5.6-terra`
- `x-ai/grok-4.5`
- `anthropic/claude-sonnet-5`
- `anthropic/claude-sonnet-5-free`
- `z-ai/glm-5.2`
- `z-ai/glm-5.2-free`
- `moonshotai/kimi-k2.7-code`
- `moonshotai/kimi-k2.7-code-free`
- `anthropic/claude-fable-5`
- `qwen/qwen3.7-plus`
- `minimax/minimax-m3`
- `stepfun/step-3.7-flash`
- `stepfun/step-3.7-flash-free`
- `anthropic/claude-opus-4.8`
- `qwen/qwen3.7-max`
- `google/gemini-3.5-flash`
- `google/gemini-3.1-flash-lite`
- `inclusionai/ring-2.6-1t`
- `openai/gpt-5.5-instant`
- `deepseek/deepseek-v4-flash`
- `deepseek/deepseek-v4-pro`
- `openai/gpt-5.5`
- `openai/gpt-5.5-pro`
- `xiaomi/mimo-v2.5`
- `xiaomi/mimo-v2.5-pro`
- `moonshotai/kimi-k2.6`
- `tencent/hy3-preview`
- `x-ai/grok-4.3`
- `anthropic/claude-opus-4.7`
- `x-ai/grok-build-0.1`
- `z-ai/glm-5.1`
- `z-ai/glm-5v-turbo`
- `kuaishou/kat-coder-pro-v2`
- `qwen/qwen3.6-plus`
- `sapiens-ai/agnes-1.5-lite`
- `sapiens-ai/agnes-1.5-pro`
- `minimax/minimax-m2.7`
- `minimax/minimax-m2.7-highspeed`
- `openai/gpt-5.3-chat`
- `openai/gpt-5.3-codex`
- `openai/gpt-5.4`
- `openai/gpt-5.4-mini`
- `openai/gpt-5.4-nano`
- `openai/gpt-5.4-pro`
- `qwen/qwen3.5-flash`
- `qwen/qwen3.5-plus`
- `volcengine/doubao-seed-2.0-code`
- `x-ai/grok-4.2-fast`
- `x-ai/grok-4.2-fast-non-reasoning`
- `z-ai/glm-5-turbo`
- `xiaomi/mimo-v2-omni`
- `xiaomi/mimo-v2-pro`
- `google/gemini-3.1-pro-preview`
- `anthropic/claude-sonnet-4.6`
- `volcengine/doubao-seed-2.0-lite`
- `volcengine/doubao-seed-2.0-mini`
- `volcengine/doubao-seed-2.0-pro`
- `minimax/minimax-m2.5`
- `minimax/minimax-m2.5-lightning`
- `z-ai/glm-5`
- `anthropic/claude-opus-4.6`
- `stepfun/step-3.5-flash`
- `moonshotai/kimi-k2.5`
- `qwen/qwen3-max`
- `baidu/ernie-5.0-thinking-preview`
- `z-ai/glm-4.7-flash-free`
- `z-ai/glm-4.7-flashx`
- `openai/gpt-5.2-codex`
- `z-ai/glm-4.7`
- `minimax/minimax-m2.1`
- `volcengine/doubao-seed-1.8`
- `google/gemini-3-flash-preview`
- `xiaomi/mimo-v2-flash`
- `openai/gpt-5.2`
- `openai/gpt-5.2-pro`
- `z-ai/glm-4.6v`
- `z-ai/glm-4.6v-flash`
- `z-ai/glm-4.6v-flash-free`
- `deepseek/deepseek-v3.2`
- `deepseek/deepseek-chat`
- `anthropic/claude-opus-4.5`
- `x-ai/grok-4.1-fast`
- `x-ai/grok-4.1-fast-non-reasoning`
- `openai/gpt-5.1`
- `openai/gpt-5.1-chat`
- `openai/gpt-5.1-codex`
- `openai/gpt-5.1-codex-mini`
- `volcengine/doubao-seed-code`
- `moonshotai/kimi-k2-thinking`
- `moonshotai/kimi-k2-thinking-turbo`
- `minimax/minimax-m2`
- `anthropic/claude-haiku-4.5`
- `inclusionai/ring-1t`
- `inclusionai/ling-1t`
- `z-ai/glm-4.6`
- `anthropic/claude-sonnet-4.5`
- `deepseek/deepseek-v3.2-exp`
- `openai/gpt-5-codex`
- `x-ai/grok-4-fast`
- `moonshotai/kimi-k2-0905`
- `x-ai/grok-code-fast-1`
- `openai/gpt-5`
- `anthropic/claude-opus-4.1`
- `stepfun/step-3`
- `z-ai/glm-4.5`
- `z-ai/glm-4.5-air`
- `qwen/qwen3-coder-plus`
- `google/gemini-2.5-flash-lite`
- `x-ai/grok-4`
- `google/gemini-2.5-flash`
- `google/gemini-2.5-pro`
- `anthropic/claude-opus-4`
- `anthropic/claude-sonnet-4`
- `google/gemini-3.1-flash-lite-preview`
- `anthropic/claude-3.7-sonnet`
- `anthropic/claude-3.5-haiku`

### `zhipuai` — Zhipu AI

`https://open.bigmodel.cn/api/paas/v4` · 13 model · protokol: `openai-chat`

- `glm-5.2`  ← varsayılan
- `glm-5v-turbo`
- `glm-5.1`
- `glm-5`
- `glm-4.7-flash`
- `glm-4.7-flashx`
- `glm-4.7`
- `glm-4.6v`
- `glm-4.6`
- `glm-4.5v`
- `glm-4.5`
- `glm-4.5-air`
- `glm-4.5-flash`

### `zhipuai-coding-plan` — Zhipu AI Coding Plan

`https://open.bigmodel.cn/api/coding/paas/v4` · 7 model · protokol: `openai-chat`

- `glm-5.2`  ← varsayılan
- `glm-5v-turbo`
- `glm-5.1`
- `glm-5-turbo`
- `glm-4.7`
- `glm-4.6v`
- `glm-4.5-air`
