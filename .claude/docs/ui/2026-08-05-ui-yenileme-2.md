# UI Yenileme — 2. Tur: Tipografi, Girdi Kutusu ve Yüzeyler

**Başlangıç:** 2026-08-05 03:10
**Bitiş:** 2026-08-05 03:55
**Sürüm:** 0.0.8

---

## İstek

Kullanıcı 1. turdan sonra: *"user text box cok kaba"*, *"ai in yazdigi kodlarin gorundugu yerde fontlar buyuk"*, ve *"benim belirttigim disindakilere de el at, komple cline dan cikioz ui da"*.

Yani: iki somut şikayet + geniş yetki.

## 1. tur neden yetersizdi

İlk tur sadece renk/yüzey düzeyinde kaldı ve **kullanıcı hiçbir değişiklik görmedi**. Üç tur boyunca yanlış teşhis kondu:

1. Önce `UserMessage.tsx` düzeltildi → ekrandaki mavi çubuk aslında `StickyUserMessage.tsx`'ti
2. Sonra sürüm numarası aynı kaldığı için (`0.0.5`) VS Code kurulumu sessizce atladı
3. Sonra `StickyUserMessage` düzeltildi ama yine değişmedi

**Muhtemel kök sebep (bu turda düzeltildi):** `--color-surface-raised` token'ı `--vscode-toolbar-hoverBackground`'dan türetiliyordu. Birçok temada bu değişken **tamamen saydam**, dolayısıyla yüzey hiç çizilmiyordu. Artık `--vscode-editor-foreground`'ın `--vscode-sideBar-background` içine karıştırılmasıyla üretiliyor — ikisi de her temada tanımlı ve karışım kendini tersine çeviriyor (koyu temada açar, açık temada koyar).

Bu teori doğrulanmadı — jsdom CSS değişkenlerini çözmediği için ölçülemedi. Ama saydam-değişken riski gerçek ve ortadan kaldırıldı.

## Yapılanlar

### Tipografi — kod yüzeyleri

Kod blokları `--vscode-editor-font-size`'ı miras alıyordu. Editör fontu rahat bir boyuttaysa (14-16px) sohbetteki kod parçaları çevresindeki metne göre devleşiyordu.

Yeni token:
```css
--text-code: 12px;
--leading-code: 1.5;
```

Taşınan yüzeyler: `CodeBlock.tsx` (2 yer), `McpResponseDisplay.tsx` (2 yer), `QuotedMessagePreview.tsx`, `SearchResultsDisplay.tsx`, `theme.css`'teki satır içi `code` ve `pre` blokları.

**Sonuç ölçüldü:** paketlenmiş CSS'te kod yüzeylerinde kalan `--vscode-editor-font-size` referansı **0**.

`pre` blokları ayrıca çerçeve (`--color-hairline`) ve ortak yarıçap aldı; öncesinde çerçevesizdi ve `rounded-xs` (2px) kullanıyordu.

### Girdi kutusu

Üç sorun vardı:

1. **Odaklanınca çerçeve tamamen kayboluyordu.** `borderLeft/Right/Top/Bottom: 0` satır içi stilleriyle siliniyor, yerine hiçbir şey gelmiyordu. Kutu odakta "kaba" görünmesinin ana sebebi buydu. Artık çerçeve her zaman çizili, sadece **rengi** değişiyor (`hairline` → `focusBorder`).
2. **Dolgu dar ve asimetrikti** (`9px ... 9px`). `10px 28px 10px 11px` yapıldı. Vurgu katmanı ile textarea'nın dolgusu **birebir aynı olmak zorunda** — aksi halde mention vurguları metinden kayar. İkisi birlikte değiştirildi ve kodda not düşüldü.
3. **Font boyutu editörden geliyordu.** Sohbet metniyle aynı olması için `--vscode-font-size`'a çevrildi. Bu değişiklik `main.css`'teki mention vurgu kuralıyla da hizalı olmak zorundaydı (satır 168) — o da aynı anda güncellendi.

