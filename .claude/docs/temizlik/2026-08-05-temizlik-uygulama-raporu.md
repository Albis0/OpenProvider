# Temizlik Uygulama Raporu — Faz 1 + Faz 2

**Tarih:** 2026-08-05
**Sürüm:** 0.0.9
**Durum:** Uygulandı, doğrulandı

---

## Sonuç

**1178 dosya, 234.110 satır silindi.** Takipli dosya sayısı **3418 → 2252**.

En önemlisi: **haftalardır kırık olan 2 test kapandı.** Test durumu artık **309/309**.

---

## Faz 1 — Ayrı Cline ürünleri (1098 dosya)

Bu fork'un hiç kullanmadığı, `apps/vscode`'a hiçbir bağımlılığı olmayan ayrı ürünler:

| Silinen | Dosya | Neydi |
|---|---|---|
| `apps/examples` + `sdk/examples` | 473+ | SDK örnek projeleri |
| `apps/cli` | 402 | Cline'ın terminal ajanı |
| `apps/cline-hub` | 161 | Tarayıcı kontrol paneli |
| `evals` | 45 | Model benchmark altyapısı |
| `apps/vscode-rollout` | 17 | A/B dağıtım araçları |

**Silmeden önce doğrulandı:** `apps/vscode` bu paketlerin hiçbirini import etmiyor (`@cline/cli`, `@cline/cline-hub`, `@cline/vscode-rollout` → hepsi 0 referans). SDK paketleri de bağımlı değil. `apps/vscode/src` içinde bulunan 5 referansın tamamı **yorum satırıydı**, kod değil.

**Kök `package.json` temizliği (zorunluydu):** 8 script silinen paketlere referans veriyordu. `workspaces` listesi 9 girdiden 4'e indi; `build`, `dev`, `cli`, `code`, `test`, `test:unit`, `test:e2e`, `format`, `lint`, `fix`, `check` ve `lint-staged` düzeltildi. Bunlar yapılmasaydı `bun install` ve `bun run test` patlardı.

**Doğrulama:** `bun install` temiz (15 paket kalktı) → `bun run build:sdk` 6/6 paket derlendi → extension + webview typecheck temiz.

---

## Faz 2a — SpendLimit (Cline organizasyon bütçe tavanı)

Cline'ın kendi backend'inden gelen `SPEND_LIMIT_EXCEEDED` (429) hatasına bağlıydı. Bu fork o backend'e hiç bağlanmıyor, dolayısıyla dal hiç çalışmıyordu.

**Silinenler:**
- `webview-ui/src/components/chat/SpendLimitError.tsx` (bileşen)
- `src/core/controller/account/submitLimitIncreaseRequest.ts` (controller)
- `ErrorRow.tsx`'teki SpendLimit dalı ve import'u
- `ClineError.ts`'te `ClineErrorType.SpendLimit` enum üyesi + sınıflandırma bloğu
- `message-translator.ts`'te iki dönüşüm bloğu (biri plain-text, biri yapılandırılmış)
- 3 story + 1 webview testi + 2 translator testi
- `proto/cline/account.proto`: `submitLimitIncreaseRequest` RPC'si + `SubmitLimitIncreaseResponse` mesajı

Planda "en izole, tek `if` bloğu" demiştim — **yanlıştı, 8 dosyaya yayılmıştı.** Yine de bağımlılık zinciri temizdi.

---

## Faz 2b — Kredi / organizasyon RPC'leri

Cline hesabının bakiye ve organizasyon yönetimi. Silmeden önce tekrar ölçüldü: dördü de **0 gerçek kullanım**.

**Silinenler:** `getUserCredits`, `getOrganizationCredits`, `getUserOrganizations`, `setUserOrganization` — controller dosyaları + proto RPC'leri.

Proto değişikliği sonrası `bun run protos` ile üretilmiş kod yeniden oluşturuldu.

---

## Faz 2c — ClinePass onboarding

