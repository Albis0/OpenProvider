# API Uyumluluk Katmanı — Her Sağlayıcının Farklı Huyu

**Tarih:** 2026-08-12
**Branch:** `feature/debrand-cline`
**Sürüm:** 0.0.17 (`openprovider-0.0.17.vsix`)
**İstek:** "önce nvidia'da bir sürü sorun, sonra gemini'de, sonra denediğim tüm
API'lerde hepsi birbirinden farklı sorunlar var — her API'nin gereksinimlerini
araştırıp kod tabanıyla uyumluluğuna bak, hata çıkaranı ya da çıkarabilecekleri
düzelt"

---

## 1. Asıl mesele: "OpenAI-compatible" bir sözleşme değil

Sağlayıcıların hepsi "OpenAI uyumluyuz" diyor. Ama bu bir standart değil, bir
**aile benzerliği** — ve aile üyeleri *aynı alan* konusunda birbiriyle çelişiyor:

| Sağlayıcı | `reasoning_content` geçmişte olursa |
|---|---|
| **Groq** | Reddediyor — kendi modelinin ürettiği alanı |
| **Cerebras** | Reddediyor — aynı hata, aynı şekil |
| **DeepSeek** | **Zorunlu tutuyor** — yoksa 400 |
| **Gemini** | Thought signature tam da o parçaların üstünde taşınıyor — silinirse 400 |

Bu tablo, "neden her API'de başka bir sorun çıkıyor" sorusunun cevabı. Sorun
sende ya da bir modelde değil: **dördü birbirinden farklı şey istiyor.**

Ve hepsi aynı sinsi şekilde patlıyor — **ilk istek çalışıyor**, ikinci istek
ölüyor. Çünkü ilk istekte geçmişte asistan mesajı yok. Bu yüzden tek soruluk
sohbet sağlıklı görünüp araç döngüsü çöküyor.

### Neden "hepsinden silelim" yanlış olurdu

Groq'u düzeltmenin bariz yolu "reasoning geçmişte sorun çıkarıyor, her yerden
sil" demek. Bu **DeepSeek'i ve Gemini'yi kırardı** — hem de tam olarak aynı
görünmez, ikinci-istekte-ölen şekilde. Bir sorunu çözüp iki tane üretmek olurdu.

Bu yüzden politika **üç durumlu**, boolean değil:

- `strip` — sağlayıcı reddediyor, gönderilmeden önce çıkar
- `require` — sağlayıcının geri istiyor, sakın dokunma
- (kayıt yok) — ölçmedik, SDK'nın davranışına karışma

---

## 2. Araştırma — kaynaklar

Bunlar tahmin değil, her biri kaynaklı:

- **DeepSeek**, thinking mode + tool kullanımında `reasoning_content`'in
  **geri gönderilmesini şart koşuyor**; göndermeyince
  `400 The reasoning_content in the thinking mode must be passed back`.
  Kendi dokümanlarında yazıyor, ve bir sürü istemci bu yüzden kırılmış.
- **Cerebras**, Groq'un birebir aynısını yapıyor — `gpt-oss-120b` ve
  `zai-glm-4.7` için birbirinden bağımsız raporlar var, hata metni bile aynı:
  `property 'reasoning_content' is unsupported`.
