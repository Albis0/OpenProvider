# Faz 7 — Rate Limit'te Sorarak Geçiş

**Tarih:** 2026-07-31
**Başlangıç:** 08:27
**Bitiş:** 08:34
**Süre:** ~7 dakika
**Branch:** `roadmap-v2`
**Durum:** Tamamlandı ✅ — 20/20 kontrol geçti

---

## Ne istendi

CLAUDE.md'nin ikinci ürün hedefi. O ana kadar router bir sağlayıcı patlayınca
**sessizce** diğerine geçiyordu. Bu bir script için doğru varsayılan, bir insan
için yanlış: kullanıcı modeli bir sebeple seçti, görev ortasında haber vermeden
değiştirmek istemediği bir çıktı üretiyor.

**Bitiş kriteri:** Kotası dolmuş bir sağlayıcıyla çalışırken geçiş öncesi
callback tetikleniyor; `"wait"` cevabında bekleyip aynı sağlayıcıyla devam
ediyor, `"switch"` cevabında diğerine geçiyor. İkisi de test edilmiş.

---

## Ne yapıldı

### `src/routing/rate-limit.ts` — sağlayıcının düzyazısını okumak

Sağlayıcılar rate limit'i nasıl söyleyeceklerinde anlaşamıyor:

| Sağlayıcı | Mesaj |
|---|---|
| Gemini | `Quota exceeded ... Please retry in 48.091315407s.` |
| Groq | `tokens per minute (TPM): Limit 8000 ... try again in 2m30s.` |
| Diğerleri | çıplak `429` |

Bu yolda okunacak yapısal bir alan yok — `AgentRunResult.error` bir `Error` ve
mesajı sağlayıcının düzyazısı. O yüzden düzyazı ayrıştırılıyor.

**Sınıflandırıcı bilerek cömert, süre ayrıştırıcı bilerek katı.** Bir auth
hatasını rate limit sanmak sadece gereksiz bir soru sorduruyor; olmayan bir
bekleme süresi uydurmak ise kimsenin söylemediği bir sayı için boş boş
oturmak demek. `retryAfterMs` asla tahmin edilmiyor.

### `src/routing/switch-policy.ts` — karar

Üç politika:

| Politika | Davranış |
|---|---|
| `"ask"` (varsayılan) | Kararı çağırana bırakır (`onProviderSwitch`) |
| `"auto"` | Sessizce geçer — Faz 7 öncesi davranış, gözetimsiz çalıştırmalar için doğru |
| `"stop"` | Asla geçmez, başarısız olur — tek bir sağlayıcı kabul edilebilirse |

Üç cevap: `"switch"`, `"wait"`, `"abort"`.

**Soru sayıları taşıyor.** "Groq rate limit'e takıldı" cevaplanabilir bir soru
değil; "8000/8000 token bu dakika, 32 saniyede sıfırlanıyor, beta'ya geçilsin
mi?" cevaplanabilir. Faz 6'nın kota verisi tam da bunun için vardı.

**`"ask"` ama callback yoksa `autoDecide`'a düşüyor** — sorulacak kimse yokken
beklemek, karar vermekten kötü.

### Beklemenin sınırları

- Sadece sağlayıcı **süre söylediyse** bekleniyor
- En fazla 90 saniye — ötesinde beklemek geçmekten kötü
- **Bir kez** bekleniyor; ikinci başarısızlıkta geçiliyor
- Süreye 500ms yastık ekleniyor: sağlayıcılar sınırı bildiriyor, tam üstüne
  gelmek genelde tekrar reddediliyor

---

## Test sonuçları — 20/20

Tamamı stub. Gerçek bir rate limit'i istediğin anda tetiklemek tekrarlanabilir
değil, ve gerçeğini beklemek teste bir dakika uyku koymak olurdu — `sleep`
enjekte ediliyor, yani zamanlama mantığı süreyi harcamadan doğrulanıyor.

```
1. Reading the provider's prose
PASS  recognises Gemini's quota message and its delay — retryAfterMs=48091
PASS  recognises Groq's TPM message and its compound delay — retryAfterMs=150000
PASS  does not treat an auth failure as a rate limit
PASS  never invents a delay the provider did not state

2. Default decisions
PASS  auto waits out a short, stated delay — 5s -> wait
PASS  auto switches rather than waiting twice
PASS  auto switches on a long delay — 2m30s -> switch
PASS  auto switches when no delay was stated
PASS  auto aborts when there is nowhere to go
PASS  stop policy never switches
PASS  the question carries the numbers — "alpha: 8000/8000 tokens/min (100%)"

3. Asking, then waiting
PASS  the callback was consulted before switching
PASS  the request carried the stated delay and an alternative — 48091ms, to=beta
PASS  it waited roughly the stated time — slept 48591ms
PASS  and stayed on the provider the user chose — calls: alpha -> alpha

4. Asking, then switching
PASS  switching moves to the alternative immediately — calls: alpha -> beta
PASS  the switch is recorded in the notices

5. Waiting is offered once
PASS  waited at most once
PASS  then moved on instead of stalling — calls: alpha -> alpha -> beta

6. Stop policy
PASS  stayed on the chosen provider and failed
```

---

## Yan etki: retry bütçesi kurtarıldı

Faz 4'te yazdığım bir test bu fazda kırıldı — ve sebebi davranışın
**iyileşmesiydi**.

Önceden bir sağlayıcı patlayınca, doğrulama döngüsünün iki denemesinden biri
harcanıyordu. Artık geçiş **aynı deneme içinde** oluyor, yani tek retry hakkı
"kod yanlış" durumu için saklı kalıyor — "sağlayıcı çöktü" için değil.

Test eski davranışı sabitlemişti (`attempts === 2`); yeni davranışı ve
gerekçesini yazacak şekilde güncellendi.

---

## Bilinen sınırlar

- **Ayrıştırma düzyazıya bağlı.** Sağlayıcı mesaj metnini değiştirirse süre
  okunamaz hâle gelir — o durumda `retryAfterMs` `undefined` olur ve sistem
  geçmeye karar verir, yani güvenli tarafa düşer.
- **Faz 6'nın başlıklarındaki `resetsInMs` henüz karar için kullanılmıyor.**
  Sadece hata mesajındaki süre okunuyor. Başlık daha güvenilir; birleştirilmeli.
- **`"ask"` politikası eşzamanlı.** Callback dönene kadar çalışma bekliyor;
  bir UI'da bu bir dialog demek.
- **Geçiş sayısı sağlayıcı sayısıyla sınırlı**, ama her biri bir istek
  harcıyor. Kotası dolu üç sağlayıcı üç başarısız istek demek.

---

## Roadmap v2 durumu

| Faz | Durum | Kontrol |
|---|---|---|
| Faz 4 — Birleşik oturum | ✅ | 11/11 |
| Faz 5 — Sağlayıcı uyumluluk | ✅ | 11/11 |
| Faz 6 — Kota takibi | ✅ | 16/16 |
| Faz 7 — Sorarak geçiş | ✅ | 20/20 |

Ek olarak v1'den devam eden `probe-verify` 7/7. **Toplam 65 kontrol, hepsi
geçiyor.**

Roadmap v2'nin dördü de bitti. Bu branch `main`'e merge edilmedi — proje
sahibinin incelemesi bekleniyor.
