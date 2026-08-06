# Fix — NVIDIA "Unsupported parameter(s): reasoningSummary, reasoning, effort"

**Başlangıç:** 2026-08-02 16:45
**Bitiş (1. tur — yetersiz çıktı):** 2026-08-02 17:10
**2. tur başlangıç:** 2026-08-02 23:15
**2. tur bitiş (gerçek kök neden):** 2026-08-02 23:52

> **Güncelleme notu:** Bu dosyanın aşağıdaki "Düzeltme" bölümü (tek satır,
> `genericEffort: true`) **yetersiz çıktı**. Kullanıcı yeni vsix'i kurup
> tekrar denediğinde `effort`/`reasoningSummary` gitmişti ama `reasoning`
> alanının kendisi hâlâ reddediliyordu:
> `Validation: Unsupported parameter(s): reasoning`. Gerçek kök neden ve
> düzeltme aşağıda **"2. Tur — Asıl Kök Neden"** bölümünde. İlk bölüm,
> neyin neden yetersiz kaldığını göstermesi için silinmeden bırakıldı.

---

## Belirti

Kullanıcı NVIDIA'da (varsayılan model `z-ai/glm-5.2`) gerçek bir istek attı ve şu hatayı aldı:

```
Validation: Unsupported parameter(s): `reasoningSummary`, `reasoning`, `effort`
```

Bu, dünkü test planında ([provider-test-plani.md](../provider-denetimi/2026-08-01-provider-test-plani.md))
"GLM-5.2'nin katalog kaydında reasoning yeteneği var, Groq'taki
`reasoning_content` tuzağının burada da çıkma ihtimali gerçek" diye işaretlenen
riskin **gerçekleştiği** durum — ama Groq'takinden farklı bir mekanizmayla:
mesaj alanı değil, **istek parametreleri**.

## Kök neden

`sdk/packages/llms/src/providers/routing/provider-option-rules.ts` içinde
provider/model davranışları bir kural tablosuyla yönetiliyor
(`PROVIDER_OPTION_RULES`). GLM ailesi modelleri için iki yol var:

1. **Native Z.AI route** (`nativeZaiGlmThinkingRule`) — provider'ın kendi
   kataloğu `metadata.routing.reasoning.format: "glm-thinking"` taşıyorsa
   (sadece `zai` ve `zai-coding-plan`'da var), `thinking: {type: enabled}`
   şeklini gönderir.
2. **Routed (jenerik) route** (`routedGlmReasoningRule`,
   `family.glm.routed-reasoning`) — model ailesi `glm` olarak algılanan ama
   native route'a sahip olmayan **her** provider için (NVIDIA, OpenRouter,
   Vercel AI Gateway, Cline gateway…) devreye giriyor, OpenAI-compatible
   `reasoning: {enabled: true}` şeklini gönderir.

