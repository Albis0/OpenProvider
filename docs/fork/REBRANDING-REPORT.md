# Rebranding Raporu — Cline → OpenProvider

Bu doküman, fork'un "Cline" kimliğinden "OpenProvider" kimliğine geçirilmesi sırasında
yapılan tüm değişiklikleri kaydeder. Amaç: ileride upstream ile rebase yaparken neyin
neden değiştiğini hatırlamak.

---

## Yeni kimlik

| Alan | Eski | Yeni |
|---|---|---|
| Extension name | `claude-dev` | `openprovider` |
| Display name | Cline | OpenProvider |
| Publisher | `saoudrizwan` | `openprovider` |
| Version | 4.0.0 | 0.0.1 |
| Repository | `github.com/cline/cline` | `github.com/Albis0/OpenProvider` |
| Homepage | `cline.bot` | `github.com/Albis0/OpenProvider` |
| Tagline | — | one agent. every provider. free. |

---

## 1. Kimlik ve manifest (`apps/vscode/package.json`)

- `name`, `displayName`, `publisher`, `description`, `version`, `repository`, `homepage`,
  `author`, `keywords` güncellendi.
- `keywords` bedava sağlayıcılara göre yeniden yazıldı (nvidia, groq, cerebras, gemini,
  openrouter, free).

### Komut / view / container ID'leri

Tüm `cline.*` komut ID'leri `openprovider.*` oldu. Bu tek başına yeterli değil çünkü
komut prefix'i **`registry.ts` içinde package.json'ın `name` alanından türetiliyor**:

```ts
// apps/vscode/src/registry.ts
const prefix = name === "claude-dev" ? "cline" : name
```

`name` artık `"claude-dev"` olmadığı için prefix otomatik olarak `"openprovider"`
oluyor — package.json'daki statik komut string'leriyle bu yüzden senkron.

| Ne | Eski | Yeni |
|---|---|---|
| Komut prefix'i | `cline.` | `openprovider.` |
| ViewContainer ID | `claude-dev-ActivityBar` | `openprovider-ActivityBar` |
| View ID | `claude-dev.SidebarProvider` | `openprovider.SidebarProvider` |
| Walkthrough ID | `ClineWalkthrough` | `OpenProviderWalkthrough` |
| Context key'ler | `cline.isDevMode`, `cline.isGeneratingCommit` | `openprovider.*` |
| Config başlığı | Cline | OpenProvider |

`VscodeWebviewProvider.SIDEBAR_ID` zaten `registry.ts`'ten türediği için otomatik uyumlu.

### OAuth redirect URI (kritik)

`apps/vscode/src/hosts/vscode/hostbridge/env/getIdeRedirectUri.ts` içindeki
`vscode://saoudrizwan.claude-dev` → `vscode://openprovider.openprovider` oldu.
Bu kozmetik değil: VS Code URI handler'ı `publisher.name`'e göre yönlendirme yapıyor,
eşleşmezse OAuth callback'leri (ör. OpenRouter) extension'a hiç dönmez.

---

## 2. İkonlar (`apps/vscode/assets/icons/`)

