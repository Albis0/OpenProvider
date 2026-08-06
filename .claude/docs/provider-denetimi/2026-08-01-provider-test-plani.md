# Sağlayıcı Test Planı

**Başlangıç:** 2026-08-01 14:20
**Bitiş:** 2026-08-01 14:52

---

## Bu dosya ne işe yarıyor

Elimizde **174 sağlayıcı** ve **4287 model** var. Hepsini denemek imkânsız ve gereksiz.
Bu dosya şu soruyu cevaplıyor:

> Hangisini, hangi sırayla, nasıl test edeceğim ve "çalışıyor" demek için neyi görmem gerek?

İki parça:

| Dosya | İçerik |
|---|---|
| **bu dosya** | Yöntem, sıralama, test kartları, tuzaklar, sonuç tablosu |
| [provider-envanteri.md](provider-envanteri.md) | 174 sağlayıcının tamamı + her birinin bütün model id'leri (otomatik üretildi, 147 KB) |

Envanter dosyası **elle yazılmadı** — SDK'nın kendi kataloğundan üretildi, yani
ayarlar ekranında göreceğin listenin birebir aynısı. Katalog `bun run build:sdk`
ile değişirse yeniden üretilmeli.

---

## 1. Önce şunu netleştirelim: "ücretsiz" bilgisi katalogda YOK

Envanterdeki **Fiyat** sütunu kataloğun yazdığı `$/1M token`. Ücretsiz *katman*
(free tier) bilgisi hiçbir yerde tutulmuyor. Bu yüzden:

- **Fiyat 0 ≠ bedava.** `zai-coding-plan`, `kimi-for-coding`, `minimax-coding-plan`
  gibi 18 sağlayıcının fiyatı 0 görünüyor çünkü bunlar **abonelik paketi** —
  token başına ücret yok, ama aboneliğin parası var.
- **Fiyat > 0 ≠ paralı.** Groq'un kataloğunda fiyat yazıyor ama ücretsiz katmanı
  var ve biz onu ölçtük (8000 token/dk, 1000 istek/gün).

Yani ücretsiz olup olmadığını **ancak deneyerek** öğreniyoruz. Bu dosyanın var
olma sebebi de bu.

Aşağıdaki gruplamalarda **hangi bilginin nereden geldiğini** işaretledim:

- 📁 = repodan/SDK'dan okundu, doğrulanabilir
- 🧪 = canlı API'ye karşı ölçüldü (tarih yazılı)
- 💭 = benim bilgim, **doğrulanmadı** — testin amacı zaten bunu doğrulamak

---

## 2. Test merdiveni — S0'dan S6'ya

Bir sağlayıcı "çalışıyor" ya da "çalışmıyor" diye ikiye ayrılmıyor. Kademeli
bozuluyor: chat çalışır ama araç çağırmaz, araç çağırır ama ikinci turda patlar,
her şey çalışır ama günde 20 istekte biter.

Bu yüzden her sağlayıcıya **0–6 arası bir not** veriyoruz. Not, o sağlayıcının
geçtiği en yüksek basamak.

| Basamak | Adı | Ne kanıtlıyor | Neden ayrı basamak |
|:---:|---|---|---|
| **S0** | Kimlik | Key kabul edildi, 401 yemedik | Key yanlışsa aşağıdaki hiçbir şeyin anlamı yok |
| **S1** | Tek tur cevap | Düz bir soruya metin döndü | Endpoint + model id doğru mu |
| **S2** | Streaming | Cevap parça parça geliyor | Cline arayüzü akış bekliyor; toplu dönen sağlayıcıda yazı bir anda "patlıyor" |
| **S3** | Araç çağırma | Model bir `tool_use` üretti | **Kodlama ajanı için asıl eşik.** Araç çağıramayan model dosya okuyup yazamaz |
| **S4** | Çok turlu araç döngüsü | Araç sonucu + geçmiş geri gönderildiğinde **ikinci** istek reddedilmedi | Groq'u tam burada kaybetmiştik. S3 geçip S4 kalmak çok yaygın |
| **S5** | Gerçek context | ~20k token'lık gerçek dosya içeriğiyle istek geçti | Küçük promptla çalışıp gerçek işte TPM'e takılan sağlayıcılar var |
| **S6** | Kota ölçüldü | Limit sayı olarak biliniyor (tercihen `x-ratelimit-*` başlığından) | Faz 6'daki kota takibi ancak gerçek sayıyla çalışır |