Sorun: `routedGlmReasoningRule`'un `suppresses` alanı sadece
`{ genericThinking: true }` idi — `genericEffort`'u **bastırmıyordu**.
Ayrı bir kural olan `buildCompatibleEffortOptions`
([generic-compatible.ts:75-106](../../../sdk/packages/llms/src/providers/routing/generic-compatible.ts#L75-L106))
`genericEffort` bastırılmadığı sürece, `reasoning.effort` istekte varsa
`effort`, `reasoningEffort`, `reasoningSummary` alanlarını **ayrıca** ekliyor.

Sonuç: routed GLM isteğinde her iki kural da çalışıyor, üç fazla alan
(`effort`, `reasoning`, `reasoningSummary`) NVIDIA'nın OpenAI-compatible
backend'ine gidiyor, NVIDIA bunları tanımadığı için tüm isteği reddediyor.

**Bu NVIDIA'ya özel bir hata değildi** — `isGlmModel()` model id/family'sine
bakıyor, provider'a değil. OpenRouter ve Vercel AI Gateway'in kendi özel
reasoning kuralları olduğu için (`openRouterReasoningRule`,
`vercelMiniMaxM3GatewayReasoningRule` vb., hepsi `genericEffort: true`
bastırıyor) onlar bu boşluğa hiç düşmüyordu. NVIDIA'nın (ve routed-GLM'e düşüp
kendi özel kuralı olmayan başka her provider'ın) böyle bir kuralı yoktu.

## Düzeltme

Tek satır — `routedGlmReasoningRule.suppresses`'e `genericEffort: true` eklendi:

[provider-option-rules.ts:465-483](../../../sdk/packages/llms/src/providers/routing/provider-option-rules.ts#L465-L483)

```ts
const routedGlmReasoningRule: ProviderOptionRule = {
	id: "family.glm.routed-reasoning",
	...
	suppresses: { genericThinking: true, genericEffort: true }, // genericEffort eklendi
	...
};
```

## Neden bu satırın doğru yer olduğu kanıtlandı

1. **Regresyon testi eklendi** —
   [provider-options.test.ts](../../../sdk/packages/llms/src/providers/routing/provider-options.test.ts) içine
   `"nvidia GLM effort -> generic effort/reasoningSummary suppressed, only routed reasoning shape sent"`
   adında yeni bir senaryo: `providerId: "nvidia"`, `modelId: "z-ai/glm-5.2"`,
   `reasoning: { enabled: true, effort: "medium" }` → beklenen çıktı
   `openaiCompatible` bucket'ında sadece `reasoning.enabled`, **`effort`,
   `reasoningEffort`, `reasoningSummary` YOK**.
2. **Testi düzeltmeden önce kırmızıya düşürdüm** — `suppresses`'i geçici
   olarak eski haline (`{ genericThinking: true }`) çevirip test'i çalıştırdım:
   ```
   error: expect(received).not.toHaveProperty(path)
   Expected path: not "effort"
   Received value: "medium"
   (fail) ... nvidia GLM effort -> ... [5.83ms]
   ```
   Sonra düzeltmeyi geri koydum, aynı test yeşile döndü. Yani test gerçekten
   bu bug'ı yakalıyor, kozmetik bir assert değil.
3. **Mevcut testler bozulmadı** — `provider-options.test.ts` +
   `anthropic-compatible.test.ts`: **116/116 geçti** (yeni test dahil).
4. **Build + tip kontrolü** — `bun run build:sdk` temiz, `apps/vscode`'da
   `bunx tsc -b` sıfır hata.

## Kapsam — kimi etkiliyor

`isGlmModel()` model id/family bazlı olduğu için bu düzeltme **NVIDIA'ya özel
değil** — GLM ailesi bir modeli routed (native olmayan) şekilde sunan **her**
openai-compatible provider'ı düzeltiyor. Envanterde GLM modeli taşıyan diğer
sağlayıcılar: `together` (`zai-org/GLM-5.2`), `chutes` (`zai-org/GLM-5.2-TEE`),
`cloudflare-workers-ai` (`@cf/zai-org/glm-5.2`), `cerebras` (`zai-glm-4.7`) —
hepsi aynı sınıf hatadan kurtuldu, ayrıca test edilmesi gerekmiyor çünkü kural
provider'a değil model ailesine bakıyor.

## Doğrulanmadı — hâlâ ölçüm gerektiriyor

Bu düzeltme **istek parametrelerindeki** hatayı gideriyor. Groq'ta görülen
**mesaj içeriğindeki** `reasoning_content` reddi ayrı bir mekanizma
([sanitizer.ts](../../../apps/openprovider/src/providers/sanitizer.ts)) ve
NVIDIA/GLM için hâlâ ölçülmedi — çok turlu bir araç döngüsü (S4) test
edilmeden bilinemez. Bu düzeltme sadece S0/S1'i (istek kabul ediliyor mu)
açıyor, S4'ü kanıtlamıyor.

## Sırada ne var (1. tur sonu — o zamanki değerlendirme, artık geçersiz)

~~Kullanıcı bu düzeltmeyle NVIDIA'ya tekrar istek atabilir.~~ **Yanlış çıktı** —
aşağıya bakın.

---

# 2. Tur — Asıl Kök Neden: "Unsupported parameter(s): reasoning"

## Neden 1. tur yetersizdi

1. turdaki analiz doğruydu ama **eksikti**. `routedGlmReasoningRule`'a
`genericEffort: true` eklemek `effort`/`reasoningEffort`/`reasoningSummary`
alanlarını gerçekten kapattı — ama kuralın **kendi ürettiği** alan olan
`reasoning: { enabled: true }` hiç incelenmemişti. Kullanıcı yeni vsix'i kurup
tekrar denediğinde hata küçüldü ama kaybolmadı:

```
Validation: Unsupported parameter(s): `reasoning`
```

## Asıl kök neden

[glm-thinking.ts](../../../sdk/packages/llms/src/providers/routing/glm-thinking.ts#L42-L58)
içindeki `buildRoutedGlmReasoningOptions`:

```ts
function buildRoutedGlmReasoningOptions(request: GatewayStreamRequest) {
	if (request.reasoning?.enabled === true) {
		return { reasoning: { enabled: true } };
	}
	if (request.reasoning?.enabled === false) {
		return { reasoning: { exclude: true } };
	}
	return undefined;
}
```

Bu `reasoning.enabled` / `reasoning.exclude` şekli **OpenRouter'ın kendi
gateway sözleşmesi** — OpenRouter bu alanı kabul edip kendi arkasındaki
sağlayıcıya çeviriyor. Ama `routedGlmReasoningRule`'un `applies` koşulu
şuydu:

```ts
applies: (input) =>
	!usesGlmThinkingProviderRouting(input) &&
	isGlmModel(input.request, input.context),
```

Yani **native GLM-thinking route'u olmayan (sadece `zai`/`zai-coding-plan`'da
var) ve model ailesi GLM olan her provider** bu kurala giriyordu — NVIDIA,
Together, Chutes, Cloudflare Workers AI, Cerebras dahil. Bunların hiçbiri
OpenRouter değil; NVIDIA'nın ham OpenAI Chat Completions endpoint'i
`reasoning` diye bir üst-düzey alan hiç tanımıyor, `effort`'u reddettiği gibi
`reasoning`'i de reddediyor.

**Neden ilk seferde gözden kaçtı:** Mevcut test paketinde tam bu senaryoyu
"doğru" sayan bir test vardı —
`"nvidia GLM effort -> generic effort/reasoningSummary suppressed, only
routed reasoning shape sent"` — ve bu test `openaiCompatible` bucket'ında
`reasoning: { enabled: true }`'un **kalmasını** bekliyordu. Yani mevcut
dokümantasyon/test, "NVIDIA `reasoning` alanını kabul eder" varsayımını
taşıyordu; kullanıcının gerçek ekran görüntüsü bunun yanlış olduğunu kanıtladı.
Kullanıcıya sorulup ("test mi güncellensin, yoksa tekrar mı doğrulansın")
testin güncellenmesine karar verildi — ekran görüntüsündeki hata zaten net
kanıttı.

## Düzeltme

`routedGlmReasoningRule` ikiye bölündü
([provider-option-rules.ts:465-517](../../../sdk/packages/llms/src/providers/routing/provider-option-rules.ts#L465-L517)):

```ts
const GLM_ROUTED_REASONING_SHAPE_PROVIDER_IDS = new Set([
	"openrouter",
	"vercel-ai-gateway",
]);

function supportsRoutedGlmReasoningShape(input: ProviderOptionMatchInput): boolean {
	return (
		isClineProvider(input.request.providerId) ||
		GLM_ROUTED_REASONING_SHAPE_PROVIDER_IDS.has(input.request.providerId)
	);
}

// Routed şekli DESTEKLEMEYEN provider'lar: hiçbir reasoning-şeklinde alan yok
const nonRoutedGlmReasoningSuppressionRule: ProviderOptionRule = {
	id: "family.glm.non-routed.suppress-generic-reasoning",
	applies: (input) =>
		!usesGlmThinkingProviderRouting(input) &&
		isGlmModel(input.request, input.context) &&
		!supportsRoutedGlmReasoningShape(input),
	suppresses: { genericThinking: true, genericEffort: true },
	build: () => undefined,
};

// Routed şekli DESTEKLEYEN provider'lar (OpenRouter, Vercel AI Gateway, Cline): eskisi gibi
const routedGlmReasoningRule: ProviderOptionRule = {
	id: "family.glm.routed-reasoning",
	applies: (input) =>
		!usesGlmThinkingProviderRouting(input) &&
		isGlmModel(input.request, input.context) &&
		supportsRoutedGlmReasoningShape(input),
	suppresses: { genericThinking: true, genericEffort: true },
	build: (input) => buildRoutedGlmReasoningProviderOptionsPatch(...),
};
```

NVIDIA (ve diğer ham openai-compatible GLM sağlayıcıları) artık
`nonRoutedGlmReasoningSuppressionRule`'a düşüyor: hiçbir reasoning-şeklinde
alan (`thinking`, `effort`, `reasoningEffort`, `reasoningSummary`,
`reasoning`) gönderilmiyor. OpenRouter/Vercel AI Gateway/Cline gateway'leri
eski davranışlarını koruyor.

`vercel-ai-gateway`'in de listeye eklenmesi gerekti — kural ilk halinde
sadece `openrouter`'ı kapsıyordu ama mevcut testlerde `vercel-ai-gateway` ve
`cline` (via `isClineProvider`) için de routed şeklin beklendiği ortaya
çıktı; onları da destekleyen bir kapsam eklendi.

## Doğrulama

1. **Regresyon testi güncellendi** —
   [provider-options.test.ts:779-806](../../../sdk/packages/llms/src/providers/routing/provider-options.test.ts#L779-L806):
   `"nvidia GLM effort -> no reasoning-shaped field leaks at all"` artık
   `openaiCompatible` bucket'ında `thinking`, `effort`, `reasoningEffort`,
   `reasoningSummary`, `reasoning` **hiçbirinin** olmamasını bekliyor.
2. **Elle yazılan geçici testlerle üç senaryo doğrulandı** (sonra silindi):
   - `nvidia` + `reasoning.enabled: true` → hiçbir alan yok ✅
   - `nvidia` + `reasoning.effort: "medium"` → hiçbir alan yok ✅
   - `openrouter` + `reasoning.enabled: true` → hâlâ `reasoning: {enabled: true}` alıyor (regresyon yok) ✅
3. **Tüm routing test paketi**: `provider-options.test.ts` — **99/99 geçti**
   (önce `cline`/`vercel-ai-gateway` testleri kırıldı çünkü
   `supportsRoutedGlmReasoningShape` ilk halinde sadece `openrouter`
   içeriyordu; kapsam genişletilince hepsi geçti).
4. **Tüm `@cline/llms` paketi**: 421/425 test geçti (4 skip zaten öyleydi),
   `bunx tsc --noEmit` temiz.
5. **Build + paketleme**: `bun run build:sdk` → `bun run package`
   (apps/vscode) → `vsce package` ile yeni `openprovider-0.0.5.vsix`
   (2026-08-02 23:51) üretildi.

## Ayrı bulunan bir sorun: derlenmiş `.js` kirliliği

Bu turda debug yaparken `sdk/packages/{agents,llms,shared}/src` ve
`apps/vscode/src` altında **1400'den fazla** eski `.js`/`.js.map` dosyası
bulundu — önceki bir oturumda yanlış konumda çalıştırılan `tsc` emit'inin
kalıntısı. Bunlar gerçek kaynak dosyası değil, hiçbiri git'te commit'li
değildi; hepsi silindi. Bu kirlilik bir ara test/analiz sürecini yanıltmıştı
(modül çözümlemesinin `.ts` yerine bu `.js`'leri okuyabileceği düşünülmüştü),
ama gerçek kanıtla (debug print'leriyle) bu ihtimal ekarte edildi — asıl
sorun her zaman `routing rule`'ın kendisindeydi.

## Kapsam — kimi etkiliyor

`isGlmModel()` model id/family bazlı olduğu için düzeltme GLM ailesi bir
modeli **routed (native olmayan) şekilde sunan her openai-compatible
provider**'ı kapsıyor: NVIDIA (`z-ai/glm-5.2`), `together`
(`zai-org/GLM-5.2`), `chutes` (`zai-org/GLM-5.2-TEE`),
`cloudflare-workers-ai` (`@cf/zai-org/glm-5.2`), `cerebras`
(`zai-glm-4.7`) — hepsi aynı sınıf hatadan kurtuldu.

## Doğrulanmadı — hâlâ ölçüm gerektiriyor

Bu düzeltme **istek parametrelerindeki** hatayı gideriyor (S0/S1). Groq'ta
görülen **mesaj içeriğindeki** `reasoning_content` reddi ayrı bir mekanizma
([sanitizer.ts](../../../apps/openprovider/src/providers/sanitizer.ts)) ve
NVIDIA/GLM için hâlâ ölçülmedi — çok turlu bir araç döngüsü (S3-S4) test
edilmeden bilinemez.

## Sırada ne var

Kullanıcı yeni vsix'i (2026-08-02 23:51) kurup NVIDIA/GLM-5.2'yi tekrar
deneyecek. S1 geçerse
[provider-test-plani.md](../provider-denetimi/2026-08-01-provider-test-plani.md)'deki
S3-S4 (araç çağırma, çok turlu döngü) hâlâ test edilmeli.

## Ders — bir dahaki sefere

Bir hatayı "3 parametre" diye tek bir vaka sanmak yanlıştı — her biri farklı
kod yolundan geliyordu (`buildCompatibleEffortOptions` vs.
`buildRoutedGlmReasoningProviderOptionsPatch`). Tek bir suppression eklemek
"hatanın bir kısmını" çözüp yanlışlıkla "tamamen çözüldü" izlenimi verdi.
Bu tip çok parametreli validation hatalarında her parametreyi **ayrı ayrı**
hangi kod yolunun ürettiğini izlemek gerekiyor, ilk bulunan kaynağı düzeltip
"bitti" dememek gerekiyor.
