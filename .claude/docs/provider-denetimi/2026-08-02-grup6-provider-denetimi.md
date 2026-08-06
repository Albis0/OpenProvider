# Grup 6 Provider Denetimi

**Başlangıç:** 2026-08-02 ~09:40
**Bitiş:** 2026-08-02 ~10:20

---

## Kapsam

Görev tanımında verilen 29 id (brief "30" diyor ama liste 29 madde içeriyor):

```
the-grid-ai, thinkingmachines, tinfoil, together, trustedrouter, umans-ai,
umans-ai-coding-plan, unorouter, upstage, v0, vercel-ai-gateway, vertex,
vivgrid, vultr, wafer.ai, wandb, xai, xiaomi, xiaomi-token-plan-ams,
xiaomi-token-plan-cn, xiaomi-token-plan-sgp, xpersona, zai, zai-coding-plan,
zeldoc, zenifra, zenmux, zhipuai, zhipuai-coding-plan
```

**Id-eşleşme notu:** `wafer.ai` gerçek katalogda tam olarak bu şekilde,
literal nokta içeren bir id olarak mevcut (`"id": "wafer.ai"`,
`sdk/packages/llms/src/providers/providers.generated.ts:2782`). Başka hiçbir
isim/id uyuşmazlığı bulunmadı — kalan 28 id, katalogda birebir aynı yazımla
var.

---

## Envanter tablosu

Kaynak: `sdk/packages/llms/src/providers/providers.generated.ts` (all 29 id
found here) ve `sdk/packages/llms/src/providers/builtins.ts` (7 tanesi ayrıca
runtime override/first-class spec olarak burada da tanımlı: xai, together,
vercel-ai-gateway, v0, zai, zai-coding-plan, vertex).

`ApiProvider` union'ı doğrulaması: `apps/vscode/src/shared/api.ts:4-53`.
Beklenenden bir fazla first-class çıktı — brief 8 bekliyordu (v0,
vercel-ai-gateway, vertex, wandb, xai, xiaomi, zai, zai-coding-plan), ama
`together` da union'da (satır 17). Toplam first-class: **9**.
`apps/vscode/src/shared/cline/api.ts` içinde ayrı bir `ApiProvider` tanımı
yok — sadece proto tiplerini import ediyor, union tek yerde tanımlı.

