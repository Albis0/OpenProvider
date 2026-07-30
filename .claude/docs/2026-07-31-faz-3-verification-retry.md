# Faz 3 — Quality Verification / Retry

**Tarih:** 2026-07-31
**Başlangıç:** 01:23
**Bitiş:** 01:30
**Süre:** ~7 dakika
**Durum:** Tamamlandı ✅ — 7/7 kontrol geçti

---

## Ne istendi

Task bittiğinde otomatik doğrulama, başarısızsa **tek seferlik** retry.

Üç adım: post-task hook (build/test çalıştır) → hata geri besleme (tek retry) →
basit rapor (değişen dosyalar, build durumu, test durumu).

**Bitiş kriteri:** Bilerek bozuk kod üreten bir senaryoda sistem hatayı yakalayıp
otomatik bir düzeltme denemesi yapabiliyor ve sonucu raporluyor.

**Yasak:** Çoklu retry zinciri, farklı modellerle sırayla deneme.

---

## Ne yapıldı

`apps/openprovider/src/verify/` altında üç modül:

| Dosya | Sorumluluk |
|---|---|
| `runner.ts` | Komut çalıştırma: paket yöneticisi tespiti, timeout + process tree kill, çıktı sınırlama |
| `verifier.ts` | build/test script'lerini bulup çalıştırma, değişen dosyalar, rapor formatları |
| `retry.ts` | Tek retry döngüsü: çalıştır → doğrula → hata varsa geri besle → bir kez daha → dur |

Doğrulama: `probe-verify.ts`.

---

## Test sonuçları — 7/7

### A. Döngü mekaniği (stub'larla, ağ yok)

```
PASS  recovers on the automatic retry — ok=true, attempts=2
PASS  first failure was captured before the retry — firstReport.ok=false
PASS  stops after one retry instead of looping — ok=false, attempts=2, runner calls=2
PASS  reports the failure to the human — "Still failing after one automatic retry — needs a human."
PASS  does not retry when the first attempt verifies — ok=true, attempts=1
PASS  skips silently when there is nothing to run — build:no package.json, test:no package.json
```

Fixture: `sum(a,b)` fonksiyonu `a - b` döndürüyor, test `sum(2,3) === 5` bekliyor.
Geçici dizinde oluşturuluyor, repoya hiç dokunulmuyor.

En önemli kontrol üçüncüsü: **üçüncü deneme asla olmuyor.** Bu bir sayaçla değil,
kodun yapısıyla garanti — ileride biri sayacı yükseltemesin diye.

### B. Gerçek ajan, gerçek araçlar

`createTool` ile `read_file` ve `write_file` araçları verildi (path escape
koruması dahil).

**Gemini ile:** ajan dosyayı okudu, hatayı buldu, düzeltti; doğrulama geçti.
```
final sum.js: export function sum(a, b) { return a + b; }
test: passed (376ms)
```

**Groq ile:** sağlayıcı isteği reddetti (aşağıya bak), ajan düzeltmeye hiç
başlayamadı. Döngü doğru davrandı:
```
· attempt 1: verifying
· verification failed — feeding the output back for one retry
· attempt 2: verifying
· still failing after the retry — stopping and reporting
BLOCKED  the provider rejected every request — not a loop failure
PASS     loop caught the failure, retried once, and stopped
```

Test bu ikisini **ayırt ediyor**. Sağlayıcının isteği reddetmesi doğrulama
döngüsünün başarısızlığı değil; ikisini aynı kefeye koymak hangisinin gerçek
sorun olduğunu gizlerdi.

---

## Bulunan üç şey

### 1. Groq + gpt-oss-120b + araç kullanımı ÇALIŞMIYOR

```
'messages.1' : for 'role:assistant' the following must be satisfied
[('messages.1' : property 'reasoning_content' is unsupported)]
```

Model `reasoning_content` alanı üretiyor, SDK bunu konuşma geçmişinde geri
gönderiyor, Groq **kendi ürettiği alanı** reddediyor. İlk turda değil, araç
çağrısından sonraki ikinci istekte patlıyor.

**Etkisi büyük:** Groq'un bu modeli tek turluk sohbette çalışıyor ama
araç kullanan ajan döngüsünde kullanılamıyor. Faz 2'de `code` modu Groq'a
yönlendiriliyordu — gerçek kodlama işi için bu ayar yeniden düşünülmeli.

### 2. Gemini ücretsiz katman: günde 20 istek

```
Quota exceeded for metric: generate_content_free_tier_requests,
limit: 20, model: gemini-3.5-flash
```

