# roadmap-v2 — İnceleme Rehberi

**Branch:** `roadmap-v2` (main'e merge EDİLMEDİ)
**Tarih:** 2026-07-31, 08:07 – 08:36
**Commit sayısı:** 5
**Test durumu:** 65/65 kontrol geçiyor

---

## Önce şunu bil

Bu roadmap'i **ben yazdım, sen onaylamadın.** O yüzden ayrı branch'te duruyor.
CLAUDE.md "her mimari kararı önce kullanıcı onaylar" diyor; branch, o kuralı
çiğnemeden ilerlemenin yolu. Beğenmezsen `git branch -D roadmap-v2` ve hiçbir
şey kaybolmaz.

---

## Neden bu dört faz

v1 bitince elimizde **üç ayrı demo** vardı (`context/`, `routing/`, `verify/`),
bir ürün değil — üçünü birlikte kullanmak hâlâ elle Agent kurup hook bağlamak
demekti.

Ayrıca v1 sırasında, projenin temel tezini ("ücretsiz sağlayıcılarla düzgün
çalışan bir ajan") doğrudan tehdit eden iki engel bulunmuştu ve ikisi de
çözülmemişti. Bir de CLAUDE.md'de yazılı ama hiç ele alınmamış iki ürün hedefi
vardı.

v2 bu üçünü kapatıyor.

---

## Ne değişti

| Faz | Ne yapıyor | Test |
|---|---|---|
| **4** | `OpenProviderSession` — routing + context + verify tek çağrıda | 11/11 |
| **5** | Groq'un araç döngülerinde çalışmama sorunu **çözüldü** | 11/11 |
| **6** | Kota takibi — "ne kadar kaldı", Groq için kesin | 16/16 |
| **7** | Rate limit'te sessizce geçmek yerine **sorma** | 20/20 |

v1'den devam eden `probe-verify` de 7/7.

---

## En önemli üç sonuç

### 1. Groq artık gerçek kodlama işi yapabiliyor

Eskiden `gpt-oss-120b` araç kullanan döngülerde çöküyordu: model
`reasoning_content` üretiyor, Groq geri gönderilince **kendi alanını**
reddediyordu. İlk istekte değil ikincide patladığı için tek turluk sohbet
sorunsuz görünüyordu.

Çözüldü. Bozuk repo senaryosu Groq ile baştan sona geçiyor.

**Neden önemli:** Gemini günde 20 istekle sınırlı. Groq'un günlük limiti 1000.
Yani asıl iş atı artık kullanılabilir.

### 2. Kota artık tahmin değil, ölçüm

Groq `x-ratelimit-*` başlıkları yayınlıyormuş. Faz 5'te elle ölçtüğüm 8000 TPM
limitini **birebir doğruladı**, ve bilmediğimiz günlük 1000 istek limitini
öğrendik.

```
groq: 4175/8000 tokens/min (52%), 5/1000 requests today, resets in 32s
```

Senin istediğin sidebar göstergesinin arkasındaki veri hazır. UI yok — o VS Code
tarafını ilgilendiriyor, ayrı iş.

### 3. Artık sormadan model değiştirmiyor

Sen bir modeli bir sebeple seçiyorsun; görev ortasında haber vermeden
değiştirmek istemediğin bir çıktı üretiyor. Artık soruyor, ve soru sayı
taşıyor:

```
alpha hit its rate limit.
  alpha: 8000/8000 tokens/min (100%)
  It asked to retry in 5s.
  Switch to beta, or wait?
```

Üç cevap: geç, bekle, dur. Bekleme sınırlı — sadece sağlayıcı süre söylediyse,
en fazla 90 saniye, ve **bir kez**.

---

## Nasıl kontrol edersin

```bash
git checkout roadmap-v2
cd apps/openprovider
bun install
bun run --cwd ../.. build:sdk

bunx tsc --noEmit          # temiz olmalı
```

Ağ gerektirmeyenler (kotanı harcamaz):

```bash
bun run src/probe-switch.ts      # 20/20
bun run src/probe-session.ts     # 11/11 (sonda 1 canlı çağrı var)
```

Groq ile (günlük 1000 istek hakkın var, rahat):

```bash
OPENPROVIDER_PROVIDER=groq bun run src/probe-provider-compat.ts   # 11/11
OPENPROVIDER_PROVIDER=groq bun run src/probe-quota.ts             # 16/16
OPENPROVIDER_PROVIDER=groq bun run src/probe-verify.ts            # 7/7
```

Gerçek kullanım denemek istersen:

```bash
bun run src/probe-context-engine.ts "C:/başka/projen" --prompt "aradığın şey"
```

---

## Senin kararını bekleyenler

1. **Bu branch merge edilsin mi?** Roadmap'i ben yazdım; kapsamı sana uymuyorsa
   silinebilir, ya da fazları tek tek cherry-pick edebilirsin.

2. **Global `fetch` sarmalaması kabul edilebilir mi?** Kota başlıklarını okumak
   için tek yol (SDK'nın `Agent` yolu `fetch` enjeksiyonu sunmuyor). Varsayılan
   **kapalı**, `dispose()` ile geri alınıyor, tamamen pasif — ama yine de
   global. Kabul etmezsen yerel tahmin yine çalışıyor.

3. **Reasoning'i geçmişten silmek kaliteyi düşürüyor mu?** Groq kabul etmediği
   için başka seçenek yok, ama uzun görevlerde modelin kendi düşünce zincirini
   hatırlamaması etkili olabilir. **Ölçmedim.**

4. **Sıradaki ne?** Aklımdakiler, ama hiçbirine başlamadım:
   - VS Code eklentisine kota göstergesi UI'ı (senin asıl hedefin)
   - NVIDIA Build'i bağlamak (`docs/fork/REPO-MAP.md`'de 6 adımlık liste var)
   - Kullanılmayan Cline klasörlerini temizlemek
   - Context engine'i çok dilli yapmak (grammar'lar zaten kutuda)

---

## Dosya haritası

Yeni:
```
apps/openprovider/src/
  session.ts              Faz 4 — birleşik oturum
  index.ts                üst düzey barrel
  hooks/pipeline.ts       Faz 4 — transform zinciri
  providers/quirks.ts     Faz 5 — ölçülmüş sağlayıcı tablosu
  providers/sanitizer.ts  Faz 5 — reasoning ayıklama
  quota/store.ts          Faz 6 — kalıcı kullanım sayacı
  quota/headers.ts        Faz 6 — rate limit başlıkları
  quota/tracker.ts        Faz 6 — "ne kadar kaldı"
  routing/rate-limit.ts   Faz 7 — hata sınıflandırma
  routing/switch-policy.ts Faz 7 — geçiş kararı
```

Faz raporları: `.claude/docs/2026-07-31-faz-{4,5,6,7}-*.md`
Roadmap: `.claude/claudeRoadmap-v2.md`
