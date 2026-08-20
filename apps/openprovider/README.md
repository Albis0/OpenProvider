# @openprovider/engine

OpenProvider'ın orkestrasyon katmanı. Cline'ın iç kodunu değiştirmeden,
`@cline/sdk`'yı **dışarıdan** kullanan ayrı bir uygulama
(bkz. [`.claude/claude.md`](../../.claude/claude.md) — kritik karar).

Roadmap'in dört fazı da burada, üç bağımsız parça hâlinde.

---

## Tek giriş noktası

```ts
const session = await OpenProviderSession.create({ projectDir })
const result = await session.run("scanner.ts'deki hatayı düzelt")
console.log(result.summary)
```

Bu tek çağrı: moda göre sağlayıcı seçer, alakalı dosyaları bulup enjekte eder,
ajanı çalıştırır, projenin build/test'ini koşar, hata varsa bir kez düzelttirir
ve tek bir özet döndürür. Sağlayıcı patlarsa sorar (`onProviderSwitch`),
kotayı takip eder (`session.quota()`).

Aşağıdaki parçalar ayrı ayrı da kullanılabilir.

---

## Parçalar

### `src/context/` — otomatik dosya seçimi (Faz 1)

Kullanıcı `@file` yazmadan, prompt'a göre hangi dosyaların alakalı olduğuna
**statik analizle** karar verir. Model çağrısı yapmaz.

```
scanner → parser (tree-sitter) → graph → score → engine → beforeModel hook
```

404 dosyalık bir kod tabanında: indeksleme 2.5 sn (bir kez), seçim 21 ms.

```ts
const engine = await ContextEngine.create({ root: process.cwd() })
const agent = new Agent({
  providerId, modelId, apiKey,
  hooks: { beforeModel: createContextHook(engine, { maxOutputTokens: 4096 }) },
})
```

### `src/routing/` — kural bazlı yönlendirme (Faz 2)

Task türünü (`plan` / `code` / `docs` / `review`) regex'le belirler, moda göre
provider seçer, kullanılamayan provider'ı atlar. Sınıflandırma için **LLM
çağırmaz** — mod tespiti mikrosaniye mertebesinde.

```ts
const { config } = await loadConfig(process.cwd())
const router = new Router(config, createCredentialSource())
const route = router.route("scanner.ts'deki hatayı düzelt")
// route.mode === "code", route.providerId === config'deki code hedefi
```

Ayarlar [`openprovider.config.json`](./openprovider.config.json) dosyasında.
**Bu dosyada API key yok** — sadece provider kimlikleri. Key'ler SDK'nın kendi
deposunda (`~/.cline/data/settings/providers.json`, izin 0600) kalır.

### `src/verify/` — doğrulama ve tek retry (Faz 3)

Task bitince projenin kendi build/test script'lerini çalıştırır. Başarısızsa
çıktıyı ajana **bir kez** geri verir, sonra durur ve raporlar.

```ts
const result = await runVerifiedTask({ prompt, projectDir, run })
console.log(result.summary)
```

---

## Çalıştırma

```bash
bun install
bun run --cwd ../.. build:sdk    # SDK dist/ üzerinden çözülüyor, şart
```

| Komut | Ne yapar |
|---|---|
| `bun run hello` | SDK üzerinden tek mesaj gönderir (Faz 0) |
| `bun run probe` | Context enjeksiyonunun çalıştığını kanıtlar |
| `bun run probe:engine` | Context engine'i çevrimdışı çalıştırır, seçimleri gösterir |
| `bun run probe:agent` | Uçtan uca: ajan `@file` olmadan doğru dosyaları buluyor mu |
| `bun run src/probe-routing.ts` | Mod tespiti, yönlendirme, fallback |
| `bun run src/probe-verify.ts` | Bozuk repo senaryosu: yakala, düzelt, raporla |
| `bun run src/probe-session.ts` | Birleşik oturum: routing + context + verify tek çağrıda |
| `bun run src/probe-provider-compat.ts` | Sağlayıcı tuhaflıkları, Groq'un araç döngüsü |
| `bun run src/probe-quota.ts` | Kota takibi ve rate limit başlıkları |
| `bun run src/probe-switch.ts` | Rate limit'te sorarak geçiş (bekle / geç / dur) |
| `bun run probe:compaction` | Geçiş sırasında context'i ucuz bir modelle sıkıştırma |
| `bun run probe:compaction-live` | Sıkıştırmanın *kalitesi*, gerçek Groq modeliyle (anahtar yoksa SKIP) |
| `bun run probe:free-tier` | Groq'un "Request too large" hatası ve çözümü |
| `bun run typecheck` | `tsc --noEmit` |

