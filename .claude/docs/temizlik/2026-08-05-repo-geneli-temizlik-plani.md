# Repo Geneli Temizlik Planı — Tüm Monorepo

**Tarih:** 2026-08-05
**Durum:** Plan — hiçbir şey silinmedi
**Önceki belge:** `2026-08-05-cline-kalintilari-temizlik-plani.md` (sadece `apps/vscode`'u kapsıyordu)

---

## Neden ikinci bir belge

İlk plan yalnızca `apps/vscode` içine bakıyordu ve kullanıcı haklı olarak "bu kadarcık mı buldun, tüm app'i tara" dedi. Tüm monorepo tarandığında tablo tamamen değişti.

**Toplam takipli dosya: 3418.** Bunun dağılımı:

| Yer | Takipli dosya | Ne işe yarıyor |
|---|---|---|
| `apps/vscode` | 1223 | **Bizim ürünümüz.** Kalsın |
| `apps/examples` | 473 | Cline'ın SDK örnek projeleri |
| `apps/cli` | 402 | Cline'ın terminal ajanı (ayrı ürün) |
| `apps/cline-hub` | 161 | Cline'ın tarayıcı kontrol paneli |
| `evals` | 45 | Cline'ın model değerlendirme altyapısı |
| `apps/openprovider` | 44 | **Bizim motor prototipimiz.** Kalsın |
| `apps/vscode-rollout` | 17 | Cline'ın A/B dağıtım araçları |

Yani deponun **yaklaşık üçte biri** (1098 dosya) bu fork'un hiç kullanmadığı ayrı Cline ürünleri.

---

## Kritik ölçüm: bunlar vsix'e giriyor mu?

**Hayır.** Ölçüldü:

- `apps/vscode/package.json` bu app'lerin **hiçbirine** bağımlı değil. Sadece `@cline/agents`, `@cline/core`, `@cline/llms`, `@cline/shared` (SDK paketleri) var
- `dist/extension.js` içinde `vscode-rollout` izi: **0**
- `cline-hub` izi: **1**, ama o bizim kodumuzdan değil — `hub-production` / `--cline-hub-daemon` sabitleri derlenmiş SDK paketinden geliyor. Kaynak taraması (`sdk/packages/*/src`) **0 sonuç** verdi

**Sonuç:** bu app'leri silmek paket boyutunu **hiç değiştirmez**. Kazanç tamamen depo temizliği: daha az dosya, daha hızlı arama, daha az kafa karışıklığı.

---

## Kaldırılabilecekler — repo düzeyi

### A. `apps/examples` (473 dosya) — en büyük tek kalem

Cline SDK'sının örnek projeleri. Bu fork SDK'yı zaten kullanıyor, örneklere ihtiyacı yok.

**Risk: DÜŞÜK.** Kök `package.json`'daki `workspaces` listesinde iki girdisi var (`apps/examples/*`, `apps/examples/vscode/src/webview`) — silerken oradan da çıkarılmalı, yoksa `bun install` uyarır.

### B. `apps/cli` (402 dosya)

Cline'ın terminal ajanı — ayrı bir ürün. Bizim ürünümüz VS Code eklentisi.

**Risk: DÜŞÜK-ORTA.** Silmeden önce `apps/vscode`'un buradan bir şey import edip etmediği doğrulanmalı (ilk tarama bağımlılık göstermedi ama dosya düzeyinde tekrar bakılmalı).

### C. `apps/cline-hub` (161 dosya)

Cline'ın tarayıcı kontrol paneli: canlı istemciler, oturumlar, hub yeniden başlatma.

**Risk: ORTA — dikkat.** Klasörün kendisi bağımsız ama **hub protokolü SDK'nın derlenmiş kodunda yaşıyor**. Yani `apps/cline-hub/` silinebilir, ama SDK'daki hub daemon mantığına dokunulmamalı. İkisi ayrı şeyler.

### D. `evals` (45 dosya)

Model değerlendirme altyapısı. Cline'ın kendi benchmark'ları.

**Risk: DÜŞÜK.**

### E. `apps/vscode-rollout` (17 dosya)

Eski Cline eklentisiyle yeni SDK tabanlı eklentiyi yan yana dağıtmak için A/B araçları. Bu fork'un tek bir eklentisi var, staged rollout diye bir şeyi yok.

**Risk: ÇOK DÜŞÜK.** En güvenli kalem.

---

## `apps/vscode` içi — ilk plandan devam

Bu maddeler önceki belgede ölçülmüştü, özet:

| # | Ne | Risk | Ölçüm |
|---|---|---|---|
| 1 | ClinePass (abonelik) | ORTA | 48 dosya; **2 kırık testin sebebi** |
| 2 | Kredi/organizasyon RPC'leri | DÜŞÜK | Hiçbir bileşen çağırmıyor (12 çağrının tamamı tarandı) |
| 3 | SpendLimit | DÜŞÜK | Extension bundle'ında 0 iz |
| 4 | Cline giriş banner'ı | DÜŞÜK-ORTA | `accountLogoutClicked`'e **dokunma** (4 yerde kullanılıyor) |

**Silinmemesi gerekenler** (ilk belgeden): `marketplace/` (MCP kurulumu), OAuth çağrıları (OpenRouter/Hicap/Codex/OCA), `cline-rules/`, telemetri.

---

## Önerilen sıra

**Faz 1 — repo düzeyi (güvenli, büyük kazanç):**
1. `apps/vscode-rollout` (17 dosya)
2. `evals` (45)
3. `apps/examples` (473) + kök `workspaces` temizliği
4. `apps/cline-hub` (161) — SDK'daki hub koduna dokunmadan
5. `apps/cli` (402) — önce import kontrolü

Her adımdan sonra: `bun install` → `bun run build:sdk` → `apps/vscode` build + test.

**Faz 2 — `apps/vscode` içi (ilk belge):**
6. SpendLimit → 7. Kredi RPC'leri → 8. Login banner → 9. ClinePass

---

## Dürüst sınırlar

**Onay kapsamı belirsiz.** Kullanıcı "ONAYLIYORUM" dediğinde elindeki plan sadece `apps/vscode` içeriyordu. Bu belge **1098 dosyalık yeni bir kapsam** ekliyor — ayrı ürünlerin tamamen silinmesi. Bu, onaylanan şeyden nitelik olarak farklı, o yüzden Faz 1 için ayrı bir onay alınmalı. Faz 2 zaten onaylı.

**Boyut beklentisi yok.** Bu app'ler vsix'e girmiyor; `extension.js` 22.9 MB olarak kalacak. Kazanç bakım ve netlik.

**`apps/cli` import kontrolü yapılmadı.** Bağımlılık listesinde yok ama dosya düzeyinde `import` taraması silmeden önce şart.

**Geri alınabilirlik:** Hepsi git'te takipli, silme işlemi tek commit'te geri alınabilir. Yine de her faz ayrı commit olmalı.
