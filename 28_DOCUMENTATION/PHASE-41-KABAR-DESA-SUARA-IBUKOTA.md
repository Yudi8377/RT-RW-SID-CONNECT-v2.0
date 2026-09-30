# PHASE 41 — KABAR DESA / SUARA IBUKOTA NEWS LAYER

Status: IMPLEMENTED — deployment/runtime verification pending.

## Tujuan
KABAR DESA menjadi lapisan editorial Smart Village yang bersumber dari database, bukan hard-coded HTML.

## Canonical source
Table: `public.news_articles`

Public rows require:
- `status = PUBLISHED`
- `published_at <= now()`
- RLS enabled
- `anon` dan `authenticated` hanya SELECT

## Article model
- slug
- title
- excerpt
- content
- category
- reading_minutes
- image_key
- published_at
- status
- source_system
- source_article_id
- canonical_url
- syndication_enabled

## User flow
Home / KABAR DESA
→ klik kartu, gambar, judul, atau Baca selengkapnya
→ `website/berita.html?slug=<slug>`
→ artikel dibaca dari `news_articles`
→ artikel terkait ditampilkan
→ atribusi sumber tetap Kabar Desa / Smart Village.

## Suara Ibukota integration contract
Smart Village adalah **publisher/source of record** untuk artikel yang berasal dari desa.

Artikel yang memiliki:
`source_system = SMART_VILLAGE`
dan
`syndication_enabled = true`
dapat disalurkan ke Suara Ibukota.

Suara Ibukota nanti menjadi **media consumer/aggregator**, bukan sumber yang mengambil isi dari HTML Smart Village.

Aturan:
1. Jangan copy-paste artikel sebagai sumber primer.
2. Pertahankan slug/article identity.
3. Pertahankan attribution Kabar Desa / Smart Village.
4. Simpan canonical URL ke artikel sumber.
5. Media boleh memiliki headline/dek editorial sendiri dengan attribution.
6. Jika artikel dicabut/diarsipkan di Smart Village, status sindikasi harus ikut dihormati.
7. Implementasi API/feed publik Suara Ibukota dilakukan pada fase pembangunan media Suara Ibukota, setelah Smart Village live.

## Boundary
News/editorial berbeda dari `public_announcements`.
- `public_announcements`: informasi pelayanan/pengumuman resmi.
- `news_articles`: berita, cerita, dan perkembangan editorial.

Tidak mengubah canonical RT/RW transaction core.

## Go-live acceptance
- [x] Database news source created
- [x] RLS public read policy
- [x] Seeded initial Kabar Desa articles
- [x] Home news section reads canonical data
- [x] Article detail page
- [x] Related articles
- [x] Suara Ibukota syndication contract documented
- [ ] GitHub Pages deployment success for final commit
- [ ] Browser click acceptance on live Pages
