# Grup 3 — 30 Provider Denetimi (huawei-cloud-maas → mistral)

- Başlangıç: 2026-08-02 14:38
- Bitiş: 2026-08-02 15:10
- Kapsam: CLAUDE.md'de tanımlı "Grup 3" — 30 provider id, aşağıdaki liste.
- **Network isteği atılmadı. Hiçbir provider'a karşı "test edildi" iddiası yoktur.**
  Gerçek canlı test `.claude/docs/2026-08-01-provider-test-plani.md`'deki S0–S6
  adımlarıyla, kullanıcının kendi API key'leriyle ayrıca yapılacak.

## Adım 1 — Envanter

Kaynak dosyalar:
- `sdk/packages/llms/src/providers/providers.generated.ts` (models.dev'den otomatik üretilir, elle düzenlenmez)
- `sdk/packages/llms/src/providers/builtins.ts` (`BUILTIN_SPEC_OVERRIDES` — generated'i id bazında override eder)
- Model verisi: `sdk/packages/llms/src/catalog/catalog.generated.ts`

| id | ad | baseUrl | defaultModelId | protokol | apiKeyEnv | model sayısı | dosya:satır |
|---|---|---|---|---|---|---|---|
| huawei-cloud-maas | Huawei Cloud MaaS | infer-modelarts.cn-southwest-2.myhuaweicloud.com/v1 | DeepSeek-R1 | openai-compatible | HUAWEI_CLOUD_MAAS_API_KEY | 0 statik (modelsProviderId yok) | builtins.ts:767-776 |
| huggingface | Hugging Face | router.huggingface.co/v1 | zai-org/GLM-5.2 | openai-compatible | HF_TOKEN | 49 | providers.generated.ts:1033-1050 |
| iflowcn | iFlow | apis.iflow.cn/v1 | kimi-k2-0905 | openai-compatible | IFLOW_API_KEY | 14 | providers.generated.ts:1053-1069 |
| inception | Inception | api.inceptionlabs.ai/v1 | mercury-2 | openai-compatible | INCEPTION_API_KEY | 1 | providers.generated.ts:1072-1089 |
| inceptron | Inceptron | api.inceptron.io/v1 | zai-org/GLM-5.2 | openai-compatible | INCEPTRON_API_KEY | 6 | providers.generated.ts:1092-1109 |
| inference | Inference | inference.net/v1 | google/gemma-3 | openai-compatible | INFERENCE_API_KEY | 8 | providers.generated.ts:1112-1127 |
| inferx | InferX | model.inferx.net/endpoints/v1 | qwen/qwen3.6-27b-fp8 | openai-compatible | INFERX_API_KEY | 6 | providers.generated.ts:1130-1146 |
| io-net | IO.NET | api.intelligence.io.solutions/api/v1 | Qwen3-235B-A22B-Thinking-2507 | openai-compatible | IOINTELLIGENCE_API_KEY | 17 | providers.generated.ts:1149-1166 |
| jiekou | Jiekou.AI | api.jiekou.ai/openai | claude-opus-4-6 | openai-compatible | JIEKOU_API_KEY | 58 | providers.generated.ts:1169-1185 |
| kenari | Kenari | kenari.id/v1 | glm-5-2 | openai-compatible | KENARI_API_KEY | 22 | providers.generated.ts:1188-1204 |
| kilo | Kilo Gateway | api.kilo.ai/api/gateway | gpt-4o (override) | openai-responses (override) | KILO_GATEWAY_API_KEY (override) | 260 (generated modelsProviderId) | **override**: builtins.ts:838-848; generated: providers.generated.ts:1207-1224 |
| kimi-for-coding | Kimi For Coding | api.kimi.com/coding/v1 | k3 | anthropic | KIMI_API_KEY | 3 | providers.generated.ts:1227-1244 |
| kuae-cloud-coding-plan | KUAE Cloud Coding Plan | coding-plan-endpoint.kuaecloud.net/v1 | GLM-4.7 | openai-compatible | KUAE_API_KEY | 1 | providers.generated.ts:1246-1263 |
| lilac | Lilac | api.getlilac.com/v1 | zai-org/glm-5.2 | openai-compatible | LILAC_API_KEY | 4 | providers.generated.ts:1265-1282 |
| litellm | LiteLLM | localhost:4000/v1 | gpt-5.4 | openai-responses | LITELLM_API_KEY | 0 (proxy, model kullanıcı tanımlı) | builtins.ts:701-711 (sadece burada var) |
| llama | Llama | api.llama.com/compat/v1 | cerebras-llama-4-maverick-17b-128e-instruct | openai-compatible | LLAMA_API_KEY | 7 | providers.generated.ts:1285-1300 |
| llmgateway | LLM Gateway | api.llmgateway.io/v1 | kimi-k3 | openai-compatible | LLMGATEWAY_API_KEY | 150 | providers.generated.ts:1303-1320 |
| llmtr | LLMTR | llmtr.com/v1 | qwen3-6-35b | openai-compatible | LLMTR_API_KEY | 1 | providers.generated.ts:1323-1339 |
| lmstudio | LM Studio | localhost:1234/v1 (override) | "" (override, boş) | openai-compatible | LMSTUDIO_API_KEY | canlı çekiliyor, katalogda 3 (hata değil) | **override**: builtins.ts:896-903; generated: providers.generated.ts:1342-1358 |
| longcat | LongCat | api.longcat.chat/openai | LongCat-2.0 | openai-compatible | LONGCAT_API_KEY | 1 | providers.generated.ts:1361-1378 |
| lucidquery | LucidQuery | api.lucidquery.com/v1 | lucidquery-agi-01-frontier | openai-compatible | LUCIDQUERY_API_KEY | 4 | providers.generated.ts:1381-1397 |
| lynkr | Lynkr | 127.0.0.1:8081/v1 | lynkr-auto | openai-compatible | LYNKR_API_KEY | 1 | providers.generated.ts:1400-1415 |
| meganova | Meganova | api.meganova.ai/v1 | MiniMaxAI/MiniMax-M2.5 | openai-compatible | MEGANOVA_API_KEY | 18 | providers.generated.ts:1418-1434 |
| meta | Meta | api.meta.ai/v1 | muse-spark-1.1 | openai | META_MODEL_API_KEY | 1 | providers.generated.ts:1437-1454 |
| minimax | MiniMax | api.minimax.io/anthropic/v1 (override) | MiniMax-M2.5 (override) | anthropic | MINIMAX_API_KEY | 7 | **override**: builtins.ts:1053-1064; generated: providers.generated.ts:1457-1475 |
| minimax-cn | MiniMax (minimaxi.com) | api.minimaxi.com/anthropic/v1 | MiniMax-M3 | anthropic | MINIMAX_API_KEY | 7 | providers.generated.ts:1477-1495 |
| minimax-cn-coding-plan | MiniMax Token Plan (minimaxi.com) | api.minimaxi.com/anthropic/v1 | MiniMax-M3 | anthropic | MINIMAX_API_KEY | 7 | providers.generated.ts:1497-1514 |
| minimax-coding-plan | MiniMax Token Plan (minimax.io) | api.minimax.io/anthropic/v1 | MiniMax-M3 | anthropic | MINIMAX_API_KEY | 7 | providers.generated.ts:1516-1533 |
| mistral | Mistral | api.mistral.ai/v1 (override baseUrl) | mistral-medium-2604 (generated) | mistral (generated family) | MISTRAL_API_KEY (generated) | 3 (modelsProviderId: mistral) | **override (sadece baseUrl)**: builtins.ts:1049-1052; generated: providers.generated.ts:1535-1548 |

Not: `kilo`, `lmstudio`, `mistral`, `minimax` hem generated hem builtins'te var;
`mergeBuiltinSpecs` id bazında alan-seviyesinde merge yapıyor (builtins.ts:312-329),
override'ta olmayan alanlar generated'tan geliyor. `litellm` ve
`huawei-cloud-maas` sadece builtins.ts'te tanımlı, generated karşılığı yok.

## ApiProvider union doğrulaması (`apps/vscode/src/shared/api.ts`, satır 4-54)

Zaten birinci sınıf olduğu bilinenler doğrulandı — **hepsi mevcut**:
`huawei-cloud-maas`, `huggingface`, `litellm`, `lmstudio`, `minimax`, `mistral`.

Kalan 24 id (`iflowcn` ... `minimax-coding-plan`, `kilo`, `llama`, `meta` dahil)
union'da **yok** — beklenen durum, jenerik formdan çalışıyorlar. Dokunulmadı.

## Adım 2 — Jenerik form eksik kontrolü

`apps/vscode/webview-ui/src/components/settings/providers/providerSettingsRegistry.ts`
içinde üç ayrı "bilinen provider" yapısı var:

1. `CUSTOM_PROVIDER_SETTINGS_IDS` (satır 9-36) — `litellm`, `lmstudio` burada.
2. `GENERIC_PROVIDER_PRESENTATION_OVERRIDES` (satır 38-107) — `huggingface`
   (64-66), `huawei-cloud-maas` (67-69), `minimax` (70-76), `mistral` (77-79)
   burada.
3. `FALLBACK_GENERIC_PROVIDER_NAMES` (satır 153-169) — `huawei-cloud-maas`,
   `minimax`, `mistral` burada.

**`FALLBACK_GENERIC_PROVIDER_NAMES` sadece `listing` yokken (katalogdan isim
gelmiyorsa) devreye giriyor** (`getFallbackGenericProviderSettings`, satır
171-185). Kalan 27 provider'ın hepsi SDK katalogunda gerçek bir `name` alanına
sahip (Adım 1 tablosuna bakınız — hiçbiri isimsiz değil), yani
`getGenericProviderSettings` (satır 135-151, `listing.name` kullanıyor) zaten
doğru ismi gösteriyor. **Eklenecek "bariz/ucuz eksik" yok** — CLAUDE.md'deki
"jenerik formda görünmesi gerekip ... eksikse" koşulu bu 27 provider için
sağlanmıyor. Dosyaya dokunulmadı.

## Adım 3 — quirks.ts iskeleti

Dosya: `apps/openprovider/src/providers/quirks.ts`, satır 137-172 (yeni blok,
"Faz 8, grup 3 denetimi" başlığı altında, önceki gruplardan sonra eklendi).
Mevcut girişlere (groq, gemini, cerebras, openrouter, nvidia, önceki fazların
grup 1/4 girişleri) dokunulmadı.

Eklenenler (5 giriş):

| id | supportsTools | not özeti |
|---|---|---|
| huggingface | true | Aylık ücretsiz kredi, 49 model, test edilmedi |
| llama | true | Meta'nın birinci taraf API'si, önizleme dönemleri bedava olabilir, test edilmedi |
| mistral | true | Ücretsiz katman (La Plateforme) + codestral kod modeli, daha önce quirks.ts'te yoktu, eklendi |
| litellm | (belirtilmedi) | Proxy — arkasındaki modele bağlı, quirk kendi başına anlamsız |
| lmstudio | (belirtilmedi) | Yerel proxy — aynı sebep, model listesi canlı çekiliyor |

Diğer 25 provider'a (iflowcn, inception, inceptron, inference, inferx, io-net,
jiekou, kenari, kilo, kimi-for-coding, kuae-cloud-coding-plan, lilac,
llmgateway, llmtr, longcat, lucidquery, lynkr, meganova, meta, minimax,
minimax-cn, minimax-cn-coding-plan, minimax-coding-plan, huawei-cloud-maas)
quirks.ts'te giriş eklenmedi — CLAUDE.md talimatı "bedava/ucuz olabilecekler"
için özellikle huggingface/llama/mistral/litellm/lmstudio'yu işaret etti;
diğerleri fiyat/ücretsizlik sinyali net olmadığından veya zaten `-coding-plan`
abonelik paketi (kimi-for-coding, minimax-cn-coding-plan, minimax-coding-plan,
kuae-cloud-coding-plan — bunlar jenerik/mevcut haliyle yeterli, ekstra iş
yapılmadı) olduklarından kapsam dışı bırakıldı.

## Coding-plan / abonelik varyantları (işaretleme amaçlı, ek iş yok)

- `kimi-for-coding` — anthropic, k3, KIMI_API_KEY — providers.generated.ts:1227-1244
- `kuae-cloud-coding-plan` — openai-compatible, GLM-4.7, KUAE_API_KEY — providers.generated.ts:1246-1263
- `minimax-cn-coding-plan` — anthropic, MiniMax-M3, MINIMAX_API_KEY — providers.generated.ts:1497-1514
- `minimax-coding-plan` — anthropic, MiniMax-M3, MINIMAX_API_KEY — providers.generated.ts:1516-1533

Dördü de jenerik formdan çalışıyor, ApiProvider union'da yok, ekstra iş
yapılmadı (talimat gereği).

## Değiştirilen dosyalar

- `apps/openprovider/src/providers/quirks.ts` — 5 yeni iskelet giriş eklendi
  (huggingface, llama, mistral, litellm, lmstudio). Mevcut girişlere
  dokunulmadı.

Başka hiçbir dosya değiştirilmedi. `providerSettingsRegistry.ts`,
`api.ts`, proto dosyaları, `cline-session-factory.ts` vb. — hepsi sadece
okundu/doğrulandı, düzenlenmedi.

## Tip kontrolü

```
cd apps/vscode && bunx tsc -b
```

Çıktı yok (sessiz başarı) — hata yok. `--noEmit` webview solution-style projede
sessiz no-op olduğundan bu, mevcut derleme yapılandırmasıyla tutarlı beklenen
sonuç.

## Doğrulanmayan / test edilmeyen

Hiçbir provider'a canlı istek atılmadı. "Ücretsiz", "bedava kredi" gibi
ifadeler quirks.ts notlarında **iddia** olarak işaretli, doğrulanmış ölçüm
değil (`measuredOn` alanı bilerek boş bırakıldı). Gerçek doğrulama kullanıcının
kendi API key'leriyle `.claude/docs/2026-08-01-provider-test-plani.md`'deki
S0-S6 adımlarıyla yapılacak.