**Kural:** S4'ü geçemeyen sağlayıcı kodlama ajanı için kullanılamaz. S3'te
kalanlar sadece "sohbet/özet" işlerine yarar.

### Neden S4 bu kadar kritik — somut örnek

Groq + `gpt-oss-120b` şöyle patlıyordu:

```
'messages.1' : for 'role:assistant' the following must be satisfied
[('messages.1' : property 'reasoning_content' is unsupported)]
```

Model `reasoning` tipinde bir içerik parçası üretiyor → SDK bunu geçmişte
saklıyor → bir sonraki istekte `reasoning_content` olarak geri gönderiyor →
Groq **kendi ürettiği alanı** reddediyor. Tek turlu sohbette hiç görünmüyor,
sadece araç döngüsünde ortaya çıkıyor.

Çözümü [sanitizer.ts](../../../apps/openprovider/src/providers/sanitizer.ts)'te
duruyor ve şu an sadece `groq` için açık. **Aynı tuzağın başka sağlayıcılarda
da olması bekleniyor** — S4 testinin asıl aradığı şey bu.

---

## 3. Test nasıl yapılır — iki yol

### Yol A — Probe scriptleri (hızlı, S0–S4 için)

`apps/openprovider` altındaki scriptler zaten sağlayıcı-bağımsız yazılmış.
Sağlayıcıyı ortam değişkeniyle seçiyorsun
([provider-settings.ts](../../../apps/openprovider/src/provider-settings.ts)):

```bash
cd apps/openprovider

# S0 + S1 + S5 — key geçerli mi, cevap geliyor mu, çıkış sınırı gerekiyor mu
OPENPROVIDER_PROVIDER=nvidia \
OPENPROVIDER_MODEL=z-ai/glm-5.2 \
OPENPROVIDER_API_KEY=nvapi-... \
  bun run src/probe-free-tier.ts

# S3 + S4 — araç çağırma ve çok turlu döngü
OPENPROVIDER_PROVIDER=nvidia \
OPENPROVIDER_MODEL=z-ai/glm-5.2 \
OPENPROVIDER_API_KEY=nvapi-... \
  bun run src/probe-provider-compat.ts

# S6 — kota başlıkları var mı
OPENPROVIDER_PROVIDER=nvidia ... bun run src/probe-quota.ts
```

`OPENPROVIDER_API_KEY` vermezsen key'i eklentinin kayıtlı ayarlarından okuyor.
Key hiçbir yere yazılmıyor ve log'a basılmıyor — sadece karakter sayısı
gösteriliyor 📁.

> **Not:** `probe-provider-compat.ts` şu an Groq'a özel bölümler içeriyor.
> Başka sağlayıcıya karşı çalıştırmadan önce o bölümün genelleştirilmesi
> gerekebilir. Henüz denenmedi.

### Yol B — Eklenti içinde gerçek görev (S5 + gerçek his)

1. VS Code → OpenProvider → Settings → sağlayıcıyı seç → key'i yapıştır
2. Model seç (varsayılan geliyorsa dokunma)
3. Şu görevi ver — hem araç çağırmayı hem çok turu hem gerçek context'i zorlar:

   > "apps/openprovider/src/providers/quirks.ts dosyasını oku ve içindeki
   > sağlayıcıları tek cümleyle özetle."

4. İzlenecekler: dosyayı gerçekten okudu mu (S3), okuduktan sonra cevap
   üretebildi mi (S4), hata mesajı çıktı mı.

---

## 4. Sıralama — hangisi önce

Sıra iki şeye göre: **erişim kolaylığı** × **kodlama işine yararlılık**.

### Grup A — Bedava, kart istemez, sadece API key (ÖNCE BUNLAR)

Bu 16'sı testin asıl hedefi. Sıra keyfi değil — üsttekiler ya zaten yarı
ölçülmüş, ya da en yüksek "işe yarama" ihtimaline sahip.

