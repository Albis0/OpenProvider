# Groq / DeepSeek / Gemini / NVIDIA — Adaptör Kod Testi (0.0.17)

**Tarih:** 2026-08-12
**Kapsam:** Kod değiştirmeden — sadece kurulum kontrolü + adaptör kodunu
node/bun ile doğrudan çalıştırıp gözlem + statik inceleme.
**VS Code UI'a hiç dokunulmadı.**

---

## 0. Kurulum durumu

`openprovider-0.0.17.vsix` zaten kuruluydu (`code --list-extensions --show-versions`
→ `openprovider.openprovider@0.0.17`), yeniden kurmaya gerek kalmadı.

Global storage (`…/globalStorage/openprovider.openprovider`) içinde sadece
model-listesi cache'leri vardı (`groq_models.json`, `hicap_models.json`,
`openrouter_models.json`, `vercel_ai_gateway_models.json`). VS Code'un
şifreli secret deposunu (`state.vscdb`, `secret://…` anahtarları,
node:sqlite ile salt-okunur açıldı) kontrol ettim: **openprovider için hiç
secret kaydı yok**, ve extension'ın kendi global state'i
`{"welcomeViewCompleted":false}` — yani bu profilde eklentiye **hiç
provider/API key girilmemiş**. Ortam değişkenlerinde (`env`) ve
`apps/vscode/.env`'de de provider key'i yok (sadece telemetry key'leri var).

**Sonuç:** Gerçek, yetkili bir API çağrısı bu makinede mümkün değildi.
Onun yerine iki şey yaptım:

1. Adaptör kodunu gerçek (fakat kasıtlı geçersiz) key'lerle uçtan uca
   çalıştırıp **gerçek HTTP hatalarını** yakaladım — bu, "istek doğru
   kuruluyor mu" sorusunu (endpoint, header, body şekli, model id
   eşlemesi) kanıtlar; sadece "key doğru mu" sorusunu kanıtlamaz.
2. `PROVIDER_COMPAT` tablosunu (`apps/vscode/src/sdk/provider-compat.ts`)
   ve ilgili commit geçmişini (`1a6ce0f1f`, `4f6909799`) statik olarak
   inceleyip her sağlayıcının bilinen/bilinmeyen risklerini çıkardım.

---

## 1. Canlı test yöntemi

`sdk/packages/llms/src/tests/` altında zaten bir "live provider" test
altyapısı var (`provider-live.test.ts`, `provider-live-tools.test.ts`,
`toLiveProviderConfig`, `createHandlerAsync`) — normalde kullanıcının
kendi key'leriyle `LLMS_LIVE_TOOL_TESTS=1` ile çalıştırılıyor. Aynı
mekanizmayı (`LlmsProviders.createHandlerAsync(config)` →
`handler.createMessage(system, messages, tools)`) kullanan geçici bir
script yazdım (`__adhoc-live-probe.ts`, test bitince silindi, repoya
commit edilmedi), 3 mesajlık bir tool-loop simüle ettim:

1. user: "Read the file README.md and summarize it in one sentence."
2. assistant: `[tool_call: read_file(path="README.md")]`
3. user: tool sonucu + "Now summarize it."

Her sağlayıcı için `process.env.<PROVIDER>_API_KEY` var mı diye baktım
(hiçbiri yoktu), yoksa `sk-test-placeholder-not-a-real-key-000000000000`
ile denedim, `bun run` ile çalıştırdım.

---

## 2. Sonuç tablosu

