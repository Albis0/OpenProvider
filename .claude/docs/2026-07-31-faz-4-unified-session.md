# Faz 4 — Birleşik Oturum

**Tarih:** 2026-07-31
**Başlangıç:** 08:07
**Bitiş:** 08:13
**Süre:** ~6 dakika
**Branch:** `roadmap-v2`
**Durum:** Tamamlandı ✅ — 11/11 kontrol geçti

---

## Ne istendi

v1'in ürettiği üç parçayı (`context/`, `routing/`, `verify/`) tek bir API'nin
arkasına koymak. v1 sonunda bunlar çalışıyordu ama birlikte kullanmak için elle
Agent kurup hook bağlamak gerekiyordu — yani üç demo vardı, ürün yoktu.

---

## Ne yapıldı

### `src/hooks/pipeline.ts` — transform zinciri

SDK ajan başına **tek** `beforeModel` yuvası veriyor. Ama bu projenin orada
yapacak dört işi var: context enjekte et, çıktıyı sınırla, sağlayıcının kabul
etmediği alanları ayıkla (Faz 5), kullanımı say (Faz 6).

Dördünü tek fonksiyona yazmak dört ilgiyi birbirine dolardı. Bunun yerine her
biri giden istek üzerinde bir **transform** olarak yazıldı ve tek hook'ta
birleştiriliyor:

```ts
composeBeforeModel([contextTransform, outputCapTransform])
```

Her transform, isteği bir öncekilerin bıraktığı hâliyle görüyor. Sıralamanın
anlamlı olmasını sağlayan bu — bir temizleyici, temizleyeceği mesajları enjekte
eden şeyden **sonra** çalışmak zorunda.

Bir transform hata fırlatırsa varsayılan davranış yutup devam etmek: bozuk bir
context motoru "ekstra context yok"a düşmeli, çalışmayı düşürmemeli.

### `src/session.ts` — `OpenProviderSession`

```
prompt
  → route   (mod → provider, kullanılamayanları atlayarak)
  → context (dosya seç, repo haritası enjekte et)
  → run     (SDK ajanı)
  → verify  (projenin kendi build/test'i, tek yönlendirilmiş retry)
  → rapor
```

Tek çağrı, tek sonuç nesnesi: hangi mod, hangi provider(lar), hangi dosyalar,
kaç deneme, build/test durumu, özet.

### Asıl kazanç: yönlendirme her denemede yeniden yapılıyor

Bir sağlayıcı patlarsa `router.markUnavailable()` **otomatik** çağrılıyor ve
retry başka bir sağlayıcıya gidiyor. v1'de bunu elle yapmak gerekiyordu, ve
zaten parçalar ayrı olduğu için doğal bir yeri yoktu. Birleştirmenin somut
faydası bu.

---

## Test sonuçları — 11/11

Neredeyse tamamı stub ajanla, iki sebeple: iddialar deterministik oluyor, ve
ücretsiz kota altyapı testine harcanacak kadar bol değil. Sonda tek canlı çağrı.

### 1. Tek hook iki işi birden yapıyor
```
PASS  context injected as the first message — "# Repository map (auto-selected)…"
PASS  selection found graph.ts — src/context/graph.ts, engine.ts, index.ts
PASS  output cap applied in the same hook — maxTokens=2048
```
Stub ajan, kurulan hook'u sahte bir istekle çağırıp sonucu inceliyor — yani
pipeline'ın ürettiği şey doğrudan görülüyor, dolaylı olarak değil.

### 2. Mod sağlayıcıyı belirliyor
```
PASS  plan mode routed to alpha — plan -> alpha
PASS  code mode routed to beta — code -> beta
```

### 3. Patlayan sağlayıcı devre dışı, retry başka yere
```
PASS  second attempt used a different provider — beta -> alpha
PASS  the switch was explained — "Switching to alpha for this "code" turn."
PASS  verification passed after the reroute — ok=true, attempts=2
```

### 4. Tek çağrı, tek özet
```
Task summary
------------
changed files: none
build: skipped (no build script)
test: passed (366ms)
```

### 5. Gerçek çağrı (Groq)
```
· context: 27 files, 53 edges, 48ms
· routing: mode "code" -> groq / openai/gpt-oss-120b
· context: selected 5 file(s): graph.ts, parser.ts, engine.ts, score.ts
answer: The dependency graph is built in the file `src/context/graph.ts`.
PASS  live run routed, injected context and answered
```

Not: Groq burada çalıştı çünkü **araçsız, tek turluk** bir çağrı. Faz 5'te
çözülecek `reasoning_content` sorunu sadece araç kullanan çok turlu döngülerde
ortaya çıkıyor.

---

## Karşılaşılan hata

Canlı test ilk çalıştırmada patladı: fixture dizinine yazdığım **stub config**
(alpha/beta sağlayıcıları) canlı oturum tarafından da yükleniyordu. Çözüm,
`configDir`'i uygulamanın gerçek config'ini gösterecek şekilde ayırmak.

Bu aslında tasarımın işe yaradığının kanıtı: `projectDir`, `configDir` ve
`contextRoot` ayrı ayrı verilebiliyor, çünkü doğrulanan proje, ayarların
bulunduğu yer ve indekslenen kod üçü de farklı olabilir.

---

## Bilinen sınırlar

- **Retry aynı prompt'la yeni bir ajan kuruyor**, konuşmayı sürdürmüyor. Basit
  ve durumsuz, ama ajan ilk denemede öğrendiklerini kaybediyor.
- **Context her turda yeniden seçiliyor.** Doğru davranış (taze context) ama
  aynı prompt için aynı işi tekrar yapıyor; önbellek yok.
- **`verify: false` yolunda retry yok.** Doğrulama kapalıysa tek deneme.
- Sağlayıcı yetenekleri (araç desteği var mı) henüz bilinmiyor — Faz 5.

---

## Sırada

Faz 5 — sağlayıcı uyumluluk katmanı. Groq'un `reasoning_content` sorununu
çözüp, benzerleri için genel bir "istek temizleyici" kurmak. Pipeline bunun
için hazır: yeni bir transform, sona eklenecek.