| # | id | Model | VS Code | Neden bu sırada |
|:---:|---|---:|:---:|---|
| 1 | `nvidia` | 43 | ✅ | Şu an kullandığın sağlayıcı. Varsayılan modeli `z-ai/glm-5.2`. Wiring bitti, sadece key bekliyor |
| 2 | `groq` | 8 | ✅ | 🧪 S6'ya kadar ölçüldü, tuzağı biliniyor ve düzeltildi. **Karşılaştırma referansı** olarak baştan çalıştır |
| 3 | `cerebras` | 3 | ✅ | Çok hızlı, `zai-glm-4.7` var. Model sayısı az ama kalitesi yüksek |
| 4 | `openrouter` | 267 | ✅ | `:free` etiketli modeller var; ayrıca tek key ile onlarca modeli denemenin en ucuz yolu |
| 5 | `github-models` | 49 | ⬜ | 💭 GitHub token'ıyla bedava, `gpt-4.1` ve `deepseek-r1` dahil. Kataloğu 0 fiyat diyor 📁 |
| 6 | `gemini` | 14 | ✅ | 🧪 Çalışıyor **ama günde 20 istek**. Bir oturum bitiriyor. Bu yüzden 5.'de değil |
| 7 | `mistral` | 21 | ✅ | 💭 Ücretsiz katman + `codestral` (kod için özel) |
| 8 | `together` | 17 | ✅ | 💭 Açılışta kredi veriyor. `zai-org/GLM-5.2`, `Kimi-K2.7-Code` var |
| 9 | `huggingface` | 49 | ✅ | 💭 Aylık ücretsiz kredi |
| 10 | `nebius` | 20 | ✅ | 💭 Kayıt kredisi |
| 11 | `chutes` | 12 | ⬜ | 💭 Ucuz/bedava katman, GLM-5.2 ve Kimi var |
| 12 | `qiniu-ai` | 81 | ⬜ | 📁 Katalogda 0 fiyat, 81 model — grubun en kalabalığı |
| 13 | `modelscope` | 7 | ⬜ | 💭 Bedava ama Çin hesabı gerekebilir |
| 14 | `llama` | 7 | ⬜ | 💭 Meta'nın kendi API'si, önizlemede bedava |
| 15 | `cloudflare-workers-ai` | 13 | ⬜ | 💭 Günlük bedava kota **ama** base URL'de `${CLOUDFLARE_ACCOUNT_ID}` var 📁 — elle doldurulacak |
| 16 | `sambanova` | 0 | ✅ | 💭 Ücretsiz katman var **ama** kataloğunda hiç model yok 📁 — key girmeden liste boş |

### Grup B — Yerel, key hiç gerekmez

| id | Not |
|---|---|
| `ollama` | 📁 Model listesi canlı çekiliyor (`/api/tags`), katalogda 0 model. Kurulu modelin ne ise o çıkar |
| `lmstudio` | 📁 Aynı şekilde `/v1/models`'tan canlı |
| `vscode-lm` | 📁 SDK listesinde **yok**, sadece eklenti tarafında var. GitHub Copilot aboneliği gerektirir |

İnternet/kota derdi olmadığı için bunlar **düzeltme testi** için değerli:
bir hata "sağlayıcıdan mı yoksa bizim koddan mı" diye şüphelendiğinde yerelde
tekrarla.

### Grup C — Abonelik paketleri (fiyat 0 görünür, aslında paralı) — 📁

`zai-coding-plan` · `zhipuai-coding-plan` · `minimax-coding-plan` ·
`minimax-cn-coding-plan` · `kimi-for-coding` · `alibaba-coding-plan` ·
`alibaba-coding-plan-cn` · `alibaba-token-plan` · `alibaba-token-plan-cn` ·
`tencent-coding-plan` · `tencent-token-plan` · `umans-ai-coding-plan` ·
`stepfun-step-plan` · `stepfun-ai-step-plan` · `xiaomi-token-plan-ams` ·
`xiaomi-token-plan-cn` · `xiaomi-token-plan-sgp` · `kuae-cloud-coding-plan`

**Test edilmeyecek** — aboneliğin yoksa denenecek bir şey yok. Ama envanterde
duruyorlar ki ileride "fiyat 0 yazıyor, bedava sanmıştım" hatası olmasın.

### Grup D — Ek kimlik bilgisi ister, tek key yetmez — 📁

| id | İstediği |
|---|---|
| `bedrock` | AWS: region, access key, secret key, session token… (10 alan) |
| `vertex` | GCP: `projectId` (zorunlu) + region |
| `oca` | Oracle: `oca.mode` |
| `qwen` / `qwen-code` | `apiLine` (bölge seçimi) |
| `cloudflare-workers-ai` | Base URL içinde hesap id'si |

