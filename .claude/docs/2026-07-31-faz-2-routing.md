# Faz 2 — Kural Bazlı Routing

**Tarih:** 2026-07-31
**Başlangıç:** 01:17
**Bitiş:** 01:22
**Süre:** ~5 dakika
**Durum:** Tamamlandı ✅ — bitiş kriteri karşılandı, ilk denemede

---

## Ne istendi

Task türüne göre farklı provider/model'e yönlendirme, **ekstra API çağrısı ve
gecikme eklemeden**.

Dört adım: mod tanımları → basit heuristic → provider config sistemi →
manuel geçiş bildirimi.

**Bitiş kriteri:** Config dosyasında tanımlı 2+ provider arasında, moda göre
doğru olanı seçip görevi o provider'a gönderebilmek. Bir provider manuel olarak
"kapalı" işaretlenince otomatik diğerine geçmek.

**Yasak:** LLM ile task sınıflandırma. Sıfırdan failover motoru yazmak.

---

## Ne yapıldı

`apps/openprovider/src/routing/` altında üç modül:

| Dosya | Sorumluluk |
|---|---|
| `modes.ts` | `plan` / `code` / `docs` / `review` modları + regex tabanlı mod önerisi |
| `config.ts` | `openprovider.config.json` şeması, okuma/yazma, ilk config üretimi |
| `router.ts` | Moda göre provider seçimi, fallback zinciri, geçiş bildirimleri |

Doğrulama: `probe-routing.ts`.

---

## Ölçülen sonuçlar

Tamamı `bun run src/probe-routing.ts` çıktısından.

### 1. Mod tespiti — 6/6, model çağrısı yok

```
OK   plan   (0.156ms, trigger "mimari")        kota göstergesi için bir mimari tasarla
OK   code   (0.231ms, trigger "düzelt")        scanner.ts'deki hatayı düzelt, testi de yaz
OK   docs   (0.004ms, trigger "README")        bu modülü README'ye ekle ve açıkla
OK   review (0.002ms, trigger "gözden geçir")  şu PR'ı gözden geçir, güvenlik açığı var mı
OK   plan   (0.001ms, trigger "how should we") how should we approach the retry loop
OK   review (0.034ms, trigger "review")        review this function for code smells
```

Mikrosaniye mertebesinde. Karşılaştırma için: bir LLM sınıflandırma çağrısı
en iyi ihtimalle ~300-800 ms ve her turda ücret demekti.

### 2. Moda göre yönlendirme

```
plan   -> gemini / gemini-3.5-flash
code   -> groq / openai/gpt-oss-120b
docs   -> groq / openai/gpt-oss-120b
review -> gemini / gemini-3.5-flash
```

### 3. Manuel kapatma → otomatik geçiş

```
disabled "groq" by hand
· groq is switched off in the config, skipping.
· Switching to gemini for this "code" turn.
routed to: gemini
```

### 4. Çalışma anı hatası → otomatik geçiş

```
· groq failed earlier in this session, skipping. (rate limited (429))
· Switching to gemini for this "code" turn.
groq -> gemini
```

### 5. Uçtan uca gönderim

Seçilen provider'a gerçek görev gitti ve cevap geldi:
```
mode "code" -> groq / openai/gpt-oss-120b
answer: Data whispers, weigh / Choosing model, silence sings
```

---

## Tasarım kararları

### Regex, sınıflandırıcı değil
Mod tespiti sadece keyword eşleşmesi. Yanlış tahmin **ucuz** — farklı bir model
seçilir, yanlış cevap üretilmez. O yüzden hızlı ve yaklaşık kural, yavaş ve
doğru olana tercih edildi. Roadmap'in yasağı da bu yönde.

### Türkçe gövde eşleşmesi
Türkçe sondan eklemeli, bu yüzden tam kelime yerine gövde eşleşiyor:
`planl\w*` → "planla", "planlama", "planlayalım". Sadece İngilizce bilen bir
tablo, Türkçe prompt'larda sessizce hep varsayılana düşerdi.

### Eşleşme sırası
`plan` → `review` → `docs` → `code`. `code`'un kelimeleri ("ekle", "test",
"fix") planlama ve inceleme cümlelerinin içinde de geçiyor, o yüzden en sonda:
daha spesifik mod kazanmalı.

### Config'de key YOK
`openprovider.config.json` sadece provider **kimliklerini** tutuyor. Key'ler
SDK'nın kendi deposunda (`~/.cline/data/settings/providers.json`, izin 0600)
kalıyor ve `ProviderSettingsManager` üzerinden okunuyor.

Bu CLAUDE.md'nin "API key'ler asla düz dosyaya/JSON'a yazılmaz" kuralının
VS Code dışındaki karşılığı: tek sır sahibi var, ve bu config dosyası
commit'lenebilir, diff'lenebilir, paylaşılabilir.

### Fallback: SDK'da yok, en basit hali yazıldı
Faz 0'da tespit edilmişti, burada tekrar doğrulandı: `@cline/core` içinde
provider'lar arası otomatik failover **yok**. Roadmap "SDK'da varsa onu kullan,
yoksa en basit haliyle kendin yaz" diyordu — yapılan tam olarak bu: sıradaki
provider'a geç ve **sebebini yüksek sesle söyle**.

### İki tür kullanılamazlık
- **`disabled`** — config'de, kalıcı, kullanıcının kararı.
- **`markUnavailable()`** — çalışma anı, sadece bu process için. Kotası
  yenilenmiş bir provider'ın sonraki çalıştırmada da cezalı kalmaması için
  diske yazılmıyor.

---

## Bilinen sınırlar

- **Mod tespiti tek dilli cümlelerde daha iyi.** Türkçe-İngilizce karışık
  cümlelerde ilk eşleşen kazanıyor.
- **Fallback sırası statik.** Kotanın gerçekten dolup dolmadığına bakmıyor,
  sadece hata aldıysa geçiyor. Canlı kota göstergesi (kullanıcının asıl hedefi)
  bunu akıllandırabilir ama o ayrı bir iş.
- **Model başına maliyet/kalite bilgisi yok.** Config elle yazılıyor.
- **`suggestConfig` tercih sırası elle belirlendi** (gemini → cerebras → groq →
  openrouter → nvidia), ölçüme dayanmıyor.

---

## Roadmap kuralına uyum

"Faz içinde bonus özellik eklenmez" kuralına uyuldu. Eklenmek isteyip
**eklenmeyenler**:

- Kota takibi / canlı limit okuma
- Faz 1 context engine'i ile routing'i tek hook'ta birleştirmek
  (ikisi de `beforeModel` kullanıyor, birleştirmek kolay — ama Faz 3 sonrası iş)
- Maliyete göre otomatik model seçimi

---

## Sırada ne var

Faz 3 — quality verification / retry: task bitince otomatik build/test, hata
varsa **tek** retry, sonra rapor. Faz 0'da bulunan "sağlayıcı hataları exception
fırlatmıyor, event olarak geliyor" notu burada kritik olacak.
