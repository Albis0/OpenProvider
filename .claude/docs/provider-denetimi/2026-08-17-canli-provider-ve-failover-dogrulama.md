# Canlı Provider + Failover Doğrulaması (İŞ 1)

**Tarih:** 2026-08-17
**Branch:** `feature/debrand-cline`
**Kurulu sürüm:** `openprovider.openprovider@0.0.17`
**Kapsam:** Kod değiştirilmedi. Gerçek API key'leriyle canlı çağrı + failover
zincirinin uçtan uca doğrulanması.

---

## 0. Önceki rapordaki "key yok" tespiti yanlıştı

`2026-08-12` tarihli rapor "bu profilde hiç provider key'i girilmemiş" diyordu.
O rapor sadece VS Code'un `state.vscdb` secret deposuna baktı. Key'ler orada
değil, **SDK'nın kendi dosyasında** duruyor:

```
%USERPROFILE%\.cline\data\secrets.json
```

İçinde 4 key var: `groqApiKey`, `geminiApiKey`, `openRouterApiKey`,
`cerebrasApiKey`. Yani canlı test bu makinede **mümkündü**.

**NVIDIA ve DeepSeek key'i yok** — bu ikisi canlı test edilemedi.

---

## 1. Yöntem

Geçici bir probe (`__adhoc-live-probe.ts`, çalıştırıldıktan sonra silindi,
commit edilmedi) `LlmsProviders.createHandlerAsync(config)` →
`handler.createMessage(system, messages, tools)` ile — yani extension'ın
kullandığı kod yolunun aynısıyla — her sağlayıcıda **3 mesajlık, tool-calling
tetikleyen** bir konuşma çalıştırdı:

1. **Tur 1:** "README.md'yi oku ve ilk başlığını söyle" → tool çağrısı beklenir
2. **Tur 2:** geçmişe `assistant tool_use` + `tool_result` eklenir → *asıl kritik
   tur*; `reasoning_content` sorunları tam burada patlıyor
3. **Tur 3:** cevaptan sonra ikinci bir tool çağrısı istenir

Not: `bun install` çalıştırılması gerekti (`nanoid` kurulu değildi, 3832 paket
kuruldu). Bu, `bun.lock` dosyasını değiştirdi — tek değişen dosya bu.

---

## 2. Sonuçlar — ham

| Sağlayıcı | Model | T1 | T2 | T3 | Sonuç |
|---|---|---|---|---|---|
| **Groq** | `openai/gpt-oss-safeguard-20b` | ✅ tool=1 | ✅ text=61 | ✅ tool=1 | **Tam geçti** |
| **Gemini** | `gemini-3.5-flash-lite` | ✅ tool=1 | ✅ text=54 | ✅ tool=1 | **Tam geçti** |
| **OpenRouter** | `google/gemini-3.5-flash-lite` | ✅ tool=1 | ✅ text=52 | ✅ tool=1 | **Tam geçti** |
| **Cerebras** | `gemma-4-31b` | ❌ | ❌ | ❌ | Hesap sorunu (aşağıda) |
| NVIDIA | — | — | — | — | Key yok, test edilemedi |
| DeepSeek | — | — | — | — | Key yok, atlandı |

### Groq — `maxOutputTokens` olmadan patlıyor, capla geçiyor

İlk denemede üç turun üçü de şu hatayla patladı:

```
Request too large for model `openai/gpt-oss-safeguard-20b` ... on tokens per
minute (TPM): Limit 8000, Requested 32209, please reduce your message size
```

Sebep: probe `maxOutputTokens` göndermiyordu. `provider-compat.ts`'teki
`PROVIDER_COMPAT.groq.maxOutputTokens = 2048` capı uygulanınca **üç tur da
sorunsuz geçti**. Yani:

- Bu bir kod hatası değil, capın **gerçekten gerekli olduğunun kanıtı**.
- `provider-compat.ts`'in "Groq rezerve output'u 8000 TPM bütçesine sayıyor"
  yorumu **canlı olarak doğrulandı**.

Ayrıca Groq turlarında `reasoning=true` görüldü ve **2. tur (tool geçmişi olan
tur) sorunsuz geçti** — yani `reasoningHistory: "strip"` politikası çalışıyor.
Bu, `PROVIDER_COMPAT`'ın en kritik iddiasının canlı doğrulanması.

### Gemini — çalışıyor, ama bir uyarı üretiyor

Üç tur da geçti, ancak AI SDK her tool-geçmişli turda şu uyarıyı bastı:

```
Replayed 1 `functionCall` part(s) for a Gemini 3 model without a
`thoughtSignature` (tools: `read_file`). Injected the documented
`skip_thought_signature_validator` sentinel to keep the request from failing
with HTTP 400. The likely cause is application code that drops
`providerOptions.google.thoughtSignature` when persisting or serializing
assistant tool-call messages.
```

**Anlamı:** İstek şu an başarısız *olmuyor*, çünkü AI SDK araya belgelenmiş bir
"doğrulamayı atla" sentinel'i koyuyor. Ama bu bir yama; Gemini'nin
`thought_signature` beklentisi `provider-compat.ts`'te `gemini:
reasoningHistory: "require"` olarak zaten biliniyor. Bu uyarı, imzanın
serileştirmede düştüğünü gösteriyor. Şu an zararsız, ileride Google sentinel'i
kaldırırsa kırılır. **Kod değişikliği yapılmadı, not olarak bırakıldı.**

### Cerebras — kod değil, hesap

Üç tur da anında:

```
Payment required to access this resource. Visit your billing tab.
```

Bu HTTP 402. Wiring sağlam (istek doğru endpoint'e ulaşıyor), sorun hesapta.
Bu yüzden Cerebras'ın `reasoning_content` davranışı yine **doğrulanamadı** —
tabloda hâlâ `source: "reported"`.

### OpenRouter — cap gerekiyor

Capsız halde:

```
This request requires more credits, or fewer max_tokens. You requested up to
32000 tokens, but can only afford 16000.
```

`maxOutputTokens: 8192` ile üç tur da geçti. **Not:** OpenRouter
`PROVIDER_COMPAT` tablosunda yok, yani extension bu capı kendiliğinden
uygulamıyor. Ücretsiz/düşük bakiyeli bir OpenRouter hesabıyla gerçek kullanımda
bu hatanın alınması muhtemel.

---

## 3. Failover doğrulaması

NVIDIA key'i olmadığı için "NVIDIA'yı bilerek rate limit'e düşürme" adımı
**yapılamadı**. Onun yerine, canlı olarak yakalanan **gerçek Groq TPM hata
metni** failover zincirine verildi — yani uydurma bir string değil, bu oturumda
API'den dönen birebir metin.

### Önce: SDK hatayı nasıl taşıyor

Probe, başarısız `done` chunk'ının şeklini yazdırdı:

```
RAW done chunk keys: ["type","id","success","error","incompleteReason"]
errorType: string | status fields: {}
```

**Kritik bulgu:** Hata sağlayıcıdan `done.error`'a **düz string** olarak
geliyor. HTTP status yok, error code yok. Yani `failure-classifier.ts`'in
Katman 1 (HTTP status) ve Katman 2 (error code) katmanları bu yolda
**hiç devreye giremiyor** — sadece Katman 3 (regex) ve Katman 4 (tekrar)
çalışabiliyor.

### Sonra: sınıflandırma sonucu

Gerçek Groq TPM metniyle:

| Girdi | Sonuç |
|---|---|
| Düz string (SDK'nın gerçekte verdiği hâl) | `not-failover-worthy`, `shouldFailover: false` |
| `{status: 429, message: ...}` olarak | `rate-limit`, `shouldFailover: true`, signal `http-status` |

Groq'un metni ("Request too large ... tokens per minute (TPM): Limit 8000")
`RATE_LIMIT_PHRASES` listesindeki hiçbir desene uymuyor: "rate limit" demiyor,
"too many requests" demiyor, "quota exceeded" demiyor. Dolayısıyla **ilk
hatada geçiş yapılmıyor.**

### Uçtan uca zincir testi

`failover-chain.test.ts`'teki gerçek harness (aynı
`classifyFailure` → `handleRateLimit` dikişi, yani
`SdkController.tryFailoverOnProviderFailure`'ın birebir aynısı) ile:

| Senaryo | Sonuç |
|---|---|
| Turdaki **1.** Groq TPM hatası | `switched = false`, sağlayıcı `groq` kalıyor |
| Turdaki **2.** aynı hata | `switched = true`, sağlayıcı → **`gemini`**, `resumed = 1` |

**Yani failover çalışıyor — ama ikinci hatada.** Katman 4 (tekrar) emniyet
supabı tam olarak tasarlandığı işi yapıyor: tanınmayan ifadeli bir sağlayıcı
sessizce ölmüyor, ikinci denemede geçiyor ve **görev kaldığı yerden devam
ediyor** (`resumed = 1`).

Bu, `2026-08-08` failover raporundaki mimarinin canlı bir sağlayıcı metniyle
ilk kez doğrulanması. Katman 4 olmasaydı Groq'un TPM hatası **sessiz bir
görev ölümü** olurdu.

---

## 4. Test durumu

| Kontrol | Sonuç |
|---|---|
| `bun run test:unit` (extension) | **935 pass / 1 fail** |
| `vitest run src/sdk/failover/` | **73 pass / 0 fail** |

Tek başarısız test: `src/test/shell.test.ts` —
`expected 'C:\WINDOWS\Sysnative\cmd.exe' to equal 'C:\Windows\Sysnative\cmd.exe'`.
Windows yol büyük/küçük harf duyarlılığı; bu oturumdaki işle **ilgisiz ve
önceden var olan** bir hata.

---

## 5. Bulgular özeti

1. **Groq/Gemini/OpenRouter üçü de 3 mesajlık tool-calling akışını canlı
   olarak geçiyor.** Multi-turn tool geçmişi dahil.
2. **Groq'un `maxOutputTokens: 2048` capı zorunlu** — capsız her istek TPM
   limitine takılıyor. `provider-compat.ts` canlı doğrulandı.
3. **Groq `reasoningHistory: "strip"` politikası canlı doğrulandı** (2. tur
   geçti).
4. **SDK hataları düz string olarak taşıyor** — failover sınıflandırıcısının
   HTTP-status ve error-code katmanları bu yolda devre dışı kalıyor.
5. **Groq'un TPM hatası ilk denemede failover tetiklemiyor**, ikinci denemede
   Katman 4 sayesinde tetikliyor ve görev devam ediyor.
6. **OpenRouter `PROVIDER_COMPAT`'ta yok** ve düşük bakiyede cap olmadan
   patlıyor.
7. **Gemini `thought_signature`'ı serileştirmede düşürüyor**; AI SDK şimdilik
   sentinel'le kurtarıyor.
8. NVIDIA ve DeepSeek key olmadığı için test edilemedi; NVIDIA `PROVIDER_COMPAT`
   tablosundaki eksikliği (önceki raporun bulgusu) sürüyor.

---

## 6. Bu oturumda değişen dosyalar

- `bun.lock` — `bun install` sonucu (kurulum gerekliydi)
- Bu rapor

Geçici probe dosyaları (`__adhoc-live-probe.ts`, `__adhoc-classify.test.ts`,
`__adhoc-chain.test.ts`) çalıştırıldıktan sonra **silindi**, commit edilmedi.
Kaynak kodda hiçbir değişiklik yapılmadı.