Bulut hesabı açmadan test edilemez. Grup A bittikten sonra bakılır.

### Grup E — Ücretli, kredi kartı ister

Kalan ~120 sağlayıcı. Envanterdeki **Sınıf = Ücretli** satırları.
Kart bağlamadan test edilemez, **bu planın kapsamı dışında**.

---

## 5. Test kartları — Grup A

Her kart bir sağlayıcı. Testten önce oku, testten sonra sonucu tabloya yaz.

---

### 1. `nvidia` — NVIDIA Build ⭐ önce bu

| | |
|---|---|
| **Key nereden** | https://build.nvidia.com/ → hesap aç → key üret (`nvapi-` ile başlar) |
| **Base URL** | `https://integrate.api.nvidia.com/v1` — otomatik dolu, elleme 📁 |
| **Varsayılan model** | `z-ai/glm-5.2` — 📁 zaten varsayılan, seçmene gerek yok |
| **Model sayısı** | 43 (katalog) / 102 (canlı çekim) 📁 |
| **VS Code durumu** | ✅ Birinci sınıf — kendi ayar formu, kendi state key'i var (commit `8b3253031`) |
| **Beklenen not** | S4 |

**Bilinen tuzaklar:**

- ⚠️ **`/v1/models` ucu kimlik doğrulaması istemiyor** 🧪. Yani **yanlış key
  girsen bile model listesi dolu gelir**. Liste dolu diye "key doğru" sanma —
  gerçek bir istek atana kadar 401 görünmez. Bu ikimizi de bir kere yanılttı.
- ⚠️ GLM-5.2'nin katalog kaydında `reasoning` yeteneği **yazıyor** 📁:
  ```
  capabilities: ["tools", "reasoning", "structured_output", "temperature"]
  ```
  Yani Groq'taki `reasoning_content` tuzağının burada da çıkma ihtimali
  **gerçek**. S4 testinin ilk hedefi bu.
  *(Daha önce "yeteneklerinde reasoning yok" demiştim — o, canlı çekimden gelen
  varsayılan bir kayıttı. Kürasyonlu katalog tersini söylüyor; doğrusu bu.)*
- Çıkarsa çözümü tek satır:
  [quirks.ts](../../../apps/openprovider/src/providers/quirks.ts) → `nvidia: { stripReasoning: true, ... }`
- `quirks.ts`'teki `nvidia` notu hâlâ *"Not wired into the VS Code extension yet"*
  diyor — **bu artık yanlış**, wiring bitti. Test sırasında düzeltilecek.

---

### 2. `groq` — Groq 🧪 referans

| | |
|---|---|
| **Key nereden** | https://console.groq.com/keys |
| **Base URL** | `https://api.groq.com/openai/v1` 📁 |
| **Varsayılan model** | `moonshotai/kimi-k2-instruct-0905` 📁 |
| **Model sayısı** | 8 |
| **VS Code durumu** | ✅ Birinci sınıf |
| **Bilinen not** | **S6** 🧪 (2026-07-31) |

**Ölçülmüş gerçekler** 🧪:

- 8000 token/dakika, 1000 istek/gün — `x-ratelimit-*` başlıklarından **tam sayı**
- **Rezerve edilen çıkışı da TPM'e sayıyor.** Bu yüzden 113 karakterlik bir
  prompt "32.074 token istedin" diye reddedilebiliyor. Çözüm: `beforeModel`'den
  `options: { maxTokens: 2048 }` döndürmek
- `reasoning_content` tuzağı — düzeltildi (bkz. yukarıdaki S4 açıklaması)

**Bu testte amaç yeni bilgi bulmak değil**: diğer sağlayıcıları ölçerken
elimizde "doğru çalışan bir şey neye benziyor" referansı olsun diye baştan
çalıştırılıyor. Groq bozulursa hata bizde demektir.

---

### 3. `cerebras` — Cerebras

| | |
|---|---|
| **Key nereden** | https://cloud.cerebras.ai/ |
| **Base URL** | `https://api.cerebras.ai/v1` 📁 |
| **Varsayılan model** | `zai-glm-4.7` 📁 |
| **Modeller** | `gemma-4-31b`, `zai-glm-4.7`, `gpt-oss-120b` (hepsi bu) |
| **VS Code durumu** | ✅ Birinci sınıf |
| **Beklenen not** | S4 |

