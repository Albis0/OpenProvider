# OpenProvider Roadmap

> Kural: her faz bitmeden sonraki faza geçilmez. Faz içinde "bonus" özellik eklenmez. Sıra: Faz 0 → 1 → 2 → 3. Toplam 4 faz, daha yok.

---

## Faz 0 — Zemin Hazırlığı (Kod Yazmadan Önce)

**Amaç:** Cline SDK'sını gerçekten anlamadan tek satır kod yazmamak.

**Somut çıktılar:**
1. `@cline/sdk` (veya resmi adı neyse) dokümantasyonunu oku, özellikle:
   - Multi-Agent Teams nasıl tanımlanıyor (coordinator/specialist API'si)
   - SDK'nın context/dosya erişim mekanizması nasıl çalışıyor
   - Custom tool ekleme API'si var mı, nasıl
2. Cline'ın kendi context yönetimini incele (`.clinerules/`, `@file` mekanizması, tree-sitter kullanımı) — GitHub'da `services/` klasörüne bak
3. Boş bir Node.js/TypeScript projesi kur, SDK'yı dependency olarak ekle, **hiçbir özel mantık yazmadan** SDK'nın "hello world" örneğini çalıştır (bir prompt gönder, cevap al)
4. Bir `NOTES.md` dosyasına şunu yaz: SDK'nın context seçimi için sunduğu hook/API tam olarak ne — yoksa Faz 1 baştan farklı kurulmalı

**Bitiş kriteri:** SDK üzerinden basit bir mesaj gönderip cevap alabiliyorsun VE context seçimi için SDK'nın neye izin verip vermediğini net biliyorsun.

**Süre beklentisi:** Bu bir öğrenme fazı, aceleye getirme. Anlamadan Faz 1'e geçme.

---

## Faz 1 — Context Engine (Asıl Farklılaştırıcı, MVP'nin Kalbi)

**Amaç:** Kullanıcı `@file` ile elle seçmeden, task'a göre otomatik olarak "hangi dosyalar alakalı" kararını statik analizle (LLM çağrısı olmadan) vermek.

**Somut çıktılar, sırayla:**

1. **Repo tarayıcı modülü**
   - Bir proje klasörünü tarayıp dosya ağacını çıkaran fonksiyon
   - `.gitignore` ve büyük binary/asset dosyalarını dışarıda bırakma

2. **Tree-sitter entegrasyonu**
   - JS/TS için tree-sitter parser kur (Cline zaten kullanıyor, hangi parser'ı hangi versiyonla kullandığına bak, aynısını kullan)
   - Her dosyadan şunları çıkar: fonksiyon/class isimleri, import/export listesi
   - Çıktıyı basit bir JSON yapısına koy: `{dosya: {exports: [], imports: [], symbols: []}}`

3. **Bağımlılık grafiği**
   - Import/export listesinden hangi dosyanın hangi dosyayı kullandığını çıkar (basit bir graph, node=dosya, edge=import ilişkisi)
   - Döngüsel bağımlılıkları görmezden gel, sadece "A, B'yi import ediyor" ilişkisini tut

4. **Alaka skorlama (LLM'siz)**
   - Kullanıcının prompt'undaki kelimelerle (dosya adı, fonksiyon adı, class adı) basit bir keyword-match skorlaması yap
   - Eşleşen dosyadan başlayıp bağımlılık grafiğinde 1-2 seviye komşuluğundaki dosyaları da "alakalı" say
   - Çıktı: "bu task için önerilen dosya listesi", skora göre sıralı

5. **SDK'ya entegrasyon**
   - Faz 0'da bulduğun context-injection noktasından, seçilen dosyaların içeriğini (ya da Aider tarzı sıkıştırılmış "repo map"ini) SDK'nın context'ine ekle
   - Kullanıcının elle `@file` yapmasına hâlâ izin ver, bu otomatik seçim bir öneri/varsayılan olsun, zorunlu değil

**Bitiş kriteri:** Gerçek bir küçük repo (kendi eski bir projen, mesela Sofra veya Astera) üzerinde, bir prompt verdiğinde sistem doğru dosyaları otomatik seçebiliyor — sen manuel `@file` yapmadan agent doğru dosyalara erişip görevi tamamlayabiliyor.

**Neyi YAPMA:** Semantic/embedding tabanlı arama ekleme (bu ayrı ve pahalı bir problem, MVP'de yok). LLM'e "bu dosyalar alakalı mı" diye sorma (amaç LLM çağrısı EKLEMEMEK).

---

## Faz 2 — Kural Bazlı Routing (LLM Sınıflandırma YOK)

**Amaç:** Task türüne göre farklı provider/model'e yönlendirme, ekstra API çağrısı/gecikme eklemeden.

**Somut çıktılar:**

1. **Mod tanımları**
   - Kullanıcının elle seçebileceği modlar: `plan`, `code`, `docs`, `review` (Cline'ın Plan/Act moduna benzer ama genişletilmiş)
   - Her mod için config dosyasında hangi provider/model kullanılacağı tanımlı (`config.json` gibi basit bir yapı)

2. **Basit heuristic (opsiyonel, mod elle seçilmediyse)**
   - Prompt'ta belirli anahtar kelimeler varsa (örn. "plan yap", "tasarla" → plan modu; "test yaz", "düzelt" → code modu) otomatik mod öner
   - Bu bir LLM çağrısı DEĞİL, basit regex/keyword eşleşmesi

3. **Provider config sistemi**
   - Kullanıcının birden fazla API key'ini (farklı sağlayıcılar için) tanımlayabileceği bir yapı
   - SDK'nın zaten sunduğu provider desteğini kullan, kendi adapter'ını YAZMA (Faz 0'da bunu doğrulamıştın)

4. **Manuel geçiş bildirimi**
   - Bir provider hata verirse veya kota biterse, kullanıcıya net bir mesaj göster ("X limitine ulaşıldı, Y'ye geçiliyor") — SDK'nın failover'ı varsa onu kullan, yoksa en basit haliyle (bir sonraki config'teki provider'a geç) kendin yaz

**Bitiş kriteri:** Config dosyasında tanımlı 2+ provider arasında, mod'a göre doğru olanı seçip görevi o provider'a gönderebiliyorsun. Bir provider manuel olarak "kapalı" işaretlenince otomatik diğerine geçiyor.

**Neyi YAPMA:** LLM ile task sınıflandırma yapma. Kendi failover motorunu sıfırdan yazma (SDK'da varsa onu kullan).

---

## Faz 3 — Quality Verification / Retry

**Amaç:** Task bittiğinde otomatik doğrulama, başarısızsa tek seferlik retry.

**Somut çıktılar:**

1. **Post-task hook**
   - Task tamamlandığında, projede `package.json` varsa `npm run build` ve/veya `npm test` komutunu otomatik çalıştır
   - Komut yoksa bu adımı sessizce atla (her proje test/build script'i içermeyebilir)

2. **Hata geri besleme**
   - Build/test başarısız olursa, hata çıktısını (stdout/stderr) alıp agent'a "bu hatayı düzelt" diye tek bir retry görevi olarak geri gönder
   - Retry'da da başarısız olursa kullanıcıya hatayı göster, otomatik üçüncü denemeye GEÇME (sonsuz döngü riski)

3. **Basit rapor**
   - Task sonunda kullanıcıya kısa bir özet: "değiştirilen dosyalar, build durumu, test durumu"

**Bitiş kriteri:** Bilerek bozuk bir kod üreten bir senaryoda (test amaçlı), sistem hatayı yakalayıp otomatik bir düzeltme denemesi yapabiliyor ve sonucu raporluyor.

**Neyi YAPMA:** Çoklu retry zinciri, farklı modellerle sırayla deneme gibi karmaşık mantık kurma — bu v0.4+ (roadmap dışı, şimdilik konuşulmuyor).

---

## Fazlar Arası Sıkı Kural

- Bir faz bitmeden diğerine geçilmiyor. "Bu arada şunu da ekleyeyim" dürtüsü çıkarsa, bir sonraki fazın notuna yaz, o faza gelince değerlendir.
- Her fazın sonunda gerçek bir repo üzerinde elle test edilecek, "kodu yazdım ama denemedim" bir faz bitmiş sayılmaz.
- Multi-agent orkestrasyon (planner/executor/reviewer/fixer) bu roadmap'te YOK — çünkü Cline SDK'sının Multi-Agent Teams'i zaten bunu sağlıyor. Faz 0'da bunun yetersiz kaldığı somut bir nokta bulunursa, o zaman ayrı bir faz olarak eklenir; bulunmazsa hiç eklenmez.
