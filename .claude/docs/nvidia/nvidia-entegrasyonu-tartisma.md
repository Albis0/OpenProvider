# NVIDIA Entegrasyonu — Sorunlar ve Öneriler

> **Durum:** Tartışma notu. Hiçbiri uygulanmadı, hiçbiri karar değil.
> **Tarih:** 2026-07-31
> **Yazan:** Claude (proje sahibi onaylamadı)

Bu akşam NVIDIA + Kimi K2.6 kurmaya çalışırken üç ayrı yerde takıldık. Aşağıda
her birinin **gerçek** sebebi (tahmin değil, ölçüm) ve çözüm seçenekleri var.

---

## Özet: üç sorun, tek kök sebep

| # | Yaşanan | Gerçek sebep | Ciddiyet |
|---|---|---|---|
| 1 | Dropdown okunmuyordu | Native `<select>` temasızdı | Kozmetik — **çözüldü** |
| 2 | API Key kutusuna URL yazılmıştı, 401 | Alan hangi değeri istediğini söylemiyor | Kullanılabilirlik |
| 3 | "Kimi listede yok" sanıldı | Liste doğruydu, 102 model alfabetik — aşağıda | Kullanılabilirlik |

Üçünün de arkasında aynı şey var: **NVIDIA birinci sınıf sağlayıcı değil.**
"OpenAI Compatible" jenerik kutusuna sıkıştırılmış, o yüzden kullanıcıdan
NVIDIA'ya özel hiçbir yardım almadan Base URL + Model ID doldurması bekleniyor.

---

## Ölçülen gerçekler

Bunlar doğrulandı, varsayım değil:

```
GET https://integrate.api.nvidia.com/v1/models
→ 200, 102 model, AUTH GEREKTİRMİYOR
→ moonshotai/kimi-k2.6 listede VAR

POST https://integrate.api.nvidia.com/v1/chat/completions
→ 401 "Authentication failed"  (çünkü key yerine URL kayıtlıydı)
```

**SDK'da NVIDIA zaten tanımlı** (`providers.generated.ts:1821`):

```json
{
  "id": "nvidia",
  "name": "Nvidia",
  "family": "openai-compatible",
  "capabilities": ["tools", "reasoning", "prompt-cache"],
  "defaultModelId": "z-ai/glm-5.2",
  "apiKeyEnv": ["NVIDIA_API_KEY"],
  "defaults": { "baseUrl": "https://integrate.api.nvidia.com/v1" }
}
```

**Base URL orada yazıyor.** Ama eklenti `apps/vscode/src/shared/api.ts`
içindeki `ApiProvider` union'ında `nvidia` **yok** — yani eklenti bu spec'i
hiç okumuyor.

Bir de not: `/models` auth istemiyor. Yani dropdown dolu gelmesi anahtarın
doğru olduğunu **kanıtlamıyor**. Bu akşam beni de yanılttı.

---

## Sorun 1 — Dropdown okunmuyordu ✅ ÇÖZÜLDÜ

`OpenAICompatible.tsx`'deki `<select>`'in tek stili `width: 100%` idi. Native
select webview temasını miras almıyor, koyu temada tarayıcı varsayılanına
düşüyordu: beyaz zemin, soluk gri yazı.

VS Code'un dropdown değişkenleri verildi (kontrole ve `<option>`'lara ayrı
ayrı, çünkü açılan liste ayrı boyanıyor). Commit `3b1ed7cc4`.

Bu ekrandaki diğer bütün seçiciler zaten styled-components ile temalıydı; bu
tek başına atlanmıştı.

---

## Sorun 2 — API Key alanı hangi değeri istediğini söylemiyor

### Ne oldu
`OpenAI Compatible API Key` kutusuna key yerine `https://...` yapıştırılmış.
Sonuç: `/models` 200 döndü (auth istemiyor), `/chat/completions` 401 verdi.
Yani **arayüz her şey yolundaymış gibi göründü.**

### Neden olabilir
Ekranda üst üste üç kutu var: Base URL, API Key, Model ID. İkisi de URL/metin
kabul ediyor, hiçbiri format doğrulaması yapmıyor, hiçbiri "bu neye benzemeli"
demiyor.

### Seçenekler

**A) Format ipucu + yumuşak uyarı** (küçük, düşük risk)
Key alanı `https://` ile başlıyorsa "Bu bir URL'e benziyor — Base URL alanına mı
aitti?" diye uyar. Engelleme, sadece uyar.

**B) Sağlayıcıya özel placeholder** (küçük)
NVIDIA seçiliyken `nvapi-...` yaz. Kullanıcı neye benzediğini görsün.

**C) "Bağlantıyı test et" düğmesi** (orta)
Gerçek bir `chat/completions` çağrısı yap, 401'i **kurarken** göster,
ilk görevde değil. `/models`'a bakmak yetmiyor — auth istemiyor.

**Tavsiyem: A + C.** B tek başına zayıf çünkü placeholder key girilince
kayboluyor. C asıl değeri veriyor: yanlış anahtar anında görünüyor.

---

## Sorun 3 — "Kimi listede yok" (aslında vardı)

### Ne oldu
Dropdown açıldı, `01-ai/yi-large`'dan `ibm/granite`'e kadar görünüyordu,
`moonshotai/kimi-k2.6` görünmüyordu. "Listede yok" sanıldı.

**Ama liste 102 model içeriyor ve alfabetik.** `moonshotai` harf sırasında
`ibm`'in epey altında. Kaydırınca çıkacaktı.

### Yani asıl sorun
102 elemanlı, sırf alfabetik, aranamayan bir dropdown. Bu kadar uzun bir liste
için yanlış bileşen.

### Seçenekler

