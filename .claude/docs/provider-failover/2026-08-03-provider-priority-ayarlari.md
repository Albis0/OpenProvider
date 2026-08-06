# Provider Priority — Failover Ayarları UI'ı (Oturum 1/2)

**Başlangıç:** 2026-08-03 07:05
**Bitiş:** 2026-08-03 08:06

---

## Neden

Kullanıcı NVIDIA + GLM-5.2 ile gerçek bir görev çalıştırırken **"Too Many Requests"** (429) hatasına takıldı. Ajan mantığı kusursuz çalışıyordu (dosya okuma, çoklu araç çağrısı, Türkçe karakter kuralını kendi kendine fark edip düzeltme) — sadece NVIDIA'nın ücretsiz katman limitine çarptı.

Kullanıcının isteği: *"kullanici istedigi gibi yapsin onu ister sessiz ister sorarak ... ve istedigi bir siralama belirleyebilsin ... mesela bizim belirledigimiz bir default olsun 5 tane api versin ama api sayisini arttirmak icin premium gereksin"*

## Mimari karar — CLAUDE.md güncellendi

CLAUDE.md'nin "MVP Kapsamı — SIKI SINIRLA" bölümü v0.1'de **"kendi failover motorunu yazmak"** maddesini bilinçli olarak ertelemişti ("Cline SDK / OmniRoute zaten çözüyor" gerekçesiyle). Bu iş tam olarak o maddeydi.

Kullanıcıya soruldu, **CLAUDE.md'yi güncelleme** seçildi. Madde kaldırıldı ve yerine gerekçeli bir istisna notu eklendi: bu, OmniRoute'un yaptığı genel failover değil — kullanıcı kontrollü, ücretsiz-katman-öncelikli bir mekanizma, projenin "provider bağımsızlık" hedefiyle doğrudan örtüşüyor.

## Kapsam bölünmesi — bilinçli

Bu oturumda **sadece veri modeli + görünür Settings UI'ı** yapıldı.

**Gerçek tetikleme mantığı (hata yakalanınca provider değiştirme) BU OTURUMA DAHİL DEĞİL.**

Sebep: tetikleme, görev ortasında UI'dan karar bekleyen yeni bir kontrol akışı gerektiriyor. Bunu UI'sız/test edilemez haldeyken yazmak riskli. Önce ayarlar çalışsın ve kullanıcı görsün, sonra davranış üstüne eklensin. Bu, planda açıkça kararlaştırıldı ve onaylandı.

**Sonuç:** Bu oturum sonunda rate limit hâlâ eskisi gibi düz metin hata gösteriyor. Yeni ayarlar kaydediliyor ama henüz hiçbir şeyi tetiklemiyor. UI'nın altında bunu açıkça söyleyen bir not var.

---

## Yapılanlar

### 1. Veri modeli

`apps/vscode/src/shared/storage/state-keys.ts` — `USER_SETTINGS_FIELDS`'e iki alan:

```ts
providerFailoverMode: { default: "ask" as "ask" | "auto" | "stop" },
providerFailoverOrder: { default: [] as ApiProvider[] },
```

**İki tasarım kararı:**

- **`"stop"` (`"off"` değil)** — `apps/openprovider/src/routing/switch-policy.ts`'teki mevcut `SwitchPolicy` tipiyle birebir eşleşsin diye. Bir sonraki oturumda tetikleme mantığı eklenince çeviri katmanı gerekmeyecek.
- **`GLOBAL_STATE_FIELDS` değil `USER_SETTINGS_FIELDS`** — İlk denemede `GLOBAL_STATE_FIELDS`'e konuldu ve generator alanları proto'ya **hiç eklemedi**. Sebep: `scripts/generate-state-proto.mjs` sadece `API_HANDLER_SETTINGS_FIELDS` + `USER_SETTINGS_FIELDS` okuyor (satır 496-497). `favoritedModelIds`'in de proto'da olmamasının sebebi bu. Alanlar `USER_SETTINGS_FIELDS`'e taşınınca generator tag 187/188'i otomatik atadı.

### 2. Proto

