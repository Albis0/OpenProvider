# Grup 5 Sağlayıcı Denetimi

**Başlangıç:** 2026-08-01 (bu oturum)
**Bitiş:** 2026-08-02

---

## Kapsam

Görevle verilen 29 sağlayıcı, dışına çıkılmadı:

`poe` `poolside` `privatemode-ai` `qihang-ai` `qiniu-ai` `qwen` `qwen-code`
`regolo-ai` `requesty` `routing-run` `sakana` `sambanova` `sapaicore` `sarvam`
`scaleway` `siliconflow` `siliconflow-cn` `snowflake-cortex` `stackit`
`stepfun` `stepfun-ai` `stepfun-ai-step-plan` `stepfun-step-plan`
`subconscious` `submodel` `synthetic` `tencent-coding-plan`
`tencent-token-plan` `tencent-tokenhub`

**Not:** `stepfun-ai` görevde iki kez geçiyordu (`stepfun-ai` hem tek başına
hem `stepfun-ai-step-plan`/`stepfun-step-plan` ile birlikte); envanterde 3
ayrı id (`stepfun`, `stepfun-ai`, `stepfun-ai-step-plan`, `stepfun-step-plan`
— toplam 4) olduğu doğrulandı, hepsi ayrı ayrı işlendi.

**Network isteği atılmadı. Hiçbir sağlayıcı "test edildi" olarak işaretlenmedi.**
Gerçek test `.claude/docs/2026-08-01-provider-test-plani.md`'deki S0-S6
merdiveniyle kullanıcının kendi key'leriyle yapılacak.

---

## Adım 1 — Envanter

Veri kaynağı: `sdk/packages/llms/src/providers/providers.generated.ts` (26
sağlayıcı JSON'dan okundu) + `apps/vscode/src/shared/api.ts` (`ApiProvider`
union, 7 sağlayıcı) + `apps/vscode/src/sdk/model-catalog/provider-id.ts`
(`KNOWN_API_PROVIDERS` doğrulaması) + mevcut
`.claude/docs/provider-envanteri.md` (fiyat/model sayısı çapraz kontrolü).