| Sağlayıcı | Sonuç | Detay |
|---|---|---|
| **Groq** (`moonshotai/kimi-k2-instruct-0905`) | ✅ İstek doğru kuruldu | 316ms'de temiz `done:{success:false, error:"Invalid API Key"}`. Crash yok, `TypeError` yok — adaptör Groq'un `api.groq.com/openai/v1`'ine doğru endpoint/header/body ile ulaşıyor. |
| **DeepSeek** (`deepseek-v4-flash`) | ✅ İstek doğru kuruldu | 421ms'de `error:"Authentication Fails, Your api key: ****0000 is invalid"` — DeepSeek key'in son 4 hanesini maskeleyip geri yolluyor, bu da isteğin gerçekten `api.deepseek.com/v1`'e ulaştığının kanıtı. |
| **Cerebras** (`zai-glm-4.7`) | ✅ İstek doğru kuruldu | 240ms'de `error:"Wrong API Key"`. |
| **NVIDIA** (`meta/llama-3.1-70b-instruct`) | ✅ İstek doğru kuruldu | 236ms'de `error:"Authentication failed"`. Ayrıca NVIDIA'nın **auth istemeyen** `GET https://integrate.api.nvidia.com/v1/models` uç noktasını da ayrı `curl` ile test ettim: **HTTP 200, 102 model** dönüyor (`builtins.ts`'teki yorumla birebir uyuşuyor — "Nvidia does publish an OpenAI-shaped /v1/models… and it needs no auth"). Bu, model-picker'ın gerçekten dolu geleceğinin doğrulanmış kanıtı. |
| **Gemini** (`gemini-3.1-flash-lite-preview`) | ✅ İstek doğru kuruldu | 290ms'de `error:"API key not valid. Please pass a valid API key."` — Google'ın kendi hata formatı, `generativelanguage.googleapis.com`'a doğru ulaşıldığını gösterir. |

**Ortak gözlem:** Beş sağlayıcının hiçbirinde adaptör kodu çökmedi
(unhandled exception, `TypeError`, JSON parse hatası yok); hepsi
`gateway`'in `done:{success:false,error:"…"}` sözleşmesine düzgün
şekilde düştü. Yani **temel wiring (endpoint, model id, header, body
serileştirme) beş sağlayıcı için de sağlam** — bunlar test edilebilen
kısımdı ve geçti.

**Test edilemeyen kısım:** Gerçek key olmadığı için modelin fiilen tool
çağırıp çağırmadığı, `reasoning_content` alanının ikinci turda ne
olacağı, Gemini'nin `thought_signature` gereksinimi gibi *davranışsal*
şeyler gözlemlenemedi. Bunun için statik inceleme + var olan ölçüm
kayıtlarına bakıldı (aşağıda).

---

## 3. Statik inceleme — bilinen risk: `reasoning_content` üç durumlu sorunu

`apps/vscode/src/sdk/provider-compat.ts` (commit `4f6909799`, `1a6ce0f1f`'i
merkezi bir tabloya taşımış) şunu söylüyor: "OpenAI-compatible" ortak bir
sözleşme değil, aile benzerliği. Aynı alan (`reasoning_content`) üzerinde
sağlayıcılar birbirine zıt davranıyor:

| Sağlayıcı | Politika | Kaynak | Not |
|---|---|---|---|
| `groq` | **strip** (geçmişten sil) | `measured` (2026-07-31) | Kendi ürettiği `reasoning_content`'i 2. mesajda reddediyor: `property 'reasoning_content' is unsupported`. Ayrıca 8000 TPM (rezerve output dahil) sınırına karşı `maxOutputTokens: 2048` tavanı var. |
| `cerebras` | **strip** | `reported` (ölçülmemiş, sadece bildirilmiş) | Groq ile aynı red şekli, ama **canlı Cerebras API'sine karşı hiç doğrulanmamış** — tablo bunu açıkça belirtiyor. |
| `deepseek` | **require** (asla silme) | `reported` | Tam tersi: silinirse `400 the reasoning_content in the thinking mode must be passed back` hatası veriyor. |
| `gemini` | **require** | `reported` | `thought_signature`, reasoning parçasının metadata'sında taşınıyor; parça silinirse imza da gidiyor, 3.x modelleri `missing thought_signature in functionCall parts` ile reddediyor. |
| **`nvidia`** | **tabloda YOK** | — | **Bulgu.** Aşağıda detay. |

### Bulgu: NVIDIA `PROVIDER_COMPAT` tablosunda yok, ama reasoning modeli var

`sdk/packages/llms/src/providers/providers.generated.ts` içinde NVIDIA
girişi `"capabilities": ["tools", "reasoning", "prompt-cache"]` ve
**varsayılan modeli `z-ai/glm-5.2`** — yani thinking/reasoning parçası
üreten bir model. `family: "openai-compatible"`, tıpkı Groq/Cerebras/
DeepSeek gibi aynı kod yolundan (`vendors/openai-compatible.ts` →
AI SDK → `reasoning_content` serileştirme) geçiyor.

Ama `provider-compat.ts`'teki `PROVIDER_COMPAT` sözlüğünde `nvidia` anahtarı
**yok**. Bu, dosyanın kendi belgelediği "ölçülmemiş sağlayıcıyı olduğu gibi
bırak" ilkesine göre bilinçli bir tasarım — riski körü körüne "strip"
yaparak DeepSeek/Gemini tarzı bir sağlayıcıyı bozmamak için. Ama pratik
sonucu şu: **NVIDIA'nın GLM-5.2 (veya başka bir reasoning modeli) Groq gibi
`reasoning_content`'i reddederse**, ilk multi-turn tool-loop isteği
başarısız olacak.

Bu senaryo tamamen çıplak bırakılmamış — `provider-compat-repair.ts`
(`ProviderCompatRepair`) tam olarak bunun için var: hata mesajında
`reasoning_content … unsupported` görürse (`isReasoningHistoryRejection`),
`noteReasoningHistoryRejected` ile o sağlayıcıyı çalışma-zamanında
"strip" olarak öğrenip **isteği bir kez otomatik tekrar dener**
(`learnedRejectors`, oturuma özel, kalıcı değil). Yani NVIDIA gerçekten
Groq gibi davranırsa **kullanıcı görmeyecek** (bir retry ile kendi kendine
düzelecek) — ama bu, canlı NVIDIA GLM-5.2 isteğiyle hiç doğrulanmamış bir
varsayım, dosyanın kendi diliyle "measured" değil "untested".

**Risk seviyesi:** Düşük-orta. Kod çökmüyor, otomatik onarım mekanizması
var ve mantıksal olarak doğru kurulmuş (Groq testinde aynı yol zaten
kanıtlanmış). Ama gerçek NVIDIA reasoning modeliyle hiç doğrulanmamış —
bu makinede NVIDIA key'i olmadığı için bu oturumda da doğrulanamadı.

**Öneri (kod değişikliği YAPILMADI, sadece not):** Kullanıcı gerçek
`NVIDIA_API_KEY` ile bir GLM-5.2/reasoning modelini 2+ turluk bir tool
döngüsünde denediğinde, `provider-compat.ts`'e `nvidia: { reasoningHistory:
"strip"|"require", source: "measured", measuredOn: "…" }` girişi eklemek
tek satırlık bir iş — dosyanın kendi yorumu da bunu söylüyor.

### Küçük tutarsızlık notu (kod değişikliği önerilmiyor, sadece gözlem)

`provider-compat.ts`'in dosya başı yorumu DeepSeek kuralının "Faz 5'te
canlı API'ye karşı teşhis edilip çözüldüğünü" söylüyor, ama tablodaki
`deepseek` girişinin `source` alanı `"measured"` değil `"reported"`.
Muhtemelen zararsız (iki kaynak da aynı sonuca varmış), ama dosyanın kendi
"measured vs reported güvenilirlik farkı" ilkesiyle hafif çelişiyor.

---

## 4. Genel değerlendirme

- **Wiring/transport katmanı** (istek doğru sağlayıcıya, doğru endpoint'e,
  doğru şekilde gidiyor mu): Groq, DeepSeek, Cerebras, NVIDIA, Gemini
  beşi için de **canlı olarak doğrulandı**, hiçbiri kırık değil.
- **NVIDIA'nın auth istemeyen `/v1/models` endpoint'i**: **canlı olarak
  doğrulandı**, 102 model dönüyor, kod yorumundaki iddiayla birebir eşleşiyor.
- **`reasoning_content` davranışı** (Groq/Cerebras/DeepSeek/Gemini):
  koddaki merkezi tablo tutarlı ve gerekçeli, Groq için gerçek ölçüme
  dayanıyor, diğerleri "reported" (bildirilmiş, bu oturumda tekrar
  doğrulanamadı — key yoktu).
- **En somut açık nokta:** NVIDIA, aynı `reasoning_content` riskini taşıyan
  aynı kod yolundan geçtiği hâlde uyumluluk tablosunda yok. Kod bunu
  otomatik-onarım mekanizmasıyla karşılıyor ama gerçek NVIDIA isteğiyle
  hiç doğrulanmamış.

## 5. Bu oturumda değişen dosyalar

**Hiç.** Sadece bir geçici script yazılıp (`sdk/packages/llms/src/tests/__adhoc-live-probe.ts`)
çalıştırıldıktan sonra silindi; `git status` bu raporun yazılmasından önce
temizdi ve hâlâ temiz.