| id | first-class mi | fiyat/free-tier bilgisi (📁 envanterden) | yapılan işlem | dosya:satır |
|---|---|---|---|---|
| `the-grid-ai` | generic | 9 model, varsayılan `agent-max` $0/$0 (katalogda 0 — abonelik/veri eksik ayrımı yapılamıyor) | display name eklendi + quirk eklendi | providerSettingsRegistry.ts:201, quirks.ts |
| `thinkingmachines` | generic | 1 model, varsayılan `inkling` $3.74/$9.36 (ücretli) | display name eklendi | providerSettingsRegistry.ts:202 |
| `tinfoil` | generic | 6 model, varsayılan `glm-5-2` $1.5/$5.25 (ücretli) | display name eklendi | providerSettingsRegistry.ts:203 |
| `together` | **first-class** (ApiProvider + builtins.ts override) | 17 model, GLM/Kimi-K2 ailesini barındırıyor (`zai-org/GLM-5.2`, `moonshotai/Kimi-K2.7-Code`, `moonshotai/Kimi-K2.6`) | dokunulmadı (zaten first-class) + quirk eklendi (zorunlu) | quirks.ts |
| `trustedrouter` | generic | 7 model, varsayılan `synth` $0/$0 (katalogda 0) | display name eklendi + quirk eklendi | providerSettingsRegistry.ts:204, quirks.ts |
| `umans-ai` | generic | 5 model, varsayılan `umans-glm-5.2` $1.4/$4.4 (ücretli) | display name eklendi | providerSettingsRegistry.ts:205 |
| `umans-ai-coding-plan` | generic | 6 model, abonelik ailesi (`-coding-plan`) | display name eklendi + quirk eklendi (nötr not) | providerSettingsRegistry.ts:206, quirks.ts |
| `unorouter` | generic | 23 model, varsayılan `claude-sonnet-5` $1.44/$7.2 (ücretli) | display name eklendi | providerSettingsRegistry.ts:207 |
| `upstage` | generic | 3 model, varsayılan `solar-pro3` $0.25/$0.25 (ücretli) | display name eklendi | providerSettingsRegistry.ts:208 |
| `v0` | **first-class** (ApiProvider + builtins.ts override) | 3 model, varsayılan `v0-1.5-md` $3/$15 (ücretli) | dokunulmadı (zaten first-class) | — |
| `vercel-ai-gateway` | **first-class** (ApiProvider + builtins.ts override) | 180 model, varsayılan `alibaba/qwen3.6-plus` $0.5/$3 (ücretli), passthrough gateway | dokunulmadı (zaten first-class) + quirk eklendi (zorunlu) | quirks.ts |
| `vertex` | **first-class** (ApiProvider + builtins.ts override) | 28 model, varsayılan `claude-sonnet-5@default` $2/$10; GCP `projectId` gerektiren özel form var (`VertexProvider.tsx`) | dokunulmadı — özel form mevcut, incelenmedi/değiştirilmedi | apps/vscode/webview-ui/src/components/settings/providers/VertexProvider.tsx |
| `vivgrid` | generic | 17 model, varsayılan `gpt-5.6-luna` $1/$6 (ücretli) | display name eklendi | providerSettingsRegistry.ts:209 |
| `vultr` | generic | 10 model, varsayılan `zai-org/GLM-5.2-FP8` $0.85/$3.1 (ücretli) | display name eklendi | providerSettingsRegistry.ts:210 |
| `wafer.ai` | generic | 5 model, varsayılan `GLM-5.2` $1.2/$4.1 (ücretli) | display name eklendi | providerSettingsRegistry.ts:211 |
| `wandb` | **first-class** (ApiProvider, generic-form fallback zaten var) | 25 model, varsayılan `zai-org/GLM-5.2` $1.39/$4.4 (ücretli) | dokunulmadı (zaten first-class + fallback adı mevcuttu) | — |
| `xai` | **first-class** (ApiProvider + builtins.ts override) | 5 model, varsayılan `grok-4.20-0309-non-reasoning` $1.25/$2.5 (ücretli, free-tier durumu belirsiz) | dokunulmadı (zaten first-class) + quirk eklendi (zorunlu) | quirks.ts |
| `xiaomi` | **first-class** (ApiProvider, generic-form fallback zaten var) | 3 model, varsayılan `mimo-v2.5-pro-ultraspeed` $1.305/$2.61 (ücretli) | dokunulmadı (zaten first-class + fallback adı mevcuttu) | — |
| `xiaomi-token-plan-ams` | generic | 2 model, abonelik ailesi (`-token-plan`, Avrupa/AMS bölgesi) | display name eklendi + quirk eklendi (nötr not) | providerSettingsRegistry.ts:212, quirks.ts |
| `xiaomi-token-plan-cn` | generic | 2 model, abonelik ailesi (`-token-plan`, Çin bölgesi) | display name eklendi + quirk eklendi (nötr not) | providerSettingsRegistry.ts:213, quirks.ts |
| `xiaomi-token-plan-sgp` | generic | 2 model, abonelik ailesi (`-token-plan`, Singapur bölgesi) | display name eklendi + quirk eklendi (nötr not) | providerSettingsRegistry.ts:214, quirks.ts |
| `xpersona` | generic | 3 model, varsayılan `claude-fable-5` $3/$18 (ücretli) | display name eklendi | providerSettingsRegistry.ts:215 |
| `zai` | **first-class** (ApiProvider + builtins.ts override) | 14 model, varsayılan `glm-5v-turbo` $1.2/$4 (ücretli); orijinal/first-party GLM sağlayıcısı | dokunulmadı (zaten first-class) + quirk eklendi (zorunlu) | quirks.ts |
| `zai-coding-plan` | **first-class** (ApiProvider + builtins.ts override, fallback adı zaten var) | 6 model, abonelik ailesi (`-coding-plan`) | dokunulmadı (zaten first-class + fallback adı mevcuttu) | — |
| `zeldoc` | generic | 1 model, varsayılan `z-code` $0/$0 (katalogda 0) | display name eklendi + quirk eklendi | providerSettingsRegistry.ts:216, quirks.ts |
| `zenifra` | generic | 1 model, varsayılan `alibaba/qwen3.6-35b-a3b` $0.19/$0.48 (ücretli) | display name eklendi | providerSettingsRegistry.ts:217 |
| `zenmux` | generic | 120 model, varsayılan `moonshotai/kimi-k3` $3/$15 (ücretli) | display name eklendi | providerSettingsRegistry.ts:218 |
| `zhipuai` | generic | 13 model, varsayılan `glm-5.2` $1.4/$4.4 (ücretli) | display name eklendi | providerSettingsRegistry.ts:219 |
| `zhipuai-coding-plan` | generic | 7 model, abonelik ailesi (`-coding-plan`) | display name eklendi + quirk eklendi (nötr not) | providerSettingsRegistry.ts:220, quirks.ts |