| id | Birinci-sınıf mi | Fiyat ($/1M in/out) | Model sayısı | Base URL | Not |
|---|:---:|---|---:|---|---|
| `poe` | ⬜ jenerik | 4.29 / 21.46 | 124 | api.poe.com/v1 | Ücretli |
| `poolside` | ✅ | 0 / 0 (katalogda) | 3 | inference.poolside.ai/v1 | `ApiProvider` union'da (api.ts:37), `FALLBACK_GENERIC_PROVIDER_NAMES`'te de var (satır 162) — çelişkili değil, custom form + fallback aynı anda tanımlı olabilir çünkü `hasCustomProviderSettings("poolside")` **false** (poolside `CUSTOM_PROVIDER_SETTINGS_IDS` setinde değil, sadece `ApiProvider` union'da) |
| `privatemode-ai` | ⬜ jenerik | 0 / 0 (katalogda) | 2 | localhost:8080/v1 (yerel proxy) | Katalog fiyatı 0, muhtemelen self-host proxy modeli |
| `qihang-ai` | ⬜ jenerik | 0.09 / 0.71 | 9 | api.qhaigc.net/v1 | Ücretli, ucuz |
| `qiniu-ai` | ⬜ jenerik | 0 / 0 (katalogda) | 81 | api.qnaigc.com/v1 | Grubun en kalabalık listesi, fiyat 0 ama **doğrulanmadı** (bkz. test planı bölüm 1), arayüz Çince olabilir |
| `qwen` | ✅ | ? (canlı çekim) | 1 (katalogda) | — (SDK üzerinden bölgeye göre) | `qwenApiLine` alanı VAR — `QwenProvider.tsx`'te doğrulandı, ekstra bölge seçimi (China/International) gerektiriyor, jenerik formda DEĞİL |
| `qwen-code` | ✅ | ? | 1 | — | `qwen` ile aynı custom form ailesini paylaşıyor (`qwenApiLine`) |
| `regolo-ai` | ⬜ jenerik | 0.75 / 3 | 10 | api.regolo.ai/v1 | Ücretli |
| `requesty` | ✅ | 2.5 / 15 | 37 | router.requesty.ai/v1 | `ApiProvider` union'da (api.ts:16) + `CUSTOM_PROVIDER_SETTINGS_IDS`'te (registry.ts:30) — tam custom form |
| `routing-run` | ⬜ jenerik | 0.7 / 4.2 | 15 | api.routing.run/v1 | Ücretli |
| `sakana` | ⬜ jenerik | 0 / 0 (katalogda) | 3 | api.sakana.ai/v1 | Küçük katalog, fiyat 0 ama doğrulanmadı |
| `sambanova` | ✅ | ? | **0** | api.sambanova.ai/v1 | `ApiProvider` union'da (api.ts:32) + `KNOWN_API_PROVIDERS`'ta (provider-id.ts:40). **Katalogda 0 model — canlı çekilmiyor, model id elle yazılmalı.** Bilinen ücretsiz katmanı var ama bu bir hata değil, doğrulanmış davranış (T6, test planı) |
| `sapaicore` | ✅ | ? | 31 | — (SAP AI Core, `AICORE_SERVICE_KEY`) | `ApiProvider` union'da (api.ts:34) + `CUSTOM_PROVIDER_SETTINGS_IDS`'te (registry.ts:31) — tam custom form |
| `sarvam` | ⬜ jenerik | 0 / 0 (katalogda) | 2 | api.sarvam.ai/v1 | Küçük katalog |
| `scaleway` | ⬜ jenerik | 1.8 / 5.5 | 13 | api.scaleway.ai/v1 | Ücretli |
| `siliconflow` | ⬜ jenerik | 1.4 / 4.4 | 49 | api.siliconflow.com/v1 | Düşük fiyat, test edilmeye değer |
| `siliconflow-cn` | ⬜ jenerik | 1.4 / 4.4 | 45 | api.siliconflow.cn/v1 | siliconflow'un Çin aynası, aynı fiyat |
| `snowflake-cortex` | ⬜ jenerik | 0 / 0 (katalogda) | 21 | `${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com/...` | Base URL şablonlu (T5 tuzağı), fiyat 0 görünüyor ama kurumsal platform — muhtemelen gerçek Snowflake hesabı gerekiyor |
| `stackit` | ⬜ jenerik | 0.53 / 0.76 | 5 | api.openai-compat.model-serving.eu01.onstackit.cloud/v1 | Ücretli |
| `stepfun` | ⬜ jenerik | 0.185 / 1.11 | 5 | api.stepfun.com/v1 | China bölgesi |
| `stepfun-ai` | ⬜ jenerik | 0.185 / 1.11 | 5 | api.stepfun.ai/v1 | Global bölge |
| `stepfun-ai-step-plan` | ⬜ jenerik | 0 / 0 (abonelik) | 3 | api.stepfun.ai/step_plan/v1 | `-plan` ile bitiyor, abonelik paketi, ekstra iş yapılmadı |
| `stepfun-step-plan` | ⬜ jenerik | 0 / 0 (abonelik) | 4 | api.stepfun.com/step_plan/v1 | `-plan` ile bitiyor, abonelik paketi, ekstra iş yapılmadı |
| `subconscious` | ⬜ jenerik | 1.4 / 4.4 | 2 | api.subconscious.dev/v1 | `family: "anthropic"` — jenerik formda protokolü `anthropic`, diğerleri `openai-compatible` |
| `submodel` | ⬜ jenerik | 0.5 / 2.15 | 9 | llm.submodel.ai/v1 | Ücretli |
| `synthetic` | ⬜ jenerik | 1.4 / 4.4 | 7 | api.synthetic.new/openai/v1 | Ücretli |
| `tencent-coding-plan` | ⬜ jenerik | 0 / 0 (abonelik) | 8 | api.lkeap.cloud.tencent.com/coding/v3 | `-plan` ile bitiyor, abonelik paketi, ekstra iş yapılmadı |
| `tencent-token-plan` | ⬜ jenerik | 0 / 0 (abonelik) | 1 | api.lkeap.cloud.tencent.com/plan/v3 | `-plan` ile bitiyor, abonelik paketi, ekstra iş yapılmadı |
| `tencent-tokenhub` | ✅ | 0 / 0 (katalogda) | 2 | tokenhub.tencentmaas.com/v1 | `ApiProvider` union'da (api.ts:53), `FALLBACK_GENERIC_PROVIDER_NAMES`'te de var (satır 167) ve `GENERIC_PROVIDER_PRESENTATION_OVERRIDES`'ta signupUrl var (satır 103-105) |

**Doğrulanan 7 birinci-sınıf sağlayıcı:** `poolside`, `qwen`, `qwen-code`,
`requesty`, `sambanova`, `sapaicore`, `tencent-tokenhub` — hepsi
`apps/vscode/src/shared/api.ts:5-53`'teki `ApiProvider` union'ında bulundu,
görevde verilen liste ile birebir eşleşti.

**`qwen`/`qwen-code` özel alanı:** Görev metnindeki `apiLine` isim tahmini
kısmen doğruydu — gerçek alan adı `qwenApiLine`
(`apps/vscode/webview-ui/src/components/settings/providers/QwenProvider.tsx:63`),
"China API" / "International API" seçimi sunuyor. Bu iki sağlayıcı
`CUSTOM_PROVIDER_SETTINGS_IDS` setinde
(`providerSettingsRegistry.ts:28-29`) — jenerik formda değiller, doğrulandı.

**`sambanova` 0 model:** `providers.generated.ts` ve `builtins.ts`'te
`sambanova` girdisi hiç yok — SDK model listesini bu sağlayıcı için hiç
üretmiyor. `provider-envanteri.md` satır 196'da model sayısı 0 olarak
doğrulandı. Bu bir hata değil; model id elle girilecek (test planı Grup A
satır 16, T6).

---

## Adım 2 — Ucuz eksik giderme

`FALLBACK_GENERIC_PROVIDER_NAMES`
(`apps/vscode/webview-ui/src/components/settings/providers/providerSettingsRegistry.ts:153-197`)
tablosunda gruptaki 22 jenerik sağlayıcının hiçbiri yoktu. Bunun etkisi:
`useProviderListings()` hook'u başlangıçta boş dizi döndürüyor
(`useProviderListings.ts:7`), yani gRPC çağrısı bitene kadar
`catalogProviderListing` `undefined` — bu süre boyunca fallback'te olmayan
her jenerik sağlayıcı, kısa süreliğine yanlış forma (ham OpenAI-compatible
custom form) düşüyor (`ApiOptions.tsx:113-117`).

**Eklenen 22 satır**
(`providerSettingsRegistry.ts:169-197`, "Grup 5 provider audit" yorumuyla
işaretli): `poe`, `privatemode-ai`, `qihang-ai`, `qiniu-ai`, `regolo-ai`,
`routing-run`, `sakana`, `sarvam`, `scaleway`, `siliconflow`,
`siliconflow-cn`, `snowflake-cortex`, `stackit`, `stepfun`, `stepfun-ai`,
`stepfun-ai-step-plan`, `stepfun-step-plan`, `subconscious`, `submodel`,
`synthetic`, `tencent-coding-plan`, `tencent-token-plan`.

Eklenmedi (görev kapsamı dışı bırakıldı): `poolside`, `qwen`, `qwen-code`,
`requesty`, `sambanova`, `sapaicore`, `tencent-tokenhub` — bunlar zaten
birinci-sınıf/custom, fallback tablosuna girmelerine gerek yok
(`poolside`/`tencent-tokenhub` zaten oradaydı, dokunulmadı).

Yeni `ApiProvider` union üyesi, proto mesajı veya state-key EKLENMEDİ —
kapsam dışı bırakıldı, görev talimatına uyuldu.

`-plan` ile biten 4 sağlayıcı (`tencent-coding-plan`, `tencent-token-plan`,
`stepfun-ai-step-plan`, `stepfun-step-plan`) sadece envanterde işaretlendi,
ekstra iş yapılmadı — fallback isim girişi dışında (bu jenerik formun kendisi
zaten yeterli, görev talimatına uygun).

---

## Adım 3 — quirks.ts iskeleti

Dosya: `apps/openprovider/src/providers/quirks.ts`. Mevcut girişlere
(`groq`, `gemini`, `cerebras`, `openrouter`, `nvidia`) ve paralel çalışan
diğer grupların eklediği bloklara (Faz 8 grup 1/3/4) dokunulmadı — sadece
dosyanın sonuna "Faz 8, grup 5 denetimi" bloğu eklendi (satır ~226-267).

Eklenen 5 iskelet (hepsi `measuredOn` alanı YOK, çünkü hiçbiri test
edilmedi):

| id | supportsTools | Not özeti |
|---|:---:|---|
| `siliconflow` | true | $1.4/$4.4 ucuz fiyat, test edilmeye değer |
| `siliconflow-cn` | true | siliconflow'un Çin aynası |
| `qiniu-ai` | true | Fiyat 0, 81 model, arayüz Çince olabilir, ücretsizliği doğrulanmadı |
| `snowflake-cortex` | true | Fiyat 0 görünüyor ama kurumsal hesap gerekebilir, base URL şablonlu |
| `sambanova` | true | Bilinen ücretsiz katman var ama katalogda 0 model, id elle girilmeli |

Diğer 24 sağlayıcı (`poe`, `poolside`, `privatemode-ai`, `qihang-ai`, `qwen`,
`qwen-code`, `regolo-ai`, `requesty`, `routing-run`, `sakana`, `sapaicore`,
`sarvam`, `scaleway`, `stackit`, `stepfun`, `stepfun-ai`,
`stepfun-ai-step-plan`, `stepfun-step-plan`, `subconscious`, `submodel`,
`synthetic`, `tencent-coding-plan`, `tencent-token-plan`,
`tencent-tokenhub`) için quirks girişi eklenmedi — hiçbiri görev metninde
"bedava/ucuz olabilecek" olarak özellikle işaretlenmemişti ve fiyatları ya
paralı ya da abonelik paketi.

---

## Adım 4 — Tip kontrolü

```
cd apps/vscode && bunx tsc -b
```

Çıktı: **temiz, hata yok** (komut sıfır çıktıyla, hatasız tamamlandı).

---

## Değiştirilen dosyalar

- `apps/vscode/webview-ui/src/components/settings/providers/providerSettingsRegistry.ts` — `FALLBACK_GENERIC_PROVIDER_NAMES`'e 22 satır eklendi (satır 169-197)
- `apps/openprovider/src/providers/quirks.ts` — `QUIRKS` tablosunun sonuna 5 girişlik "Faz 8, grup 5" bloğu eklendi

Commit atılmadı (görev talimatı gereği).
