# SMART VILLAGE — DEMO DATASET 3 TAHUN

Status: DEMO / NON-PRODUCTION CONTENT
Territory: PILOT-DESA / Desa Pilot
Purpose: mengisi pengalaman publik dan dashboard admin dengan data contoh yang terasa seperti sistem telah berjalan selama 3 tahun.

## Prinsip

- Seluruh data ini bersifat sintetis/demo.
- Tidak menggunakan NIK nyata.
- Data pribadi tidak dipublikasikan.
- Data publik berasal dari lapisan publik Smart Village.
- Kabar Desa menggunakan `public.news_articles` sebagai sumber kanonik.
- `public.news_syndication_feed` adalah VIEW untuk konsumsi media berikutnya.
- Suara Ibukota nantinya membaca feed kanonik tersebut; artikel tidak perlu dibuat ulang di dua database.
- `canonical_url`, `source_system`, `source_article_id`, dan `syndication_enabled` disiapkan untuk atribusi dan sindikasi.

## Data yang tersedia

| Area | Sumber | Kondisi demo |
|---|---|---|
| Kabar Desa / News | `news_articles` | 33 artikel, mencakup 2024–2026 |
| Feed editorial | `news_syndication_feed` | VIEW dari sumber kanonik |
| Agenda warga | `community_events` | 51 event |
| Ekonomi Desa | `rt_business_profiles` | 57 profil usaha |
| Indikator ekonomi | `economic_analysis_snapshots` | 15 snapshot agregat 2024–2026 |
| Pengumuman | `public_announcements` | 12 data |
| Data warga/RT/RW | `persons`, `households`, `addresses`, dan tabel domain terkait | tetap mengikuti RLS dan batas akses |

## Contoh indikator ekonomi 3 tahun

- UMKM_ACTIVE: 24 → 29 → 34
- LOCAL_PRODUCTS: 86 → 104 → 122
- ECONOMIC_EVENTS: 12 → 16 → 20
- MARKET_PARTNERS: 8 → 11 → 14
- TRAINING_SESSIONS: 6 → 8 → 10

Angka tersebut adalah data sintetis untuk demo dashboard, bukan statistik resmi desa.

## Arsitektur Suara Ibukota

Tahap sekarang:
`Smart Village → news_articles → news_syndication_feed`

Tahap berikutnya:
`Suara Ibukota → konsumsi news_syndication_feed/API → atribusi sumber → canonical_url`

Dengan pola ini:
1. Smart Village menjadi sumber berita lokal.
2. Artikel tetap memiliki satu identitas kanonik.
3. Suara Ibukota dapat menampilkan ulang/sindikasi dengan atribusi.
4. Perubahan artikel dapat dikendalikan dari sumber utama.
5. Tidak terjadi duplikasi editorial dan konflik versi.

## Batas publik

Data pribadi, NIK, detail kesehatan, detail rumah tangga, dan data operasional RT/RW tidak dimasukkan ke feed publik. Dashboard publik hanya menggunakan agregat atau konten yang memang ditandai untuk publik.

## Catatan go-live

Dataset ini hanya untuk demo/pilot. Saat desa nyata mulai menggunakan sistem, data demo harus dipisahkan atau diganti melalui proses data onboarding yang terdokumentasi.