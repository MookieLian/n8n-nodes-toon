# n8n-nodes-toon

Bu depo, JSON girdisini [TOON formatına](https://toonformat.dev/docs) dönüştüren tek adımlık bir n8n topluluk düğümünü içerir. Düğüm yalnızca zorunlu girdiyi (`Input JSON`) gösterir ve çıktıda TOON metnini `toon` alanında üretir.

## Kurulum

1. Depoyu kopyalayın veya paketi `npm install <paket-adi>` ile kurun.
2. n8n örneğinizde topluluk düğümleri desteğini aktif edin.
3. [n8n topluluk düğümleri kılavuzundaki](https://docs.n8n.io/integrations/community-nodes/installation/) adımları izleyerek paketi yükleyin.

## Operasyonlar

- **Format**: Sağlanan JSON'u TOON metnine kodlar.

## Kullanım

1. Bir **TOON Formatter** düğümü ekleyin.
2. `Input JSON` alanına statik JSON girin ya da `{{ $json }}` gibi bir ifade kullanın.
3. Çalıştırdığınızda çıktı öğelerinin `toon` alanında TOON metnini alırsınız.

## Kaynaklar

- [TOON format dokümantasyonu](https://toonformat.dev/docs)
- [n8n topluluk düğümleri kılavuzu](https://docs.n8n.io/integrations/#community-nodes)

## Sürüm geçmişi

- **0.1.0** – İlk TOON formatter sürümü.
