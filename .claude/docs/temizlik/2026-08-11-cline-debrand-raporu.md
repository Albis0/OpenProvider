# Cline Debrand — Görünen Yüzey Temizliği

**Tarih:** 2026-08-11
**Branch:** `feature/debrand-cline`
**Sürüm:** 0.0.15
**İstek:** "projede CLINE adına bişi kalmıcak isim olarak — kod dokunmanı istemiyorum onun sdk ları alt yapıları duracak ama dosya isimleridir md lerdir yorum satırlarıdır falan ne kadar cline varsa onları kaldır. cline fork u olabiliriz ama ayrı bir app iz"

---

## 1. Önce ölçtüm: "Cline" tek bir şey değil

Repoda **2287 dosyanın 1477'si** (yani %65) "cline" içeriyor. Bu sayı ilk bakışta korkutucu
ama yanıltıcı — çünkü hepsi aynı türden değil. Dört ayrı kategori var ve bunların sadece
ikisi güvenle değiştirilebilir:

| # | Kategori | Yaklaşık adet | Durum |
|---|---|---|---|
| 1 | Görünen metin, log, yorum, MD | yüzlerce | ✅ Değiştirildi |
| 2 | Kod içi semboller (`ClineMessage`, `ClineSay`) | ~1000+ | ⏸️ Ertelendi (senin kararın) |
| 3 | Diskteki dosya/klasör adları (`.clinerules`) | ~300 | ⚠️ Çift-okuma yapıldı |
| 4 | Vendored SDK (`sdk/packages/*` = `@cline/core`) | 478 dosya | ❌ Dokunulmadı (senin kararın) |

Bu ayrımı yapmadan toplu bir "bul-değiştir" çalıştırmak eklentiyi bozardı. Sebebi aşağıda.

---

## 2. Sürpriz: iş zaten büyük ölçüde yapılmıştı

`docs/fork/REBRANDING-REPORT.md` diye bir dosya buldum — daha önceki bir oturumda
kapsamlı bir rebrand yapılmış. Kontrol ettim, iddiaları doğru:

- 19 komutun hepsi zaten `openprovider.*` ve başlıkları temiz.
- Sistem promptu zaten **"You are OpenProvider"** diyor (hem eklentide hem SDK'da).
- `package.json` kimliği (`name`, `displayName`, `publisher`) zaten OpenProvider.
- README, NOTICE, SECURITY, CONTRIBUTING zaten OpenProvider olarak yazılmış.

Yani bu oturumdaki iş, sıfırdan rebrand değil — **kaçmış olan kalıntıları toplamak** oldu.

---

## 3. Bu oturumda gerçekten ne değişti

### 3.1 Webview'daki görünen metinler

Ayarlar panelinde gözünle gördüğün cümleler:

- 4 sağlayıcı ekranında (LMStudio, Ollama, OpenAI-Compatible, xAI):
  "Cline uses complex prompts…" → "OpenProvider uses complex prompts…"
- Terminal ayarları bölümünde 4 cümle: "Choose whether Cline runs commands…",
  "Set how long Cline waits…", "When enabled, Cline will reuse…",
  "Select the default terminal Cline will use…"
- Birkaç kod yorumu (`WorktreesView`, `SapAiCoreModelPicker`, `ChatView`).

### 3.2 Loglar ve giden HTTP başlıkları

- Log prefix'leri: `[Cline] CRITICAL…`, `Cline version changed…` → OpenProvider.
- Self-hosted mod ve HMR bildirimleri.
- **Giden istek başlıkları**: Groq ve Baseten'e `User-Agent: Cline-VSCode-Extension`
  gönderiyorduk, SAP AI Core'a `AI-Client-Type: Cline`. Bunlar bizim kendimizi
  tanıttığımız yerler — artık OpenProvider diyoruz.

### 3.3 Kural klasörü — asıl teknik iş burada

En dikkat gerektiren kısım buydu.

**Sorun:** `.clinerules` sadece bir string değil, insanların **diskinde duran gerçek bir
klasör**. Sabiti `.openproviderrules` yapıp geçseydim, daha önce Cline ile açılmış her
projede kurallar **sessizce** yüklenmemeye başlardı. Hata yok, uyarı yok — ajan sadece
kullanıcının yazdığı kuralları görmezden gelir. Mümkün olan en kötü arıza türü bu:
kullanıcı çalıştığını sanıyor.

**Çözüm — çift okuma.** Tek bir yerde karar veriliyor:
`apps/vscode/src/shared/rule-directory-names.ts`

```
.openproviderrules  → yeni klasörler böyle oluşturulur, öncelik bunda
.clinerules         → varsa hâlâ okunur
ikisi de varsa      → .openproviderrules kazanır
hiçbiri yoksa       → .openproviderrules oluşturulur
```

Bağlandığı yerler: kural toggle'ları (`cline-rules.ts`), kural/workflow oluşturma
(`rule-helpers.ts`), hook tarama (`refreshHooks.ts`) ve hook çözümleme (`hooks/utils.ts`).

İki incelik vardı, ikisi de yakalandı:

1. **Dışlanan alt klasörler.** Toggle senkronizasyonu `workflows`/`hooks`/`skills`
   alt klasörlerini dışlıyor ama liste `.clinerules` olarak sabit yazılmıştı. Çözülen
   klasör adına bağlamasaydım, yeni isim kullanan bir projede bu dosyalar sıradan
   kural gibi görünmeye başlardı.
2. **Oluşturma sırasında klasör seçimi.** Yeni kural dosyası her zaman
   `.openproviderrules` içine yazılsaydı, `.clinerules`'u olan bir projede **iki tane**
   kural klasörü olurdu ve kullanıcı hangisinin canlı olduğunu bilemezdi. Artık
   oluşturma da projenin mevcut klasörünü benimsiyor.

5 yeni test yazıldı (`rule-directory-names.test.ts`) — hepsi geçiyor. Test dosyası
`vitest.config.ts`'teki açık `include` listesine eklendi (o listeye eklenmezse test
sessizce hiç koşmuyor).

