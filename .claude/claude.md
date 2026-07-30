# CLAUDE.md — OpenProvider Proje Yönergesi

Bu dosya Claude Code için: OpenProvider projesinin ne olduğunu, nasıl kurulacağını ve hangi kararların zaten verilmiş olduğunu tanımlar. Her yeni oturumda bu dosyayı oku ve buradaki kararlara uy.

---

## Proje Nedir

OpenProvider, **Cline'ın SDK'sı üzerine inşa edilen**, provider-bağımsız bir AI kodlama ajanı katmanıdır.

**KRİTİK KARAR:** Bu proje Cline'ı fork edip iç kodunu (Controller/Task/webview) değiştirmiyor. Bunun yerine `@cline/sdk` (veya Cline'ın sunduğu resmi programatik API) dışarıdan kullanılıyor, kendi orkestrasyon/routing katmanı **ayrı bir uygulama** olarak yazılıyor. Sebep: Cline'ın iç kod tabanı büyük ve sıkı bağlı (Controller ↔ Task ↔ gRPC ↔ webview state senkronu); fork bakımı (upstream sürekli merge) gereksiz yük getiriyor ve kod tabanının tamamını anlamadan üstüne inşa etmek kırılgan sonuç veriyor.

Eğer Cline SDK'sı ihtiyacı karşılamıyorsa (araştırma sırasında ortaya çıkarsa), bu karar yeniden değerlendirilir — ama varsayılan yön budur, aksini önermeden önce SDK'nın gerçekten yetersiz kaldığı somut noktayı göster.

---

## Neden Var — Rakip Analizi (Zaten Yapıldı, Tekrar Sorgulama)

- **OmniRoute**: Sadece bir proxy/router. Dosya düzenlemiyor, planlama yapmıyor, context seçmiyor. Abonelik/API key/ücretsiz tier'lar arasında failover yapıyor.
- **Cline (güncel)**: Zaten Multi-Agent Teams (coordinator + specialist agent), her provider desteği, ve kendi SDK'sını sunuyor. Yani "provider bağımsızlık" ve "multi-agent" fikirlerinin büyük kısmı Cline'da zaten var.
- **Sonuç:** OpenProvider'ın var olma sebebi, Cline'ın SDK/Multi-Agent Teams'inin **yapmadığı** dar bir boşluğu doldurmak olmalı — genel bir "ben de agent yapayım" değil.

**Belirlenmiş gerçek boşluk (öncelik sırasıyla):**
1. **Otomatik, statik-analiz tabanlı context seçimi** — Cline'ın context yönetimi hâlâ kullanıcının manuel `@file` seçimine veya basit özetlemeye dayanıyor. Tree-sitter ile sembol/bağımlılık grafiği çıkarıp, LLM çağrısı yapmadan (maliyet/gecikme eklemeden) "bu task için hangi dosyalar alakalı" kararını otomatik vermek — Aider'ın "repository map" yaklaşımına benzer.
2. **Kural bazlı, düşük gecikmeli task routing** — "planning → Claude, codegen → DeepSeek" gibi kararları LLM sınıflandırması OLMADAN (ekstra API çağrısı eklemeden) kural/mod bazlı vermek.
3. **Quality verification/retry döngüsü** — task bitince otomatik build/test çalıştırma, başarısızsa hatayı modele geri verip retry.

Bunların dışında yeni "farklılaştırıcı özellik" önerilmeden önce, önerilen şeyin Cline SDK'sında zaten olup olmadığı kontrol edilmeli.

---

## MVP Kapsamı — SIKI SINIRLA

**v0.1 hedefi tek bir şey:** Yukarıdaki 3 boşluktan **SADECE BİRİNİ** (öncelik: #1, context seçimi) minimal ama çalışan şekilde kanıtlamak. Failover, provider abstraction, multi-agent orkestrasyon gibi şeyleri v0.1'e KATMA — bunlar zaten Cline SDK'sında var, yeniden yazmak zaman kaybı.

**v0.1'de YAPILMAYACAKLAR (bilinçli olarak ertelendi):**
- Kendi failover motorunu yazmak (Cline SDK / OmniRoute zaten çözüyor)
- Kendi provider adapter katmanını yazmak (SDK zaten sağlıyor)
- Multi-agent orkestrasyon (SDK'nın Multi-Agent Teams'i zaten var, önce onu incele)
- LLM ile task sınıflandırma / dinamik routing (maliyet/gecikme riski yüksek, MVP'de kural bazlı yeter)

---

## Teknik Notlar (Önceki Analizden)

- Cline'ın context yönetimi: otomatik pencere takibi + `.clinerules/` (proje kuralları, 150 satır altı önerilir, workspace kuralları globali eziyor) + git checkpoint'leri. Bunları yeniden yazma, üstüne inşa et.
- MCP (Model Context Protocol) desteği korunmalı — ekosistem bunun etrafında şekilleniyor, kaybetmek büyük gerileme olur.
- API key'ler asla düz dosyaya/JSON'a yazılmaz — VS Code `SecretStorage` API'si (veya SDK'nın sağladığı eşdeğeri) kullanılır.
- Tool-calling formatları provider'a göre farklı (Anthropic tool_use, OpenAI function calling, Gemini kendi şeması) — eğer bir noktada kendi adapter yazmak gerekirse (SDK yetersiz kalırsa) bunları ortak bir iç formata çevirecek şekilde tasarla, yoksa her yeni provider'da tüm agent mantığı değişir.

---

## Çalışma Şekli

- Her mimari kararı önce **kullanıcı** (proje sahibi) onaylar, sonra kod yazılır. "Şuraya şunu ekle" gibi açık uçlu görev yerine, spesifik ve sınırlı görev tanımı beklenir.
- Kullanıcı lise öğrencisi, self-taught: HTML, vanilla CSS, JS (ES6+), temel React (useState/useEffect/Context), git/terminal komutları biliyor. Node.js/TypeScript agent mimarisi, gRPC, tree-sitter gibi konularda yeni — açıklamalar bu seviyeye göre ayarlanmalı, adım atlanmadan.
- Her yeni özellik için ayrı bir görev MD'si tutuluyor (proje sahibinin kendi sistemi) — bu dosyalar tamamlanınca gözden geçirilecek, CLAUDE.md bu MD'lerdeki kararlarla çelişmemeli.
- yaptigin her is sonrasi .claude/docs icine yaptigin isi aciklayan bir md dosyasi olustur
