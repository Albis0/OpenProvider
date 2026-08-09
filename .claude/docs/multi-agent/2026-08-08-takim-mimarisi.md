# Takım Halinde AI — Mimari Tasarım

**Tarih:** 2026-08-08
**Durum:** Tasarım. Bu belgede **kod yazılmadı** — kullanıcı "plan ve mimari ile gel" dedi.
**Önkoşul:** `2026-08-08-failover-mimarisi.md` (temel bu işten geliyor)

---

## Özet

Rol zinciri (planner → executor → reviewer) `apps/openprovider` motorunda **çalışıyor ve test edilmiş** (33/33 probe) — ama VS Code eklentisine **hiç bağlı değil**. Kullanıcının gerçekten çalıştığı yer eklenti, dolayısıyla özellik pratikte **yok**.

Bu belge onu eklentiye nasıl getireceğini tasarlıyor. Merkezinde tek bir fikir var:

> **Rol değişimi ile failover değişimi aynı işlemdir.**

---

## Birleştirici fikir

Bugün failover'ı tamir ederken şu ortaya çıktı: failover'ın yaptığı şey, soyutlandığında, şu:

```
"bu oturumu başka bir sağlayıcıya taşı ve devam et"
```

Rol zincirinin ihtiyacı olan şey de tam olarak bu. Fark sadece **niyet**:

| | Tetikleyen | Niyet |
|---|---|---|
| **Failover** | Sağlayıcı düştü | İstemsiz — mecburen taşı |
| **Rol zinciri** | Adım bitti | İstemli — sıradaki koltuk başka modelde |

İkisi de aynı üç şeyi yapıyor: config'e yeni sağlayıcıyı yaz → oturumu yeniden kur → turu devam ettir.

`switchTo()` ([sdk-failover-coordinator.ts](../../../apps/vscode/src/sdk/failover/sdk-failover-coordinator.ts)) bunu **şimdiden** yapıyor ve artık uçtan uca test edilmiş durumda.

### Neden bu kritik

Ayrı iki geçiş mekanizması yazmak, **ikisinin de yarı test edilmiş** olması demekti. Bugünkü bug tam olarak bunun bedelini gösterdi: parçalar tek tek çalışıyordu, aralarındaki kablo yoktu, ve hiçbir test oradan başlamadığı için üç sürüm fark edilmedi.

Rol zinciri için ikinci bir geçiş yolu yazmak aynı hatayı ikinci kez yapmak olurdu. Bunun yerine **ortak bir ilkel** çıkarılmalı:

```
ProviderSwitchEngine
  ├── switchForFailover(from, to, reason)   ← mevcut, çalışıyor
  └── switchForRole(role, to)               ← yeni, aynı gövde
```

---

## Mevcut durumun envanteri

### Motorda hazır olanlar (`apps/openprovider/src/routing/`)

| Dosya | Ne yapıyor | Eklentiye taşınmalı mı |
|---|---|---|
| `roles.ts` | Rol tanımları + rol promptları | Evet (kopyalanarak) |
| `handoff.ts` | Planner çıktısını yapılandırılmış adımlara ayrıştırma | **Evet — en değerli parça** |
| `chain.ts` | Hangi roller koşacak, basit görevde atlama | Evet |
| `config.ts` | `roleConfig` şeması | Hayır — eklentide `state-keys` kullanılacak |
| `session.ts` | Orkestrasyon | Hayır — eklentide oturum modeli farklı |

### Eklentide hazır olanlar

| Parça | Nerede | Rol zincirinde işi |
|---|---|---|
| `switchTo()` | `failover/sdk-failover-coordinator.ts` | Rolü sağlayıcıya taşıma gövdesi |
| `normalizeProviderSwitchModel` | `core/controller/models/` | Yeni sağlayıcı için geçerli model çözme |
| `SdkProviderChangeCoordinator` | `sdk/` | Oturumu id ve geçmişi koruyarak yeniden kurma |
| Provider Priority sekmesi | `webview-ui/.../ProviderPrioritySection.tsx` | Rol→sağlayıcı UI'ı için desen |
| `say: "provider_failover"` bandı | `ChatRow.tsx` | Rol geçişi bandı için desen |

**Yeniden yazılmayacak:** yukarıdakilerin hiçbiri.

---

## Neden SDK'nın AgentTeam'i yürütme için kullanılmıyor

`@cline/sdk` = `export * from "@cline/core"`, ve core `AgentTeam` + `runPipeline` + `bootstrapAgentTeams` veriyor. İncelendi (2026-08-07). Karar ikiye bölündü:

**Alınan (kavram):**
- `AgentConfig` rol başına `providerId`/`modelId`/`apiKey` taşıyor → "her rol farklı sağlayıcıda" için yeni kavram icat etmeye gerek yok
- `runPipeline(pipeline, message, messageTransformer)` zincirin şekli

**Alınmayan (yürütme) — iki somut engel:**

