# Faz 1 — Context Engine

**Tarih:** 2026-07-31
**Başlangıç:** 01:02 (Faz 0 commit'inden hemen sonra)
**Bitiş:** 01:16
**Süre:** ~14 dakika
**Durum:** Tamamlandı ✅ — bitiş kriteri karşılandı

---

## Ne istendi

Roadmap Faz 1: kullanıcı elle `@file` seçmeden, task'a göre otomatik olarak
"hangi dosyalar alakalı" kararını **statik analizle, LLM çağrısı olmadan** vermek.

Beş adım: repo tarayıcı → tree-sitter → bağımlılık grafiği → alaka skorlama →
SDK entegrasyonu.

**Bitiş kriteri:** Gerçek bir repo üzerinde, bir prompt verildiğinde sistem doğru
dosyaları otomatik seçebiliyor; kullanıcı manuel `@file` yapmadan ajan doğru
dosyalara erişebiliyor.

---

## Ne yapıldı

`apps/openprovider/src/context/` altında altı modül:

| Dosya | Sorumluluk |
|---|---|
| `scanner.ts` | Repo taraması. SDK'nın `getFileIndex`'i üzerine kaynak dosya filtresi + boyut limiti. |
| `parser.ts` | tree-sitter (WASM). Her dosyadan import / export / sembol çıkarımı. |
| `graph.ts` | Bağımlılık grafiği. Import specifier'larını gerçek dosyalara çözüp kenar kuruyor. |
| `score.ts` | Alaka skorlama. Keyword eşleşmesi + graf komşuluğu. Model çağrısı yok. |
| `engine.ts` | Hepsini birleştiren `ContextEngine`. Repo haritası render'ı. |
| `hook.ts` | `beforeModel` hook fabrikası — Faz 0'da kanıtlanan enjeksiyon noktası. |

Ayrıca üç doğrulama script'i: `probe-context-engine.ts` (çevrimdışı),
`probe-context-agent.ts` (uçtan uca), `probe-free-tier.ts`.

---

## Ölçülen sonuçlar

### Çevrimdışı — 404 dosyalık gerçek kod tabanı (`sdk/packages/core`)

```
[engine] index ready in 2535ms — 404 files, 1173 edges

PROMPT: the compaction prepareTurn is dropping messages when the session resumes
  ● 57.2  src/runtime/host/local-runtime-host.ts
  ● 54.1  src/session/models/session-compaction.ts
  ● 50.4  src/runtime/host/runtime-host.ts
  ...
  ● 42.5  src/extensions/context/compaction.ts
  selection took 21.0ms (no model calls)
```

Bu sonucun anlamlı bir yanı var: **Faz 0'da `prepareTurn`'ün nerede kurulduğunu
bulmak için elle uğraşmıştım, cevap `local-runtime-host.ts` idi.** Motor aynı
dosyayı bağımsız olarak birinci sıraya koydu.

Rakamlar: indeksleme 2.5 sn (bir kez), seçim **21 ms**, sıfır model çağrısı.

### Küçük repo (`apps/openprovider`, 13 dosya) — 4 prompt

| Prompt | 1. sıradaki dosya | Süre |
|---|---|---|
| "the repo scanner is missing files that are gitignored" | `scanner.ts` | 2.6ms |
| "add a test for tokenize and the stopword list" | `score.ts` | 0.6ms |
| "how does the dependency graph resolve an import to a file" | `graph.ts` | 0.5ms |
| "provider api key resolution is picking the wrong provider" | `provider-settings.ts` | 0.6ms |

Dördünde de doğru dosya birinci.

### Uçtan uca — gerçek ajan, gerçek model

`probe-context-agent.ts`, bu gece yazılmış koda dair bir soru soruyor
(eğitim verisinde olması imkânsız), kullanıcı **hiç `@file` yazmadan**:

```
[agent] auto-selected, with no @file from the user:
           17.1  src/context/graph.ts
           10.6  src/context/engine.ts
            9.3  src/context/score.ts
            ...

[agent] answer: The file `src/context/graph.ts` builds the dependency graph and
        exports the two functions `buildGraph` and `expandNeighbourhood`.

[agent] PASS
```

2/2 kararlı geçti. **Bitiş kriteri karşılandı.**

---

## Tasarım kararları ve gerekçeleri

### tree-sitter yerine WASM grammar'ları
`@vscode/tree-sitter-wasm` hazır derlenmiş `.wasm` dosyaları sunuyor
(typescript, tsx, javascript + python/go/rust/java ileriye dönük). Native
tree-sitter node-gyp gerektiriyor ve Windows'ta kurulumun en sık öldüğü yer
orası. WASM yolu sıfır derleme adımı demek.

### Query yerine ağaç gezme
tree-sitter `.scm` query'leri daha hızlı, ama yanlış bir düğüm adı **sessizce**
hiçbir şey döndürmüyor. Ağaç gezmede eksik düğüm tipi sadece daha az sonuç
demek, ve testle yakalanabiliyor. Doğruluk hız'dan önce geldi.

### Tam dosya içeriği yerine repo haritası
Seçilen dosyaların içeriğini göndermek bariz seçenek ama yanlış olanı: 8000
TPM'lik bir ücretsiz tier'da birkaç dosya bütçeyi soruyu okumadan bitiriyor.
Bunun yerine her dosya "yol + export ettiği isimler" olarak listeleniyor —
Aider'ın "repository map" yaklaşımı. Model neyi açacağına kendi araçlarıyla
karar veriyor. Karakter bütçesi (`maxChars`) tavsiye değil, zorunlu.

### Skorlama ağırlıkları
Sıralama mutlak değerlerden önemli: **dosyayı adıyla anmak** > içindeki bir şeyi
anmak > sadece yakın olmak. Graf komşuları hop başına 0.35 ile sönümleniyor.
Her seçimin `reasons` alanı var, yani neden seçildiği görülebiliyor —
skorlama ayarlanırken bu şart.

### Türkçe stopword'ler
Prompt'lar Türkçe yazılıyor. `bir`, `yap`, `dosya` gibi kelimeler filtrelenmezse
"parser'a test ekle" cümlesi `ekle` ve `test` üzerinden alakasız dosyalara
tohum atıyordu.

---

## Bulunan SDK tuzağı

**`getFileIndex` bazı programlarda sessizce hiç dönmüyor.**

SDK worker thread'ini ve yedek timeout'unu bilinçli olarak `unref()` ediyor
(host'un kapanmasını geciktirmesin diye). Sonuç: beklerken event loop'u canlı
tutan ref'li hiçbir şey kalmıyor. Giriş noktası top-level `await` olan bir
program sorunsuz çalışıyor, ama `main().catch(...)` kalıbındaki bir program
tarama ortasında **çıkış kodu 0 ile, hatasız, çıktısız** kapanıyor.

Teşhis kolay değildi — ilk testim top-level `await` kullandığı için sorunu
maskeledi. `scanner.ts` içindeki `withEventLoopHeld` bunu çağıranlardan
gizliyor.

---

## Bilinen sınırlar (dürüst liste)

- **Sadece JS/TS.** Roadmap zaten böyle sınırlamıştı. Grammar'lar kutuda hazır,
  genişletmek küçük iş.
- **tsconfig path alias'ları çözülmüyor.** `@/utils` gibi import'lar graf'ta
  kenar oluşturmuyor. Recall kaybı var, yanlış sonuç yok.
- **Türkçe prompt ↔ İngilizce kod.** "kota göstergesi" yazınca `quota` eşleşmiyor.
  Şu an sadece kullanıcı dosya/fonksiyon adını yazarsa çalışıyor. Gerçek çözüm
  eşanlamlı sözlüğü ya da embedding — ikincisi roadmap'te açıkça yasak.
- **İndeks statik.** Dosya değişince yeniden indekslemek gerekiyor. Watch modu yok.
- **Ağırlıklar bu repo üzerinde ayarlandı.** Başka kod tabanlarında yeniden
  bakılması gerekebilir.

---

## Roadmap kuralına uyum

"Faz içinde bonus özellik eklenmez" kuralına uyuldu. Eklenmek isteyip
**eklenmeyenler**, Faz 2/3 notuna:

- İndeks önbelleği / watch modu
- Embedding tabanlı arama (roadmap'te açıkça yasak)
- Çok dilli parser desteği
- Seçimi kullanıcıya gösterip onaylatma UI'ı

---

## Sırada ne var

Faz 2 — kural bazlı routing (mod tanımları, provider config, LLM sınıflandırma
olmadan). Faz 1'in ürettiği `beforeModel` hook'u orada da kullanılabilir:
`options` döndürerek model/parametre seçimi aynı noktadan yapılabiliyor.