**A) Aranabilir seçici kullan** (orta)
Kod tabanında **zaten var**: `ModelAutocomplete`, `GroqModelPicker`,
`HicapModelPicker`, `BasetenModelPicker`. Hepsi arama + temalı liste sunuyor.
OpenAI-uyumlu sağlayıcı bunlardan birini kullanmıyor, tek ham `<select>` bu.

**B) Sağlayıcıya göre öne çıkanlar** (küçük)
NVIDIA için üstte kısa bir "önerilen" bölümü, altında tam liste.

**C) Olduğu gibi bırak, sadece sayıyı göster** (çok küçük)
"102 model" yazsın ki kullanıcı kaydırması gerektiğini anlasın.

**Tavsiyem: A.** Yeni bileşen yazmak yok, mevcutlardan birini bağlamak.
Kod tabanının kendi kalıbına dönmek — bu select zaten istisna.

---

## Asıl mesele — NVIDIA'yı birinci sınıf sağlayıcı yapmak

Yukarıdaki üçü semptom. Kök sebep: NVIDIA jenerik kutuda.

### Şu an kullanıcının yapması gerekenler
1. Base URL'i bilmek ve elle yazmak
2. Key'i doğru kutuya yapıştırmak
3. 102 model arasından doğru ID'yi bulmak

### Birinci sınıf olsaydı
1. Listeden "Nvidia" seç
2. Key yapıştır
3. Model seç

Base URL SDK'da **zaten yazıyor** (`defaults.baseUrl`). Kullanıcıya sormaya
gerek yok.

### Ne gerekiyor
`docs/fork/REPO-MAP.md`'de 6 adımlık checklist duruyor:
`ApiProvider` union → `state-keys.ts` → `.proto` → dönüşüm → `cline-session-factory.ts`
→ webview registry.

### Seçenekler

**A) Tam checklist'i uygula** (~yarım gün)
NVIDIA gerçek sağlayıcı olur, Base URL otomatik gelir, model listesi kendi
seçicisini kullanır. Sorun 2 ve 3 kendiliğinden kaybolur.

**B) Sadece Base URL'i otomatik doldur** (küçük)
OpenAI-uyumlu kutuda kal ama sağlayıcı spec'inden `defaults.baseUrl` çek.
Sorun 2'nin yarısını çözer, 3'ü çözmez.

**C) Hiçbiri, dokümante et** (sıfır)
README'ye "NVIDIA için şu üç değeri gir" yaz.

**Tavsiyem: A.** Zaten senin roadmap'inde duruyordu, ve "ücretsiz sağlayıcı"
tezinin merkezinde. NVIDIA Kimi K2.6'yı bedava veriyor — Gemini'nin günde 20
isteğine karşı ciddi bir alternatif.

---

## Ölçülmemiş risk: Kimi bir reasoning modeli

Faz 5'te Groq'ta şunu bulmuştuk: model `reasoning_content` üretiyor, SDK
geçmişte saklıyor, sağlayıcı geri gönderilince **kendi alanını** reddediyor.
Araç kullanan döngüler çöküyordu. Sanitizer ile çözüldü.

NVIDIA spec'i `"capabilities": [... "reasoning" ...]` diyor. **Aynı sorun
NVIDIA'da da olabilir.** Henüz test edilmedi — çünkü geçerli bir anahtar yok.

Varsa çözüm tek satır: `src/providers/quirks.ts` içine
`nvidia: { stripReasoning: true }`.

**Geçerli key girilir girilmez bunu ölçmek lazım.** Sırf bir görev ortasında
patlamasın diye.

---

## Önerilen sıra

| Sıra | İş | Büyüklük | Neden |
|---|---|---|---|
| 1 | Geçerli `nvapi-` key ile bağlantıyı doğrula | dakikalar | Diğer her şey buna bağlı |
| 2 | `reasoning_content` sorununu ölç | dakikalar | Varsa tek satır fix |
| 3 | Aranabilir model seçici (Sorun 3-A) | küçük | Mevcut bileşen, yeni kod yok |
| 4 | Key format uyarısı + bağlantı testi (Sorun 2-A+C) | küçük | Bu akşamki hatayı bir daha yaşatmaz |
| 5 | NVIDIA'yı birinci sınıf yap (Asıl-A) | yarım gün | Kökü çözer, 3-4'ü gereksizleştirir |

5'i yapacaksan 3 ve 4 kısmen boşa gidebilir — ama ikisi de OpenAI-uyumlu
sağlayıcıyı kullanan **herkese** yarıyor, sadece NVIDIA'ya değil.

---

## Tartışırken sorulacak sorular

1. NVIDIA'yı birinci sınıf yapmaya değer mi, yoksa OpenAI-uyumlu kutu yeterli mi?
2. "Bağlantıyı test et" düğmesi her sağlayıcıya mı, sadece OpenAI-uyumluya mı?
3. 102 modelli liste için arama mı, yoksa kısa "önerilen" listesi mi?
4. Model listesi auth istemiyorsa, dropdown'ın dolu olması yanlış güven veriyor
   — bunu arayüzde belirtmeli mi?

---

## Kaynaklar

- Dropdown fix: commit `3b1ed7cc4`, [OpenAICompatible.tsx](../../../apps/vscode/webview-ui/src/components/settings/providers/OpenAICompatible.tsx)
- NVIDIA spec: `sdk/packages/llms/src/providers/providers.generated.ts:1821`
- Bağlama checklist'i: `docs/fork/REPO-MAP.md`
- Reasoning sorunu ve çözümü: `.claude/docs/2026-07-31-faz-5-provider-compat.md`
- Sanitizer: `apps/openprovider/src/providers/sanitizer.ts`
