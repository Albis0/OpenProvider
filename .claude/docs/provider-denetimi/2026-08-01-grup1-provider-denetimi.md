# Grup 1 Provider Denetimi (29 provider)

- Başlangıç: 2026-08-02 14:37 (yerel saat, TSS)
- Bitiş: 2026-08-02 14:43 (yerel saat, TSS)
- Görev: `.claude/CLAUDE.md` kapsam kuralına uyularak, verilen 29 provider için envanter çıkarma + sadece bariz/ucuz eksiklerin düzeltilmesi + `quirks.ts` iskelet ekleme.

## Önemli bulgu — Adım 2 için kapsam daraltıldı

`providerSettingsRegistry.ts` denetlendi (`apps/vscode/webview-ui/src/components/settings/providers/providerSettingsRegistry.ts`). Bir alt-agent ile doğrulandı: bu dosyadaki `GENERIC_PROVIDER_PRESENTATION_OVERRIDES` ve `FALLBACK_GENERIC_PROVIDER_NAMES` haritaları **görünürlüğü değil, sadece sunumu** kontrol ediyor. Sağlayıcı dropdown'ı (`apps/vscode/webview-ui/src/hooks/useProviderListings.ts` → `ModelsServiceClient.listProviders`) SDK kataloğundaki **her** provider'ı listeler; iki haritada da olmayan bir id seçildiğinde `ApiOptions.tsx` düz `OpenAICompatibleProvider` formuna düşer (base URL + API key alanlarıyla, `listing.name` kullanarak). Yani grubumdaki 21 "jenerik" provider zaten kullanıcı tarafından görülebilir ve kullanılabilir durumda — sadece özel signup-link/alan etiketi süslemesi eksik.

Bu nedenle **hiçbir provider'ı registry'e eklemedim** — CLAUDE.md'nin "sadece bariz/ucuz eksik" kısıtı burada geçerli değil çünkü ortada gerçek bir eksik (görünmezlik) yok, sadece kozmetik bir iyileştirme fırsatı var; bunu eklemek "büyük mimari değişiklik yapma" sınırını aşmasa da gereksiz kapsam genişletmesi olurdu.

## Provider Tablosu