**Notlar:**
- `quirks.ts`'te zaten `defaultMaxOutputTokens: 4096` yazılı ama **ölçülmemiş**
  📁 — `measuredOn` alanı boş. Bu testin işi o alanı doldurmak.
- `gpt-oss-120b` Groq'ta reasoning üreten modelin aynısı → **aynı `reasoning_content`
  tuzağı burada da beklenmeli**. S4'ü bu modelle test et.

---

### 4. `openrouter` — OpenRouter

| | |
|---|---|
| **Key nereden** | https://openrouter.ai/keys |
| **Base URL** | `https://openrouter.ai/api/v1` 📁 |
| **Model sayısı** | 267 — envanterdeki en kalabalık ikinci liste |
| **VS Code durumu** | ✅ Birinci sınıf, "popular" işaretli 📁 |
| **Beklenen not** | S6 |

**Notlar:**
- Varsayılanı `anthropic/claude-sonnet-4.6` ve **paralı**. Bedava denemek için
  model id'si `:free` ile biten bir model seç 💭 — katalogdaki 267 modelde
  arayabilirsin.
- Tek key ile onlarca modeli test edebildiğin için, **bir modelin mi yoksa bir
  sağlayıcının mı sorunlu olduğunu ayırt etmenin en ucuz yolu.**

---

### 5. `github-models` — GitHub Models

| | |
|---|---|
| **Key nereden** | GitHub Personal Access Token (`models:read` yetkisi) 💭 |
| **Base URL** | `https://models.github.ai/inference` 📁 |
| **Varsayılan model** | `deepseek/deepseek-r1-0528` 📁 |
| **Model sayısı** | 49 — `gpt-4.1`, `gpt-4o`, `deepseek-r1`, `grok-3`, `phi-4`, `codestral` |
| **VS Code durumu** | ⬜ Jenerik form |
| **Beklenen not** | S4 |

**Notlar:**
- 📁 Katalog fiyatı 0/0. Grup A'daki en iddialı model listesi bu — `gpt-4.1`
  bedava erişilebiliyorsa çok değerli.
- Varsayılan model **reasoning modeli** (`deepseek-r1`) → S4'te
  `reasoning_content` riski yüksek.
- ⬜ olduğu için model id'si ortak slotta tutulur — aşağıdaki "paylaşılan model
  slotu" tuzağını oku.

---

### 6. `gemini` — Google Gemini 🧪

| | |
|---|---|
| **Key nereden** | https://aistudio.google.com/apikey |
| **Base URL** | `https://generativelanguage.googleapis.com/v1beta` 📁 |
| **Varsayılan model** | `gemini-3.5-flash-lite` 📁 |
| **VS Code durumu** | ✅ Birinci sınıf, "popular" |
| **Bilinen not** | S4 🧪 (2026-07-31), S6 kısmen |

**Ölçülmüş** 🧪: **günde 20 istek.** Tek bir ajan oturumu bunu bitiriyor.
Reasoning modelleri görünür ilk token'dan **önce** çıkış bütçesini harcıyor, bu
yüzden ~4096'nın altına indirilen bir sınır akışı kesiyor (kırpmıyor, komple
başarısız ediyor).

**Test amacı:** Günlük limitin hâlâ 20 olup olmadığı ve `gemini-3.6-flash` gibi
yeni modellerin farklı kotası olup olmadığı. Kotası azken S5/S6 testi yapma —
S0–S4 yeter.

---

### 7–16. Kalan Grup A

Bunlar için henüz hiçbir ölçüm yok; kart yerine tablo yeterli. Test ederken
yukarıdaki merdiveni aynen uygula.

