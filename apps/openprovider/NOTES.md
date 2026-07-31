# SDK Notları

> Faz 0'da yazıldı, Faz 5-7'de güncellendi. Her madde ya kodda satır
> numarasıyla doğrulandı, ya da çalıştırılıp kanıtlandı. Tahmin yok.


Roadmap'in Faz 0 sorusu tekti:

> SDK'nın context seçimi için sunduğu hook/API tam olarak ne — yoksa Faz 1 baştan farklı kurulmalı.

**Cevap: var, ve Faz 1 planlandığı gibi kurulabilir.** Hook'un adı `beforeModel`.
Aşağıdaki her madde ya kodda satır numarasıyla doğrulandı, ya da çalıştırılıp
kanıtlandı. Tahmin yok.

---

## 1. Context enjeksiyon noktası: `hooks.beforeModel`

Model çağrılmadan hemen önce çalışan, isteği değiştirebilen bir callback.

```ts
const agent = new Agent({
  providerId, modelId, apiKey,
  hooks: {
    beforeModel: ({ request }) => {
      // request.messages'ı istediğin gibi değiştir
      return { messages: [contextMesaji, ...request.messages] }
    },
  },
})
```

Ne döndürebiliyor (`AgentBeforeModelResult`, `sdk/packages/shared/src/agent.ts:279`):

| Alan | Etkisi |
|---|---|
| `messages` | İsteğe giden mesaj listesini **tamamen değiştirir** |
| `tools` | Araç listesini değiştirir |
| `options` | Model seçeneklerini birleştirir (`maxTokens` gibi) |
| `stop` / `reason` | Çağrıyı hiç yapmadan döngüyü durdurur |

Uygulandığı yer: `sdk/packages/agents/src/agent-runtime.ts:857-876`. Hook'lar
sırayla çalışıyor ve her biri `request`'i üzerine yazıyor.

**Kanıt:** `src/probe-context-hook.ts`. Modelin bilemeyeceği uydurma bir bilgi
(`ZURNA-7`) sadece hook'tan enjekte edildi, sonra o bilgiyi gerektiren bir soru
soruldu. Model `ZURNA-7` cevabını verdi. Yani enjekte edilen context modele
gerçekten ulaşıyor.

```
[probe] beforeModel fired: 1x
[probe] request messages: 1 -> 2
[probe] model answered: "ZURNA-7"
[probe] PASS
```

### Neden Faz 1 için doğru yer

- **Ekstra LLM çağrısı yok.** Hook senkron/async bir fonksiyon, sadece yerel kod.
  Roadmap'in "LLM çağrısı EKLEMEME" kuralı bozulmuyor.
- **Her tur çalışıyor.** Yani konuşma ilerledikçe seçilen dosyalar tazelenebilir.
- **Kullanıcının `@file` hakkı elinden alınmıyor.** Biz sadece ekliyoruz.

---

## 2. Hangi katmanda çalışacağız

SDK iki katman sunuyor, ikisi de `hooks` kabul ediyor:

| Katman | Nasıl | Ne veriyor | Ne vermiyor |
|---|---|---|---|
| `Agent` (= `AgentRuntime`) | `new Agent({ providerId, modelId, apiKey, hooks })` | Sade ajan döngüsü, streaming, custom tool | Oturum kalıcılığı, checkpoint, built-in araçlar |
| `ClineCore` | `ClineCore.create({...})` → `cline.start({ ...config, hooks })` | Yukarıdakiler + SQLite oturum kaydı, built-in araçlar, MCP, teams, checkpoint | — |

`ClineCore` tarafında hook alanı `CoreSessionConfig.hooks`
(`sdk/packages/core/src/types/config.ts:261`), oradan
`local-runtime-host.ts:648` üzerinden ajana geçiyor.

**Faz 1 için karar: `Agent` ile başla.** Context motorunu test etmek için oturum
kalıcılığına ihtiyaç yok, ve `Agent` çok daha az hareketli parça demek. Faz 2/3'te
`ClineCore`'a taşımak, aynı `hooks` nesnesini vermekten ibaret.

---

## 3. `prepareTurn` — benzer ama bize kapalı

`prepareTurn` adında ikinci bir kanca daha var ve `beforeModel`'den daha güçlü:
`messages`'ın yanında **`systemPrompt`'u da** değiştirebiliyor
(`sdk/packages/shared/src/agents/types.ts:590`).

Ama SDK kullanıcısına açık değil: `local-runtime-host.ts:567-582` onu compaction
(context sıkıştırma) için kendisi kuruyor ve dışarıdan verilen bir değeri kabul
etmiyor. `ClineCoreOptions` içinde de böyle bir alan yok.

**Sonuç:** system prompt'a yazamıyoruz, mesaj olarak enjekte ediyoruz. Faz 1 için
sorun değil. Dokümantasyonundaki şu not bizim lehimize:

> Returned messages affect only the provider request for the current call. They
> do not replace the canonical runtime transcript, are not persisted as session
> history.

Yani enjekte ettiğimiz repo haritası kalıcı konuşma geçmişini kirletmiyor —
her turda taze context verip eskisini çöpe atabiliriz. Context motoru için tam
istediğimiz davranış.

---

## 4. Cline'ın kendi context yönetimi — beklenenden zayıf

Roadmap "Cline zaten tree-sitter kullanıyor, aynısını kullan" diyordu.
**Bu, bu repo sürümü için doğru değil.**

| Aranan | Bulunan |
|---|---|
| tree-sitter ile kod parse | **Yok.** `web-tree-sitter` sadece `@opentui/core`'un (terminal UI kütüphanesi) peer dependency'si. Hiçbir kaynak dosyada kullanılmıyor. |
| repo map / sembol indeksi | **Yok.** `repo map`, `codebase index`, `symbol index`, `environment_details` — hiçbiri SDK'da geçmiyor. |
| `@file` mekanizması | Var ama basit: `enrichPromptWithMentions` prompt'taki `@yol` kalıplarını regex'le buluyor, dosyayı okuyup içine gömüyor. Alaka analizi yok. |
| `.clinerules` | Var: kurallar okunup `formatRulesForSystemPrompt` ile system prompt'un sonuna ekleniyor. Statik — task'a göre değişmiyor. |

CHANGELOG'da tree-sitter'dan bahseden bir kayıt var ama o refactor öncesi
sürümden; parser o zamandan beri kaldırılmış.

**Bunun anlamı:** CLAUDE.md'nin tespit ettiği boşluk gerçek ve düşündüğümüzden
büyük. Ama Faz 1'in maliyeti de arttı — tree-sitter'ı sıfırdan biz kuracağız,
hazır bir kurulumu devralmayacağız. Parser sürümü seçimi bize kaldı.

---

## 5. Faz 1'de yeniden kullanılacak hazır parçalar

Sıfırdan yazmaya gerek olmayanlar:

**`getFileIndex(cwd)`** — `@cline/sdk`'dan export ediliyor
(`sdk/packages/core/src/services/workspace/file-indexer.ts`).
Roadmap Faz 1 adım 1'in ("repo tarayıcı, .gitignore'a uy") neredeyse tamamı:

- `rg --files --hidden -g '!.git'` çalıştırıyor → **ripgrep .gitignore'a zaten uyuyor**
- 15 saniyelik cache, worker thread'de, ana thread'i bloklamıyor
- ripgrep yoksa manuel dizin gezmeye düşüyor

⚠️ İki uyarı: (1) yedek yol `.gitignore` okumuyor, sadece sabit bir dışlama
listesi kullanıyor (`node_modules`, `dist`, `.git`...). (2) `rg`'nin PATH'te
olması gerekiyor.

**`createTool`** — custom araç yazmak için, zod şemasıyla. Faz 3'te build/test
aracı için lazım olacak.

---

## 6. Ücretsiz sağlayıcı bulguları (test edilmiş)

`hello.ts` ve `probe-free-tier.ts` gerçek key'lerle çalıştırıldı.

### Gemini — sorunsuz
`gemini-3.5-flash` ile ilk denemede çalıştı. 12 giriş / 261 çıkış token.

### Groq — araç kullanan döngülerde `reasoning_content` reddi (Faz 5'te çözüldü)

```
'messages.1' : for 'role:assistant' the following must be satisfied
[('messages.1' : property 'reasoning_content' is unsupported)]
```

`gpt-oss-120b` bir `type: "reasoning"` içerik parçası üretiyor, SDK bunu
geçmişte saklıyor, AI SDK bir sonraki istekte `reasoning_content` alanına
çeviriyor, Groq **kendi modelinin ürettiği alanı** reddediyor.

İlk istekte patlamıyor (geçmişte asistan mesajı yok), ikincide patlıyor. Yani
tek turluk sohbet sorunsuz görünüyor, araç döngüsü çöküyor.

**Çözüm:** `beforeModel`'de asistan mesajlarından `reasoning` parçalarını
ayıklamak — `src/providers/sanitizer.ts`. Bundan sonra Groq araçlarla sorunsuz
çalışıyor.

### Groq — kota başlıklarını yayınlıyor (Faz 6)

`x-ratelimit-limit-tokens`, `x-ratelimit-remaining-tokens`,
`x-ratelimit-reset-tokens` dönüyor. Yani Groq için kota **tahmin değil, kesin**.

Ölçülen limitler: **8000 token/dakika**, **1000 istek/gün**.

Başlıkları okumak için global `fetch` sarmalamak gerekiyor: gateway özel bir
`fetch` kabul ediyor ama düz `Agent` yolu onu asla geçirmiyor.

### Groq — "Request too long" hatasının gerçek sebebi
Kullanıcının eklentide gördüğü hata burada da çıktı:

```
TPM: Limit 8000, Requested 32074, please reduce your message size
```

**Mesaj yanıltıcı.** Gönderilen istek 113 karakterdi (hook'la ölçtüm: system
prompt 0, araç 0, 1 mesaj). O 32.000 token **çıktı bütçesi**. Model kataloğunda
model bulunamayınca gateway varsayılan bir üst sınıra düşüyor
(`resolveGatewayRequestMaxTokens`, `sdk/packages/llms/src/providers/gateway.ts:120`)
ve Groq ayrılan çıktıyı da aynı dakikalık kotaya sayıyor.

**Çözüm** — `beforeModel`'den çıktıyı sınırla:

```ts
hooks: { beforeModel: () => ({ options: { maxTokens: 1024 } }) }
```

Bunu ekleyince Groq çalıştı. `Agent` constructor'ındaki `maxTokensPerTurn` ve
`options` bu yola **ulaşmıyor** — ikisini de denedim, etkisi olmadı. Tek yol hook.

⚠️ **Açık soru:** İlk 4 denemede sınırsız istek tutarlı şekilde patladı, sonraki
denemelerde patlamadı (5/5 geçti). Nedenini kesinleştiremedim; canlı model
kataloğunun çözümlenme zamanlamasıyla ilgili görünüyor. Sınır koymak sonucu
belirlenebilir kılıyor, o yüzden **ücretsiz tier'larda çıktıyı her zaman
açıkça sınırla.**

---

## 7. Dikkat edilecek API tuzağı

**Sağlayıcı hataları exception fırlatmıyor.** `agent.run()` hata durumunda da
normal dönüyor, `try/catch` hiçbir şey yakalamıyor.

> **Düzeltme (Faz 3'te bulundu):** Bu bölümün ilk hali "hatayı görmek için
> event'e abone olmak şart" diyordu. Yanlıştı. Hata dönüş değerinde de var:

```ts
const result = await agent.run(prompt)
if (result.status === "failed") {
  console.error(result.error?.message)   // örn. "Invalid API Key"
}
```

Ampirik olarak doğrulandı: geçersiz key'le `status: "failed"`,
`error: Error("Invalid API Key")`, `outputText: ""` dönüyor.

Alan adlarına dikkat — `AgentRunResult`'ta `text` ve `finishReason` **yok**:

| Beklenen | Gerçek |
|---|---|
| `result.text` | `result.outputText` |
| `result.finishReason` | `result.status` |

Yanlış alan adı `undefined` veriyor, hata vermiyor — sessizce yanlış davranış.

Event'e abone olmak hâlâ yararlı, ama **streaming** için (`assistant-text-delta`),
hata yakalamak için değil.

---

## 8. API key'ler nerede duruyor

`~/.cline/data/settings/providers.json`, dosya izni `0600`. SDK'nın kendi
`ProviderSettingsManager`'ı yazıyor.

CLAUDE.md "API key'ler asla düz dosyaya/JSON'a yazılmaz, VS Code SecretStorage
kullanılır" diyor. VS Code eklentisi için bu geçerli, ama **VS Code dışında
çalışan bir Node uygulamasında SecretStorage diye bir şey yok** — SDK'nın
sunduğu tek kalıcı saklama yeri bu dosya.

`src/provider-settings.ts` bu dosyayı sadece **okuyor**, hiçbir şey yazmıyor,
ve key'i asla loglamıyor (sadece karakter sayısını yazıyor). Env değişkeniyle
(`OPENPROVIDER_API_KEY`) geçersiz kılınabiliyor.

---

## 9. Faz 1'e giren kararlar

1. Entegrasyon noktası **`hooks.beforeModel`**, mesaj enjeksiyonu şeklinde.
2. **`Agent`** katmanıyla başla, `ClineCore` değil.
3. Repo taraması için **`getFileIndex`**'i yeniden kullan, sıfırdan yazma.
4. **tree-sitter'ı biz kuracağız** — Cline'da yok, devralınacak kurulum yok.
5. Ücretsiz tier'da çalışırken **çıktı token'ını hook'tan sınırla**.
6. Hata yönetimi **event tabanlı** olacak, `try/catch` tabanlı değil.

## Nasıl çalıştırılır

```bash
bun install
bun run --cwd ../.. build:sdk    # SDK dist/ üzerinden çözülüyor, şart

cd apps/openprovider
bun run hello                     # son kullanılan sağlayıcıyla mesaj gönder
bun run probe                     # context enjeksiyonunu kanıtla
OPENPROVIDER_PROVIDER=groq bun run src/probe-free-tier.ts
```

Sağlayıcı seçimi: `OPENPROVIDER_PROVIDER`, `OPENPROVIDER_MODEL`,
`OPENPROVIDER_API_KEY` env değişkenleriyle geçersiz kılınabilir.
