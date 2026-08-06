# Provider Failover — Tetikleme Mantığı (Oturum 2/2)

**Başlangıç:** 2026-08-03 21:00
**Bitiş:** 2026-08-03 21:50

---

## Ne yapıldı

Oturum 1 sadece ayar ekranını kurmuştu; ayarlar kaydediliyor ama hiçbir şeyi tetiklemiyordu. Bu oturumda **gerçek davranış** bağlandı: rate limit'e takılınca ajan sıradaki sağlayıcıya geçiyor ve **yarıda kalan görevi kaldığı yerden sürdürüyor**.

Üç mod da artık çalışıyor:

| Mod | Davranış |
|---|---|
| `auto` | Sessizce geçer, sohbete tek satır bilgi notu düşer, tur devam eder |
| `ask` | Kullanıcıya iki butonlu soru sorar, cevabı bekler |
| `stop` | Hiç karışmaz, hata eskisi gibi görünür |

---

## Mimari — neden bu noktalar

### Hook: `onSendError`

`SdkController.ts` içindeki `onSendError` callback'i zaten `isClineAuthError` / `isClineBalanceError` gibi özel dallara ayrılıyordu. Rate limit dalı araya doğal oturdu:

```ts
} else if (await this.tryFailoverOnRateLimit(error, errorMessage, providerId, sessionId)) {
    // Geçiş yapıldı ve tur sürdürüldü; hata çıkmaza sokmuyor.
} else {
    // ... mevcut hata yolu, hiç değişmedi
}
```

`tryFailoverOnRateLimit` **false döndüğü her durumda** eski davranış aynen korunuyor — rate limit değilse, mod `stop` ise, geçilecek sağlayıcı kalmadıysa, kullanıcı hayır dediyse veya geçişin kendisi patladıysa.

### Sınıflandırma: mevcut `ClineError` kullanıldı, yenisi yazılmadı

`apps/openprovider/src/routing/rate-limit.ts`'te bir `isRateLimitError` sınıflandırıcısı var ama **kopyalanmadı**. Sebep: `ClineError.getErrorType()` zaten aynı işi yapıyor, provider-agnostik ve extension'ın her yerinde kullanılıyor. İki ayrı sınıflandırıcının zamanla birbirinden ayrılması, tek bir sınıflandırıcının eksik olmasından daha kötü.

Kopyalanan tek şey **gecikme parser'ı** (`parseRetryDelay`) — bunun extension tarafında karşılığı yoktu. Şu an sadece test edildi, henüz bir yerde tüketilmiyor: "bekle" seçeneği bu oturumun kapsamında değil (aşağıya bak).

### Geçişi uygulama: mevcut provider-change yolu

Yeni bir session restart mekanizması yazılmadı. Config'e yeni provider yazılınca `handleApiConfigurationChanged` → `SdkProviderChangeCoordinator` zinciri zaten devreye giriyor; bu zincir session ID'yi koruyor ve mesaj geçmişini taşıyor. Failover bu zincirin ikinci çağıranı oldu, koordinatörde **tek satır değişiklik gerekmedi**.

Model seçimi de `normalizeProviderSwitchModel`'e bırakıldı — yeni sağlayıcı için geçerli bir model id'sini (son kullanılan → SDK varsayılanı → katalogdaki ilk) zaten o çözüyor.

### Turu sürdürme: `askResponse()` — "Retry" butonunun yaptığı şey

Session restart geçmişi taşıyor ama **başarısız mesajı yeniden göndermiyor**. Yani sadece provider değiştirmek görevi yarıda bırakırdı.

Keşifte, webview'deki "Retry" butonunun aslında `askResponse` çağrısından ibaret olduğu görüldü (`useMessageHandlers.ts:301`). Boş prompt'la `askResponse()` çağırmak, yeni bir kullanıcı mesajı eklemeden kesilen turu sürdürüyor. Failover da tam olarak bunu yapıyor — yani kullanıcının elle "Retry"a basmasıyla aynı yol, sadece otomatik.

### "Sorarak" modu: yeni proto/UI yazılmadı

Plan, `ErrorRow.tsx`'e yeni bir `ProviderSwitchPrompt.tsx` + yeni bir gRPC round-trip öngörüyordu. Keşifte `SdkInteractionCoordinator.handleAskQuestion` bulundu: soruyu seçeneklerle gösteriyor, turu bloke ediyor, cevabı bekliyor — hepsi hazır.

Sonuç: **sıfır yeni proto alanı, sıfır yeni component**. Soru şöyle görünüyor:

```
nvidia hit its rate limit.

429 Too Many Requests

Switch to groq and continue?
   [Switch to groq]  [Stay and show the error]
```

Serbest metin cevabı **onay sayılıyor** — sadece açık ret ("Stay and show the error") geçişi engelliyor. Gerekçe: kullanıcı görev ortasında sorulunca butona basmak yerine "evet devam et" yazabilir; bunu "hayır" saymak yanlış olurdu.

---

## Bulunan ve düzeltilen hata: sonsuz döngü riski

Bir turda hangi sağlayıcıların zaten patladığını tutan bir `exhausted` seti var; `onSendStart`'ta temizleniyor ki yeni bir tur temiz başlasın.

**Sorun:** failover'ın kendi başlattığı retry de bir "send" — yani `onSendStart` → `beginTurn()` → set temizleniyor. Bu haliyle iki sağlayıcı arasında sonsuz gidip gelme mümkündü: nvidia patlar → groq'a geç → set temizlenir → groq patlar → nvidia'ya geç → ...

