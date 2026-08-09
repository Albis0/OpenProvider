# Failover Motoru — Kök Neden ve Yeni Mimari

**Tarih:** 2026-08-08
**Branch:** `feature/failover-architecture`
**Sürüm:** 0.0.12
**Durum:** Uygulandı, 905/905 test geçiyor. Canlı 429 ile denenmedi.

---

## Özet

Failover üç sürümdür **hiç çalışmıyordu**. Sebebi bir regex hatası değildi — motor, **hiç tetiklenmeyen bir yola bağlanmıştı**.

Bu rapor kök nedeni, neden daha önce fark edilmediğini ve yerine kurulan katmanlı mimariyi anlatıyor.

| Commit | İş |
|---|---|
| `4d56e16ab` | Kök neden düzeltmesi + katmanlı sınıflandırıcı + sessiz kalmama |
| `0f67474ca` | Cooldown + uçtan uca zincir testi |
| `60a32b041` | 0.0.12 |

---

## Kök neden

### Belirti

Kullanıcı NVIDIA'da gerçek bir görev sırasında limite takıldı:

```
ResourceExhausted: Worker local total request limit reached (33/32)
```

Hiçbir geçiş olmadı, hiçbir bildirim çıkmadı. Görev durdu.

### İlk (yanlış) teşhis

Bunu bir **regex sorunu** sandım. `ClineError.ts`'teki desen `resource exhausted` (boşluklu) bekliyordu, NVIDIA ise `ResourceExhausted` (bitişik) yazıyordu. Deseni düzelttim, test yazdım, 0.0.11 çıkardım.

**Failover yine çalışmadı.** Düzeltme doğruydu ama yetersizdi.

### Gerçek sebep

Failover'ın tek girişi şuraya bağlıydı:

```
tryFailoverOnRateLimit()
  └── çağıran: onSendError()                    SdkController.ts:411
        └── çağıran: sdk-session-lifecycle.ts:410
              └── .catch()   ← SADECE promise REJECT olursa
```

Ama **Cline SDK sağlayıcı hatalarını fırlatmıyor.** `agent_event` akışında `type: "error"` olarak yayınlıyor ve send promise'i normal çözülüyor. `.catch()` hiç girilmiyor → `onSendError` hiç çalışmıyor → failover hiç çağrılmıyor.

Yani motorun tamamı — sınıflandırıcı, sağlayıcı seçici, geçiş mantığı, birim testleri — **çağrılmayan bir fonksiyonun arkasında** duruyordu.

### Neden fark edilmedi

Çünkü **her parça tek tek çalışıyordu.** Sınıflandırıcının testi vardı ve geçiyordu. Seçicinin testi vardı ve geçiyordu. Geçiş mantığının testi vardı ve geçiyordu. Bozuk olan **aralarındaki kablo**ydu ve hiçbir test oradan başlamıyordu.

En çarpıcı detay: hatayı yakalayan kod **zaten vardı**. `sdk-session-event-coordinator.ts:149`'daki `getAgentFailureTelemetry()` tam olarak bu event'i tespit ediyor, hata metnini çıkarıyor — ve sadece **telemetriye** gönderiyordu.

İki kod parçası aynı olayı bekliyordu: telemetri doğru yerde dinliyordu, failover yanlış yerde.

---

## Yeni mimari

### Tek giriş

```
agent_event(error)  ─┐
                     ├──►  classifyFailure  ──►  policy  ──►  switch + resume
onSendError()       ─┘
```

Kanca, tespitin **zaten çalıştığı** yere kondu — yeni bir dinleyici eklenmedi, var olan tespit ikinci bir tüketiciye bağlandı.

`onSendError` yolu da korundu: nadir de olsa send'in kendisi reddedebilir. İki yol da aynı `tryFailoverOnProviderFailure`'a gidiyor, böylece politika ve döngü koruyucuları arasında tutarsızlık olamaz.

**Değişen dosyalar:**
- `apps/vscode/src/sdk/sdk-session-event-coordinator.ts` — kanca + hata mesajını bastırma
- `apps/vscode/src/sdk/SdkController.ts` — tek giriş noktası

### Katmanlı sınıflandırma

Tek bir regex listesi, her yeni sağlayıcı ifadesini **sessiz** bir arızaya çeviriyordu. Sessiz olan en kötüsü: kullanıcı failover'ın çalıştığını sanıyor.

**Yeni dosya:** `apps/vscode/src/sdk/failover/failure-classifier.ts`

| Katman | Sinyal | Neden bu sırada |
|---|---|---|
| 1 | HTTP status (429, 500-504, 529) | Sayı, ifadeye bağlı değil |
| 2 | Hata kodu / gRPC durum adı | Makine okunur, sağlayıcıdan bağımsız |
| 3 | Bilinen ifadeler (regex) | Son çare |
| 4 | **Tekrar** | Tanınmayan hata 2. kez → geçişe değer |

**Katman 4 emniyet supabıdır.** Hiç görülmemiş ifadeli bir sağlayıcı artık sessizce ölmüyor, ikinci denemede geçiyor. Bu, regex listesinin asla sahip olamayacağı özellik: sınıflandırıcının bilmediği şey artık görevi bitirmiyor.

**Terminal hatalar önce eleniyor** (bozuk anahtar, yetkisiz, desteklenmeyen parametre, bakiye yok). Bunlar her sağlayıcıda aynı şekilde başarısız olur; zincir boyunca sürüklemek beş kopya hata üretip gerçek sebebi gömerdi. Katman 4'ün bunları "tekrarlayan hata" sanmasını engellemek için ilk sırada.