### Araç satırları

`ChatRow.tsx`'te 17 adet `font-bold` vardı; "OpenProvider wants to…" başlıkları ekranda bağırıyordu. Bunlar `font-medium`'a (500) indirildi.

**Bilinçli olarak korunanlar:** `Error`, `OpenProvider is having trouble...`, `Task Completed`, `Summary:` — bunların vurgusu anlam taşıyor, dekorasyon değil.

`CommandOutputRow.tsx`'te `text-white` bulundu (açık temada okunmaz) → `text-code-foreground`. Çerçevesi `editor-group-border`'dan `hairline`'a, yarıçapı ortak token'a çevrildi.

### Diğer yüzeyler

- **Auto-approve çubuğu:** hiçbir hover geri bildirimi yoktu, tıklanabilir olduğu belli değildi. `text-xs` + `text-description` → hover'da `text-foreground`, dikey dolgu azaltıldı.
- **Fiyat etiketi (TaskHeader):** `rounded-full` + ters renk (badge zemininde badge metni) dikkat çekiyordu. Ortak yarıçap + ince çerçeve + `text-description` oldu.

**Dokunulmayan:** `ActionButtons.tsx` — VS Code'un kendi `VSCodeButton`'ını kullanıyor, bu bir editör eklentisi için doğru tercih.

## Doğrulama

| Kontrol | Sonuç |
|---|---|
| `bunx tsc -b` (webview) | Temiz |
| `bunx tsc --noEmit` (extension) | Temiz |
| `bunx vitest run` | **308 geçti**, 2 kaldı (önceden bozuk) |
| `biome check` (değiştirilen dosyalar) | Hata yok |
| CSS: `--text-code` token'ı | `12px` olarak üretildi |
| CSS: kod yüzeylerinde `editor-font-size` | **0** (hepsi taşındı) |
| CSS: `surface-raised` tabanı | `editor-foreground` (saydam olmayan) |
| JS: odak çerçevesi sınıfı | Bulundu |
| JS: `font-medium` başlıklar | Bulundu |
| vsix | `openprovider-0.0.8.vsix` |

**Kalan 2 test:** `data-steps.test.ts` — ClinePass onboarding seçenekleri. Bu fork Cline hesap sistemini kaldırdığı için eskimiş; UI ile ilgisi yok, 1. turda da `git stash` ile doğrulanmıştı.

## Dürüst sınırlar

**Görsel olarak doğrulanamadı.** Eklenti arayüzü ancak VS Code içinde render olduğu için ekran görüntüsü alınamıyor. Doğrulama tip kontrolü, test, lint ve **paketlenmiş bundle'ın içeriğini ölçmek** seviyesinde. 1. turdan alınan ders: "sınıfı ekledim" yetmiyor, "CSS'te kural üredi ve eski değer kalmadı" diye ölçmek gerekiyor — bu turda öyle yapıldı.

**Saydam-token teorisi kanıtlanmadı.** Kullanıcının temasında `--vscode-toolbar-hoverBackground`'ın gerçekten saydam olup olmadığı ölçülemedi. Değişiklik riski ortadan kaldırıyor ama kesin sebep hâlâ doğrulanmamış. Bu sürüm de görünmezse teşhis için VS Code Developer Tools çıktısı gerekir.

**Sürüm numarası artık her pakette artıyor.** 0.0.5'te takılı kalması kurulumun sessizce atlanmasına yol açmıştı.

## Kurulum

1. Extensions (Ctrl+Shift+X) → OpenProvider → **Uninstall**
2. `...` → **Install from VSIX...** → `c:\OpenProvider\openprovider-0.0.8.vsix`
3. VS Code'u tamamen kapat-aç

> Extensions panelinde **0.0.8** yazdığını doğrula. Yazmıyorsa kurulum atlanmıştır.