**Fiyat/free-tier bilgisi kaynağı:** yalnızca `.claude/docs/provider-envanteri.md`
dosyasındaki katalog verisi (📁, models.dev'den otomatik üretildi). Hiçbiri
canlı olarak doğrulanmadı; "$0/$0" satırları çoğunlukla abonelik ailesi ya da
katalogda fiyat verisi eksik olduğu anlamına geliyor — "gerçekten bedava"
anlamına gelmiyor.

---

## Yapılan değişiklikler (dosya listesi)

1. `apps/vscode/webview-ui/src/components/settings/providers/providerSettingsRegistry.ts`
   — `FALLBACK_GENERIC_PROVIDER_NAMES` haritasına 21 yeni satır eklendi
   (satır ~198-220 civarı, "Grup 6 provider audit" yorumu altında). Sadece
   generic-form kullanan, first-class olmayan 21 id için display name eklendi
   (subscription-plan id'leri dahil — görev talimatı bunlar için "ekstra iş
   yapma" dedi, display name eklemeyi hariç tutmadı).
2. `apps/openprovider/src/providers/quirks.ts` — `QUIRKS` haritasına 12 yeni
   entry eklendi ("Faz 8, grup 6 denetimi" yorumu altında): 4 zorunlu
   (`together`, `zai`, `xai`, `vercel-ai-gateway`) + 8 ek nötr iskelet
   (`the-grid-ai`, `trustedrouter`, `zeldoc`, ve 5 abonelik ailesi id'si).
   Mevcut hiçbir entry (groq, gemini, cerebras, openrouter, nvidia, ve
   grup 1/3/4/5'in eklediği entry'ler) değiştirilmedi.

**Dokunulmadı (talimat gereği):** `ApiProvider` union'ı
(`apps/vscode/src/shared/api.ts`), `models.proto`, `state.proto`,
`state-keys.ts`, `api-configuration-conversion.ts`,
`cline-session-factory.ts`, `provider-id.ts`, `VertexProvider.tsx`,
`vertex` için `GENERIC_PROVIDER_PRESENTATION_OVERRIDES`/`CUSTOM_PROVIDER_SETTINGS_IDS`
girişleri, ve `wandb`/`xiaomi`/`zai-coding-plan` için zaten mevcut olan
fallback isimleri.

---

## Test durumu

Bu denetim sırasında hiçbir network isteği atılmadı, hiçbir provider gerçek
API key ile test edilmedi. Gerçek doğrulama testi
`.claude/docs/2026-08-01-provider-test-plani.md` dosyasındaki S0-S6
adımlarıyla kullanıcının kendi API key'leri kullanılarak ayrıca yapılacaktır.

---

## Tip kontrolü (Step 5)

```
cd c:\OpenProvider\apps\vscode && bunx tsc -b
```

**Sonuç: BAŞARILI (exit code 0, hata yok).** İki kez çalıştırıldı (bu
denetim sırasında dosyalara eşzamanlı başka bir oturumun da yazdığı fark
edildiği için ikinci kez doğrulandı) — her ikisinde de çıktı boş ve exit
code 0.
