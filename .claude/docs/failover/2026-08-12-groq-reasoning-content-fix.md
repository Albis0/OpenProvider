# Groq `reasoning_content` Reddi — Eklentiye Port

**Tarih:** 2026-08-12
**Branch:** `feature/debrand-cline`
**Sürüm:** 0.0.16
**Belirti:** `groq:openai/gpt-oss-120b` ile sohbet ikinci mesajda ölüyor:

```
'messages.2' : for 'role:assistant' the following must be satisfied
[('messages.2' : property 'reasoning_content' is unsupported)]
```

Kullanıcı modeli değiştirmeyi denedi, hata gitmedi.

> **Sonraki gelişme (2026-08-12, aynı gün):** Bu düzeltme genelleştirildi.
> Groq'a özel liste yerine üç durumlu bir sağlayıcı uyumluluk tablosu geldi
> ([provider-compat.ts](../../../apps/vscode/src/sdk/provider-compat.ts)), çünkü
> DeepSeek bu alanı **zorunlu tutuyor** ve Gemini'nin thought signature'ı tam da
> bu parçaların üstünde taşınıyor — "hepsinden sil" ikisini de kırardı. Detay:
> [API uyumluluk katmanı](../provider-uyumluluk/2026-08-12-api-uyumluluk-katmani.md).

---

## 1. Neden model değiştirmek işe yaramadı

Çünkü hata **modelden gelmiyor**. Groq'un istek doğrulayıcısından geliyor.

Zincir şu:

1. `gpt-oss-120b` bir `type: "reasoning"` içerik parçası üretiyor.
2. SDK bunu sohbet geçmişinde saklıyor (doğru davranış — çoğu sağlayıcı kabul eder).
3. Bir sonraki istekte AI SDK bunu `reasoning_content` alanına çeviriyor.
4. Groq **kendi modelinin ürettiği alanı** reddediyor.

Yani Groq'un bir ucu üretiyor, öbür ucu kabul etmiyor. Model değiştirmek işe
yaramaz çünkü sorun geçmişte duran veride ve onu geri gönderen serileştirmede.

**Neden ilk mesaj çalışıyordu:** İlk istekte geçmişte asistan mesajı yok, dolayısıyla
gönderilecek `reasoning_content` de yok. İkinci istekte var. Bu yüzden tek turluk
sohbet sağlıklı görünüyor, araç döngüsü ve devam eden konuşma çöküyor — ekran
görüntüsündeki "devam et" tam olarak bu.

---

## 2. Bu hatayı daha önce çözmüşüz

`apps/openprovider/src/providers/sanitizer.ts` — Faz 5'te canlı API'ye karşı teşhis
edilmiş ve çözülmüş. `NOTES.md`'de de yazıyor. Ama o çözüm **openprovider app'inde**
kaldı, eklentiye hiç taşınmamıştı. Kullanıcı eklentiyi kullandığı için hata duruyordu.

---

## 3. Çözüm

`apps/vscode/src/sdk/reasoning-sanitizer.ts` (yeni) + `sdk-session-config-builder.ts`
içindeki `beforeModel` kancasına bağlandı.

**Neden `beforeModel`:** O parçayı üreten model, geçmişe koyan SDK. Bizim kodumuz
hiçbir yerde oluşturmuyor. Mesaj listesine sahip olduğumuz **tek nokta** bu kanca.

**Neden sadece Groq:** Liste hâlinde tutuluyor, herkese uygulanmıyor. Kabul eden
sağlayıcılarda geçmişteki reasoning modele faydalı bağlam — hepsinden silmek,
o sağlayıcılarda olmayan bir sorunu çözmek için cevap kalitesini sessizce düşürmek olurdu.

**İki incelik:**

1. **Boş mesaj tuzağı.** Bir asistan mesajı *sadece* reasoning olabilir. İçeriği
   tamamen silmek boş mesaj bırakır, sağlayıcılar onu da en az reasoning kadar sert
   reddeder. Bu yüzden boş kalırsa yerine boş metin parçası konuyor.
2. **Sıralama.** Sanitizer en sonda çalışıyor — daha önceki bir kanca mesaj
   döndürdüyse onu temizliyor, orijinal isteği değil. Yoksa o mesajlar
   temizlenmeden çıkardı.

---

## 4. Doğrulama

| Kontrol | Sonuç |
|---|---|
| `tsc --noEmit` | ✅ Temiz |
| biome + proto lint | ✅ Temiz |
| Sanitizer birim testi | ✅ 8/8 |
| Kanca bağlantı testi | ✅ 3 yeni (Groq temizler / Gemini dokunmaz / base hook mesajını temizler) |
| Tüm test | ✅ **931/931** |
| vsix | ✅ `openprovider-0.0.16.vsix` |

**Dürüst sınır:** Mantık test edildi, **canlı Groq isteğiyle değil**. Zincirin
doğru yerine bağlandığı testlerle kanıtlı ama gerçek 2. mesajın geçtiği ancak
kullanıcı denediğinde belli olur.

---

## 5. Not

`quirks.ts` NVIDIA, Cerebras ve diğer 'reasoning' yetenekli sağlayıcılar için de
aynı riski **şüpheli** olarak işaretliyor (test edilmemiş). Eğer başka bir
sağlayıcıda aynı hata görülürse çözüm tek satır:
`reasoning-sanitizer.ts` içindeki `PROVIDERS_REJECTING_REASONING` listesine eklemek.
