# Failover Sırasında Context Sıkıştırma (İŞ 2)

**Tarih:** 2026-08-17
**Branch:** `feature/debrand-cline`
**Durum:** Uygulandı. Tip kontrolü temiz, 26 yeni kontrol geçiyor, mevcut
testler bozulmadı.

---

## Problem

Failover şu ana kadar görevi bir sonraki sağlayıcıya **ham context'le**
devrediyordu. Bu güvenli varsayılan, ama aynı zamanda pahalı olanı: bir
sağlayıcının hizmet vermeyi bırakmasının en yaygın sebebi, konuşmanın o
sağlayıcının bir dakikada kabul edeceğinden büyümüş olması.

Aynı şişmiş geçmişi zincirdeki bir sonrakine vermek, onu da aynı duvara
çarptırıyor — sağlayıcı sağlayıcı, ta ki elde kota kalmayana kadar.

**İŞ 1'de ölçülen somut sayı:** Gerçek bir ajan turu **32209 token**. Groq'un
ücretsiz katmanı **8000 TPM**'de (rezerve output dahil) reddediyor. Yani
bütçenin dört katı — ve zincirdeki her sağlayıcı aynı 32k'yı görüyor.

---

## Çözüm

Geçişten hemen önce, **ucuz ve hızlı bir model** "şimdiye kadar ne oldu"yu bir
sonraki sağlayıcının gerçekten kabul edebileceği bir brief'e çeviriyor.

Ölçülen sonuç (probe): **9828 → 341 karakter.**

### Nereye oturdu

Yeni bir paralel sistem kurulmadı. Mevcut akışa tek bir noktadan girdi:

```
runAttempt döngüsü (session.ts)
  provider hata verdi
    → classifyError            (mevcut)
    → decider: switch/wait/abort  (mevcut, switch-policy.ts)
    → markUnavailable          (mevcut)
    → ★ compactForHandover     (YENİ — tam burada)
    → döngü başa, yeni sağlayıcıyla devam
```

Sıkıştırma **`request.to` belirlendikten sonra** çalışıyor, çünkü:
- Devralan sağlayıcının kim olduğu ilk kez orada biliniyor.
- Gerçekleşmeyecek bir geçiş için çağrı harcamak anlamsız olurdu.

`beforeModel` hook mimarisi de olduğu gibi kullanıldı: sıkıştırma modeli,
görevin kendi `agentFactory`'si üzerinden, `composeBeforeModel` +
`createOutputCapTransform` ile çağrılıyor. Yani sağlayıcıyla konuşmayı bilen
tek bir yer var, ikinci bir yol açılmadı.

---

## Kullanıcı ayarı

`openprovider.config.json` içine yeni bir blok:

```json
"compression": {
  "provider": "groq",
  "model": "openai/gpt-oss-safeguard-20b",
  "enabled": true,
  "maxTokens": 1024
}
```

| Alan | Anlamı |
|---|---|
| `provider` | Sıkıştırmayı yapacak sağlayıcı. Yoksa özellik kapalı. |
| `model` | Model id. Boşsa sağlayıcının kayıtlı varsayılanı. |
| `enabled` | Ana anahtar. **Varsayılan `false`.** |
| `maxTokens` | Özetin kendi output tavanı. Varsayılan 1024. |

### Neden varsayılan kapalı

Açmak, kullanıcının seçmediği bir sağlayıcıya fazladan bir çağrı harcamak
demek. Rol zinciri de aynı sebeple kapalı geliyor. `suggestConfig` bloğu
**yazıyor ama açmıyor** — kullanıcı tek bayrağı çevirerek açabilsin, ama
kendiliğinden para/kota harcamasın.

### Sessiz bir tuzak kapatıldı

`{"enabled": true}` yazıp `provider` yazmamak, ancak **failover'ın tam
ortasında** patlayacak bir özellik kurardı — yani görev zaten başı dertteyken.
`parseCompression` bu durumu `enabled: false`'a zorluyor.

---

## Asla görevi durdurmama

Bu, özelliğin en önemli kısmı. Sıkıştırma bir **optimizasyon**, bir bağımlılık
değil. Her başarısızlık yolu ham prompt'a dönüyor:

| Durum | Davranış |
|---|---|
| Kapalı | Ham context, hiç çağrı yok |
| Sıkıştırma sağlayıcısının anahtarı yok | Ham context |
| Sıkıştırma sağlayıcısı = az önce patlayan sağlayıcı | Ham context (atlanır) |
| **Sıkıştırma modeli de rate limit yedi** | **Ham context, görev devam eder** |
| Model boş/whitespace döndü | Ham context |
| "Özet" orijinalden büyük | Ham context |
| Model 20sn içinde cevap vermedi | Ham context |
| Context zaten kısa (<2000 karakter) | Ham context, çağrı harcanmaz |

`compactForHandover` **hiç exception fırlatmıyor**. Failover'ı daha kırılgan
hale getiren bir özellik, kendi amacını yok ederdi.

### Sıkıştırma sağlayıcısı neden farklı olmalı

Kotası biten sağlayıcıdan kendi geçmişini özetlemesini istemek, orijinal
çağrının başarısız olduğu sebebin aynısıyla başarısız olur. Kod bunu tespit
edip atlıyor, ve `suggestConfig` sıkıştırma için **birincil değil** ucuz olanı
öneriyor — birincide bir limit, hem görevi hem de kurtarma mekanizmasını aynı
anda öldürmesin diye.