- **Gemini 3.x**, tool kullanımında `thought_signature`'ı **birebir** geri
  bekliyor; eksikse `missing thought_signature in functionCall parts`.
  Kodumuzda bu imza `reasoning` parçalarının `signature` alanında taşınıyor
  ([compat.ts:560-572](../../../sdk/packages/llms/src/providers/compat.ts#L560-L572)),
  yani Gemini'de reasoning silmek doğrudan bu hatayı üretirdi.
- **Groq**, 8000 TPM'i input **ve rezerve edilen output** arasında paylaştırıyor
  (kendi `x-ratelimit` başlıklarıyla doğrulandı, 2026-07-31).

### Araştırıp "bizde sorun yok" dediklerim

Bunlar da gerçek risklerdi, kontrol ettim, temiz çıktılar:

| Risk | Sonuç |
|---|---|
| NVIDIA NIM `function.strict` alanını reddediyor | Kodumuz hiç göndermiyor ✅ |
| NIM/Cerebras `developer` rolünde 500 veriyor | Kodumuz `developer` rolü kullanmıyor ✅ |
| Gemini thought signature'ı kaybediliyor olabilir | SDK 8 dosyada round-trip ediyor ✅ |

---

## 3. Ne değişti

### `apps/vscode/src/sdk/provider-compat.ts` (yeni) — tek tablo

Üç durumlu reasoning politikası + çıktı sınırları, tek yerde. Her kaydın bir
`note`'u ve bir `source`'u var (`measured` = biz ölçtük, `reported` = başkaları
tekrarladı). Bu ayrım önemli: `measured` bir kayıt yanlış davranıyorsa sağlayıcı
değişmiştir, `reported` olan baştan yanlış olabilir.

Sanitizer'daki ikinci liste kaldırıldı — iki liste tutmak, tam da bu iki grubun
(reddedenler / zorunlu tutanlar) zamanla birbirine karışma yolu.

### Çıktı sınırı — Groq'un gerçek engeli

`maxTokensPerTurn` artık sağlayıcı varsayılanı da alabiliyor. Groq'ta 2048.

Sebep: Groq **rezerve edilen** output'u da kotadan sayıyor. Sınırsız bir ajan
isteği modelin tüm output penceresini (32k+) rezerve ediyor ve daha çalışmadan
reddediliyor — kullanılmayacak tokenler yüzünden. Yani "sınır koymamak" göründüğü
gibi tarafsız seçim değil.

Sıralama: **senin ayarın** > OpenAI-compatible ayarı > sağlayıcı varsayılanı.
İstemediğin bir sınırın uzun cevaplarını sessizce kesmesi, önlediği kota
hatasından daha kötü olurdu.

### `provider-compat-repair.ts` (yeni) — kendini onarma

Tabloda olmayan bir sağlayıcı reasoning'i reddederse artık görev ölmüyor:
hata tanınıyor, sağlayıcı kaydediliyor, **aynı sağlayıcıda** tur yeniden
deneniyor.

**Neden failover değil:** Failover "bu sağlayıcı şu an hizmet veremiyor, kim
verebilir?" sorusunun cevabı. Uyumluluk reddi bunun tersi — sağlayıcı gayet
sağlıklı, sadece kabul etmediği bir alan gönderiyoruz. Orada sağlayıcı
değiştirmek iki kere yanlış: ikinci sağlayıcının kotasını, istekle birlikte
taşınan bir sorun için harcıyor, ve yeni sağlayıcıya da onarılmamış gidiyor.

Sınıflandırıcı zaten bu hatalarda failover'a girmiyor (400 terminal sayılıyor),
yani bu dosyadan önce görev orada **sessizce bitiyordu**. Kapanan boşluk bu.

**Sonsuz döngü olamaz:** `noteReasoningHistoryRejected` bir sağlayıcıyı sadece
ilk seferde öğreniyor, ikinci çağrıda `false` dönüyor. Onarım işe yaramazsa hata
normal yoluna devam ediyor. Çalışmayan bir onarımın tek çıkmazı sonsuz çıkmaza
çevirmesi kabul edilemezdi.

### Karar isteğe taşındı — sessiz bir tuzak

Sanitizer kararı önceden **oturum kurulurken bir kez** okunuyordu, kod yorumu da
"sağlayıcı değişiminde oturum yeniden kuruluyor, bayatlayamaz" diyordu. Onarım
yolu bunu yanlışladı: çalışma anında öğrenilen bilgi o oturuma hiç ulaşmazdı,
retry birebir aynı reddedilen isteği gönderirdi — onarım çalışmış *görünüp*
hiçbir şey yapmazdı.

Karar artık her istekte okunuyor.

---

## 4. Doğrulama

| Kontrol | Sonuç |
|---|---|
| Tüm testler | ✅ **959/959** (önce 931, +28 yeni) |
| `bunx tsc --noEmit` | ✅ Temiz |
| biome lint (1127 dosya) + proto lint | ✅ Temiz |
| `bun run package` | ✅ Temiz |
| vsix | ✅ `openprovider-0.0.17.vsix` |

**Mutasyon testi yapıldı.** En kritik yeni iddia "karar her istekte okunuyor"
idi. Kodu geçici olarak eski hâline (kurulumda bir kez) döndürdüm:

```
× re-reads the strip decision per request, so a provider learned mid-session takes effect
  Tests  1 failed | 6 passed (7)
```

Geri alınca yeşile döndü. Yani test gerçekten bu hatayı yakalıyor, kozmetik
değil.

Ayrıca çıktı sınırı testinde bir varsayımım yanlış çıktı ve testler yakaladı:
override'ın model id'ye göre anahtarlandığını, uydurma bir model id ile
çalışmayacağını test kırmızıya düşünce öğrendim.

---

## 5. Dürüst sınırlar

- **Canlı API'ye karşı doğrulanmadı.** Zincirin doğru yerlere bağlandığı
  testlerle kanıtlı, ama gerçek bir Cerebras/DeepSeek isteği atılmadı. Tablodaki
  `reported` kayıtlar başkalarının tekrarladığı hatalar — bizim ölçümümüz değil.
- **Groq'un 2048 sınırı bir denge.** Kota hatasını bitiriyor ama çok uzun tek
  seferlik dosya yazımları kırpılabilir. Ayarlardan kendi değerini vermen bunu
  eziyor.
- **Öğrenilen sağlayıcılar kalıcı değil** — sadece o oturum boyunca. Kasıtlı:
  yanlış bir kalıcı kayıt bir sağlayıcıyı sonsuza kadar, kullanıcının
  temizleyemeyeceği şekilde bozardı. Bedeli sonraki oturumda bir başarısız istek.
- **NVIDIA hâlâ tabloda yok.** Reasoning'i reddedip etmediği ölçülmedi; artık
  reddederse kendi kendine öğrenip devam edecek.

---

## 6. Sırada ne var

1. `openprovider-0.0.17.vsix` kurulup NVIDIA/Gemini/Groq'ta çok turlu bir araç
   döngüsü denenmeli (test merdiveninde S3-S4).
2. Kendi kendine öğrenme tetiklenirse log'da `[CompatRepair]` satırı görünür —
   o sağlayıcı tabloya `measured` olarak eklenmeli.
3. Ölçülen her yeni davranış `provider-compat.ts`'e, `apps/openprovider`'daki
   `quirks.ts`'e değil: eklenti artık kendi tablosunu okuyor.

---

## Kapsam dışı bırakılan, ama duruyor

`refreshGroqModels.ts:110` API anahtarının ilk 10 karakterini log'luyor. CLAUDE.md'deki
"API key'ler asla loglanmaz" kuralıyla çelişiyor. Bu turun kapsamı değildi, dokunmadım —
ama not düşülmesi gereken gerçek bir açık.
