# Faz 5 — Sağlayıcı Uyumluluk Katmanı

**Tarih:** 2026-07-31
**Başlangıç:** 08:14
**Bitiş:** 08:20
**Süre:** ~6 dakika
**Branch:** `roadmap-v2`
**Durum:** Tamamlandı ✅ — 11/11 kontrol geçti

---

## Ne istendi

v1'de bulunan ve projenin temel tezini tehdit eden engeli çözmek: **Groq'un
en güçlü ücretsiz modeli araç kullanan döngülerde çalışmıyordu.**

Ve benzerleri için genel bir çözüm kurmak, tek seferlik bir yama değil.

---

## Sorun neydi

```
'messages.1' : for 'role:assistant' the following must be satisfied
[('messages.1' : property 'reasoning_content' is unsupported)]
```

Zinciri takip edince: `gpt-oss-120b` bir **reasoning** içerik parçası üretiyor
(`type: "reasoning"`, `sdk/packages/shared/src/agent.ts:30`). SDK bunu konuşma
geçmişinde saklıyor. Bir sonraki istekte Vercel AI SDK'nın OpenAI-uyumlu
sağlayıcısı bunu `reasoning_content` alanına çeviriyor. Groq da **kendi
modelinin ürettiği alanı** reddediyor.

İlk istekte patlamıyor — geçmişte henüz asistan mesajı yok. İkinci istekte
patlıyor. Yani tek turluk sohbet sorunsuz görünüyor, araç kullanan döngü
çöküyor. Sorunun bu kadar geç fark edilmesinin sebebi bu.

**Neden `beforeModel`'de çözülmeli:** sorunlu içeriği model üretiyor ve
geçmişe SDK koyuyor. Ondan önce sahiplendiğimiz bir nokta yok.

---

## Ne yapıldı

### `src/providers/quirks.ts` — ölçülmüş tuhaflık tablosu

Ücretsiz sağlayıcılar birbirinin yerine geçmiyor ve farklılıkları hiçbir
katalogda yazmıyor. Her kayıt **canlı API'ye karşı ölçüldü**, dokümandan
okunmadı; `measuredOn` alanı ne zaman ölçüldüğünü söylüyor çünkü bu limitler
değişiyor.

| Sağlayıcı | Kayıt |
|---|---|
| groq | `stripReasoning`, 2048 çıktı sınırı, 8000 TPM |
| gemini | 4096 çıktı sınırı, günde 20 istek |
| cerebras / openrouter / nvidia | varsayılan sınırlar |

### `src/providers/sanitizer.ts` — istek temizleyici

Asistan mesajlarından `reasoning` parçalarını ayıklıyor. Üç incelik:

1. **Sadece asistan mesajlarına bakıyor** — kullanıcı ve araç mesajları
   reasoning taşımıyor, boşuna kopyalamıyor.
2. **Değişiklik yoksa `undefined` dönüyor** — pipeline gereksiz kopya
   yapmıyor.
3. **Mesajı asla boş bırakmıyor.** Bir asistan turu tamamen reasoning'den
   ibaret olabiliyor; içeriği tümden silmek bir sağlayıcı reddini başkasıyla
   takas etmek olurdu. Boş kalırsa yer tutucu bir metin parçası konuyor.

Tuhaflığı olmayan sağlayıcılar için transform **hiç üretilmiyor** — pipeline
no-op taşımıyor.

### Sıralama

Sanitizer pipeline'a **en son** ekleniyor. Temizleyeceği mesajları enjekte
eden şeyden sonra çalışmak zorunda; önce çalışsaydı listenin sadece bir
önekini temizlerdi.

---

## Sonuç: Groq artık çalışıyor

Faz 3'ün bozuk repo senaryosu, Groq ile baştan sona geçiyor:

```
· attempt 1: running task
· routing: mode "code" -> groq / openai/gpt-oss-120b
· sanitize: removed 1 reasoning part(s) rejected by groq
· sanitize: removed 2 reasoning part(s) rejected by groq
· sanitize: removed 3 reasoning part(s) rejected by groq
· attempt 1: verifying
· verification passed on the first attempt

test: passed (392ms)
```

Ayıklanan parça sayısının 1 → 2 → 3 diye artması, tam olarak eskiden patlatan
birikim. Şimdi her turda temizleniyor.

**Bunun anlamı:** Groq'un `gpt-oss-120b`'si gerçek kodlama işi için
kullanılabilir hâle geldi. Gemini günde 20 istekle sınırlıyken, bu ciddi bir
fark.

---

## Test sonuçları — 11/11

Çoğu deterministik, ağ gerektirmiyor — düzeltmenin sabitlenmesi için:

```
PASS  groq has a sanitizer — sanitize:groq
PASS  strips reasoning from assistant messages — parts now: text
PASS  leaves the user message untouched — same object reference
PASS  never leaves an assistant message with no content — parts now: text
PASS  no-ops when there is no reasoning to remove — patch=undefined
PASS  builds no sanitizer for providers that do not need one — gemini -> undefined
PASS  groq's measured TPM limit is recorded — tokensPerMinute=8000
PASS  gemini's daily request cap is recorded — requestsPerDay=20
PASS  config beats the measured default — configured=512 -> 512, default -> 2048
PASS  unknown providers get no cap and are assumed tool-capable
PASS  session ran a tool loop and verification passed — provider=groq, attempts=1
```

---

## Bilinen sınırlar

- **Reasoning geçmişten siliniyor, yani model kendi düşünce zincirini
  hatırlamıyor.** Sağlayıcı kabul etmediği için seçenek yok, ama uzun
  görevlerde kaliteyi etkileyebilir. Ölçülmedi.
- **Tablo elle yazıldı.** Yeni bir sağlayıcı eklendiğinde tuhaflığı ancak
  patladığında öğrenilecek.
- **`supportsTools` henüz kullanılmıyor.** Router bunu okuyup "araç gerektiren
  bir task'ı araç desteklemeyen sağlayıcıya gönderme" kararı verebilir; şu an
  sadece tabloda duruyor.
- **Ölçümler 2026-07-31 tarihli.** Sağlayıcı limitleri değişiyor.

---

## Sırada

Faz 6 — kota takibi. Tablodaki limitler (8000 TPM, 20 istek/gün) artık
biliniyor; eksik olan "ne kadarı kullanıldı".