1. **`runPipeline` bir ajan patlayınca zinciri `break` ediyor.** Bu projenin var olma sebebi rate limit'te görevin bitmemesi. Rol başına failover o yoldan imkânsız.

2. **`AgentTeam.addAgent` içeride `new SessionRuntime(...)` yapıyor.** Eklentinin oturum yaşam döngüsünü (`SdkSessionLifecycle`), event akışını, `beforeModel` hook zincirini ve — bugün kanıtlandığı gibi — **failover kancasını** tamamen atlıyor. AgentTeam kullanan bir zincir, bugün tamir ettiğimiz failover'dan yararlanamaz.

İkinci madde bugünden sonra daha da ağırlaştı: failover artık event akışına bağlı, `AgentTeam` ise o akışın dışında çalışıyor.

---

## Tasarım

### Veri modeli

`state-keys.ts` → `GLOBAL_STATE_FIELDS` (mevcut `providerFailoverOrder` deseni birebir):

```ts
roleChainEnabled: { default: false },
roleTargets: { default: {} as Record<Role, { provider?: ApiProvider; model?: string }> },
```

**Varsayılan kapalı.** Üç rol = üç API çağrısı ≈ üç katı token. Ücretsiz katmanda bu, kendi ikinci çağrında 429 yemekle görevi bitirmek arasındaki fark. Sormadan açmak her mevcut kullanıcının turunu yavaşlatır ve pahalılaştırır.

Proto tag'leri `scripts/generate-state-proto.mjs` tarafından otomatik atanıyor — elle proto düzenlemesi yapılmayacak.

### Zincir yürütmesi

```
kullanıcı mesajı
   │
   ├─ planChain(prompt)         ← kural bazlı, model çağrısı YOK
   │     basit görev? → sadece executor, zincir atlanır
   │
   ├─ planner turu   (sağlayıcı A)
   │     └─ parseHandoff(output) → yapılandırılmış adımlar
   │
   ├─ ProviderSwitchEngine.switchForRole("executor", B)
   │
   ├─ executor turu  (sağlayıcı B, plan enjekte edilmiş)
   │
   ├─ ProviderSwitchEngine.switchForRole("reviewer", C)
   │
   └─ reviewer turu  (sağlayıcı C, sonuç + orijinal istek)
```

**Rol seçimi asla LLM'e sorulmuyor** — CLAUDE.md'nin kural bazlı routing kararı. "Bu görev karmaşık mı?" diye modele sormak tam olarak kaçınılan gecikme ve maliyeti eklerdi, üstüne sınıflandırmayı yapan sağlayıcı rate limit yiyen sağlayıcı olduğunda kendi başına arıza noktası olurdu.

### Basit görevde zinciri atlama

`chain.ts`'teki tablo portlanır. Karmaşık sayılma kriterleri:

| Sinyal | Örnek |
|---|---|
| Çok adımlı ifade | "önce ... sonra ...", "then", "adım 2" |
| Genişlik kelimeleri | "refactor", "yeniden yaz", "mimari" |
| Çoğul iş | "tüm dosyalar", "hepsi", "every ..." |
| >1 dosya adı | `router.ts` ve `session.ts` |
| >400 karakter | — |

Türkçe kalıplar şart: bu projede istekler Türkçe yazılıyor, sadece İngilizce bilen tablo sessizce "hiçbir şey karmaşık değil"e düşer.

### Handoff — düz metin değil, yapılandırılmış