Test sırasında doldu. Günlük 20 istek, ciddi bir ajan oturumu için çok az.
Bu, projenin "ücretsiz sağlayıcı" tezini doğrudan ilgilendiriyor: tek bir
sağlayıcı yetmiyor, rotasyon şart — Faz 2'nin fallback zinciri tam da bunun
için var.

### 3. NOTES.md'de yanlış bir bilgi vardı — düzeltildi

Faz 0'da "sağlayıcı hatalarını görmek için event'e abone olmak **şart**"
yazmıştım. Yanlış. Hata dönüş değerinde de var:

```ts
const result = await agent.run(prompt)
if (result.status === "failed") console.error(result.error?.message)
```

Geçersiz key'le ampirik doğrulandı: `status: "failed"`,
`error: Error("Invalid API Key")`.

Doğru olan kısım: `agent.run()` **exception fırlatmıyor**, `try/catch` boş
dönüyor.

Ayrıca alan adları tuzaklı — `AgentRunResult`'ta `text` ve `finishReason` yok:

| Beklenen | Gerçek |
|---|---|
| `result.text` | `result.outputText` |
| `result.finishReason` | `result.status` |

Yanlış alan adı hata vermiyor, sessizce `undefined` veriyor. NOTES.md §7
güncellendi.

---

## Tasarım kararları

### Process tree'yi öldürmek (Windows)
Komutlar `shell: true` ile başlatılıyor (Windows'ta `npm.cmd` PATH'te böyle
bulunuyor). Ama sadece shell'i öldürmek gerçek build'i arkada çalışır bırakıyor.
Timeout'ta `taskkill /t /f` ile tüm ağaç indiriliyor.

### Çıktının sonu saklanıyor, başı değil
Başarısız bir test suite megabaytlarca çıktı üretebiliyor. Sadece son 16.000
karakter tutuluyor — **hata logun sonunda olur.** Ayrıca akış sırasında da
budanıyor, kaçak bir process belleği tüketemesin diye.

### Script yoksa sessizce atla
Roadmap açıkça istiyordu ve haklı: çoğu repoda ikisi birden yok. Her turda
"build script bulamadım" diyen bir ajan, kapatılan bir ajan olur.

`build` yoksa `typecheck` / `check-types` deneniyor — build'i olmayan
projelerde ucuz bir vekil.

### Paket yöneticisi tespiti
Lock dosyasına bakılıyor (`bun.lock` → bun, `pnpm-lock.yaml` → pnpm, ...).
Yanlış tahmin kozmetik değil: bir Bun workspace'inde `npm test` çalıştırmak
lock dosyasını yeniden yazıp farklı bir bağımlılık ağacı çekebiliyor.

### Retry sınırı yapısal
Sayaç yerine kodun şeklinde: `runVerifiedTask` iki `run()` çağrısı içeriyor,
döngü değil. Bir ajan kendi çıktısını yönlendirilmiş tek denemede düzeltemiyorsa
genelde sorunu yanlış anlamıştır; her ek tur ücretsiz kotayı aynı hatayı
tekrarlamak için yakıyor.

### Geri beslemede sadece başarısız adımlar
Geçen bir build'in logu gürültü, ve ücretsiz katmanın olmayan token'ını yiyor.

---

## Bilinen sınırlar

- **Değişen dosyalar git'e bağımlı.** Git deposu değilse liste boş dönüyor
  (hata değil, sadece bilgi eksik).
- **build/test script adları sabit listeden.** `verify:ci` gibi özel adlar
  bulunmuyor. Config'e taşınabilir.
- **Retry aynı modele gidiyor.** Roadmap "farklı modellerle sırayla deneme"
  yasağı koyduğu için bilinçli.
- **Doğrulama ajan bittikten sonra çalışıyor**, ajan çalışırken değil. Ajan
  kendi kendine test çalıştırmak isterse ayrı bir araç gerekir.

---

## Roadmap durumu

| Faz | Durum |
|---|---|
| Faz 0 — Zemin hazırlığı | ✅ |
| Faz 1 — Context engine | ✅ |
| Faz 2 — Kural bazlı routing | ✅ |
| Faz 3 — Quality verification / retry | ✅ |

**Roadmap'in dört fazı da tamamlandı.** "Toplam 4 faz, daha yok."

Üç parça da (`context/`, `routing/`, `verify/`) birbirinden bağımsız çalışıyor
ve hepsi tek bir uygulamada (`apps/openprovider`) duruyor. Henüz **tek bir akışta
birleştirilmediler** — bu bilinçli: roadmap faz içinde bonus özellik yasaklıyordu.
Birleştirme, sonraki oturumun ilk işi olmaya aday.
