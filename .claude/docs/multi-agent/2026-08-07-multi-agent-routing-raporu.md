# Multi-Agent Routing — planner / executor / reviewer

**Tarih:** 2026-08-07
**Branch:** `feature/multi-agent-routing` (main'e dokunulmadı)
**Durum:** Kod bitti, doğrulandı, commit'lendi. Canlı API ile denenmedi.

---

## Özet

Görev tipine göre farklı sağlayıcıya iş atayan bir rol katmanı eklendi. Üç rol var:

```
planner  →  executor  →  reviewer
 (plan)      (kod)        (inceleme)
```

Her rol **kendi sağlayıcısına** gidebiliyor ve **kendi failover zincirine** sahip. Planner'ın kotası biterse sadece planner yer değiştiriyor, executor'ın nereye gideceği değişmiyor.

**Zincir varsayılan olarak KAPALI.** Sebep aşağıda.

5 commit:

| Commit | İş |
|---|---|
| `b66aa01a1` | Rol tanımları + config şeması |
| `e17ede96c` | Yapılandırılmış devir + zincir seçici |
| `7d4486e4d` | Session orkestrasyonu + rol başına failover |
| `5fa76f292` | Probe script |
| `20c1dc655` | Bu rapor |

Yeni dosyalar: `roles.ts`, `handoff.ts`, `chain.ts`, `probe-multi-agent.ts`.
Değişenler: `config.ts`, `router.ts`, `session.ts`, `index.ts`, `package.json`.

---

## Önce SDK incelendi (yol haritasının şartı)

`@cline/sdk` aslında tek satır: `export * from "@cline/core"`. Core da `AgentTeam`, `AgentTeamsRuntime` ve `bootstrapAgentTeams`'i dışa veriyor. Yani **Multi-Agent Teams API'si gerçekten var ve erişilebilir.**

İncelendi. Kararı ikiye ayırmak gerekti.

### Kullanılan kısım — kavram

İki bulgu doğrudan işe yaradı:

1. **`AgentConfig` zaten rol başına sağlayıcı taşıyor** (`providerId`, `modelId`, `apiKey`). Yani "her rol farklı sağlayıcıya gitsin" isteği için yeni bir kavram icat etmeye gerek yoktu — SDK bunun mümkün olduğunu zaten söylüyordu.
2. **`runPipeline(pipeline, message, messageTransformer)`** tam olarak planner→executor→reviewer akışı. Bizim zincirin şekli buradan alındı.

### Kullanılamayan kısım — yürütme

İki somut engel var, ikisi de bu projenin var olma sebebine dokunuyor:

**1. `runPipeline` bir ajan patlayınca zinciri `break` ediyor.**

```ts
} catch (error) {
    results.push({ agentId, result: undefined, error: err });
    break;   // ← zincir burada biter
}
```

Bu projenin tüm meselesi, rate limit yiyen bir sağlayıcının **görevi bitirmemesi**, sıradakine geçmesi. `runPipeline` üzerinden rol başına failover yazmak mümkün değil.

**2. `AgentTeam.addAgent` içeride `new SessionRuntime(...)` yapıyor.**

Bu iki şeyi atlıyor: bizim `AgentFactory` seam'i (probe'un ağsız çalışmasını sağlayan şey) ve `beforeModel` hook zinciri (context enjeksiyonu, çıktı sınırı, sanitizer).

**Karar:** Şekil SDK'dan alındı, yürütme mevcut `Router` + `AgentFactory` üstünde kaldı — çünkü ikisi zaten failover'ı biliyor. Bu geçici bir çözüm değil; `AgentTeam.runPipeline`'a sonradan geçmek her iki kazanımı da geri vermek demek olurdu. Gerekçe [roles.ts](../../../apps/openprovider/src/routing/roles.ts) başında kod yorumu olarak duruyor.

---

## Yapılan işler

### 1. Rol ≠ Mod (ayrı eksen)

Bu ayrım bilinçli:

- **mod** = işin *türü* (`plan` / `code` / `docs` / `review`)
- **rol** = o an *hangi koltuğun* çalıştığı (`planner` / `executor` / `reviewer`)

İkisini birleştirmek ilk bakışta sadeleştirme gibi görünüyor ama tam ters çalışıyordu: planner rolü sadece `plan` modundaki işleri alabilirdi. Oysa planner'ın işi **başkasının** görevini planlamak. "scanner.ts'deki bug'ı düzelt" `code` modudur ama yine de bir planner'dan geçebilir.

Config'de rol şöyle tanımlanıyor:

```json
{
  "roleConfig": {
    "enabled": true,
    "roles": {
      "planner":  { "mode": "plan" },
      "executor": { "mode": "code" },
      "reviewer": { "provider": "gemini", "model": "gemini-2.5-flash" }
    }
  }
}
```