---

## Devralan modele ne gönderiliyor

Çıplak bir özet gönderilse, modeller düzenli olarak özeti **onaylayarak**
cevap veriyor, işe devam etmek yerine. Bu yüzden brief bir devir teslim
çerçevesine sarılıyor: "bu görevi devraldın, kaldığı yerden devam et, brief'i
bana geri özetleme."

Özet formatı: hedef → yapılanlar (dosya yollarıyla) → kalan adımlar →
kaybolmaması gereken kısıtlar/hata metinleri. Dosya yolları ve hata metinleri
**birebir** korunuyor.

Sıkıştırma modeli **araçsız** (`tools: undefined`) ve **tek turlu**
(`maxIterations: 1`) çağrılıyor: özet çıkaran bir modelin dosya düzenleyebilmesi
gereksiz bir risk, döngüye girmesi de tasarruf etmesi gereken şeyi harcar.
Context enjeksiyonu da bilinçli olarak yok — amaç payload'ı *küçültmek*, repo
map'i ise context transform'un eklediği en büyük şey.

---

## Doğrulama

| Kontrol | Sonuç |
|---|---|
| `bunx tsc --noEmit` (openprovider) | **Temiz** |
| `bun run probe:compaction` (yeni) | **26/26** |
| `probe-switch` | 20/20 (bozulmadı) |
| `probe-routing` / `probe-quota` / `probe-verify` | PASS |
| `probe-provider-compat` / `probe-multi-agent` | PASS |
| Extension `bun run test:unit` | **935 pass / 1 fail** (aynı, önceden var olan `shell.test.ts` hatası) |
| biome (openprovider) | 40 hata — **değişiklikten önceki sayının aynısı**, yeni dosyalar temiz |

### Yeni testler — `probe-compaction.ts`

26 kontrol, altı başlıkta. Ağırlık bilinçli olarak **başarısızlık
yollarında**: bir sıkıştırma adımının görevi askıda bırakabilmesi, failover'ı
iyileştirmek yerine kötüleştirir.

1. **Config** (4) — yok/açık/sağlayıcısız-açık/bozuk maxTokens
2. **Render** (3) — brief iki sağlayıcıyı da adlandırıyor, boş çıktılar
   atlanıyor, devralan "devam et" talimatı alıyor
3. **Her başarısızlık ham prompt'a düşüyor** (9) — kapalı, anahtar yok, aynı
   sağlayıcı, **rate limit**, boş cevap, şişmiş özet, timeout, kısa context,
   ve çalıştığında gerçekten küçülme
4. **Uçtan uca sıkıştırma** (4) — geçiş oldu, doğru sağlayıcı sıkıştırdı,
   ikinci sağlayıcı brief'i aldı, kullanıcıya söylendi
5. **Uçtan uca sıkıştırma çöktü** (3) — görev yine de tamamlandı, ikinci
   sağlayıcı ham context'i aldı, sebep görünür
6. **Varsayılan kapalı** (3) — sıkıştırıcı hiç çağrılmadı, davranış eskisiyle
   birebir aynı, gereksiz uyarı üretmiyor

---

## Değişen dosyalar

| Dosya | İş |
|---|---|
| `routing/compaction.ts` | **Yeni.** Sıkıştırma mantığı, tüm geri düşme yolları |
| `routing/config.ts` | `CompressionTarget` tipi, `parseCompression`, `suggestConfig` |
| `routing/index.ts` | Dışa aktarımlar |
| `session.ts` | Geçiş noktasına bağlama, `defaultCompactionRunner`, `credentials` alanı |
| `probe-compaction.ts` | **Yeni.** 26 kontrol |
| `probe-multi-agent.ts` | Literal config'e `compression` alanı (tip gereği) |
| `package.json` | `probe:compaction` script'i |
| `openprovider.config.json` | Örnek blok (kapalı) |
| `README.md` | Ayarın belgelenmesi |

---

## Bilinen sınırlar — dürüst liste

- ~~**Canlı bir sağlayıcıyla hiç denenmedi.**~~ **2026-08-20'de kapatıldı.**
  `probe:compaction-live` gerçek Groq modeliyle ölçüyor: 6396 → ~1900 karakter
  (orijinalin %30-35'i), ~1.3 saniye. Brief, alıcı modelin ihtiyaç duyduğu
  altı şeyin hepsini koruyor — dosya yolları, birebir assertion hata metni,
  teşhis, kullanıcının kısıtı, kalan adımlar — ve 40 satırlık gürültüyü atıyor.
  Detay: `.claude/docs/failover/2026-08-20-sinifllandirici-ve-sikistirma-kalitesi.md`
- **Sıkıştırma sadece `apps/openprovider`'da.** VS Code eklentisinin kendi
  failover'ı (`apps/vscode/src/sdk/failover/`) ayrı bir uygulama ve bu
  özelliği almadı. Görev tanımı `switch-policy.ts` akışını işaret ediyordu, o
  da bu app'te.
- **Özet kalitesi ölçülmüyor.** Kod yalnızca "boş mu" ve "orijinalden büyük
  mü" diye bakıyor. Bilgi kaybeden ama kısa bir özet tespit edilemez.
- **Prompt sıkışıyor, mesaj geçmişi değil.** Bu app'in akışında context
  prompt'a gömülü olduğu için yeterli; SDK'nın mesaj dizisini doğrudan
  yeniden yazmak ayrı bir iş.
