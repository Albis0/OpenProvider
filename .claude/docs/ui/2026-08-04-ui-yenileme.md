# UI Yenileme — Claude Code'a Yakın Sakin Bir Arayüz

**Başlangıç:** 2026-08-04 07:05
**Bitiş:** 2026-08-04 07:40

---

## İstek

Kullanıcı: *"openprovider in ui ini hic bisi bozmadan istedigin kadar ugrasarak otonom bi sekilde yenile mumkunse claude code a benzesin"*

İki kısıt: (1) hiçbir davranış bozulmayacak, (2) Claude Code'un görsel diline yaklaşacak.

## Teşhis — neden "bozuk" hissettiriyordu

Mevcut UI'ın temeli aslında doğruydu: renkler VS Code tema değişkenlerinden geliyordu (`--vscode-*`), bu bir editör eklentisi için doğru karar. Sorun temelde değil, tutarsızlıktaydı:

| Sorun | Nerede | Etkisi |
|---|---|---|
| Kullanıcı mesajı `--vscode-badge-background` üzerinde | `UserMessage.tsx` | Doygun mavi blok; sohbette en çok tekrar eden öğe en çok bağıran öğeydi |
| `bg-white/2`, `text-white`, `text-gray` | Welcome, QuickWin, SuggestedTasks | Açık temalarda **görünmez** oluyordu |
| `white` sabit metin rengi | `OptionsButtons.tsx` | Açık temada `--vscode-focusBorder` soluk mavi → beyaz metin okunmuyordu |
| Üç farklı yarıçap yan yana | `rounded-full` (999px), `rounded-xs` (2px), `rounded-lg` | Aynı ekranda üç ayrı "dil" |
| 80px logo + kalın başlık | `HomeHeader.tsx` | Karşılama ekranı bir araçtan çok bir açılış sayfası gibiydi |

## Tasarım kararı

Claude Code'un görsel dili **sakin ve tipografi ağırlıklı**: renk lekesi yok, kutu yok, konuşan tarafı yapısal olarak işaretliyor. Buna göre:

**Token sistemi** (`theme.css`) — hepsi VS Code değişkenlerinden türetildi, hiçbiri sabit hex değil:

```css
--color-surface-raised: color-mix(in srgb, var(--vscode-toolbar-hoverBackground) 40%, transparent);
--color-surface-hover:  color-mix(in srgb, var(--vscode-toolbar-hoverBackground) 75%, transparent);
--color-hairline:       color-mix(in srgb, var(--vscode-panel-border) 60%, transparent);
--color-turn-user:      var(--vscode-textLink-foreground);
--radius-surface:       4px;
```

`color-mix` kullanılmasının sebebi: tek bir değer hem açık hem koyu temada doğru yoğunlukta çıkıyor, tema başına ayrı değer tutmaya gerek kalmıyor.

**İmza öğesi — konuşma çizgisi.** Kullanıcı mesajları artık mavi blok değil, sol kenarında 2px'lik bir vurgu çizgisi olan sakin bir yüzey. Bu süs değil: *kimin konuştuğunu* yapısal olarak kodluyor. Asistan mesajlarına bilinçli olarak **eklenmedi** — çizgi sadece bir tarafı işaretlediği için anlam taşıyor, ikisinde de olsaydı dekorasyona dönüşürdü.

**Tek yarıçap.** Sohbet yüzeylerinde üç farklı yarıçap yerine tek bir `--radius-surface` (4px).

## Değişenler