| id | Base URL 📁 | Varsayılan model 📁 | Key sayfası | Dikkat |
|---|---|---|---|---|
| `mistral` | `https://api.mistral.ai/v1` | `mistral-medium-2604` | console.mistral.ai | `codestral-latest` kod için ayrı model |
| `together` | `https://api.together.xyz/v1` | `Qwen/Qwen3.5-397B-A17B` | api.together.ai | `Kimi-K2.7-Code`, `GLM-5.2` var |
| `huggingface` | `https://router.huggingface.co/v1` | `zai-org/GLM-5.2` | huggingface.co/settings/tokens | 49 model |
| `nebius` | `https://api.tokenfactory.nebius.com/v1` | `zai-org/GLM-5.2` | auth.tokenfactory.nebius.com | 20 model |
| `chutes` | `https://llm.chutes.ai/v1` | `zai-org/GLM-5.2-TEE` | llm.chutes.ai | Model adları `-TEE` ile bitiyor |
| `qiniu-ai` | `https://api.qnaigc.com/v1` | `qwen3.5-397b-a17b` | developer.qiniu.com | 81 model, Çince arayüz |
| `modelscope` | `https://api-inference.modelscope.cn/v1` | `ZhipuAI/GLM-4.6` | modelscope.cn | Çin hesabı gerekebilir |
| `llama` | `https://api.llama.com/compat/v1` | `cerebras-llama-4-maverick-…` | llama.developer.meta.com | Türkiye'den erişim belirsiz |
| `cloudflare-workers-ai` | `…/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/v1` | `@cf/zai-org/glm-5.2` | dash.cloudflare.com | **Base URL'i elle düzelt** |
| `sambanova` | `https://api.sambanova.ai/v1` | `default` | cloud.sambanova.ai | Katalogda **0 model**, id'yi elle yaz |

---

## 6. Her sağlayıcıda geçerli tuzaklar

Test sırasında bunlardan biriyle karşılaşırsan sağlayıcıyı hemen "bozuk"
işaretleme — önce buraya bak.

### T1 — Dolu model listesi, key'in doğru olduğunu KANITLAMAZ 🧪

Çoğu sağlayıcının `/v1/models` ucu kimlik doğrulaması istemiyor. Yanlış key'le
bile liste dolu gelir, her şey kurulmuş görünür, ilk gerçek istekte 401 alırsın.

Bu yüzden **S0 ayrı bir basamak**: "liste doldu" değil, "gerçek bir istek geçti".

Kısmi önlem [ApiKeyField.tsx](../../../apps/vscode/webview-ui/src/components/settings/common/ApiKeyField.tsx)'e
eklendi — key kutusuna `http` ile başlayan bir şey yapıştırırsan uyarıyor. Ama
bu sadece "base URL'i yanlış kutuya yapıştırdın" hatasını yakalar.

### T2 — `reasoning_content` reddi (S4'ü öldüren şey) 🧪

Yukarıda anlatıldı. Belirtisi: **ilk istek çalışır, ikincisi patlar.**
Tek turlu sohbette hiç görünmez.

### T3 — Rezerve çıkışın kotaya sayılması 🧪

Belirtisi: iki kelimelik prompt "çok büyük" diye reddediliyor, hata mesajında
32.000 gibi bir sayı var. O sayı **girdi değil, çıkış bütçesi**.
Çözüm: `beforeModel` → `options: { maxTokens: 2048 }`.

### T4 — Paylaşılan model id slotu (sadece ⬜ sağlayıcılarda) 📁