**Çözüm:** `isRetrying` bayrağı. Failover'ın tetiklediği retry sırasında `beginTurn()` no-op oluyor. Bu davranış test edildi (`"keeps its memory when the retry it started re-enters beginTurn"`) — test, gerçek send yolunun `beginTurn()`'ü geri çağırmasını taklit ediyor ve zincirin üçüncü adımda `exhausted` ile durduğunu doğruluyor.

Bayrağın doğru çalışması ince bir zamanlama varsayımına dayanıyor: `resumeTurn()` döndüğü promise settle olmadan **önce** send'e (dolayısıyla `onSendStart`'a) ulaşıyor. Bu, resume'un prompt taşımaması sayesinde geçerli — prompt olsaydı `resolveContextMentions` await'i araya girip sırayı bozardı. Bu bağımlılık kodda yorum olarak yazıldı.

---

## Dosyalar

**Yeni:** `apps/vscode/src/sdk/failover/`
| Dosya | İş |
|---|---|
| `provider-failover.ts` | Sıradaki sağlayıcıyı seç (saf fonksiyon), config patch'i üret |
| `rate-limit.ts` | Gecikme parser'ı (openprovider'dan kopyalandı) |
| `sdk-failover-coordinator.ts` | Kararı uygula: config yaz → restart bekle → turu sürdür |
| `provider-failover.test.ts` | 16 test |
| `sdk-failover-coordinator.test.ts` | 11 test |

**Değişen:** `SdkController.ts` (+86 satır, mevcut 2 import satırı genişletildi — başka hiçbir satır silinmedi), `ProviderPrioritySection.tsx` (alttaki "henüz çalışmıyor" notu gerçeğe uygun hale getirildi).

### Seçim kuralları (`selectNextProvider`)

Sırayla atlanan: (1) az önce patlayan sağlayıcı, (2) bu turda zaten denenmiş olanlar, (3) **API key'i olmayanlar**. Üçüncüsü önemli — keysiz bir sağlayıcıya geçmek anında patlar ve bug gibi görünür. Kontrol için `resolveApiKey` kullanıldı, yani session factory'nin başlangıçta kullandığı aynı çözümleme.

Karşılaştırmalar kanonik yazımla yapılıyor (`toLegacyApiProvider`): `openai` ile `openai-compatible` aynı sağlayıcı; yazım farkı yüzünden az önce patlayan sağlayıcının tekrar seçilmesi engellendi. Bu da test edildi.

---

## Doğrulama

| Kontrol | Sonuç |
|---|---|
| Yeni birim testler | 27/27 geçti |
| `bun scripts/run-bun-unit-tests.ts` (tüm suite) | 935 geçti, 1 kaldı |
| `bunx tsc --noEmit` (extension) | Temiz |
| `bunx tsc -b` (webview) | Temiz |
| `bun run check-types` | Temiz |
| `biome check` (yeni dosyalar) | Temiz |
| Webview + extension build | Temiz |
| Bundle doğrulaması | Failover metinleri her iki bundle'da bulundu |
| vsix | `openprovider-0.0.5.vsix` (2026-08-03 21:47; 2026-08-04 07:37'de UI yenilemesiyle birlikte yeniden paketlendi) |

**Kalan 1 test:** `src/test/shell.test.ts` — Windows shell profil yolu testi. **Bu değişiklikle ilgisi yok:** değişiklikler `git stash` ile geçici olarak geri alınıp test tekrar çalıştırıldı, aynı şekilde kaldı.

**Vitest bu makinede çalışmıyor** (`@vitest/utils/helpers` çözümlenemiyor — bun hoisting sorunu, önceden var olan bir durum; mevcut bir test dosyasıyla doğrulandı). Testler vitest formatında yazıldı (komşu SDK testleriyle tutarlı olsun diye) ama doğrulama `bun test`'e geçici çevrilerek yapıldı. CI'da vitest çalışıyorsa oldukları gibi koşacaklar.

> **Sonradan not (2026-08-04):** Vitest **webview** workspace'inde sorunsuz çalışıyor (`apps/vscode/webview-ui`, 310 test). Bozuk olan sadece extension-host workspace'i. Yukarıdaki tespit o workspace için geçerli.

---

## Dürüst sınırlar

**Gerçek 429 ile test edilmedi.** Doğrulama birim testleri + tip kontrolü + bundle kontrolü seviyesinde. Gerçek bir rate limit senaryosu ancak kullanımda ortaya çıkar; NVIDIA'nın limitine tekrar takılınca görülecek.

**"Bekle" seçeneği yok.** `switch-policy.ts`'teki `autoDecide`, kısa bir gecikme bildirildiğinde beklemeyi tercih ediyordu. Bu taşınmadı: beklemek turu askıda tutan yeni bir zamanlayıcı gerektiriyor ve geçiş yapmak zaten daha hızlı. `parseRetryDelay` ileride bunu isteyecek olan için hazır duruyor.

**Boş liste hâlâ varsayılana düşüyor.** Kullanıcı listeyi tamamen boşaltırsa, extension tarafı bunu "hiç ayarlanmamış" sayıp varsayılan 5'liyi kullanıyor. Oturum 1'de not edilen aynı belirsizlik; kalıcı çözümü ayrı bir state key gerektiriyor.

**Kota ölçümü hâlâ yok.** `quirks.ts`'te NVIDIA/cerebras/openrouter için `measuredOn` boş.

---

## Kurulum

1. Extensions (Ctrl+Shift+X) → OpenProvider → Uninstall
2. `...` → **Install from VSIX...** → `c:\OpenProvider\openprovider-0.0.5.vsix`
3. VS Code'u tamamen kapat-aç

> Çift tıklama işe yaramaz — Windows dosyayı Visual Studio Installer'a yönlendiriyor.