| Dosya | Ne yapıldı |
|---|---|
| `theme.css` | 5 yeni token (yukarıda) |
| `UserMessage.tsx` | Badge mavisi → sakin yüzey + konuşma çizgisi; buton renkleri tema rollerine bağlandı |
| `HomeHeader.tsx` | Logo 80px→48px, başlık ağırlığı düşürüldü, "Take a Tour"→"Take a tour" (cümle düzeni) |
| `QuickWinCard.tsx` | `rounded-full` pill → satır; `<div onClick>` → gerçek `<button>` (klavye erişimi bedavaya geldi); ikon 28px→16px |
| `SuggestedTasks.tsx` | `text-white`/`text-gray` kaldırıldı; "Quick [Wins] with Cline" → "Try something" |
| `OptionsButtons.tsx` | Sabit `white` → `--vscode-button-foreground`; yarıçap 2→4; geçiş animasyonu |
| `ChatTextArea.tsx` | Girdi kutusu yarıçapı 2→4; mod anahtarındaki `text-white` → `text-button-foreground` |
| `ContextWindowSummary.tsx` | `text-white` → `text-foreground` |
| `ProviderPrioritySection.tsx` | Yeni token'lara geçirildi; `text-[var(--vscode-*)]` → semantik sınıflar |

**Kopya değişiklikleri** yalnızca yanlış ya da eskimiş olanlarda yapıldı: "with Cline" markası kalkmıştı, "Quick [Wins]" köşeli parantezli stil bir şey ifade etmiyordu.

## Doğrulama

| Kontrol | Sonuç |
|---|---|
| `bunx tsc --noEmit` (extension) | Temiz |
| `bunx tsc -b` (webview) | Temiz |
| `bunx vitest run` (webview) | **308 geçti**, 2 kaldı (önceden bozuk) |
| `biome check` (değişen dosyalar) | Hata yok |
| Webview + extension build | Temiz |
| CSS bundle | 5 token da derlendi ve kullanılıyor |
| JS bundle | Yeni kopya metinleri mevcut, eskiler gitti |
| vsix | `openprovider-0.0.5.vsix` (2026-08-04 07:37) |

**Kalan 2 test:** `data-steps.test.ts` — "ClinePass" onboarding seçenekleri. Bu fork Cline hesap/faturalama sistemini kaldırdığı için testler eskimiş durumda; **bu değişikliklerle ilgisi yok** (`git stash` ile doğrulandı: değişiklikler geri alındığında aynı 2 test aynı şekilde kalıyor). Ürün kararının sonucu olduğu için UI yenilemesi kapsamında düzeltilmedi.

Üçüncü bir test (`ToolGroupRenderer`) düzeltildi — "Cline read 1 file" bekliyordu, isim değişikliğinden kalma gerçek bir eskimişlikti.

## Dürüst sınırlar

**Görsel olarak çalıştırılıp bakılmadı.** Doğrulama tip kontrolü, test, lint ve bundle içerik kontrolü seviyesinde. Ekran görüntüsü alınamadı çünkü eklenti UI'ı ancak VS Code içinde kurulu haldeyken render oluyor. Renk seçimleri tema değişkenlerinden türediği için açık/koyu/yüksek kontrast temalarda **mantıken** doğru olmalı, ama gerçek görüntü kullanıcı kurunca netleşecek.

**Kapsam bilinçli olarak dar tutuldu.** `ChatRow.tsx` (1166 satır) ve `TaskHeader.tsx` gibi büyük dosyaların iç yapısına dokunulmadı — oradaki her değişiklik davranış riski taşıyor ve istek "hiçbir şeyi bozmadan"dı. Yapılan iş yüzey/renk/aralık düzeyinde kaldı.

**Kaldırılmayan sabit renkler var** ve bilinçli: modal arka planları (`bg-black/50`), tehlike/başarı butonları (`text-white!` kırmızı/yeşil zemin üzerinde). Bunlar her temada doğru çalışıyor.

## Kurulum

1. Extensions (Ctrl+Shift+X) → OpenProvider → Uninstall
2. `...` → **Install from VSIX...** → `c:\OpenProvider\openprovider-0.0.5.vsix`
3. VS Code'u tamamen kapat-aç

> Çift tıklama işe yaramaz — Windows dosyayı Visual Studio Installer'a yönlendiriyor.