`ApiProvider` union'ında **olmayan** sağlayıcıların kendi model-id alanı yok;
hepsi ortak `planModeApiModelId` / `actModeApiModelId` slotunu paylaşıyor
([cline-session-factory.ts:511-514](../../../apps/vscode/src/sdk/cline-session-factory.ts#L511-L514)).

Yani `github-models`'ten `chutes`'a geçtiğinde eski model id'si kalabilir ve
yeni sağlayıcıya ait olmayan bir model istenir. Kodda bu risk yorumla kabul
edilmiş durumda.

**Test kuralı:** iki ⬜ sağlayıcıyı arka arkaya test ederken, aradaki geçişte
model id'sinin gerçekten değiştiğini gör.

### T5 — Base URL şablonu 📁

`cloudflare-workers-ai`'ın base URL'i `${CLOUDFLARE_ACCOUNT_ID}` içeriyor.
Otomatik doldurulmuyor — elle değiştirmezsen istek hiç gitmez.

### T6 — Kataloğu boş sağlayıcılar 📁

`sambanova`, `ollama`, `morph` kataloğunda 0 model var; listeyi canlı çekiyorlar.
Model seçici boş görünürse sağlayıcı bozuk demek değil — id'yi elle yazman
gerekiyor.

### T7 — Key'ler düz metin dosyada duruyor 📁 ⚠️

Jenerik formdan girilen key'ler VS Code SecretStorage'a **değil**,
`~/.cline/data/settings/providers.json` dosyasına **düz JSON** olarak yazılıyor
([provider-settings-manager.ts:130](../../../sdk/packages/core/src/services/storage/provider-settings-manager.ts#L130)).
Tek koruma dosya izni (`0o600`) — ki Windows'ta pratikte etkisi sınırlı.

Bu upstream Cline davranışı, biz eklemedik. Ama **projenin "key'ler asla düz
dosyaya yazılmaz" kuralıyla çelişiyor**. Test kapsamı dışında ama kayda geçsin:
test için attığın key'leri iş bitince sil.

---

## 7. Sonuç tablosu — doldurulacak

Her testten sonra satırı güncelle. `—` = henüz denenmedi.

| id | S0 | S1 | S2 | S3 | S4 | S5 | S6 | Not | Tarih |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|---|---|
| `groq` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 8000 tpm / 1000 rpd, `x-ratelimit` başlığı var; sanitizer şart | 2026-07-31 |
| `gemini` | ✅ | ✅ | ✅ | ✅ | ✅ | — | ◐ | 20 istek/gün; maxTokens ≥ 4096 | 2026-07-31 |
| `nvidia` | — | — | — | — | — | — | — | Key bekleniyor | — |
| `cerebras` | — | — | — | — | — | — | — | | — |
| `openrouter` | — | — | — | — | — | — | — | | — |
| `github-models` | — | — | — | — | — | — | — | | — |
| `mistral` | — | — | — | — | — | — | — | | — |
| `together` | — | — | — | — | — | — | — | | — |
| `huggingface` | — | — | — | — | — | — | — | | — |
| `nebius` | — | — | — | — | — | — | — | | — |
| `chutes` | — | — | — | — | — | — | — | | — |
| `qiniu-ai` | — | — | — | — | — | — | — | | — |
| `modelscope` | — | — | — | — | — | — | — | | — |
| `llama` | — | — | — | — | — | — | — | | — |
| `cloudflare-workers-ai` | — | — | — | — | — | — | — | Base URL elle | — |
| `sambanova` | — | — | — | — | — | — | — | Model id elle | — |
| `ollama` | — | — | — | — | — | — | — | Yerel | — |
| `lmstudio` | — | — | — | — | — | — | — | Yerel | — |

**Groq ve Gemini satırları 🧪 gerçek ölçüm**, tahmin değil. Diğerlerinin hepsi boş.

---

## 8. Test sonucu nereye gider

Boşa test etmemek için: her ölçüm **koda** yazılmalı, yoksa üç hafta sonra
"Gemini'nin limiti neydi?" diye tekrar ölçersin.

Yeri belli:
[apps/openprovider/src/providers/quirks.ts](../../../apps/openprovider/src/providers/quirks.ts)

```ts
nvidia: {
  stripReasoning: true,          // S4'te reasoning_content reddi çıktıysa
  defaultMaxOutputTokens: 4096,  // S1/S5'te "too large" hatası çıktıysa
  supportsTools: true,           // S3 geçtiyse
  limits: { requestsPerDay: 40 },// S6'da ölçüldüyse
  note: "...",
  measuredOn: "2026-08-01",      // BU ALANI BOŞ BIRAKMA
},
```

`measuredOn` boşsa o satır tahmindir. Şu an `cerebras`, `openrouter` ve `nvidia`
satırlarında bu alan **boş** 📁 — yani oradaki `defaultMaxOutputTokens: 4096`
değerleri ölçülmüş değil, kopyalanmış varsayım. Test bunları gerçek yapacak.

---

## 9. Sırada ne var

1. NVIDIA key'i gir → S0–S4 → GLM-5.2'de `reasoning_content` var mı, cevabı al
2. `quirks.ts`'teki eski NVIDIA notunu düzelt ("not wired" artık yanlış)
3. Groq'u referans olarak baştan çalıştır
4. Grup A'nın kalanını sırayla
5. Sonuçlar tabloyu doldurdukça `quirks.ts`'e `measuredOn` ile işlensin

Ölçüm bittiğinde Faz 6'daki kota takibi ve Faz 7'deki "sorarak sağlayıcı değiştir"
akışı gerçek sayılarla çalışabilir hale gelir — şu an ikisi de çoğunlukla
tahmine dayanıyor.
