# Grup 2 Provider Denetimi (29 provider)

Başlangıç: 2026-08-02 14:39:04
Bitiş: 2026-08-02 14:46:00

Kapsam: sana verilen 29 provider id'sinin envanteri + çok ucuz/bariz eksik giderme + quirks.ts iskeleti. Network isteği YAPILMADI. Hiçbir provider "test edildi" DENMEDİ — statik kod denetimi ve dosya düzenlemesi yapıldı. Gerçek test `.claude/docs/2026-08-01-provider-test-plani.md` içindeki S0-S6 adımlarıyla kullanıcının kendi API key'leriyle yapılacak.

## Önemli düzeltme — kaynak dosya konumu

`providers.generated.ts` içinde **model dizisi/fiyatlandırma yok** — o dosya sadece id/name/baseUrl/apiKeyEnv/family gibi sağlayıcı metadata'sını tutuyor. Model listesi ve fiyatlandırma ayrı bir dosyada: `sdk/packages/llms/src/catalog/catalog.generated.ts` (`GENERATED_PROVIDER_MODELS.providers[id]`). Model sayıları ve fiyat bilgileri oradan çıkarıldı.

`dify`, `doubao`, `hicap` gerçekten `providers.generated.ts`'te YOK ama üçü de `sdk/packages/llms/src/providers/builtins.ts` içinde tam tanımlı (satır 1077, 803, 748). Bu üçü models.dev kataloğundan değil, elle yazılmış "builtin" tanımlar — bu yüzden `catalog.generated.ts`'te de model girdileri yok (dify `modelsFactory: () => ({})` kullanıyor, hicap/doubao statik model listesi kullanmıyor).

## Envanter tablosu

