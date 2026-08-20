# Sınıflandırıcı Boşluğu + Sıkıştırma Kalitesi Ölçümü

**Tarih:** 2026-08-20
**Branch:** `main` (ve `feature/debrand-cline`, aynı commit)
**Durum:** İkisi de tamamlandı, push'landı.

---

## Neden bu iki iş

2026-08-17 oturumu iki açık nokta bırakmıştı. Bu oturumda ikisi de kapatıldı:

1. Groq'un gerçek rate limit metni failover'ı **ilk hatada** tetiklemiyordu.
2. Sıkıştırmanın *kalitesi* hiç gerçek modelle ölçülmemişti.

---

## 1. Sınıflandırıcı: bir tur israfı

### Sorun

Groq limite takıldığında yazdığı metin (2026-08-17'de canlı yakalandı):

```
Request too large for model `openai/gpt-oss-safeguard-20b` ... on tokens per
minute (TPM): Limit 8000, Requested 32209, please reduce your message size
```

Bu metin `failure-classifier.ts`'teki hiçbir kalıba uymuyordu — "rate limit"
demiyor, "quota" demiyor, "too many requests" demiyor.

Sayıya bakan katmanlar da devre dışıydı: SDK sağlayıcı hatalarını **düz string**
olarak veriyor (`done` chunk'ında `error` var, `status` yok), yani arkadaki 429
sınıflandırıcıya hiç ulaşmıyor.

### Sonucu

Her limitte **bir tur boşa gidiyordu.** İlk hata `not-failover-worthy` olarak
sınıflanıyor, görev kotası bitmiş sağlayıcıda kalıyor, ancak ikinci hatada
Katman 4 (tekrar) devreye girip geçiş yapıyordu.

Bu, failover'ın üç sürüm boyunca hiç çalışmamasının daha hafif bir versiyonu:
özellik çalışıyor **görünüyordu**, sadece olması gerekenden bir tur geç.

### Çözüm

`RATE_LIMIT_PHRASES`'e üç desen eklendi:

```ts
/tokens? per (?:minute|day)/i,
/requests? per (?:minute|day)/i,
/\b(?:TPM|RPM|TPD|RPD)\b/,
```

### Kritik tasarım kararı: neden "too large" değil de "per minute"

Eşleştirme bilinçli olarak **hız boyutuna** (dakika/gün başına) demirlendi,
"request too large" ifadesine değil.

Sebep: **context penceresi taşması** de "too large" der, ama o aynı isteğin her
sağlayıcıda aynı şekilde başarısız olması demektir. Onu failover'a değer saymak,
tek bir hata yerine sağlayıcı başına bir kopya hata üretirdi.

Test bunu pinliyor:

```
"This model's maximum context length is 8192 tokens..." → shouldFailover: false
```

### Kıl payı kaçınılan tuzak: OpenRouter

OpenRouter'ın bakiye hatası da token'lardan ve `max_tokens`'tan bahsediyor:

```
This request requires more credits, or fewer max_tokens. You requested up to
32000 tokens, but can only afford 16000.
```

Ama bu **terminal** bir hata — bakiye bitmiş, geçiş bunu çözemez ve kullanıcıyı
onaylamadığı bir harcamaya sokar. Desenler yazılmadan önce beş canlı metne
karşı ayrı ayrı doğrulandı; OpenRouter'ın terminal kalması artık testle
sabitlendi.

### Doğrulama

| Kontrol | Öncesi | Sonrası |
|---|---|---|
| Groq TPM, turdaki **1.** hata | `switched = false` (tur israfı) | **`switched = true`, gemini'ye geçti, tur devam etti** |
| `vitest src/sdk/failover/` | 73 test | **81 test, hepsi geçiyor** |
| Tüm vitest paketi | — | **967 test / 78 dosya, hepsi geçiyor** |
| `bun run test:unit` | 935 pass / 1 fail | 935 pass / 1 fail (aynı, ilgisiz) |
| `bunx tsc --noEmit` | Temiz | Temiz |

**Not:** `bun run test:unit` failover testlerini **hiç çalıştırmıyor** — onlar
vitest altında. İki koşucu ayrı ayrı çalıştırılmalı.

Tek kırmızı: `src/test/shell.test.ts` — Windows yol büyük/küçük harf farkı,
ilk commit'ten beri hiç değişmemiş, bu işle ilgisiz.

---

## 2. Sıkıştırma kalitesi: gerçek modelle ölçüm

### Neden gerekliydi

`probe-compaction.ts` mekanizmayı kanıtlıyordu: küçültüyor, ve her başarısızlık
yolu ham context'e düşüyor. Ama içindeki her runner **stub** — sabit bir string
döndürüyor. Yani "özet işe yarıyor mu" sorusu hiç sorulmamıştı.

Bu boşluk göründüğünden önemli: dosya yollarını, hata metnini ya da yapılanları
kaybeden bir özet, alıcı modele üzerine iş yapamayacağı bir brief verir. Görev
devam eder, sağlıklı görünür, ve sessizce işi baştan yapar ya da bırakır.

### Yöntem

`probe-compaction-live.ts` gerçek bir tıkanmış turu simüle ediyor: hedef,
somut dosya yollarıyla yapılmış işler, birebir bir assertion hatası, açık bir
kullanıcı kısıtı — ve bunların arasına gömülü **40 satır düşük sinyalli
gürültü** (alakasız dosya listesi). Sonra briefte altı şeyin hayatta kalıp
kalmadığı tek tek kontrol ediliyor.

Anahtar yoksa temiz şekilde SKIP ediyor, yani her makinede çalıştırılabilir.

### Sonuç — 8/8 geçti

Model: `groq / openai/gpt-oss-safeguard-20b`

| Ölçüm | Sonuç |
|---|---|
| Boyut | **6396 → ~1900 karakter** (orijinalin %30-35'i) |
| Süre | **~1.3 saniye** |
| Hedef korundu mu | ✅ |
| Somut dosya yolu korundu mu | ✅ |
| Birebir assertion hatası korundu mu | ✅ (`expected 'groq' to be 'gemini'`) |
| Teşhis korundu mu | ✅ (`recordFailure` iki kez çalışıyor) |
| Kullanıcının kısıtı korundu mu | ✅ ("assertion'ları değiştirme") |
| Kalan iş korundu mu | ✅ |
| Tasarruf çağrıya değer mi | ✅ |

**En dikkat çekici kısım:** 40 satırlık gürültünün tamamı atıldı, sinyalin
tamamı korundu. Model ayrıca kalan işi numaralı adımlara çevirip küçük bir kod
taslağı bile ekledi — istenenden fazlası, ama zararsız.

İki koşuda %30 ve %35 çıktı; bu normal model değişkenliği, ikisi de eşiğin
(%75) çok altında.

---

## Değişen dosyalar

| Dosya | İş |
|---|---|
| `apps/vscode/src/sdk/failover/failure-classifier.ts` | Üç TPM/RPM deseni + gerekçe yorumu |
| `apps/vscode/src/sdk/failover/failure-classifier.test.ts` | 8 yeni test (canlı metinler pinlendi) |
| `apps/openprovider/src/probe-compaction-live.ts` | **Yeni.** Canlı kalite ölçümü |
| `apps/openprovider/package.json` | `probe:compaction-live` |
| `.claude/docs/failover/2026-08-17-...md` | "canlı denenmedi" maddesi kapatıldı |

---

## Hâlâ açık

- **Sıkıştırma yalnızca `apps/openprovider`'da.** VS Code eklentisi bunu almadı.
  Ama eklentinin **kendi sıkıştırması zaten var** (`sdk-compaction-coordinator.ts`,
  `compactTask`) ve gerçek konuşma geçmişini sıkıştırdığı için motordakinden
  daha güçlü. Sorun şu ki iki noktada bize uymuyor:
  1. Tur ortasında çalışmayı **açıkça reddediyor** (`isRunning` kontrolü) —
     failover tam olarak tur ortasında oluyor.
  2. Sıkıştırmayı **görevin kendi sağlayıcısında** yapıyor — yani kotası biten
     sağlayıcıda.

  Yani bu bir "taşı gitsin" işi değil, tasarım işi. Motordaki kodu eklentiye
  kopyalamak yanlış olur; doğrusu mevcut `compactTask` yolunu failover için
  gevşetmek.
- **NVIDIA ve DeepSeek** hâlâ anahtarsız, canlı doğrulanmadı.
- **NVIDIA `PROVIDER_COMPAT` tablosunda yok** (2026-08-12 bulgusu, sürüyor).
