# NVIDIA'yı Birinci Sınıf Sağlayıcı Yapmak

**Tarih:** 2026-08-01
**Başlangıç:** 00:15
**Bitiş:** 01:00
**Süre:** ~45 dakika
**Branch:** `roadmap-v2`
**Durum:** Tamamlandı ✅ — tip kontrolü temiz, canlı doğrulandı

Tartışma notu: [`nvidia-entegrasyonu-tartisma.md`](./nvidia-entegrasyonu-tartisma.md)

---

## Ne istendi

Tartışma MD'sindeki maddeleri uygulamak. Beş maddenin ikisi geçerli bir
`nvapi-` anahtarı gerektiriyordu (kullanıcının kayıtlı "anahtarı" bir URL'di),
o ikisi atlandı. Kalan üçü yapıldı.

---

## Yapılanlar

### 1. NVIDIA artık gerçek bir sağlayıcı (7 durak)

`docs/fork/REPO-MAP.md` 6 durak diyordu; gerçekte **7** çıktı.

| # | Dosya | Ne eklendi |
|---|---|---|
| 1 | `src/shared/api.ts` | `ApiProvider` union'a `\| "nvidia"` |
| 2 | `src/shared/storage/state-keys.ts` | `nvidiaApiKey` + plan/act model id & info |
| 3 | `proto/cline/models.proto` | `ModelsApiSecrets`, `ModelsApiOptions`, `ModelsApiConfiguration` |
| 3b | `proto/cline/state.proto` | `Secrets` + `Settings` |
| 4 | `api-configuration-conversion.ts` | iki yön de |
| 5 | `src/sdk/cline-session-factory.ts` | `PROVIDER_API_KEY_MAP` + `PROVIDER_MODEL_ID_MAP` |
| 6 | `providerSettingsRegistry.ts` | "NVIDIA Build" + signup URL |
| **7** | `src/sdk/model-catalog/provider-id.ts` | **checklist'te yazmıyordu** — `Record<ApiProvider, true>` |

### 2. Model listesi — 0'dan 102'ye

Asıl bulgu buydu: NVIDIA SDK kataloğunda **vardı ama sıfır modelle**. Yani
yedi durağı bağlasak bile model seçici boş gelecekti, kullanıcı yine elle
model ID yazacaktı.

`builtins.ts` override katmanına tek alanlık bir ekleme yapıldı:

```ts
{
  id: "nvidia",
  modelsSourceUrl: "https://integrate.api.nvidia.com/v1/models",
},
```

`mergeBuiltinSpecs` override'ları **birleştiriyor**, ezmiyor — o yüzden
generated spec'in geri kalanı (base URL, yetenekler, varsayılan model) olduğu
gibi kalıyor.

Bu tek satır, SDK'nın hazır `fetchModelIdsFromSource` mekanizmasını devreye
sokuyor. Yeni RPC yok, yeni UI bileşeni yok.

### 3. API key alanına URL uyarısı

`ApiKeyField.tsx` — değer `http://` veya `https://` ile başlıyorsa yumuşak bir
uyarı çıkıyor. Engellemiyor.

Bu bileşen **bütün** sağlayıcılar tarafından kullanılıyor, yani uyarı hepsine
yarıyor.

---

## Canlı doğrulama

### Base URL artık sorulmuyor

Kasten geçersiz bir anahtarla test edildi:

```
providerId: "nvidia", modelId: "moonshotai/kimi-k2.6", apiKey: "nvapi-gecersiz-test"
→ status: failed
→ error: "Authorization failed"
```

**DNS hatası ya da 404 değil, 401.** Yani istek doğru adrese gitti ve base
URL'i SDK spec'ten kendisi çözdü. Kullanıcının artık Base URL yazması
gerekmiyor.

### Model listesi geliyor

```
resolveProviderConfig("nvidia") →
  baseUrl:     https://integrate.api.nvidia.com/v1
  modelId:     z-ai/glm-5.2
  knownModels: 102 anahtar | kimi: moonshotai/kimi-k2.6
```

Önce 0'dı, şimdi 102 ve Kimi içinde.

### Tip kontrolü

`bun run check-types` (eklenti + webview) temiz. Zaten üç eksiği o yakaladı:
`ModelsApiConfiguration`'a `nvidia_api_key` eklemeyi unutmuştum ve 7. durağı
hiç bilmiyordum.

---

## Karşılaşılan iki hata

**Proto rezerve numara.** `state.proto`'nun `Settings` mesajı 139'u rezerve
etmiş (`was max_consecutive_mistakes`), ben de oraya alan koymuşum. Boş tag
tarayıcım `reserved` bildirimlerini saymıyordu. Düzeltip yeniden hesapladım.

**models.proto'da iki değil üç mesaj var.** REPO-MAP "hem `ApiConfiguration`
hem `ModelsApiConfiguration`" diyor ama gerçek isimler `ModelsApiSecrets`,
`ModelsApiOptions` ve `ModelsApiConfiguration`. İlk turda sonuncusunu
atladım, tip kontrolü yakaladı.

---

## Düzeltilen bir yanlışım

Tartışma MD'sinde ve daha öncesinde "dropdown statik bir liste gösteriyor,
Kimi listede yok" demiştim. **İkisi de yanlıştı.**

- Liste statik değil, `refreshOpenAiModels` ile canlı çekiliyordu
- Kimi listedeydi; 102 model alfabetik sıralı ve `moonshotai` ekranda görünen
  `ibm/granite`'in epey altında kalıyordu

Asıl sorun listenin içeriği değil, 102 elemanlı aranamayan bir `<select>`
olmasıydı. NVIDIA birinci sınıf olunca o ekran hiç kullanılmıyor zaten —
`GenericProviderSettings` devreye giriyor.

---

## Hâlâ ölçülmemiş: Kimi reasoning modeli

NVIDIA spec'i `capabilities: ["tools", "reasoning", "prompt-cache"]` diyor.

Faz 5'te Groq'ta şunu bulmuştuk: model `reasoning_content` üretiyor, SDK
geçmişte saklıyor, sağlayıcı geri gönderilince **kendi alanını** reddediyor;
araç kullanan döngüler çöküyor. İlk istekte değil ikincide patlıyor, o yüzden
tek turluk sohbette görünmüyor.

**NVIDIA'da aynı sorun olabilir, test edilmedi** — geçerli anahtar yok.
Varsa çözüm `apps/openprovider/src/providers/quirks.ts` içine tek satır:

```ts
nvidia: { stripReasoning: true, ... }
```

Anahtar girilir girilmez ölçülmeli. Bir görev ortasında patlamasın diye.

---

## Kullanıcının yapması gereken

1. https://build.nvidia.com → gerçek anahtarı al (`nvapi-` ile başlar)
2. VS Code'u kapat aç (sürüm 0.0.5 kuruldu)
3. Settings → API Provider → **NVIDIA Build**
4. Anahtarı yapıştır — Base URL sorulmayacak
5. Model listesinden `moonshotai/kimi-k2.6` seç

Eski "OpenAI Compatible" yoluyla girilmiş NVIDIA ayarları duruyor ama artık
gerekmiyor.

---

## Bilinen sınırlar

- **Bağlantı testi düğmesi yapılmadı.** Tartışma MD'sinde 2-C olarak
  önerilmişti. URL uyarısı bu akşamki özel hatayı yakalıyor ama yanlış bir
  anahtar hâlâ ilk gerçek isteğe kadar sessiz kalıyor.
- **Model listesi auth istemiyor**, yani listenin dolu gelmesi anahtarın
  doğru olduğunu kanıtlamıyor. Arayüzde bu belirtilmiyor.
- **Proto tag'leri elle seçildi.** Rezerve numaraları da hesaba katan bir
  script yazıldı ama tek seferlik, commit edilmedi.
- NVIDIA'nın kota başlıkları yayınlayıp yayınlamadığı **bilinmiyor** (Faz 6
  altyapısı hazır, ölçüm eksik).