- `Settings` mesajı: generator otomatik üretti (tag 187, 188). **Elle düzenlenmedi.**
- `UpdateSettingsRequest`: elle eklendi (bu mesaj generator'a tabi değil) — tag 45, 46, 47.

**`provider_failover_order_set` flag'i neden var:** proto3'te `repeated` alanlar `optional` olamaz, yani boş dizi ile "bu patch'e dahil değil" ayırt edilemiyor. Kullanıcı listeyi bilinçli olarak temizlerse bunun kaybolmaması için ayrı bir flag gerekti.

### 3. Conversion zinciri (4 dosya, `preferredLanguage` deseni izlendi)

| Dosya | Değişiklik |
|---|---|
| `src/shared/ExtensionMessage.ts` | `ExtensionState`'e iki alan + `ApiProvider` import'u |
| `src/core/controller/state/getStateToPostToWebview.ts` | `getGlobalSettingsKey` ile okuma + return objesine ekleme |
| `src/core/controller/state/updateSettings.ts` | İki handler; mode için değer doğrulaması, order için `_set` flag kontrolü |
| `webview-ui/src/context/ExtensionStateContext.tsx` | Webview varsayılanları (`"ask"`, `[]`) |

### 4. Yeni Settings sekmesi

**Yeni dosya:** `apps/vscode/webview-ui/src/components/settings/sections/ProviderPrioritySection.tsx`

`SettingsView.tsx`'te üç nokta: `SettingsTabID` union, `SETTINGS_TABS` girişi (api-config'den hemen sonra, `ListOrdered` ikonu), `TAB_CONTENT_MAP`.

**İçerik:**
- Üstte üç seçenekli radio grubu (Ask first / Switch silently / Never switch), her birinin altında ne yaptığını açıklayan bir satır
- Altta sıralı liste, her satırda yukarı/aşağı ok butonları
- Varsayılan sıra: `gemini > cerebras > groq > openrouter > nvidia` — `apps/openprovider/src/routing/config.ts`'teki `suggestConfig` tercih sırasından, **import edilmeden kopyalandı** (iki app farklı runtime/bundler, liste 5 elemanlı)
- Altta `5 providers included. More slots — coming soon.` notu

