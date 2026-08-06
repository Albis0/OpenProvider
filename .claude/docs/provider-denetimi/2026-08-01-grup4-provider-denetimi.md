# Grup 4 — Sağlayıcı Denetimi (29 provider)

**Başlangıç:** 2026-08-01 (devralınan görev, önceki oturumdan)
**Bitiş:** 2026-08-02 14:42

---

## Kapsam

Bu denetim şu 29 provider id'sini kapsıyor (görevde verilen liste dışına çıkılmadı):

```
mixlayer, moark, model-oracle-ai, modelscope, moonshot, moonshotai-cn, morph,
nano-gpt, nearai, nebius, neon, neuralwatt, nousResearch, nova, novita-ai,
nvidia, oca, ollama, openai-codex, openai-codex-cli, openai-compatible,
openai-native, opencode, opencode-go, openrouter, orcarouter, ovhcloud,
perplexity-agent, pioneer
```

**NVIDIA'ya hiçbir şey eklenmedi/değiştirilmedi.** Zaten tam birinci sınıf
(commit `8b3253031`) — `ApiProvider` union'da, tüm proto alanları, session
factory, registry hepsi hazır. Aşağıdaki tabloda sadece "zaten tamam, dokunulmadı"
diye işaretlendi.

**Network isteği atılmadı, hiçbir provider'a karşı "test edildi" denmedi.**
Gerçek test [provider-test-plani.md](2026-08-01-provider-test-plani.md)'deki
S0–S6 basamaklarıyla, kullanıcının kendi API key'leri ile yapılacak.

---

## Yöntem

Veri üç kaynaktan okundu (kod okuma, API çağrısı yok):

1. `sdk/packages/llms/src/providers/providers.generated.ts` — models.dev'den
   otomatik üretilen düz spec listesi (id, name, family/protokol, capabilities,
   defaultModelId, apiKeyEnv, docsUrl, baseUrl). Bu dosyada **model dizisi yok**
   — sadece varsayılan model id'si var; model sayıları
   [provider-envanteri.md](provider-envanteri.md)'den alındı (o dosya ayrı bir
   SDK çağrısıyla, `getModelsForProvider`, üretilmişti).
2. `sdk/packages/llms/src/providers/builtins.ts` — el yazması override'lar.
   Bazı id'ler (`nousResearch`, `oca`, `openai-codex`, `openai-codex-cli`,
   `openai-compatible`) **sadece burada** var, `providers.generated.ts`'te hiç
   yok.
3. `apps/vscode/src/shared/api.ts` (`ApiProvider` union, satır 4-53) ve
   `apps/vscode/webview-ui/src/components/settings/providers/providerSettingsRegistry.ts`
   (`FALLBACK_GENERIC_PROVIDER_NAMES`, satır 153-169).

---

## 1. Envanter tablosu

