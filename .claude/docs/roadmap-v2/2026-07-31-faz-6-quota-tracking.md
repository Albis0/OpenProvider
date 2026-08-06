# Faz 6 — Kota Takibi

**Tarih:** 2026-07-31
**Başlangıç:** 08:20
**Bitiş:** 08:26
**Süre:** ~6 dakika
**Branch:** `roadmap-v2`
**Durum:** Tamamlandı ✅ — 16/16 kontrol geçti

---

## Ne istendi

CLAUDE.md'deki "sidebar'da canlı kota göstergesi" hedefinin **veri katmanı**.
UI değil — önce doğru sayıları bilmek.

**Bitiş kriteri:** `session.quota()` her sağlayıcı için "kullanılan / limit /
kalan" döndürüyor, ve Groq için bu sayı sağlayıcının kendi başlığıyla uyuşuyor.

---

## Ne yapıldı

### `src/quota/store.ts` — kalıcı kullanım sayacı

Sağlayıcı başına istek sayısı ve token'lar, zaman damgasıyla. **Kalıcı**, çünkü
limitler de kalıcı: Gemini'nin limiti **günlük**, yani process kapanınca sıfırlanan
bir sayaç her zaman sıfır gösterirdi.

`~/.openprovider/usage.json` altında, repo dışında — kullanım makineye ve
anahtara özel, git ağacında her diff'te gürültü olurdu.

Pencere sorguları: son N milisaniye, ve "bugün".

> Günlük limitler sağlayıcının saatine göre sıfırlanıyor, bizimkine göre değil,
> ve Gemini hangisi olduğunu söylemiyor. Yerel gece yarısı dürüst bir
> yaklaşıklık — sınıra yakın **eksik** sayıyor, yani temkinli tarafa hata
> yapıyor.

### `src/quota/headers.ts` — sağlayıcının kendi rakamları

Yerel sayaç bir **tahmin**: aynı anahtarla başka araçların yaptığı istekleri
göremiyor. `x-ratelimit-*` başlıkları yayınlayan sağlayıcılar gerçeği söylüyor.

**Neden global `fetch` sarmalayıcısı:** gateway özel bir `fetch` kabul ediyor
(`GatewayConfig.fetch`), ama düz `Agent` yolu onu asla geçirmiyor —
`createGateway({ providerConfigs, telemetry })` çağırıyor, başka bir şey değil.
Bu yolda desteklenen bir dikiş yeri yok.

O yüzden sarmalayıcı **opt-in, geri alınabilir ve tamamen pasif**: yanıt
başlıklarını okuyup yanıtı olduğu gibi geçiriyor. İsteği değiştirmiyor, gövdeyi
tamponlamıyor, `uninstall()` orijinali birebir geri koyuyor. Bu takas kabul
edilemezse kapalı bırakılır, yerel sayaç yine çalışır.

### `src/quota/tracker.ts` — güven sırasına göre birleştirme

1. **Sağlayıcının başlıkları** — kesin
2. **Yerel sayaç + ölçülmüş limit** — tahmin
3. **Hiçbiri** — limit bilinmiyor, sadece kullanım raporlanıyor

`source` alanı hangisinin cevap verdiğini söylüyor. **Tahmini gerçek gibi
sunmak, hiç sayı vermemekten kötüdür.**

---

## Canlı sonuç — Groq başlık yayınlıyor

```
· routing: mode "code" -> groq / openai/gpt-oss-120b
· quota: groq reported 3825 tokens remaining

groq: 4175/8000 tokens/min (52%), 5/1000 requests today, resets in 32s
source=provider-headers, limit=8000, remaining=3825
```

İki şey doğrulandı:

1. **Faz 5'te elle ölçtüğüm 8000 TPM limiti, Groq'un kendi başlığıyla birebir
   uyuşuyor.** Tahmin doğruymuş.
2. **Groq'un günlük istek limiti 1000** — bunu bilmiyorduk, başlıktan öğrenildi.
   Tuhaflık tablosuna işlendi.

Yani kullanıcının istediği "canlı kota göstergesi" için gereken veri artık var,
ve Groq için **tahmin değil, kesin**.

---

## Test sonuçları — 16/16

Sayaç ve ayrıştırıcılar geçici dizinde, sabit saatle, sentetik başlıklarla
deterministik test edildi. Son bölüm tek gerçek istek — başlıkların gerçekten
orada olup olmadığını başka türlü öğrenmenin yolu yok.

```
1. Usage store
PASS  window query counts only what is inside it — requests=1, tokens=15
PASS  daily totals include everything since midnight — requests=3, tokens=445
PASS  usage survives a new process — reloaded requests=3
PASS  failed requests are still counted

2. Header parsing
PASS  bare numbers are seconds (retry-after) — "48" -> 48000ms
PASS  compound durations — "1m30s" -> 90000, "7.66s" -> 7660
PASS  milliseconds are not read as seconds — "500ms" -> 500
PASS  reads the x-ratelimit family — limit=8000, remaining=6500, reset=11250ms
PASS  returns nothing when no rate-limit headers are present
PASS  attributes a response to a provider by host

3. Tracker
PASS  falls back to a local estimate, and says so — groq: 1240/8000 (16%) (estimated)
PASS  the estimate states its blind spot
PASS  provider headers override the local estimate — groq: 6000/8000 (75%), resets in 30s
PASS  an unknown provider reports usage without inventing a limit

4. Live
PASS  usage was recorded — source=provider-headers, tokens=4175, requests=5
PASS  the provider's own numbers were used — limit=8000, remaining=3825
```

---

## Bilinen sınırlar

- **Global `fetch` sarmalayıcısı bir taviz.** Varsayılan kapalı, `dispose()`
  ile geri alınıyor, ve başkası `fetch`'i bizden sonra sarmalarsa geri koymuyor
  (onun sarmalayıcısını ezmek daha kötü olurdu). Yine de global.
- **Yerel tahmin aynı anahtarı kullanan başka araçları göremiyor.** Not olarak
  açıkça söyleniyor.
- **Gemini başlık yayınlıyor mu bilinmiyor** — günlük kotası dolu olduğu için
  bu oturumda test edilemedi.
- **Günlük sıfırlama yerel gece yarısına göre.** Sağlayıcının saatine göre değil.
- **Maliyet takibi yok**, sadece token ve istek sayısı.

---

## Sırada

Faz 7 — rate limit'te sorarak geçiş. Artık "ne kadar kaldı" ve "ne zaman
sıfırlanıyor" biliniyor, yani kullanıcıya sorulacak soru somut olabilir:
"Groq 8000/8000 doldu, 32 saniye sonra sıfırlanıyor. Beklensin mi, Gemini'ye mi
geçilsin?"