`402 Payment Required` bilinçli olarak **geçişe değer sayılmıyor** — kullanıcıyı sessizce başka bir ücretli sağlayıcıya taşımak, onay vermediği bir harcama demek.

### Cooldown

`exhausted` set'i sadece bir tur yaşıyordu. Sonraki mesaj, kotası yeni bitmiş sağlayıcıya doğrudan geri dönüp bildiğimiz şeyi öğrenmek için bir hata daha harcıyordu.

Rate limit artık 2 dakikalık cooldown koyuyor; sağlayıcı kendi gecikmesini söylediyse **o kazanıyor** (kendi penceresini bizden iyi bilir).

Sadece **throttling** cooldown kazanıyor. Overloaded ya da tanınmayan bir hata sonraki mesajda pekâlâ düzelmiş olabilir; kullanıcıyı seçtiği modelden zayıf kanıtla uzaklaştırmak yanlış olurdu.

Soğuyan sağlayıcı **atılmıyor, geriye alınıyor**: başka hiçbir aday kalmadıysa, toparlanmış olabilecek bir sağlayıcı görevi tamamen bitirmekten iyidir.

### Sessiz kalmama

Failover **çalışmadığında** da artık sebebini söylüyor:

> ⚠ Rate limit — no switch made
> nvidia hit its rate limit, but no other provider with an API key is available to switch to. Add a key in Settings → Provider Priority to enable failover.

Sebep şu: sessiz bir no-op ile bozuk bir motor **birbirinden ayırt edilemez**. Bu özelliğin ölü kod yolu tam olarak bu yüzden üç sürüm hayatta kaldı. Kullanıcı "geçecek yer yok" ile "özellik çalışmıyor" arasındaki farkı görebilmeli.

`stop` modu istisna — kullanıcının kendi ayarını her hatada ona tekrarlamak gürültü, sadece log'a düşüyor.

---

## Doğrulama

| Kontrol | Sonuç |
|---|---|
| `bunx tsc --noEmit` (extension) | Temiz |
| `bunx tsc -b` (webview) | Temiz |
| Extension testleri | **905/905** (öncesi 863, +42 yeni) |
| biome lint | Temiz |
| vsix | `openprovider-0.0.12.vsix` |

### Yeni testler

**`failure-classifier.test.ts` (28 test)** — NVIDIA'nın gerçek metni, üç gRPC yazımı, 429/5xx, tekrar katmanı, ve **yanlış-pozitif olmaması gerekenler** (bozuk anahtar, 400, 402, desteklenmeyen parametre).

**`failover-chain.test.ts` (14 test)** — asıl eksik olan test. Gerçek bir sağlayıcı hatasından başlayıp gözlenebilir sonuca bakıyor:

- NVIDIA'nın birebir metni → sağlayıcı değişti **ve tur devam etti**
- Zincirde aşağı yürüme (nvidia → groq → gemini)
- Aday kalmayınca **açıklama yapılıyor**
- Terminal hata → hiçbir şey yapılmıyor
- Tanınmayan hata → 1. kez hayır, 2. kez evet
- Cooldown: turlar arası hafıza, süre dolunca geri dönüş, son çare tercihi
- Tek tur içinde iki sağlayıcı arasında **döngüye girmiyor**

Bir test özellikle bu bug'ın nüksetmesini engelliyor: kancanın hâlâ agent-error dalından çağrıldığını doğruluyor. Biri onu `onSendError`'a geri taşırsa **test patlar**, özellik sessizce ölmez.

### Neden fault injection

Gerçek 429 beklemek sürdürülemez — bu bug tam olarak öyle kaçtı. Hata enjekte edilerek tüm zincir kotaya dokunmadan koşuyor.

---

## Bilinen açıklar — dürüst liste

**Canlı 429 ile denenmedi.** Zincir NVIDIA'nın birebir metniyle uçtan uca kanıtlandı, ama gerçek bir sağlayıcı hatasıyla değil. Asıl doğrulama kullanıcı tekrar limite takılınca olacak — fark şu ki artık beklemeye gerek kalmadan regresyon yakalanıyor.

**`onSendError`'ın hiç ateşlenmediği hâlâ hipotez.** Kod yolu ve gözlenen davranış bunu destekliyor, canlı doğrulanmadı. Mimari her iki yolu da beslediği için bu belirsizlik zararsız.

**Mid-turn oturum yeniden başlatmanın araç durumunu koruyup korumadığı test edilmedi.** `switchTo` mevcut `SdkProviderChangeCoordinator` yolunu kullanıyor (manuel sağlayıcı değişiminin yolu), ama bir görev **ortasında**, yarım kalmış araç çağrılarıyla hiç denenmedi.

**Bekleme seçeneği uygulanmadı.** Plan "kısa `Retry-After` varsa geçmek yerine bekle" diyordu. Cooldown'a girdi (gecikme süresi cooldown'u uzatıyor) ama aktif bekleme yok — sağlayıcı 5 saniye dese bile hemen geçiyor. Tek sağlayıcılı kullanıcı için bu bir kayıp.

**`ClineError`'ın kendi rate-limit listesi hâlâ duruyor.** İki sınıflandırıcı var: biri hata bandı için (`ClineError`), biri failover için. Bilinçli — farklı sorulara cevap veriyorlar — ama ileride ayrışabilirler.

---

## Sırada ne var

1. **Gerçek kullanımda dene** — 0.0.12 kurulup NVIDIA'da limite takılmalı
2. Aktif bekleme (kısa `Retry-After` + tek sağlayıcı durumu)
3. Mid-turn yeniden başlatmanın araç durumunu koruduğunu doğrula
4. `provider-error-signatures.ts` — sağlayıcıya özel imzalar ayrı tabloya (şu an sınıflandırıcının içinde)