**Beklenmedik bulgu:** kaynak kod zaten doğruydu. `data-steps.ts` içinde hosted hesap seçenekleri (FREE/POWER/CLINE_PASS) daha önce bilinçli olarak kaldırılmış, sadece BYOK bırakılmıştı — dosyada bunu açıklayan bir yorum bile vardı.

Kırık olan **testlerdi**: eski davranışı (4 seçenek) bekliyorlardı. Testler gerçeğe uyduruldu.

**Sonuç: 307/309 → 309/309.** Haftalardır her raporda "önceden bozuk" diye geçiştirilen 2 test kapandı.

---

## Bilinçli olarak yapılmayanlar

**`OnboardingView.tsx`'teki ölü ClinePass dalları duruyor.** 706 satırlık dosyada 17 dokunuş gerektiriyor. Kod ölü ama zararsız — `getUserTypeSelections` yalnızca BYOK döndürdüğü için o dallara hiç girilmiyor. Testler yeşil ve asıl kazanç alındığı için riskli refactor'e girilmedi. İleride yapılabilir.

**Aynı sebeple duran:** `NEW_USER_TYPE` enum'undaki `FREE`/`POWER`/`CLINE_PASS` üyeleri, `cline-pass` provider id'si (`ApiProvider` union üyesi — sökmek proto + conversion zincirine dokunmayı gerektirir).

---

## Silinmeyenler (kasıtlı)

| Korunan | Sebep |
|---|---|
| `components/marketplace/` | **MCP sunucu kurulumu buradan yapılıyor.** İsmi yanıltıcı |
| OAuth çağrıları (OpenRouter, Hicap, Codex, OCA) | Canlı sağlayıcı giriş akışları |
| `accountLogoutClicked` | 4 yerden kullanılıyor, environment değişiminde çalışıyor |
| `cline-rules/` | `.clinerules/` desteği — CLAUDE.md "üstüne inşa et" diyor |
| SDK'daki hub daemon mantığı | `apps/cline-hub/` silindi ama SDK'daki protokole dokunulmadı |

---

## Doğrulama

| Kontrol | Sonuç |
|---|---|
| `bun install` | Temiz, 15 paket kalktı |
| `bun run build:sdk` | 6/6 paket derlendi |
| `bunx tsc --noEmit` (extension) | Temiz |
| `bunx tsc -b` (webview) | Temiz |
| `bunx vitest run` | **309/309 geçti** |
| Webview + extension build | Temiz |
| vsix | `openprovider-0.0.9.vsix` |

**Paket içeriği ölçüldü** — silinenler gerçekten çıktı:

| Terim | webview | extension |
|---|---|---|
| `SPEND_LIMIT_EXCEEDED` | 0 | 0 |
| `getUserCredits` | 0 | 0 |
| `getOrganizationCredits` | 0 | 0 |
| `submitLimitIncreaseRequest` | 0 | 0 |

**Korunanlar yerinde:** `openrouterAuthClicked`, failover mantığı, Provider Priority sekmesi.

---

## Dürüst sınırlar

**Paket boyutu değişmedi** — planda söylendiği gibi. Silinen app'ler zaten vsix'e girmiyordu; `extension.js` hâlâ ~23 MB ve ağırlık SDK/AI kütüphanelerinde. Kazanç depo temizliği ve bakım kolaylığı.

**Commit atılmadı.** Tüm değişiklikler staged/working tree'de duruyor. Geri almak tek komut. Commit kararı kullanıcının.

**Davranış testi yapılmadı.** Doğrulama tip kontrolü, birim testleri ve bundle içerik ölçümü seviyesinde. Onboarding akışı ve hata ekranları gerçek kullanımda denenmedi.

**`src/dev/` vsix kontrolü yapılmadı** — plandaki 4. madde atlandı, boyut etkisi olmadığı için önceliksizdi.

---

## Kurulum

1. Extensions (Ctrl+Shift+X) → OpenProvider → **Uninstall**
2. `...` → **Install from VSIX...** → `c:\OpenProvider\openprovider-0.0.9.vsix`
3. VS Code'u tamamen kapat-aç

> Extensions panelinde **0.0.9** yazdığını doğrula.