**Ekleme/çıkarma (2026-08-03 20:48'de eklendi):** İlk sürümde liste sabitti — sadece sıralama değiştirilebiliyordu. Kullanıcı *"bunlar sabit providerler istedigimzi gibi degistirebilmemiz lazim"* dedi. Eklenenler:

- Her satırda `X` butonu — o sağlayıcıyı listeden çıkarır
- Listenin altında bir dropdown — katalogdaki (`useProviderListings`) **zaten listede olmayan** sağlayıcıları alfabetik gösterir, seçilince listenin sonuna ekler
- 5 slot dolunca dropdown devre dışı kalır ve `"All free slots used"` yazar; alttaki not `"N of 5 free slots used"` şeklinde canlı sayaca çevrildi
- Liste boşaltılırsa uyarı satırı: *"The list is empty — nothing will be tried after the active provider."*

**Bu değişikliğin ortaya çıkardığı ince hata ve çözümü:** Kayıtlı boş dizi iki farklı anlama geliyordu — "kullanıcı bu ekrana hiç dokunmadı" (→ varsayılan 5'liyi göster) ve artık "kullanıcı bilerek hepsini sildi" (→ boş göster). Sadece ekleme/çıkarma varken ikincisi mümkün değildi. Düzeltmeden önce son satır silinince liste sessizce 5 varsayılana geri dönüyordu. Çözüm: component içinde `hasEdited` bayrağı; bu ekrandan bir kayıt yapıldıktan sonra boş dizi gerçek cevap sayılıyor. Tek mutasyon yolu (`commit`) bayrağı tek yerde set ediyor.

**Bilinen sınır:** `hasEdited` sadece component ekranda dururken yaşıyor. Kullanıcı listeyi tamamen boşaltıp Settings'ten çıkıp geri dönerse varsayılan 5'li tekrar görünür. Kalıcı çözüm ayrı bir state key (`providerFailoverOrderCustomized`) gerektiriyor — yeni bir proto alanı + conversion zinciri demek. Bu oturumun kapsamına alınmadı; "hepsini sil ve öyle bırak" muhtemelen nadir bir durum, ve tetikleme mantığı yazılırken (Oturum 2) boş liste zaten "geçiş yapma" olarak ele alınacağı için orada tekrar değerlendirilmeli.

**Sürükle-bırak eklenmedi** — `webview-ui/package.json`'da `@dnd-kit` gibi bir paket yok, yeni bağımlılık bu oturumun kapsamı dışında. Ok butonları klavye erişilebilirliğini de bedavaya getiriyor.

**Ölü buton yok** — "premium" için tıklanabilir ama hiçbir şey yapmayan bir buton yerine düz metin notu tercih edildi (ölü buton bug gibi okunur).

---

## Dürüst sınırlar

**"Yapılandırılmış provider" filtresi yok.** Plan, sadece kullanıcının key girdiği sağlayıcıları listelemeyi öneriyordu. Araştırınca `ProviderListing` proto'sunda böyle bir alan olmadığı, `configuredApiKeys`'in de webview'e akmadığı görüldü. Uydurma bir "yapılandırılmış" göstergesi yazmak yerine liste olduğu gibi gösteriliyor; key kontrolü gerçek failover tetiklenirken extension host tarafında (`resolveApiKey` zaten var) yapılacak. UI'da bu açıkça yazıyor: *"A provider is skipped if you have not saved an API key for it."*

**`Settings` proto mesajı bu repoda hiçbir elle yazılmış kod tarafından tüketilmiyor** — sadece üretilmiş dosyalarda var. Gerçek veri yolu `getStateToPostToWebview` → `ExtensionMessage` → `ExtensionStateContext`. Alanlar yine de proto'ya eklendi (tutarlılık için) ama işi yapan kanal bu değil.

---

## Doğrulama

| Kontrol | Sonuç |
|---|---|
| `bunx tsc --noEmit` (extension host) | Temiz |
| `bunx tsc -b` (webview) | Temiz |
| `biome lint` (değişen dosyalar) | Temiz |
| `bun run package` (tam production build) | Temiz, 1116 dosya lint'ten geçti |
| Proto generator | Tag 187/188 otomatik atandı, elle düzenleme yok |
| Bundle doğrulaması | `"Provider Priority"` webview bundle'ında, `providerFailoverMode`/`providerFailoverOrderSet` extension bundle'ında |
| vsix | `openprovider-0.0.5.vsix` (2026-08-03 08:06) |

**Davranış testi yapılmadı** — çünkü bu oturumda kasıtlı olarak davranış değişikliği yok. Kullanıcının manuel doğrulaması: Settings → Provider Priority sekmesi görünüyor mu, mod seçimi ve sıralama VS Code yeniden başlatılınca korunuyor mu.

---

## Kurulum

Kullanıcı **kurulu .vsix** üzerinden çalışıyor (F5 debug host değil). Yani:

1. Extensions (Ctrl+Shift+X) → OpenProvider → Uninstall
2. `...` menüsü → **Install from VSIX...** → `c:\OpenProvider\openprovider-0.0.5.vsix`
3. VS Code'u tamamen kapat-aç

> Dosyaya çift tıklama **işe yaramaz** — Windows onu Visual Studio Installer'a yönlendiriyor, VS Code'a değil.

---

## Sırada ne var (Oturum 2)

Tetikleme mantığı. Keşifte doğrulanan bağlantı noktaları:

1. **Hook noktası:** `apps/vscode/src/sdk/SdkController.ts` → `onSendError` callback'i (satır ~374). Zaten `isClineAuthError` / `isClineBalanceError` gibi özel dallara ayrılıyor; rate-limit dalı buraya doğal oturuyor.
2. **Sınıflandırma:** `ClineError.getErrorType()` → `ClineErrorType.RateLimit` (`RATE_LIMIT_PATTERNS`, satır 54) zaten çalışıyor, provider-agnostik.
3. **Geçişi uygulama:** `SdkProviderChangeCoordinator.restartActiveSessionForProviderChange()` (`sdk-provider-change-coordinator.ts:65`) — **hiç değişiklik gerekmiyor**. Session ID'yi koruyor, mesaj geçmişini taşıyor. Programatik tetiklenmek üzere yazılmış ama şimdiye kadar sadece kullanıcı elle provider değiştirince çağrılıyordu; failover handler ikinci çağıran olacak.
4. **"Sorarak" modda UI:** `ErrorRow.tsx`'in `RateLimit` dalına (satır 44-51) yeni bir `ProviderSwitchPrompt.tsx` — `SpendLimitError` deseninin aynısı. Karar için gRPC round-trip gerekecek (extension host bekler, webview cevabı postalar).
5. **Taşınacak mantık:** `apps/openprovider/src/routing/switch-policy.ts` + `rate-limit.ts` — saf TypeScript, sıfır VS Code bağımlılığı, 250 satırın altında. Karar: paylaşılan pakete çıkarmak yerine `apps/vscode/src`'e **kopyalanacak** (iki app farklı bundler; üçüncü bir tüketici çıkarsa paket ayrılır).

Ayrıca hâlâ ölçülmemiş: NVIDIA'nın gerçek rate limit değerleri (`quirks.ts`'te `measuredOn` alanı boş).