Planner düz yazı veriyor (completion'ın döndürebileceği tek şey). `runPipeline`'ın varsayılanı bunu `"Previous agent output:\n..."` diye yapıştırmak — yani istenen yapıyı çöpe atmak.

`handoff.ts` portlanır: metin numaralı adımlara + dosya yollarına ayrıştırılır. **Yeni proto alanı yok** — taşıyıcı mevcut mesaj metni.

**JSON istenmiyor, bilinçli:** hedef sağlayıcılar küçük modeller çalıştıran ücretsiz katmanlar; ölçülmüş davranış yapılandırılmış çıktı uyumunun oynak olduğu yönünde (Groq tool döngüleri). Fazladan virgül tüm zinciri düşürürdü. Numaralı liste modellerin en güvenilir olduğu format, ve ayrıştırıcı beklenen şekil gelmezse çökmüyor — her şeyi tek adım sayıp devam ediyor.

Executor'a **orijinal istek de** gönderiliyor: ayrı bir ajan, ortak transcript'i yok, kullanıcının ne istediğini hiç görmedi. Plan saptıysa tek gerçek kaynağı o sapmış plan olurdu.

### Rol başına failover

Bugünkü işin doğrudan kazancı: her rol turu normal bir tur olduğu için **failover kendiliğinden çalışıyor**. Planner NVIDIA'da limite takılırsa event akışı → sınıflandırıcı → geçiş → planner devam. Executor'ın nereye gideceği etkilenmiyor.

Ayrı bir "rol başına failover" mekanizması yazılmasına **gerek yok** — ortak ilkel bunu bedavaya veriyor. Bu, birleştirici fikrin en somut getirisi.

### Görünürlük

`say: "provider_failover"` bandının kardeşi: `say: "role_handoff"`.

```
▸ Planner → Executor        nvidia → groq
  3 adım · router.ts, session.ts
```

Sebep failover'dakiyle aynı: turun ortasında **hangi modelin cevap verdiği değişiyor**. Bu görülmezse çıktı üslubundaki kayma modelin sebepsiz kötüleşmesi gibi okunur.

### Hata politikası

- **Planner çökerse** → görev çökmez, plansız devam eder (tek-ajan davranışı). Daha kötü bir tur, ama gerçek bir tur.
- **Reviewer çökerse** → görev çökmez, sonuç incelenmemiş döner.
- **Executor çökerse** → görev çöker. İşi yapan o.

Her durumda kullanıcıya söylenir. Bugünün dersi: sessiz düşüş, bozuk özellikten ayırt edilemez.

**Dönen metin executor'ın çıktısı, reviewer'ın değil.** Reviewer'ın işi yorum yapmak; onun yorumunu sonuç diye döndürmek cevabın yerine cevap hakkındaki eleştiriyi koymak olurdu.

---

## Fazlı teslim

| Faz | İş | Risk | Durum |
|---|---|---|---|
| **0** | Failover'ı gerçekten çalıştır | — | **Bitti** (0.0.12) |
| **1** | `ProviderSwitchEngine`'i ortak ilkel olarak ayır | Düşük — mevcut kodu yeniden düzenleme | Sırada |
| **2** | `roleTargets` + Settings sekmesi (davranış yok) | Düşük — görünür, test edilebilir | |
| **3** | `handoff.ts` + `chain.ts` portu + testler | Düşük — saf fonksiyonlar | |
| **4** | Zincir yürütmesi (planner→executor) | **Yüksek** — tur ortasında yeni kontrol akışı | |
| **5** | Reviewer + görünürlük bandı | Orta | |

Faz 4 kasıtlı olarak en sonda ve tek başına: tur ortasında sağlayıcı değiştirip devam etmek, bugün failover'da düzelttiğimiz şeyin aynısı — ve orada bile mid-turn yeniden başlatmanın araç durumunu koruduğu **henüz doğrulanmadı**. Rol zinciri onu her turda birkaç kez yapacak. Bu yüzden Faz 0'ın canlı doğrulaması Faz 4'ün önkoşulu.

**Faz 1-3 arası her faz tek başına sevk edilebilir** ve hiçbir davranış değiştirmez. Kullanıcı zinciri açana kadar eklenti bugünkü gibi çalışır.

---

## Açık sorular (karar gerektiriyor)

**1. Reviewer → executor geri beslemesi.** Reviewer "şurası bozuk" derse bu executor'a geri gitmeli mi? Bir tur daha token demek. Öneri: **hayır**, ilk sürümde sadece raporla — Faz 3'teki verification retry döngüsü zaten build/test çıktısıyla bu işi yapıyor.

**2. Rol promptu nereye.** Şu an motorda prompt'un başına ekleniyor çünkü `AgentFactoryInput`'ta `systemPrompt` yok. Eklentide sistem promptu erişilebilir — oraya koymak daha doğru ama oturum kurulumuna dokunmak gerekiyor. Öneri: Faz 4'te sistem promptu.

**3. Zincir tur başına mı, görev başına mı.** Her kullanıcı mesajı zinciri baştan mı koşacak, yoksa görev boyunca bir kez mi planlanacak? Öneri: **tur başına**, çünkü kullanıcı görev ortasında yön değiştirebiliyor ve eski plan yanıltıcı olur.

**4. Kota etkileşimi.** Üç rol üç sağlayıcıya dağıldığında kota takibi (`quota/tracker.ts`) rol başına mı raporlamalı? Ölçülmedi.

---

## Ölçülmemiş varsayımlar — dürüst liste

**Gerçek modellerin numaralı liste formatına uyumu bilinmiyor.** Ayrıştırıcı uymazsa çökmüyor (her şeyi tek adım sayıyor) ama bu yola ne sıklıkla düşüleceği **hiç ölçülmedi**. Faz 3'ün çıkışı bu ölçüm olmalı.

**Karmaşıklık tablosu ölçülmedi.** Kelime listeleri makul tahminler. Yanlış tahminin maliyeti asimetrik: gereksiz zincir = 3 kat token, atlanan zincir = zayıf sonuç.

**Mid-turn oturum yeniden başlatmanın araç durumunu koruduğu doğrulanmadı.** Faz 4'ün en büyük riski ve failover ile paylaşılan risk.

**3 kat token maliyeti tahmin.** Gerçek oran rol promptlarının uzunluğuna ve planın büyüklüğüne bağlı, ölçülmedi.