| id | Ad | Baz URL | Varsayılan model | Protokol (family) | Model # | apiKeyEnv | VS Code |
|---|---|---|---|---|---:|---|:---:|
| `mixlayer` | Mixlayer | `https://models.mixlayer.ai/v1` | `qwen/qwen3.5-122b-a10b` | openai-compatible | 5 | `MIXLAYER_API_KEY` | ⬜ jenerik |
| `moark` | Moark | `https://moark.com/v1` | `MiniMax-M2.1` | openai-compatible | 2 | `MOARK_API_KEY` | ⬜ jenerik |
| `model-oracle-ai` | Model Oracle AI | `https://api.modeloracle.com/api/v1` | `claude-sonnet-5` | openai-compatible | 15 | `MODEL_ORACLE_API_KEY` | ⬜ jenerik |
| `modelscope` | ModelScope | `https://api-inference.modelscope.cn/v1` | `ZhipuAI/GLM-4.6` | openai-compatible | 7 | `MODELSCOPE_API_KEY` | ⬜ jenerik |
| `moonshot` | Moonshot AI | `https://api.moonshot.ai/v1` | `kimi-k3` | openai-compatible | 10 | `MOONSHOT_API_KEY` | ✅ birinci sınıf |
| `moonshotai-cn` | Moonshot AI (China) | `https://api.moonshot.cn/v1` | `kimi-k3` | openai-compatible | 10 | `MOONSHOT_API_KEY` | ⬜ jenerik |
| `morph` | Morph | `https://api.morphllm.com/v1` | *(yok)* | openai-compatible | 0 (canlı) | `MORPH_API_KEY` | ⬜ jenerik |
| `nano-gpt` | NanoGPT | `https://nano-gpt.com/api/v1` | `mistral-code-agent-latest` | openai-compatible | 193 | `NANO_GPT_API_KEY` | ⬜ jenerik |
| `nearai` | NEAR AI Cloud | `https://cloud-api.near.ai/v1` | `google/gemini-3.5-flash` | openai-compatible | 33 | `NEARAI_API_KEY` | ⬜ jenerik |
| `nebius` | Nebius Token Factory | `https://api.tokenfactory.nebius.com/v1` | `zai-org/GLM-5.2` | openai-compatible | 20 | `NEBIUS_API_KEY` | ✅ birinci sınıf |
| `neon` | Neon | `${NEON_AI_GATEWAY_BASE_URL}/v1` | `claude-opus-4-8` | openai-compatible | 36 | `NEON_AI_GATEWAY_BASE_URL`, `NEON_AI_GATEWAY_TOKEN` | ⬜ jenerik |
| `neuralwatt` | Neuralwatt | `https://api.neuralwatt.com/v1` | `glm-5.2` | openai-compatible | 18 | `NEURALWATT_API_KEY` | ⬜ jenerik |
| `nousResearch` | Nous Research | `https://inference-api.nousresearch.com/v1` | `DeepHermes-3-Llama-3-3-70B-Preview` | openai-compatible | 1 | `NOUS_RESEARCH_API_KEY`/`NOUSRESEARCH_API_KEY` | ✅ birinci sınıf |
| `nova` | Nova | `https://api.nova.amazon.com/v1` | `nova-2-pro-v1` | openai-compatible | 2 | `NOVA_API_KEY` | ⬜ jenerik |
| `novita-ai` | NovitaAI | `https://api.novita.ai/openai` | `moonshotai/kimi-k3` | openai-compatible | 72 | `NOVITA_API_KEY` | ⬜ jenerik |
| `nvidia` | Nvidia | `https://integrate.api.nvidia.com/v1` | `z-ai/glm-5.2` | openai-compatible | 43 | `NVIDIA_API_KEY` | ✅ **zaten tam, dokunulmadı** |
| `oca` | Oracle Code Assist | (OCI LiteLLM gateway) | `anthropic/claude-3-7-sonnet-20250219` | openai-compatible | 1 | `OCA_API_KEY` | ✅ birinci sınıf |
| `ollama` | Ollama | `http://localhost:11434` (yerel) | *(boş — canlı seçim)* | ollama (builtins override) | 0 (canlı) | `OLLAMA_API_KEY` | ✅ birinci sınıf |
| `openai-codex` | OpenAI ChatGPT Subscription | `https://chatgpt.com/backend-api/codex` | `gpt-5.4`/OAuth | openai (OAuth) | 7 | — (OAuth) | ✅ birinci sınıf |
| `openai-codex-cli` | OpenAI Codex CLI | `https://chatgpt.com/backend-api/codex` | `gpt-5.6-sol` | openai-codex | 1 | — (local-auth) | ⬜ jenerik |
| `openai-compatible` | OpenAI Compatible | `https://api.openai.com/v1` | `gpt-4o` | openai-compatible | 1 | `OPENAI_API_KEY` | özel amaçlı — dokunulmadı |
| `openai-native` | OpenAI | `https://api.openai.com/v1` | `gpt-5.4` | openai | 46 | `OPENAI_API_KEY` | ✅ birinci sınıf |
| `opencode` | OpenCode | (boş, oauth ile çözülüyor) | `openai/gpt-5.6-sol` | opencode | 58 | — (OAuth) | ⬜ jenerik |
| `opencode-go` | OpenCode Go | `https://opencode.ai/zen/go/v1` | `kimi-k3` | openai-compatible | 15 | `OPENCODE_API_KEY` | ⬜ jenerik |
| `openrouter` | OpenRouter | `https://openrouter.ai/api/v1` | `anthropic/claude-sonnet-4.6` | openai-compatible | 267 | `OPENROUTER_API_KEY` | ✅ birinci sınıf (**zaten quirks.ts'te var, dokunulmadı**) |
| `orcarouter` | OrcaRouter | `https://api.orcarouter.ai/v1` | `google/gemini-flash-latest` | openai-compatible | 79 | `ORCAROUTER_API_KEY` | ⬜ jenerik |
| `ovhcloud` | OVHcloud AI Endpoints | `https://oai.endpoints.kepler.ai.cloud.ovh.net/v1` | `qwen3.6-27b` | openai-compatible | 11 | `OVHCLOUD_API_KEY` | ⬜ jenerik |
| `perplexity-agent` | Perplexity Agent | `https://api.perplexity.ai/v1` | `openai/gpt-5.5` | openai (responses) | 18 | `PERPLEXITY_API_KEY` | ⬜ jenerik |
| `pioneer` | Pioneer | `https://api.pioneer.ai/v1` | `sakana/fugu-ultra` | openai-compatible | 73 | `PIONEER_API_KEY` | ⬜ jenerik |

**Doğrulama — `ApiProvider` union'da olanlar** (`apps/vscode/src/shared/api.ts:4-53`):
`moonshot`, `nebius`, `nousResearch`, `oca`, `ollama`, `openai-codex`,
`openai-native`, `openrouter` — görev talimatındaki liste ile **birebir eşleşti**,
artı `nvidia` (zaten bilinen, ayrı tutuldu). Diğer 20 id union'da yok, jenerik
formdan çalışıyor. Kod değişikliği yapılmadı, sadece doğrulandı.

---

## 2. `providers.generated.ts`'te bulunamayan 5 id

Şu 5 id **sadece** `sdk/packages/llms/src/providers/builtins.ts`'te el yazması
override olarak var, models.dev kaynaklı otomatik dosyada hiç yok:

- `nousResearch` (builtins.ts:756-765)
- `oca` (builtins.ts:906-918, `OCA_CONFIG_FIELDS` ile `oca.mode`/`oca.usePromptCache` ek alanları)
- `openai-codex` (builtins.ts:949-962, OAuth device-code akışı)
- `openai-codex-cli` (builtins.ts:963-974, yerel Codex CLI)
- `openai-compatible` (builtins.ts:629-639, kullanıcı tanımlı custom provider'ların jenerik adı — **CLAUDE.md talimatı gereği dokunulmadı**)

Bunun dışında `ollama` ve `openai-native` ve `openrouter` `providers.generated.ts`'te
de var ama `builtins.ts`'te **override** ediliyor (örn. `ollama`'nın family'si
generated dosyada `openai-compatible` iken builtins'te `ollama`'ya çevriliyor,
`defaultModelId` boşaltılıyor, `modelsFactory: () => ({})` ile canlı model kataloğu
otomatik miras alınmıyor — `apps/openprovider` görev talimatındaki "ollama model
listesi canlı çekiliyor, katalogda 0 model normal" notuyla birebir uyuşuyor).

---

## 3. Adım 2 — jenerik form eksik giderme sonucu: **DOKUNULACAK BİR ŞEY YOK**

`providerSettingsRegistry.ts`'teki `FALLBACK_GENERIC_PROVIDER_NAMES`
(satır 153-169) tam içeriği okundu — 15 giriş var, hiçbiri benim 20 jenerik
provider'ımla eşleşmiyor (sadece `nousResearch` ve `nvidia` var, ikisi de zaten
birinci sınıf/bilinen, listeye ekstra eklenmesi anlamsız).

`apps/vscode/webview-ui/src/components/settings/ApiOptions.tsx:113` içindeki
karar mantığını okudum:

```ts
const isCustomProvider = !hasCustomProviderSettings(selectedProvider) && !isKnownGenericProvider(selectedProvider)
```

`isKnownGenericProvider` sadece `GENERIC_PROVIDER_PRESENTATION_OVERRIDES` veya
`FALLBACK_GENERIC_PROVIDER_NAMES`'te olan id'ler için `true` dönüyor. Benim
20 jenerik provider'ımın hiçbiri bu iki listede yok → `isCustomProvider = true`
→ hepsi **zaten** "OpenAI-compatible" custom formundan render ediliyor.

Koddaki yorum (satır 108-112) bunun bir eksiklik değil, **kasıtlı tasarım**
olduğunu açıkça yazıyor: bu form Base URL, Custom Headers, Model Configuration
ve Reasoning Effort bölümlerini garantili veriyor — `FALLBACK_GENERIC_PROVIDER_NAMES`
listesi daha *dar/küratörlü* bir jenerik form için, sadece belirli seçilmiş
provider'lara ayrılmış. Buraya benim 20 id'imden birini eklemek eksik giderme
değil, kapsam dışı bir "küratörlü listeye ekleme" olurdu — **yapılmadı.**

**Sonuç: providerSettingsRegistry.ts'te hiçbir satır eklenmedi.** Görevdeki
"jenerik formda görünmesi gerekip listede eksikse ekle" şartı bu 29 provider
için tetiklenmedi.

---

## 4. Adım 3 — `quirks.ts` iskelet eklemeleri

Dosya: `apps/openprovider/src/providers/quirks.ts`

Mevcut girişlere (`groq`, `gemini`, `cerebras`, `openrouter`, `nvidia`)
**dokunulmadı**. `openrouter` ve `nvidia` zaten benim grubumda geçiyor ama
tabloda değişiklik yapılmadı, sadece "zaten mevcut" diye işaretlendi (yukarıki
tabloda not edildi).

**Not:** Dosyayı düzenlerken, benden önce çalışan başka bir grup denetiminin
(`anyapi`, `blueclaw`, `alibaba-coding-plan`, `alibaba-coding-plan-cn`,
`alibaba-token-plan`, `alibaba-token-plan-cn`, `chutes` — hiçbiri benim 29
provider'ımda yok) zaten `QUIRKS` map'ine eklenmiş olduğu görüldü; onlara
dokunulmadı, kendi eklemelerim bunların altına eklendi.

Eklenen 5 iskelet (`quirks.ts` satır ~138 sonrası):

```ts
nebius: {
	supportsTools: true,
	note: "Sign-up credit, GLM-5.2 in the catalog, first-class in ApiProvider " +
		"union already — but no quirk ever measured against the live API.",
},
"nano-gpt": {
	supportsTools: true,
	note: "Very cheap default model (~$0.4/$2 per M tokens), 193 models — the " +
		"largest catalog in this group. Generic openai-compatible form only " +
		"(not first-class). Not tested against the live API.",
},
modelscope: {
	supportsTools: true,
	note: "Catalog price is 0, but a China-region account may be required to " +
		"actually use it — free-tier accessibility from elsewhere unconfirmed. " +
		"Not tested against the live API.",
},
ollama: {
	note: "Local/OAuth provider — no token-quota concept applies. Model list is " +
		"fetched live from the local Ollama server (/api/tags), not the static " +
		"catalog; catalog shows 0 models by design.",
},
opencode: {
	note: "Local/OAuth provider (OpenCode SDK multi-provider runtime) — no " +
		"token-quota concept applies the way it does for hosted free tiers.",
},
```

Diğer 24 provider'a (mixlayer, moark, model-oracle-ai, moonshot, moonshotai-cn,
morph, nearai, neon, neuralwatt, nousResearch, nova, novita-ai, nvidia, oca,
openai-codex, openai-codex-cli, openai-compatible, openai-native, opencode-go,
openrouter, orcarouter, ovhcloud, perplexity-agent, pioneer) **quirks.ts'te
skeleton eklenmedi** — görev talimatı sadece "nebius, nano-gpt, modelscope,
ollama/opencode" için özellikle işaret etmişti, geri kalanı için ucuz/bariz bir
gerekçe yoktu (birçoğu ya zaten birinci sınıf ve ölçüm bekliyor ya da fiyatı
sıfır değil — spekülatif not eklemek gürültü olurdu).

---

## 5. Tip kontrolü

```
cd apps/vscode && bunx tsc -b
```

Çıktı: **temiz, hata yok.** (Komut sıfır çıktı ile bitti.)

---

## 6. Kısıtlara uyum

- Network isteği atılmadı.
- Hiçbir provider için "test ettim" denmedi — hepsi 💭 (doğrulanmadı) durumda.
- Gerçek test, kullanıcının kendi key'leriyle
  [provider-test-plani.md](2026-08-01-provider-test-plani.md)'deki S0–S6
  basamaklarıyla yapılacak.
- NVIDIA'ya hiçbir satır eklenmedi/değiştirilmedi.
- Yeni `ApiProvider` union/proto/state-key eklenmedi — kapsam dışı tutuldu.
- Commit atılmadı.

---

## 7. Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `apps/openprovider/src/providers/quirks.ts` | 5 yeni skeleton giriş eklendi (`nebius`, `nano-gpt`, `modelscope`, `ollama`, `opencode`) — mevcut girişlere dokunulmadı |
| `apps/vscode/webview-ui/src/components/settings/providers/providerSettingsRegistry.ts` | **Değişmedi** — inceleme sonucu ekleme gerekmediği anlaşıldı |
| `apps/vscode/src/shared/api.ts` | **Değişmedi** — sadece doğrulama için okundu |
| `.claude/docs/2026-08-01-grup4-provider-denetimi.md` | Bu rapor (yeni) |