### 3.4 Kendiyle çelişen dökümanlar düzeltildi

`AGENTS.md` ve `CONTRIBUTING.md` "`.clinerules`'u asla yeniden adlandırma" diyordu.
Bu artık doğru değil, dolayısıyla ikisi de `rule-directory-names.ts`'i işaret edecek
şekilde güncellendi. `REBRANDING-REPORT.md`'nin "değiştirilmeyenler" tablosundaki ilgili
satır düzeltildi ve yeni bir 5.1 bölümü eklendi.

---

## 4. Bilerek DOKUNULMAYANLAR (ve nedenleri)

Bunlar unutulmadı — kasıtlı bırakıldı:

| Ne | Neden |
|---|---|
| `sdk/packages/*` (`@cline/core` vb.) | Senin kararın. Upstream'den güncelleme alabilmek için. Kullanıcıya hiç görünmüyor. |
| `Documents/Cline/Rules`, `/Hooks`, `/MCP` | Diskte gerçek klasörler. Değişirse kullanıcı verisi kaybolur. |
| `.clineignore` | Aynı gerekçe — diskte gerçek dosya. |
| `ClineMessage`, `ClineSay`, `ClineError` vb. | Kapsam #2, sen erteledin. Görünmüyor. |
| `proto/cline/*` namespace'i | Tüm generated kodu yeniden üretmeyi gerektirir. |
| `docs/` klasörü (~1000 mention) | Upstream'in Mintlify sitesi — CLI, Kanban, enterprise gibi bu fork'un **yayınlamadığı** ürünleri anlatıyor. Yeniden yazmak, satmadığın ürünlerin dökümanını bakmak demek. |
| `.claude/docs` tarihli raporlar | Tarihsel kayıt. İçlerindeki "Cline" ifadeleri SDK hakkında **olgusal** cümleler ("Cline SDK hataları fırlatmıyor"). Değiştirmek dökümanı yanlış yapar. |
| README/NOTICE/SECURITY'deki Cline | **Apache-2.0 madde 4 zorunlu atıf.** Yasal olarak kalmalı. |

---

## 5. Doğrulama

| Kontrol | Sonuç |
|---|---|
| `tsc --noEmit` (eklenti) | ✅ Temiz |
| `tsc -b` (webview) | ✅ Temiz |
| biome lint | ✅ 1121 dosya, hata yok |
| proto lint | ✅ Temiz |
| Test | ✅ **920/920** (5 yeni test dahil) |
| vsix | ✅ `openprovider-0.0.15.vsix` (8.12 MB) |
| Manifest denetimi | ✅ Kalan 5 "cline" = 4 SDK workspace deps + 1 build script yolu |

**Dürüst not:** Test koşumunun birinde `sdk-diff-edit-coordinator.test.ts` bir kez
düştü, sonraki iki koşuda geçti. Bu dosyaya hiç dokunmadım (kural, marka veya string
içermiyor) — zamanlamaya duyarlı, önceden var olan bir flake. Benim değişikliğimden
kaynaklanmıyor ama kayda geçiyorum.

---

## 6. Bir yan bulgu (marka dışı)

`refreshGroqModels.ts:110` API anahtarının ilk 10 karakterini loga yazıyor:

```ts
Logger.log("Fetching Groq models with API key:", cleanApiKey.substring(0, 10) + "...")
```

CLAUDE.md'deki "API key'leri asla logla" kuralıyla çelişiyor. Bu oturumun kapsamı
dışında olduğu için **dokunmadım**, ama ayrı bir iş olarak bakılmalı.

---

## 7. Sırada ne var (istersen)

- **Kapsam #2**: `ClineMessage` → `OpenProviderMessage` gibi ~1000 sembol ve dosya adı.
  Mekanik iş ama proto katmanına dokunuyor, dikkatli test ister.
- Yukarıdaki API-key log satırı.
- `.openproviderrules`'un gerçek kullanımda denenmesi — mantık test edildi, canlı
  kullanımda henüz değil.
