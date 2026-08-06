# Özet — 174 Sağlayıcının Tam Denetimi (6 Paralel Ajan)

**Başlangıç:** 2026-08-01 14:55
**Bitiş:** 2026-08-02 09:10

---

## Ne yapıldı

[provider-envanteri.md](provider-envanteri.md)'deki 174 sağlayıcının **tamamı**
6 eşit dilime (29-30'ar) bölünüp 6 subagent'a paralel verildi. Her agent kendi
diliminde üç şeyi yaptı:

1. **Wiring denetimi** — sağlayıcı `ApiProvider` union'ında (birinci sınıf) mı,
   yoksa jenerik `openai-compatible` formundan mı geçiyor; jenerik formda
   görünürlüğü eksikse tek satırlık isim girişi ekledi
2. **`quirks.ts` iskeleti** — bedava/ucuz olabilecek veya reasoning modeli
   varsayılan olan sağlayıcılara `measuredOn` alanı **bilerek boş** bırakılmış
   test-bekleyen kayıt ekledi
3. **Rapor** — her grup kendi `.claude/docs/2026-08-01-grupN-provider-denetimi.md`
   dosyasını yazdı

**Hiçbir agent gerçek API çağrısı yapmadı** — key yoktu, hepsi statik katalog
dosyalarından (`providers.generated.ts`, `builtins.ts`, `catalog.generated.ts`)
çalıştı. Gerçek test hâlâ [provider-test-plani.md](2026-08-01-provider-test-plani.md)'deki
S0-S6 basamaklarıyla, kullanıcının kendi key'leriyle yapılacak.

## Sonuç — sadece 2 kaynak dosya değişti

| Dosya | Değişiklik |
|---|---|
| `apps/vscode/webview-ui/src/components/settings/providers/providerSettingsRegistry.ts` | ~44 sağlayıcıya `FALLBACK_GENERIC_PROVIDER_NAMES` girişi (isim eşleşmesi, kozmetik — görünürlüğü etkilemiyor, sadece imza/link kalitesini) |
| `apps/openprovider/src/providers/quirks.ts` | 47 → **25 giriş** toplam (5 eski + 20 yeni test-bekleyen iskelet) |

**Neden bu kadar az?** Çünkü denetim şunu ortaya çıkardı: jenerik form,
`providerSettingsRegistry.ts`'de kaydı olmasa bile **zaten görünür ve
kullanılabilir** — o kayıt sadece kozmetik (imza linki, özel etiket). Yani
başta beklenen "çoğu sağlayıcı eksik wiring'den mustarip" varsayımı **yanlış
çıktı**. 174 sağlayıcının ezici çoğunluğu zaten çalışır durumdaydı.

**Yeni `ApiProvider` union girişi, proto alanı veya state-key EKLENMEDİ** —
bilerek. Her biri NVIDIA'daki gibi 7 duraklık bir iş; 174 sağlayıcı için tek
tek yapmak kapsam dışı bırakıldı ve zaten gerekli değildi.

## Doğrulama

- `apps/vscode/src` altında bir agent'ın yanlış `tsc` çağrısından kalan
  **1412 adet başıboş `.js`/`.js.map`** build artifact'i bulundu ve silindi —
  hiçbiri kaynak dosya değildi, hepsi derleme çıktısıydı
- `quirks.ts`'teki 25 giriş elle sayıldı, süslü parantez dengesi (51/51)
  doğrulandı, eski 5 giriş (groq/gemini/cerebras/openrouter/nvidia) bozulmamış
- `cd apps/vscode && bunx tsc -b` — **temiz, hata yok**
- Git durumu: sadece 2 değişmiş kaynak dosya + 8 yeni rapor MD'si, hiç
  beklenmedik değişiklik yok

## Raporların tam listesi

- [2026-08-01-grup1-provider-denetimi.md](2026-08-01-grup1-provider-denetimi.md) — 302ai…cline-pass (29)
- [2026-08-01-grup2-provider-denetimi.md](2026-08-01-grup2-provider-denetimi.md) — cloudferro-sherlock…hpc-ai (29)
- [2026-08-01-grup3-provider-denetimi.md](2026-08-01-grup3-provider-denetimi.md) — huawei-cloud-maas…mistral (30)
- [2026-08-01-grup4-provider-denetimi.md](2026-08-01-grup4-provider-denetimi.md) — mixlayer…pioneer (29, NVIDIA dahil ama dokunulmadı)
- [2026-08-01-grup5-provider-denetimi.md](2026-08-01-grup5-provider-denetimi.md) — poe…tencent-tokenhub (29)
- [2026-08-02-grup6-provider-denetimi.md](2026-08-02-grup6-provider-denetimi.md) — the-grid-ai…zhipuai-coding-plan (30)

## Sırada ne var

Kod tarafında yapılabilecek her şey bitti. Kalan iş tamamen ölçüm:
[provider-test-plani.md](2026-08-01-provider-test-plani.md)'deki Grup A'dan
başlayarak (NVIDIA → Groq → Cerebras → OpenRouter → ...) gerçek key'lerle
S0-S6 basamaklarını geçip sonuçları `quirks.ts`'e `measuredOn` tarihiyle işlemek.