| id | Sınıf | Varsayılan model fiyatı (input/output $/M) | Yapılan |
|---|---|---|---|
| 302ai | jenerik (OpenAI-compatible fallback) | 5 / 25 | Dokunmadım |
| abacus | jenerik | 1 / 6 | Dokunmadım |
| abliteration-ai | jenerik | 3 / 3 | Dokunmadım |
| ai-router | jenerik | 1 / 6 | Dokunmadım |
| aihubmix | **birinci sınıf** (ApiProvider union'da var) | 1 / 6 | Doğruladım, dokunmadım |
| alibaba | jenerik | 0.5 / 3 | Dokunmadım |
| alibaba-cn | jenerik | 1.1 / 3.851 | Dokunmadım |
| alibaba-coding-plan | jenerik, abonelik ailesi | 0 / 0 (abonelik) | quirks.ts'e ekledim |
| alibaba-coding-plan-cn | jenerik, abonelik ailesi | 0 / 0 (abonelik) | quirks.ts'e ekledim |
| alibaba-token-plan | jenerik, abonelik ailesi | 0 / 0 (abonelik) | quirks.ts'e ekledim |
| alibaba-token-plan-cn | jenerik, abonelik ailesi | 0 / 0 (abonelik) | quirks.ts'e ekledim |
| ambient | jenerik | 1.05 / 4.4 | Dokunmadım |
| anthropic | **birinci sınıf** | (Claude fiyatlandırması, model bazlı) | Doğruladım, dokunmadım |
| anyapi | jenerik | 0 / 0 (varsayılan model deepseek-v4-flash) | quirks.ts'e ekledim |
| asksage | **birinci sınıf** | n/a (builtin, generated katalogda spec yok) | Doğruladım, dokunmadım |
| atomic-chat | jenerik, yerel sunucu (`127.0.0.1:1337`) | 0 / 0 (yerel model) | Dokunmadım — yerel sunucu, quirks kapsamı dışı |
| auriko | jenerik | 0.14 / 0.28 | Dokunmadım |
| bailing | jenerik | 0.57 / 2.29 | Dokunmadım |
| baseten | **birinci sınıf** | (model bazlı) | Doğruladım, dokunmadım |
| bedrock | **birinci sınıf** | (model bazlı) | Doğruladım, dokunmadım |
| berget | jenerik | 1.54 / 4.84 | Dokunmadım |
| blueclaw | jenerik | 0 / 0 | quirks.ts'e ekledim |
| cerebras | **birinci sınıf** (quirks'te de zaten var) | (model bazlı) | Doğruladım, dokunmadım |
| chutes | jenerik | 1.4 / 4.4 (ucuz, bedava değil) | quirks.ts'e ekledim |
| clarifai | jenerik | 0.95 / 4 | Dokunmadım |
| claude-code | **birinci sınıf** | n/a (builtin) | Doğruladım, dokunmadım |
| claudinio | jenerik | 0.5 / 2 | Dokunmadım |
| cline | **birinci sınıf** | n/a (builtin) | Doğruladım, dokunmadım |
| cline-pass | **birinci sınıf** | (abonelik) | Doğruladım, dokunmadım |

## Yapılan Kod Değişiklikleri

**Tek dosya değişti:** `apps/openprovider/src/providers/quirks.ts` (satır 81-136 civarı; not: dosyada paralel çalışan başka bir görev de aynı anda `nebius`/`nano-gpt`/`modelscope`/`ollama`/`opencode` girişlerini ekledi, kendi bloğum "Faz 8, grup 1 denetimi" yorumuyla ayrı ve çakışmasız).

Eklenen 7 iskelet giriş (hepsi `measuredOn` YOK, `note` ile "test edilmedi" açıkça belirtiliyor):
- `anyapi` — varsayılan model fiyatı 0, `reasoning` capability var → Groq tipi reasoning_content reddi riski notu.
- `blueclaw` — varsayılan model fiyatı 0, `reasoning` capability var → aynı risk notu.
- `alibaba-coding-plan`, `alibaba-coding-plan-cn` — abonelik ailesi, fiyat 0, `reasoning` capability.
- `alibaba-token-plan`, `alibaba-token-plan-cn` — abonelik ailesi, fiyat 0, `reasoning` capability.
- `chutes` — ucuz (bedava değil) varsayılan model, GLM/Kimi ailesi, `reasoning` capability.

Diğer 22 provider'da (jenerik veya zaten birinci sınıf olanlar) hiçbir dosyaya dokunulmadı.

## Kısıtlara Uyum

- **Hiçbir API çağrısı yapılmadı.** Tüm fiyat/model bilgisi `sdk/packages/llms/src/catalog/catalog.generated.ts` ve `sdk/packages/llms/src/providers/providers.generated.ts` statik dosyalarından okundu.
- "Test ettim" denilmedi; tüm `quirks.ts` notları "Not tested against the live API" ifadesini içeriyor.
- Gerçek network testi (S0-S6 basamakları) `.claude/docs/2026-08-01-provider-test-plani.md`'de tanımlı ve kullanıcının kendi API key'leriyle yapılması gerekiyor — bu görev kapsamında YAPILMADI.
- `bun run types` (repo genelinde typecheck, `apps/vscode` dahil tüm workspace paketleri) çalıştırıldı, **tüm paketler hatasız geçti** (dahil `@cline/vscode:typecheck`, `@openprovider/engine:typecheck`).
- Commit atılmadı.
- Kapsam 29 id ile sınırlı tutuldu, registry/proto/state-key/ApiProvider union gibi 7-durak dosyalarına dokunulmadı.
