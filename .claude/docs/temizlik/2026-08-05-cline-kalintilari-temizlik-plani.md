# Cline Kalıntıları — Temizlik Planı

**Tarih:** 2026-08-05
**Durum:** Plan — hiçbir kod silinmedi, onay bekliyor

---

## Bu belge ne değil

Bu bir "Cline'ı tamamen söküp atalım" listesi değil. Proje Cline'ın SDK'sı üzerine kurulu (CLAUDE.md'deki temel karar) ve çekirdek altyapının çoğu **gerekli**. Buradaki liste, ölçülerek bulunmuş **gerçekten ölü ya da bu fork'a ait olmayan** yüzeyler.

Her madde için ölçüm yöntemi yazıldı, çünkü "kullanılmıyor gibi duruyor" ile "kullanılmadığını doğruladım" arasında fark var.

---

## Önce: yanlışlıkla silinmemesi gerekenler

Tarama sırasında "Cline" adı geçtiği için ilk bakışta aday görünen ama **canlı ve gerekli** olan şeyler:

| Yüzey | Neden kalmalı |
|---|---|
| `AccountServiceClient.openrouterAuthClicked` | OpenRouter OAuth akışı — senin kullandığın sağlayıcı |
| `AccountServiceClient.hicapAuthClicked` | Hicap OAuth |
| `openAiCodexSignIn` / `SignOut` | OpenAI Codex OAuth |
| `OcaAccountServiceClient.*` | OCA OAuth |
| `components/marketplace/` | **MCP sunucu kurulumu buradan yapılıyor.** İsmi "marketplace" ama Cline mağazası değil, MCP ekosistemi. CLAUDE.md: "MCP desteği korunmalı" |
| `cline-rules/` | `.clinerules/` proje kuralları — CLAUDE.md'de "yeniden yazma, üstüne inşa et" deniyor |
| `src/services/telemetry/` | PostHog zaten çıkarılmış; kalan self-hosted OpenTelemetry yolu, zararsız |

**`cline.bot` URL taraması: 0 sonuç.** Dış bağlantılar zaten temizlenmiş.

---

## Kaldırılabilecekler

### 1. ClinePass (abonelik sistemi) — en büyük kalıntı

**Ne:** Cline'ın kendi abonelik ürünü. Bu fork'un böyle bir ürünü yok ve olamaz.

**Ölçüm:**
- Kaynakta **48 dosyada** referans
- Paketlenmiş `extension.js`'te **13**, webview'de **5** iz
- `data-steps.test.ts`'teki **2 kırık test** doğrudan bunun kalıntısı (haftalardır kırık, her raporda "önceden bozuk" diye geçiliyor)

**Nerede:**
```
src/core/controller/models/handleClinePassProviderSelection.ts
src/core/controller/models/refreshClineRecommendedModels.ts
src/core/controller/models/refreshClineRecommendedModelsRpc.ts
src/sdk/model-catalog/  (cline-pass provider id'si)
webview-ui/src/components/onboarding/OnboardingView.tsx  (userType: CLINE_PASS)
```

**Risk: ORTA.** `cline-pass` bir `ApiProvider` union üyesi; sökmek proto + conversion zincirine dokunmayı gerektiriyor. Faydası: 2 kırık test kapanır, onboarding'den anlamsız bir seçenek kalkar, ~48 dosya sadeleşir.

**Önerilen sıra:** önce UI katmanı (onboarding seçeneği), sonra controller, en son provider id'si. Her adımda test.

---

### 2. Kredi / organizasyon RPC'leri — tamamen ölü

**Ne:** Cline hesabının bakiye ve organizasyon yönetimi.

**Ölçüm — bu kesin:** `AccountServiceClient.*` çağrılarının **tamamı** (12 adet) tarandı. `getUserCredits`, `getOrganizationCredits`, `getUserOrganizations`, `setUserOrganization` **hiçbir bileşenden çağrılmıyor**. Sadece üretilmiş gRPC iskeletinde ve client stub'ında duruyorlar.

**Nerede:**
```
src/core/controller/account/getUserCredits.ts
src/core/controller/account/getOrganizationCredits.ts
src/core/controller/account/getUserOrganizations.ts
src/core/controller/account/setUserOrganization.ts
+ proto/cline/account.proto içindeki karşılıkları
```

**Risk: DÜŞÜK.** Çağıran yok. Proto alanları silinince `src/generated/` yeniden üretilmeli.

---

### 3. Harcama limiti (SpendLimit) — ölü

**Ne:** Cline organizasyonlarının bütçe tavanı uyarısı ve "limit artır" talebi.

**Ölçüm:** `SpendLimitError` sadece `ErrorRow.tsx`'ten çağrılıyor, o da `ClineErrorType.SpendLimit` dalında. Bu hata tipi **Cline'ın kendi backend'inden** gelen `SPEND_LIMIT_EXCEEDED` koduyla tetikleniyor — bu fork o backend'e hiç bağlanmıyor, dolayısıyla dal hiç çalışmıyor. Extension bundle'ında izi bile yok (0 eşleşme).

**Nerede:**
```
webview-ui/src/components/chat/SpendLimitError.tsx
src/core/controller/account/submitLimitIncreaseRequest.ts
ErrorRow.tsx'teki SpendLimit dalı + ClineErrorType.SpendLimit
```

**Risk: DÜŞÜK.** Tek dokunulan yer `ErrorRow.tsx`'te bir `if` bloğu.

---

### 4. Cline hesabı giriş banner'ı

**Ne:** `WelcomeSection.tsx`'te `BannerActionType.ShowAccount` → `accountLoginClicked` → Cline hesabına yönlendirme.

**Ölçüm:** `accountLoginClicked` iki yerden çağrılıyor: bu banner ve `OnboardingView`. İkisi de Cline hesabına giriş akışı.

**Risk: DÜŞÜK-ORTA.** `accountLogoutClicked` **4 yerden** referans alıyor ve `updateSettings.ts`'te environment değişiminde kullanılıyor — **onu silme**, sadece login banner'ını kaldır.

---

### 5. Onboarding'in Cline'a özgü kısımları

**Ne:** `OnboardingView.tsx`'te `NEW_USER_TYPE.CLINE_PASS` dalı, "No ClinePass models are available" boş durumu, abonelik olduğu için fiyat gizleme mantığı (`hidePrice`).

**Risk: DÜŞÜK.** 1 numaralı maddenin UI ayağı; onunla birlikte yapılmalı.

---

## Kaldırılmaması gereken ama gözden geçirilebilecekler

| Yüzey | Not |
|---|---|
| `src/dev/` (159K) | `debug-harness`, `mcp-oauth-test-server`, `grit`. `.vscodeignore`'da açıkça dışlanmamış — **vsix'e giriyor mu kontrol edilmeli**. Giriyorsa paket boyutu düşer |
| `src/generated/` (4 MB) | Üretilmiş gRPC kodu. Elle silinmez; proto sadeleşince kendiliğinden küçülür |
| `components/worktrees/` (44K) | Git worktree desteği. Cline'a özgü değil, ama bu fork kullanıyor mu? Kullanılmıyorsa aday |
| `components/browser/` (8K) | Tarayıcı oturumu. MCP/araç akışında yeri var, ölçülmedi |

---

## Önerilen sıra

Riski düşükten yükseğe, her adımdan sonra `bunx vitest run` + `tsc`:

1. **SpendLimit** (madde 3) — en izole, tek `if` bloğu
2. **Kredi/organizasyon RPC'leri** (madde 2) — çağıran yok, kesin ölçüldü
3. **Cline login banner'ı** (madde 4) — `accountLogoutClicked`'e dokunmadan
4. **`src/dev/` vsix kontrolü** — silme değil, `.vscodeignore` düzeltmesi
5. **ClinePass** (madde 1 + 5) — en büyük, en riskli, en sona. UI → controller → provider id sırasıyla

**Beklenen kazanç:** 2 kırık test kapanır, onboarding sadeleşir, proto/generated küçülür. Paket boyutunda dramatik düşüş beklenmemeli — asıl ağırlık `extension.js`'in 23 MB'ı ve o çoğunlukla SDK/AI kütüphaneleri.

---

## Dürüst sınırlar

**Hiçbir madde uygulanmadı.** Bu bir plan; CLAUDE.md'deki "her mimari kararı önce kullanıcı onaylar" kuralı gereği silme işlemi onaysız yapılmadı.

**Ölçümler statik.** "Çağıran yok" taramayla bulundu, çalışma zamanında değil. gRPC ile dinamik çağrılan bir şey gözden kaçmış olabilir — özellikle `src/generated/` üzerinden. Silmeden önce her madde için `bun run package` + davranış testi gerekir.

**Paket boyutu ölçüldü:** `extension.js` 22.9 MB, webview `index.js` 7.9 MB. Buradaki maddelerin hiçbiri bu rakamları ciddi düşürmez; temizliğin gerekçesi **bakım kolaylığı ve kırık testler**, boyut değil. Boyut hedefi varsa ayrı bir iş: SDK bağımlılıkları ve `src/generated/` incelenmeli.

**`worktrees` ve `browser` ölçülmedi** — listeye "aday" olarak konuldu ama kullanım taraması yapılmadı, o yüzden kaldırma önerisi yok.