| id | name | family | model sayısı | fiyat sinyali | ApiProvider union | jenerik formda görünür ad |
|---|---|---|---|---|---|---|
| cloudferro-sherlock | CloudFerro Sherlock | openai-compatible | 5 | ölçülmedi | yok | **eklendi** (isim yoktu) |
| cloudflare-workers-ai | Cloudflare Workers AI | openai-compatible | 13 | ölçülmedi | yok | **eklendi**; baseUrl `${CLOUDFLARE_ACCOUNT_ID}` şablon değişkeni içeriyor — jenerik formda elle girilecek |
| cortecs | Cortecs | openai-compatible | 55 | ölçülmedi | yok | **eklendi** |
| crof | CrofAI | openai-compatible | 19 | ölçülmedi | yok | **eklendi** |
| crossmodel | CrossModel | openai-compatible | 44 | ölçülmedi | yok | **eklendi** |
| daoxe | DaoXE | openai-compatible | 9 | ölçülmedi | yok | **eklendi** |
| databricks | Databricks | openai-compatible | 30 | ölçülmedi | yok | **eklendi** |
| deepseek | DeepSeek | openai-compatible | 4 | default model $0.14/$0.28 per M (ücretsiz değil) | **VAR (doğrulandı)** | zaten custom değil, first-class |
| dify | Dify | dify | model listesi yok (dinamik) | n/a | **VAR (doğrulandı)** | dedicated custom settings (CUSTOM_PROVIDER_SETTINGS_IDS) |
| digitalocean | DigitalOcean | openai-compatible | 60 | ölçülmedi | yok | **eklendi** |
| dinference | DInference | openai-compatible | 5 | ölçülmedi | yok | **eklendi** |
| doubao | Doubao | openai-compatible | (builtins.ts, models.dev'de yok) | n/a | **VAR (doğrulandı)** | zaten fallback listesinde vardı |
| drun | D.Run (China) | openai-compatible | 3 | ölçülmedi | yok | **eklendi** |
| ebcloud | EBCloud | openai-compatible | 4 | ölçülmedi | yok | **eklendi** |
| empiriolabs | EmpirioLabs AI | openai-compatible | 37 | ölçülmedi | yok | **eklendi** |
| evroc | evroc | openai-compatible | 9 | ölçülmedi | yok | **eklendi** |
| fastrouter | FastRouter | openai-compatible | 34 | ölçülmedi | yok | **eklendi** |
| fireworks | Fireworks AI | openai-compatible | 16 | ölçülmedi | yok (isim yoktu ama presentation override zaten vardı — signupUrl) | **VAR (doğrulandı)**, sadece presentation override vardı, isim eksikti — **eklendi** |
| freemodel | FreeModel | anthropic | 10 | default model (claude-fable-5) $10/$50 per M — **isme rağmen ücretsiz DEĞİL** | yok | **eklendi**; quirks EKLENMEDİ (gerçek sinyal yok) |
| friendli | Friendli | openai-compatible | 6 | ölçülmedi | yok | **eklendi** |
| frogbot | FrogBot | openai-compatible | 26 | default model (grok-4-3) $1.25/$2.5 per M — ücretsiz değil | yok | **eklendi**; quirks EKLENMEDİ |
| gemini | Google (Gemini) | google | 14 | ölçülmedi | **VAR (doğrulandı)** | zaten fallback listesinde vardı |
| github-copilot | GitHub Copilot | openai-compatible | 28 | ölçülmedi | yok | **eklendi** |
| github-models | GitHub Models | openai-compatible | **49** | **tüm 49 model $0/$0** (gerçek ücretsiz katman) | yok | **eklendi**; quirks eklendi (aşağıda) |
| gmicloud | GMI Cloud | openai-compatible | 13 | ölçülmedi | yok | **eklendi** |
| groq | Groq | openai-compatible | 7 | — | **VAR (doğrulandı)** | zaten fallback/override listesinde vardı |
| helicone | Helicone | openai-compatible | 72 | ölçülmedi | yok | **eklendi** |
| hicap | HiCap | openai-compatible | model listesi yok (builtins.ts, sabit `hicap-pro`) | n/a | **VAR (doğrulandı, sürpriz)** | dedicated custom settings (CUSTOM_PROVIDER_SETTINGS_IDS) |
| hpc-ai | HPC-AI | openai-compatible | 9 | ölçülmedi | yok | **eklendi** |

**Sürpriz:** `hicap` sadece jenerik değil, aynı zamanda `ApiProvider` union'ında VE `CUSTOM_PROVIDER_SETTINGS_IDS`'te — yani birinci sınıf/özel bir ayarlar formu var. Görevde "6 tanesi first-class" deniyordu (deepseek, doubao, gemini, dify, groq, fireworks) ama gerçekte **7 tanesi** first-class: bunlara `hicap` da ekleniyor.

## Jenerik form davranışı hakkında bulgu

`isKnownGenericProvider()` fonksiyonu `FALLBACK_GENERIC_PROVIDER_NAMES` veya `GENERIC_PROVIDER_PRESENTATION_OVERRIDES` listesinde olmayan bir id için `false` döner ve `ApiOptions.tsx`'te `isCustomProvider = true` olur — bu da provider'ı ham OpenAI-compatible formuna düşürür. AMA `getGenericProviderSettings()` fonksiyonu, canlı katalog listing'i (`ProviderListing`) mevcutsa ve `protocol` alanı `openai-chat`/`anthropic`/`gemini`/`openai-responses`'tan biriyse, statik listelere bakmadan `listing.name`'i kullanarak jenerik formu doğru isimle üretebiliyor. `providers.generated.ts`'teki `family: "openai-compatible"` → SDK'da `inferProtocol()` (`builtins.ts:480`) tarafından `protocol: "openai-chat"`'e çevriliyor — yani bu grubun 29 provider'ının 26'sı (deepseek/doubao/gemini/dify/groq/fireworks/hicap first-class hariç) zaten canlı katalog listing'i geldiğinde doğru isimle görünüyor olmalıydı.

Statik fallback isimlerini yine de ekledim çünkü kod tabanında zaten yerleşik bir örüntü var: `providerSettingsRegistry.ts` içinde "Grup 5" ve "Grup 6" adlı önceki denetim turları aynı sebepten (katalog listing'i async geldiği için ilk render'da boş dizi olması, formun kısa süre yanlış göründüğü riski) aynı tarz fallback girdileri eklemiş. Ben de aynı deseni izleyip "Grup 2" bloğu ekledim.

## Yapılan kod değişiklikleri

1. `apps/vscode/webview-ui/src/components/settings/providers/providerSettingsRegistry.ts` — `FALLBACK_GENERIC_PROVIDER_NAMES` objesine "Grup 2 provider audit (2026-08-02)" başlıklı 22 satırlık blok eklendi (satır ~220 civarı, dosya sonuna doğru, mevcut "Grup 6" bloğunun hemen ardından): cloudferro-sherlock, cloudflare-workers-ai, cortecs, crof, crossmodel, daoxe, databricks, digitalocean, dinference, drun, ebcloud, empiriolabs, evroc, fastrouter, freemodel, friendli, frogbot, github-copilot, github-models, gmicloud, helicone, hpc-ai. (fireworks için isim de eklendi çünkü sadece presentation override'ı vardı, ismi yoktu.)
   - Mevcut girdilere DOKUNULMADI, hiçbiri silinmedi/değiştirilmedi.
2. `apps/openprovider/src/providers/quirks.ts` — dosya sonuna "Faz 8, grup 2 denetimi (2026-08-02)" başlıklı yeni blok eklendi (mevcut `QUIRKS` objesinin son iki girdisi olarak, kapanış `};`'den hemen önce):
   - `github-models`: `supportsTools: true`, not: tüm 49 model $0 fiyatlı gerçek ücretsiz katman, varsayılan model `deepseek/deepseek-r1-0528` reasoning modeli — Groq'ta görülen "reasoning_content alanının API tarafından reddedilmesi" riskine benzer bir risk olabileceği açıkça belirtildi. `measuredOn` YOK.
   - `deepseek`: `supportsTools: true`, not: first-class ama quirk girdisi yoktu, varsayılan model (`deepseek-v4-flash`) ücretsiz değil ama DeepSeek'in kendi `deepseek-reasoner` modelinin reasoning_content riski taşıdığı belirtildi. `measuredOn` YOK.
   - Mevcut `groq`, `gemini`, `cerebras`, `openrouter`, `nvidia` ve önceki fazların tüm girdilerine DOKUNULMADI.
   - `freemodel` ve `frogbot` için quirk EKLENMEDİ — isimleri "free/free-ish" çağrıştırsa da gerçek katalog fiyatı sırasıyla $10/$50 ve $1.25/$2.5 per M token, yani ücretsiz sinyali yok; raporda not düşüldü, uydurma yapılmadı.

## Tip kontrolü sonucu

- `cd apps/vscode && bunx tsc -b` → çıktısız, exit 0. `--force` ile incremental cache bypass edilerek tekrar çalıştırıldı, yine exit 0 (gerçek build, no-op değil).
- `cd apps/openprovider && bunx tsc --noEmit -p tsconfig.json` → exit 0 (quirks.ts ayrı bir proje olduğu için ayrıca kontrol edildi).
- Hata YOK.

## Yapılmayanlar (bilinçli, kapsam dışı)

- Hiçbir provider `ApiProvider` union'ına eklenmedi.
- Hiçbir proto alanı (`ModelsApiSecrets`/`ModelsApiOptions`/`ModelsApiConfiguration`/`state.proto`) değiştirilmedi.
- Hiçbir state-key eklenmedi.
- `cline-session-factory.ts`, `api-configuration-conversion.ts` dosyalarına dokunulmadı.
- Commit atılmadı.

## Sonraki adım (kullanıcı için)

Gerçek doğrulama (rate limit, tool-loop desteği, reasoning_content reddi riski) `.claude/docs/2026-08-01-provider-test-plani.md`'deki S0-S6 adımlarıyla, kullanıcının kendi API key'leriyle yapılmalı — özellikle `github-models` (ücretsiz + reasoning default) ve `deepseek-reasoner` seçilirse.