İki yazım şekli var: `mode` ile **başka bir modun sağlayıcısını ödünç al**, ya da `provider` ile doğrudan söyle. `provider` yazılmışsa o kazanıyor. Bu, aynı sağlayıcı listesini iki kez yazmayı önlüyor.

### 2. Zincir neden varsayılan olarak kapalı

Üç rol = **üç ayrı API çağrısı** ve kabaca **üç katı token**. Bu ücretsiz katmanda yuvarlama hatası değil — kendi ikinci çağrında 429 yemekle görevi bitirmek arasındaki fark.

Bunu sormadan açmak, mevcut her kullanıcının turunu sessizce yavaşlatır ve pahalılaştırır. `enabled: false` iken executor tek başına çalışıyor ve bu **eski tek-ajan davranışının birebir aynısı** — rol promptu bile eklenmiyor.

### 3. Basit görevlerde zincir atlanıyor

Zincir açıkken bile, tek dosyalık bir istek executor'a tek başına gidiyor. Karar tamamen **kural bazlı** — model çağrısı yok, çünkü "bu görev karmaşık mı?" diye modele sormak tam olarak kaçınmaya çalıştığımız gecikme ve maliyeti eklerdi. Üstüne, sınıflandırmayı yapan sağlayıcı rate limit yiyen sağlayıcı olduğunda kendi başına bir arıza noktası olurdu.

Karmaşık sayılma kriterleri ([chain.ts](../../../apps/openprovider/src/routing/chain.ts)):

| Sinyal | Örnek |
|---|---|
| Çok adımlı ifade | "önce ... sonra ...", "then", "adım 2" |
| Genişlik kelimeleri | "refactor", "yeniden yaz", "mimari", "migrate" |
| Çoğul iş | "tüm dosyalar", "hepsi", "every ..." |
| Planlama dili | "planla", "tasarla", "strateji" |
| >1 dosya adı geçiyor | `router.ts` ve `session.ts` |
| >400 karakter istek | — |

Türkçe kalıplar `modes.ts` ile aynı sebepten var: bu projede istekler Türkçe yazılıyor, sadece İngilizce bilen bir tablo sessizce "hiçbir şey karmaşık değil"e düşerdi.

### 4. Devir düz metin değil, yapılandırılmış

Planner cevabı düz yazı olarak veriyor — bir completion'ın döndürebileceği tek şey bu. `runPipeline`'ın varsayılanı bunu olduğu gibi `"Previous agent output:\n..."` diye executor'a yapıştırmak, yani planner'dan istenen yapıyı çöpe atmak.

Bunun yerine metin `Handoff`'a ayrıştırılıyor:

```ts
interface Handoff {
  from: Role
  steps: { index: number; text: string; files: string[] }[]
  raw: string
  structured: boolean
}
```

**Yeni proto alanı eklenmedi.** Taşıyıcı hâlâ `AgentRunOutcome.text` — tek-ajan yolunun zaten kullandığı alan. Bu mevcut bir mesajın izdüşümü, yeni bir mesaj değil.

**Neden JSON istenmedi:** Daha katı olurdu, bilinçli reddedildi. Hedef sağlayıcılar küçük modeller çalıştıran ücretsiz katmanlar ve ölçülmüş davranış (NOTES.md, Groq tool döngüleri) yapılandırılmış çıktı uyumunun oynak olduğu yönünde. JSON'ını düz yazıya saran ya da fazladan virgül koyan bir model tüm zinciri düşürürdü. Numaralı liste modellerin en güvenilir olduğu format, ve ayrıştırıcı beklenen şekil gelmezse **çökmüyor** — her şeyi tek adım sayıp devam ediyor.

Executor'a giden prompt'ta **orijinal istek de tekrarlanıyor**. Executor ayrı bir ajan, ortak transcript'i yok — kullanıcının ne istediğini hiç görmedi, sadece planner'ın ondan ne anladığını gördü. Plan saptıysa executor'ın tek gerçek kaynağı o sapmış plan olurdu.

### 5. Rol başına ayrı failover

En kritik parça. `runAttempt` artık rol parametresi alıyor ve router'a **o rolün kendi aday listesini** soruyor:

```ts
const route = this.router.route(prompt, runOptions.mode, role)
```

Sonuç: planner alpha'da kota bitirirse planner beta'ya geçiyor, executor beta'da kalmaya devam ediyor. Roller zaten farklı sağlayıcılara **tam olarak bu yüzden** konuyor — bir kotanın tükenmesi tüm görevi durdurmasın diye.

### 6. Hata politikası: planner/reviewer tavsiye niteliğinde

- **Planner çökerse** → görev çökmüyor. Plansız devam ediyor, yani şimdiye kadarki varsayılan olan tek-ajan davranışına düşüyor. Daha kötü bir tur, ama gerçek bir tur.
- **Reviewer çökerse** → görev çökmüyor, sonuç incelenmemiş olarak dönüyor.
- **Executor çökerse** → görev çöküyor. İşi yapan o.

