# OpenProvider Roadmap v2

> **Bu roadmap'i Claude yazdı, kullanıcı onaylamadı.** O yüzden `roadmap-v2`
> branch'inde uygulanıyor, `main`'e dokunulmuyor. Uyandığında incelenip
> kabul/ret/değişiklik kararı verilecek.
>
> Kural, v1 ile aynı: bir faz bitmeden diğerine geçilmez, faz içine bonus
> özellik eklenmez, her faz gerçek bir şey üzerinde test edilmeden bitmiş
> sayılmaz.

---

## Neden yeni bir roadmap

v1'in dört fazı bitti ve üç çalışan parça üretti: `context/`, `routing/`,
`verify/`. Ama bunlar **üç ayrı demo**, bir ürün değil. Üçünü birlikte kullanmak
için hâlâ elle kod yazmak gerekiyor.

Ayrıca v1 sırasında, projenin temel tezini ("ücretsiz sağlayıcılarla düzgün
çalışan bir kodlama ajanı") doğrudan tehdit eden iki somut engel bulundu:

1. **Groq + `gpt-oss-120b`, araç kullanan döngülerde çalışmıyor.** Model
   `reasoning_content` üretiyor, SDK bunu konuşma geçmişinde geri gönderiyor,
   Groq kendi ürettiği alanı reddediyor. Yani Groq'un en güçlü ücretsiz modeli
   şu an gerçek kodlama işi için kullanılamıyor.
2. **Gemini ücretsiz katman günde 20 istek.** Tek bir ajan oturumu bunu bitiriyor.

Bu ikisi çözülmeden "ücretsiz sağlayıcı" iddiası havada kalıyor.

Üçüncü olarak, CLAUDE.md'de yazılı ama v1'de hiç ele alınmamış iki ürün hedefi
var: **canlı kota göstergesi** ve **rate limit'te sorarak geçiş**. v1'in routing
altyapısı bunların ikisini de mümkün kıldı ama hiçbirini yapmadı.

v2 bu üç boşluğu kapatıyor. Dört faz, daha yok.

---

## Faz 4 — Birleşik Oturum

**Amaç:** `context/`, `routing/` ve `verify/`'ı tek bir API'nin arkasına
koymak. Şu an bir kullanıcı üçünü birleştirmek için elle Agent kurup hook
bağlamak zorunda.

**Somut çıktılar:**

1. **`OpenProviderSession` sınıfı**
   - `create({ projectDir })` → config'i yükler, context engine'i indeksler,
     router'ı kurar
   - `run(prompt, { mode? })` → yönlendirir, context enjekte eder, çalıştırır,
     doğrular, raporlar
   - Tek bir sonuç nesnesi: hangi mod, hangi provider, hangi dosyalar seçildi,
     build/test durumu, kaç deneme

2. **Tek `beforeModel` hook'u**
   - Şu an context enjeksiyonu ve `maxTokens` sınırı ayrı ayrı hook yazmayı
     gerektiriyor. Tek bir birleşik hook olacak, parçalar opsiyonel.

3. **Sağlayıcı hatasında router'a geri bildirim**
   - Run başarısız olursa `router.markUnavailable()` otomatik çağrılacak.
     Şu an bunu elle yapmak gerekiyor.

**Bitiş kriteri:** Tek bir `session.run("...")` çağrısı; doğru provider'a
gidiyor, doğru dosyaları enjekte ediyor, sonunda build/test çalıştırıyor ve
tek bir özet döndürüyor. Stub'larla deterministik test + en az bir gerçek çağrı.

**YAPMA:** Yeni yetenek ekleme. Bu faz sadece birleştirme.

---

## Faz 5 — Sağlayıcı Uyumluluk Katmanı

**Amaç:** Yukarıdaki 1. engeli çözmek, ve benzerlerinin genel çözümünü kurmak.

**Somut çıktılar:**

1. **İstek temizleyici (request sanitizer)**
   - `beforeModel` içinde, giden mesajlardan sağlayıcının kabul etmediği
     alanları ayıklayan bir katman
   - İlk kural: asistan mesajlarından `reasoning_content` ayıkla (Groq)
   - Kurallar sağlayıcı bazlı bir tabloda, yeni bir sağlayıcı için kural
     eklemek tek satır olacak

2. **Sağlayıcı yetenek tablosu**
   - Hangi sağlayıcı araç kullanımını destekliyor, hangi çıktı sınırı makul,
     hangi bilinen tuhaflığı var
   - Router bunu kullanarak "araç gerektiren bir task'ı araç desteklemeyen
     sağlayıcıya gönderme" kararını verebilecek

3. **Groq'un gerçekten çalıştığının kanıtı**
   - Faz 3'teki bozuk repo senaryosu (`probe-verify.ts` B kısmı) Groq ile
     baştan sona geçecek

**Bitiş kriteri:** `OPENPROVIDER_PROVIDER=groq bun run src/probe-verify.ts`
B kısmı dahil tam geçiyor. Yani Groq ile araç kullanan bir ajan bozuk bir
repoyu düzeltebiliyor.

**YAPMA:** Kendi provider adapter'ını yazma — bu SDK'nın işi. Sadece giden
isteği düzelt.

---

## Faz 6 — Kota Takibi

**Amaç:** CLAUDE.md'deki "canlı kota göstergesi" hedefinin veri katmanı.
UI değil, önce doğru sayıları bilmek.

**Somut çıktılar:**

1. **Kullanım sayacı**
   - Sağlayıcı başına: istek sayısı, giriş/çıkış token'ı, zaman damgası
   - Kalıcı (`~/.openprovider/usage.json` gibi), process'ler arası korunur
   - Pencere bazlı sorgu: "son 1 dakikada", "bugün"

2. **Rate limit başlıklarını okuma**
   - Groq `x-ratelimit-remaining-*` başlıkları döndürüyor; varsa gerçek veriyi
     kullan, yoksa yerel sayaca düş
   - SDK'nın `fetch` enjeksiyonu (`ClineCoreOptions.fetch`) üzerinden yakalanacak

3. **Bilinen limit tablosu**
   - Groq: 8000 TPM, Gemini: 20 istek/gün gibi ölçülmüş değerler
   - "Ne kadar kaldı" hesabı bu tablo + sayaçtan

**Bitiş kriteri:** Birkaç istek gönderdikten sonra
`session.quota()` çağrısı her sağlayıcı için "kullanılan / limit / kalan"
döndürüyor, ve Groq için bu sayı sağlayıcının kendi başlığıyla uyuşuyor.

**YAPMA:** UI/sidebar. Bu ayrı bir iş ve VS Code tarafını ilgilendiriyor.

---

## Faz 7 — Rate Limit'te Sorarak Geçiş

**Amaç:** CLAUDE.md'deki ikinci ürün hedefi. Şu an router bir sağlayıcı
patlayınca sessizce diğerine geçiyor; kullanıcı haberdar olmalı ve karar
verebilmeli.

**Somut çıktılar:**

1. **Geçiş politikası**
   - `"ask"` (varsayılan) / `"auto"` / `"stop"`
   - Config'den ayarlanabilir

2. **Karar callback'i**
   - `onProviderSwitch({ from, to, reason, quota })` → `"switch" | "wait" | "abort"`
   - `"wait"` seçilirse, rate limit süresi biliniyorsa (hata mesajında
     "retry in 48s" gibi) o kadar bekleyip aynı sağlayıcıyla devam et

3. **Net mesaj**
   - "Groq dakikalık limitine ulaştı (8000/8000). Gemini'ye geçilsin mi?
     Ya da 48 saniye beklenebilir." — Faz 6'nın kota verisiyle zenginleştirilmiş

**Bitiş kriteri:** Kotası dolmuş bir sağlayıcıyla çalışırken, geçiş öncesi
callback tetikleniyor; `"wait"` cevabı verildiğinde bekleyip aynı sağlayıcıyla
devam ediyor, `"switch"` cevabında diğerine geçiyor. İkisi de test edilmiş.

**YAPMA:** Otomatik sonsuz bekleme. `wait` bir kez, sonra tekrar sor.

---

## Fazlar arası kural

- Sıra: 4 → 5 → 6 → 7. Bir faz bitmeden diğerine geçilmiyor.
- Her faz sonunda: test + `.claude/docs/` altına rapor (başlangıç/bitiş
  saatleriyle) + commit.
- Hiçbiri `main`'e merge edilmiyor. Branch: `roadmap-v2`.
- Ücretsiz kota sınırlı: mümkün olan her şey stub'larla deterministik test
  edilecek, canlı çağrı sadece gerçekten gerektiğinde.