Başka bir repoyu incelemek için:

```bash
bun run probe:engine "C:/yol/projeye" --prompt "aradığın şey"
```

Sağlayıcı seçimi env ile geçersiz kılınabilir:
`OPENPROVIDER_PROVIDER`, `OPENPROVIDER_MODEL`, `OPENPROVIDER_API_KEY`.

### Geçişte context sıkıştırma

Bir sağlayıcı limite takılıp görev başkasına devredilirken, context'i ham
haliyle taşımak yerine ucuz/hızlı bir model onu öz bir brief'e çevirebilir.
Sebep ölçülmüş: gerçek bir ajan turu 32209 token ölçüldü, Groq'un ücretsiz
katmanı ise 8000 TPM'de reddediyor — aynı 32k'yı zincirdeki her sağlayıcıya
taşımak, kotaları tek tek yakıp görevi öldürüyor.

`openprovider.config.json`:

```json
"compression": {
  "provider": "groq",
  "model": "openai/gpt-oss-safeguard-20b",
  "enabled": true,
  "maxTokens": 1024
}
```

- **Varsayılan olarak kapalı.** Açmak fazladan bir çağrı harcar; bunu sormadan
  yapmak yanlış olurdu.
- Sıkıştırma sağlayıcısı, **görevin çalıştığı sağlayıcıdan farklı olmalı** —
  kotası biten sağlayıcıdan kendi geçmişini özetlemesini istemek aynı hatayla
  başarısız olur. Kod bu durumu tespit edip sıkıştırmayı atlar.
- Sıkıştırma başarısız olursa (limit, timeout, boş cevap, anahtar yok)
  **ham context'e dönülür, görev durmaz.**

---

## Önce bunu oku

[`NOTES.md`](./NOTES.md) — SDK'nın context için tam olarak neye izin verdiği,
hangi hook'un neyi değiştirebildiği, ve çalışırken karşılaşılan tuzaklar.
Hepsi kodda satır numarasıyla doğrulanmış ya da çalıştırılıp kanıtlanmış.

Faz raporları: [`.claude/docs/`](../../.claude/docs/).

---

## Bilinen sınırlar

- Context engine **sadece JS/TS**. Grammar'lar kutuda hazır (python, go, rust,
  java), genişletmek küçük iş.
- `tsconfig` path alias'ları (`@/utils`) graf'ta kenar oluşturmuyor.
- Türkçe prompt ↔ İngilizce kod: "kota göstergesi" yazınca `quota` eşleşmiyor.
- **Gemini ücretsiz katman günde 20 istek.** Tek sağlayıcı bir oturuma yetmiyor
  — `session.quota()` ve fallback zinciri tam da bunun için.
- **Reasoning geçmişten siliniyor** (Groq kabul etmediği için), yani model kendi
  düşünce zincirini hatırlamıyor. Uzun görevlerde kaliteyi etkileyebilir,
  ölçülmedi.
- **Kota başlıklarını okumak global `fetch`'i sarmalıyor.** Varsayılan kapalı
  (`observeRateLimitHeaders`), `dispose()` ile geri alınıyor.
- **Sağlayıcı limitleri 2026-07-31 tarihli ölçümler.** Değişebilir.

> Groq + `gpt-oss-120b`'nin araç döngülerinde çalışmama sorunu **çözüldü**
> (Faz 5) — `reasoning` parçaları giden istekten ayıklanıyor.