Her iki durumda da `notices`'a düşülüyor, sessizce yutulmuyor.

**Dönen metin executor'ın çıktısı, reviewer'ın değil.** Reviewer'ın işi işe yorum yapmak; onun yorumunu sonuç diye döndürmek, cevabın yerine cevap hakkındaki eleştiriyi koymak olurdu. Verdict ayrı alanda (`review`) taşınıyor.

---

## Doğrulama

| Kontrol | Sonuç |
|---|---|
| `bunx tsc --noEmit` (extension) | Temiz |
| `bunx tsc -b` (webview) | Temiz |
| `bunx tsc --noEmit` (openprovider) | Temiz |
| **Extension testleri** | **852/852 geçti** (71 dosya) |
| Probe (`bun run probe:multi-agent`) | **33/33 kontrol geçti** |

Mevcut 852 testin hiçbiri bozulmadı — zaten beklenen buydu, çünkü zincir kapalıyken kod eski yoldan geçiyor.

### Probe ne kanıtlıyor

Stub ajanla, ağsız. Bu kısayol değil: canlı zincir tur başına üç sağlayıcıda üç çağrı demek, ve ücretsiz kota tesisat testine harcanırdı. Ayrıca "planner alpha'ya, executor beta'ya gitti" bir **routing gerçeği** — araya gerçek model sokmak sadece gürültü ekler.

7 bölüm:

1. Karmaşıklık değerlendirmesi (4 kontrol)
2. Zincir seçimi — kapalı / atlanmış / tam (3)
3. Devir ayrıştırma, bozuk girdi dahil (6)
4. Uçtan uca: roller farklı sağlayıcılara gidiyor, executor yapılandırılmış planı alıyor (10)
5. Basit istek **tam olarak 1 çağrı** yapıyor (3)
6. Planner'ın sağlayıcısı düşürülünce planner tek başına kayıyor, executor yerinde kalıyor (4)
7. Executor çökerse görev çöküyor (2)

Config **diske yazılarak** test ediliyor, enjekte edilerek değil — bellekte parse olan ama JSON'dan olmayan bir rol bloğu bu probe'u geçemesin diye.

---

## Bilinen açıklar — dürüst liste

**Canlı API ile hiç denenmedi.** Tüm doğrulama stub üzerinden. Gerçek bir modelin numaralı liste formatına ne kadar uyduğu **ölçülmedi** — `structured: false` yoluna ne sıklıkla düşüleceği bilinmiyor. Bu, ayrıştırıcının en çok merak edilen tarafı.

**Gerçek 429 ile denenmedi.** Rol başına failover stub'da bir sağlayıcı sahte hata döndürerek doğrulandı. Gerçek rate limit başlıklarıyla (`retry-after`, sağlayıcıya göre değişen formatlar) hiç karşılaşmadı.

**VS Code arayüzünde hiçbir şey yok.** Bu tamamen `apps/openprovider` motor katmanında. Kullanıcı zinciri açmak için `openprovider.config.json`'ı **elle** düzenlemek zorunda. Settings'te ne bir anahtar var ne de rol/sağlayıcı seçici.

**Rol promptu sistem mesajı değil, prompt'a ekleniyor.** `AgentFactoryInput`'ta `systemPrompt` alanı yok; eklemek varsayılan olarak kapalı bir özellik için tüm mevcut çağıranların sözleşmesini değiştirmek demekti. Doğru yer muhtemelen sistem mesajı — ileride factory sözleşmesi genişletilirse taşınmalı.

**Zincir tek geçişli.** Reviewer "şurası bozuk" derse bu bilgi executor'a **geri gitmiyor**, sadece sonuçta raporlanıyor. Reviewer→executor geri besleme döngüsü yok. Faz 3'teki verification retry döngüsü zaten var ve zinciri sarıyor, ama o build/test çıktısına bakıyor, reviewer'ın yorumuna değil.

**Karmaşıklık tablosu ölçülmedi.** Kelime listeleri makul tahminler, gerçek kullanımdaki isabet oranı bilinmiyor. Yanlış tahminin maliyeti asimetrik: gereksiz zincir = 3 kat token, atlanan zincir = daha zayıf sonuç.

---

## Sırada ne var

1. **Canlı bir zincir çalıştır** — asıl bilinmeyen, gerçek modellerin numaralı liste formatına uyumu
2. **VS Code Settings entegrasyonu** — şu an config dosyası elle düzenleniyor
3. Reviewer→executor geri besleme döngüsü (karar gerektirir: bir tur daha token harcamaya değer mi)
4. Rol promptunu sistem mesajına taşı (factory sözleşmesi değişikliği)
5. Karmaşıklık tablosunu gerçek isteklerle ölç
