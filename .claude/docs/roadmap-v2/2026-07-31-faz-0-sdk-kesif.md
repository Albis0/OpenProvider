# Faz 0 — SDK Keşfi ve Hello World

**Tarih:** 2026-07-31
**Başlangıç:** 00:42
**Bitiş:** 01:00
**Süre:** ~18 dakika
**Durum:** Tamamlandı ✅

---

## Ne istendi

Roadmap Faz 0. Dört çıktı:

1. `@cline/sdk` dokümantasyonunu/kaynağını oku — Multi-Agent Teams, context erişimi, custom tool API'si
2. Cline'ın kendi context yönetimini incele — `.clinerules`, `@file`, tree-sitter
3. Ayrı bir Node/TS projesi kur, SDK'yı dependency ekle, hello-world çalıştır
4. `NOTES.md` yaz: SDK'nın context seçimi için tam olarak neye izin verdiği

Bitiş kriteri: SDK üzerinden mesaj gönderip cevap alabilmek **ve** context seçimi
konusunda SDK'nın sınırlarını net bilmek.

---

## Ne yapıldı

### Yeni uygulama: `apps/openprovider/`

CLAUDE.md'nin kritik kararı gereği (fork'un içini değiştirme, SDK'yı dışarıdan
kullan, **ayrı bir uygulama** yaz) monorepo içinde yeni bir workspace paketi
açıldı. Adı `@openprovider/engine` — `openprovider` adı `apps/vscode` tarafından
kullanıldığı için (rebrand'den kalma) çakışma yaşandı, o yüzden scope'landı.

| Dosya | Ne yapıyor |
|---|---|
| `src/provider-settings.ts` | Sağlayıcı + key çözümlemesi. SDK'nın `ProviderSettingsManager`'ını **sadece okuyor**. Key'i asla loglamıyor. Env ile geçersiz kılınabiliyor. |
| `src/hello.ts` | Faz 0 adım 3. Tek prompt gönderip cevabı stream ediyor. |
| `src/probe-context-hook.ts` | Faz 0'ın asıl deneyi. Context enjeksiyonunun çalıştığını kanıtlıyor. |
| `src/probe-free-tier.ts` | Groq'un "Request too large" hatasını ve çözümünü gösteriyor. |
| `NOTES.md` | Roadmap'in istediği bulgu dokümanı. |

### Yapılan testler (hepsi gerçek API çağrısıyla)

**Hello world — Gemini:** çalıştı.
```
[openprovider] using gemini / gemini-3.5-flash
Yes, I am reachable.
[openprovider] done — 1 iteration(s), 12 in / 261 out tokens
```

**Context enjeksiyon probe'u:** geçti. Modelin bilemeyeceği uydurma bir bilgi
(`ZURNA-7`) sadece hook'tan enjekte edildi, sonra o bilgiyi gerektiren soru
soruldu. Model doğru cevapladı.
```
[probe] beforeModel fired: 1x
[probe] request messages: 1 -> 2
[probe] model answered: "ZURNA-7"
[probe] PASS
```

**Tip kontrolü:** `bunx tsc --noEmit` temiz.

---

## Ana bulgu — Faz 1 kurulabilir

Aranan hook **`hooks.beforeModel`**. Model çağrılmadan önce çalışıyor ve
`messages`, `tools`, `options` alanlarını değiştirebiliyor
(`sdk/packages/agents/src/agent-runtime.ts:857-876`).

Faz 1'in ihtiyaç duyduğu her şeyi karşılıyor:
- Ekstra LLM çağrısı gerektirmiyor (sadece yerel kod)
- Her turda çalışıyor
- Enjekte edilen mesajlar kalıcı konuşma geçmişine yazılmıyor — her tur taze
  context verilebiliyor

---

## Roadmap'i değiştiren üç bulgu

### 1. Cline'da tree-sitter YOK

Roadmap "Cline zaten kullanıyor, aynısını kullan" diyordu. Bu repo sürümünde
doğru değil:

- Hiçbir `package.json`'da tree-sitter bağımlılığı yok
- Hiçbir kaynak dosyada kullanılmıyor
- `web-tree-sitter` sadece `@opentui/core`'un (terminal UI kütüphanesi) peer
  dependency'si olarak lock dosyasında görünüyor
- CHANGELOG'daki tree-sitter kaydı refactor öncesi sürümden; parser kaldırılmış

**Etkisi:** Faz 1'de tree-sitter'ı sıfırdan biz kuracağız. Parser sürümü seçimi
bize kaldı, devralınacak kurulum yok. Faz 1 tahmini biraz büyüdü.

### 2. Repo scanner neredeyse bedava

`getFileIndex(cwd)` SDK'dan export ediliyor ve Faz 1 adım 1'in tamamına yakınını
zaten yapıyor: `rg --files --hidden -g '!.git'` çalıştırıyor, yani **.gitignore'a
ripgrep sayesinde uyuyor**. 15sn cache'li, worker thread'de.

**Etkisi:** Faz 1 adım 1 sıfırdan yazılmayacak.

### 3. Groq "Request too long" hatasının gerçek sebebi bulundu

Kullanıcının önceki oturumda eklentide gördüğü hata burada da üretildi:
`TPM: Limit 8000, Requested 32074`.

Mesaj yanıltıcı — gönderilen istek **113 karakterdi** (hook'la ölçüldü: system
prompt 0, araç 0, 1 mesaj). O 32.000 token **çıktı bütçesi**. Model kataloğunda
model bulunamayınca gateway varsayılan bir üst sınıra düşüyor, Groq da ayrılan
çıktıyı aynı dakikalık kotaya sayıyor.

**Çözüm:** `beforeModel`'den `{ options: { maxTokens: 1024 } }` döndürmek.
Bunu ekleyince Groq çalıştı. `maxTokensPerTurn` ve constructor `options` bu yola
ulaşmıyor — ikisi de denendi, etkisiz.

⚠️ İlk 4 denemede sınırsız istek tutarlı patladı, sonraki 5 denemede patlamadı.
Kesin neden bulunamadı, canlı katalog çözümleme zamanlamasıyla ilgili görünüyor.
Not olarak bırakıldı; sınır koymak sonucu belirlenebilir kılıyor.

---

## Diğer notlar

- **`prepareTurn`** diye daha güçlü bir hook var (system prompt'u da
  değiştirebiliyor) ama SDK kullanıcısına kapalı — core onu compaction için
  kendisi kuruyor. Bizim için `beforeModel` yeterli.
- **Sağlayıcı hataları exception fırlatmıyor.** `agent.run()` hatada da normal
  dönüyor, `result.text` `undefined` oluyor. Hatayı görmek için `run-failed`
  event'ine abone olmak şart. Faz 3 bunun üzerine kurulmalı.
- **API key'ler** `~/.cline/data/settings/providers.json`'da (izin 0600), SDK'nın
  kendi yöneticisi tarafından. VS Code dışında SecretStorage olmadığı için
  SDK'nın sunduğu tek kalıcı yer bu. Bizim kod sadece okuyor.

---

## Faz 1'e giren kararlar

1. Entegrasyon noktası **`hooks.beforeModel`**, mesaj enjeksiyonu şeklinde
2. **`Agent`** katmanıyla başla, `ClineCore` değil (oturum kalıcılığına gerek yok)
3. Repo taraması için **`getFileIndex`**'i yeniden kullan
4. **tree-sitter'ı biz kuracağız**
5. Ücretsiz tier'da **çıktı token'ını hook'tan sınırla**
6. Hata yönetimi **event tabanlı**

---

## Kapsam dışı bırakılanlar

- Multi-Agent Teams API'si yüzeysel incelendi (`AgentTeam`, `bootstrapAgentTeams`,
  `createSpawnAgentTool` mevcut). Roadmap bu fazda derinleşmeyi gerektirmiyor —
  multi-agent zaten roadmap dışı.
- Faz 1 kodu yazılmadı. Roadmap kuralı: faz bitmeden sonrakine geçilmez.