- `icon.png` → yeni OpenProvider marka ikonu (440x440).
- `icon.svg` → yeni ikon (PNG raster'ı SVG içine gömülü). VS Code activity bar SVG
  istiyor, elimizde vektör kaynak olmadığı için `<image>` ile sarmalandı. Not: bu yüzden
  VS Code'un tema-renklendirmesi bu ikona uygulanmaz.
- **Silindi** (hiçbir yerde referans edilmiyordu): `cline-bot.svg`, `cline-bot.ttf`,
  `cline-bot.woff`, `sleepy-cline.svg`.
- `contributes.icons` bloğu tamamen kaldırıldı; `$(cline-icon)` özel font glifi yerine
  hazır VS Code codicon'u `$(sparkle)` kullanılıyor (özel font üretme ihtiyacı ortadan kalktı).
- `social/*.svg` (discord, github, linkedin, reddit, x) genel platform logoları — dokunulmadı.

---

## 3. Kullanıcıya görünen metinler

- **Walkthrough** (`apps/vscode/walkthrough/step1-5.md`): baştan yazıldı. Cline'ın kendi
  GCS bucket'ında barındırdığı tanıtım görselleri (`storage.googleapis.com/cline_public_images/...`)
  kaldırıldı — bizim eşdeğerimiz yok, başkasının markalı görsellerine hotlink yapmak doğru değil.
- **Editör quick-fix menüsü** (`extension.ts`): "Add to Cline", "Explain with Cline",
  "Improve with Cline", "Fix with Cline" → OpenProvider.
- **Output kanalı adı** (`hostbridge/env/debugLog.ts`): "Cline" → "OpenProvider".
- **Log prefix'leri**: `[Cline]`, `[Cline Dev]` → `[OpenProvider]`, `[OpenProvider Dev]`.
- **Sohbet arayüzü** (`ChatRow.tsx`, `BrowserSessionRow.tsx`, `SubagentStatusRow.tsx`,
  `FeatureTip.tsx`, `ChatTextArea.tsx`, `AutoApproveModal.tsx`, `WelcomeSection.tsx`,
  `ToolGroupRenderer.tsx`, `MarketplaceView.tsx`, `ConfigureServersView.tsx`,
  `NewRuleRow.tsx`, `ReportBugPreview.tsx`, `ErrorRow.tsx`): "Cline wants to...",
  "Cline is...", "Cline's..." kalıpları OpenProvider'a çevrildi.
- **AboutSection.tsx**: baştan yazıldı; Cline'ın X/Discord/Reddit/docs linkleri kaldırıldı,
  yerine repo + issues linki ve Apache-2.0 türetme notu kondu.
- **Sistem prompt'ları** (ajanın kendi kimliği):
  `sdk/packages/shared/src/prompt/system.ts` ve `apps/vscode/src/sdk/cline-session-factory.ts`
  içindeki "You are Cline, ..." → "You are OpenProvider, ...".

---

## 4. Kaldırılan sistemler

Bunlar yeniden adlandırılmadı, **kaldırıldı** — çünkü tamamen Cline'ın kendi backend'ine
(`api.cline.bot`, `app.cline.bot`, `data.cline.bot`) bağlıydılar ve bizim böyle bir
altyapımız yok.

### Hesap / kimlik doğrulama / faturalama
ClineAccount, ClinePass, kredi bakiyesi, kredi geçmişi, hesap sign-in ekranı, org/enterprise
remote-config (org policy ve API key push), `accountButtonClicked` komutu ve ilgili
ProtoBus aboneliği kaldırıldı. `AuthService` **silinmedi, ayıklandı**: OpenRouter, Requesty,
Hicap, OpenAI Codex ve OCA OAuth akışları korundu; sadece Cline-hesabına özel metod/state
çıkarıldı.

### Telemetri
Cline'ın PostHog proxy'sine (`data.cline.bot`) giden telemetri, hata raporlama ve
feature-flag sağlayıcıları devre dışı bırakıldı. Genel amaçlı OpenTelemetry altyapısı
korundu — o kullanıcının kendi sunucusuna gidiyor, bize/Cline'a değil.
`WebviewProvider.ts` içindeki CSP `connect-src` direktifinden `*.cline.bot` çıkarıldı.

### Cline'a özel linkler
Discord daveti, `docs.cline.bot` linkleri ve `cline/cline` issue şablonu kaldırıldı;
yerine `github.com/Albis0/OpenProvider` (ve `/issues`) kondu.

---

## 5. Kasıtlı olarak DEĞİŞTİRİLMEYENLER

Bunlara dokunmak mevcut kurulumları veya kullanıcı verisini bozardı:

| Ne | Neden |
|---|---|
| `.clineignore` dosya adı | Kullanıcıların diskte mevcut dosyaları var; adı değişirse sessizce çalışmaz olur |
| `Documents/Cline/Rules` klasör yolu | Aynı gerekçe — diskte gerçek bir klasör |
| `SECRETS_KEYS` girdileri (`clineApiKey`, `clineAccountId` vb.) | globalState/secrets anahtarları; değişirse mevcut kurulumda tüm API key'ler kaybolur |
| `cline.generatedMachineId` globalState anahtarı | Aynı gerekçe (kalıcı kullanıcı verisi) |
| Sağlayıcı ve model ID'leri | Fonksiyonel tanımlayıcılar, marka değil |
| `ClineMessage`, `ClineSayTool`, `createClineAPI` gibi iç tip/fonksiyon adları | Refactor kapsam dışı; kullanıcıya görünmüyor |
| `proto/cline/*.proto` namespace'i | Dahili gRPC namespace'i; değiştirmek tüm generated kodu yeniden üretmeyi gerektirir |
| `LICENSE` | Apache-2.0 metni aynen korunur |

### 5.1 Kural klasörü — sonradan değişti (2026-08-11)

Yukarıdaki tabloda `.clinerules` bir zamanlar "dokunulmaz" listesindeydi. Artık değil,
ama **yeniden adlandırılmadı** da — ikisi birden destekleniyor:

- Yeni klasörler `.openproviderrules` olarak oluşturuluyor.
- Projede zaten `.clinerules` varsa o okunmaya devam ediyor.
- İkisi de varsa `.openproviderrules` kazanıyor.

Karar tek bir yerde veriliyor: `apps/vscode/src/shared/rule-directory-names.ts`.
Yeni bir kural-klasörü araması eklerken adı elle yazmak yerine oradaki
`resolveRulesDirName()` çağrılmalı.

Gerekçe: düz yeniden adlandırma, kullanıcının mevcut `.clinerules` dosyalarının
**sessizce** yok sayılması demekti — hata yok, uyarı yok, ajan sadece kullanıcının
kurallarını görmezden geliyor. Bu, mümkün olan en kötü arıza türü.

---

## 6. Lisans / atıf

`LICENSE` dosyasına dokunulmadı. Kök dizine **`NOTICE`** dosyası eklendi: yazılımın
Cline'dan (Apache-2.0) türetildiğini ve üzerinde değişiklik yapıldığını belirtiyor —
Apache-2.0'ın 4. maddesinin zorunlu kıldığı atıf bu.

---

## 7. Bilinen açık noktalar

- Marketplace'e **yayınlanmadı**; sadece `vsce package` ile `.vsix` üretiliyor.
- `publisher: openprovider` henüz VS Code Marketplace'te kayıtlı bir publisher değil;
  gerçekten yayınlanacaksa önce o publisher ID'sinin alınması gerekir.
- `icon.svg` gömülü raster içerdiği için VS Code tema-renklendirmesinden etkilenmez.
  İleride gerçek bir vektör (path tabanlı) SVG üretmek daha doğru olur.
- Upstream ile rebase yaparken bu dosyadaki "değiştirilmeyenler" tablosu referans alınmalı.
