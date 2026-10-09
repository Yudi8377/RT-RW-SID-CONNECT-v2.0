# Dataset Contoh RT/RW–SID CONNECT v1

Status: **SYNTHETIC DEMO — BUKAN DATA RESMI**
Migrations: `supabase/migrations/20261009090000_synthetic_demo_dataset_v1.sql` dan `supabase/migrations/20261009100000_module_specific_demo_records_v1.sql`

## Isi dataset
- 60 penduduk sintetis; identifier menggunakan prefix `DEMO-NIK-`, bukan NIK asli.
- 20 kartu keluarga sintetis; identifier menggunakan prefix `DEMO-KK-`, bukan nomor KK asli.
- 2 catatan kematian simulasi.
- 6 catatan pergerakan penduduk: pendatang, pindah masuk, pindah keluar, pindah RT, dan pindah RW.
- Wilayah fiktif: 1 desa contoh, 2 RW, 5 RT.
- Contoh permohonan layanan, dokumen, dan aktivitas untuk warga, kependudukan, kematian, pendatang/pindah, UMKM, berita desa, layanan/surat, kegiatan, kas RT/RW, GIS, bantuan sosial, keamanan, dan admin.\n- Tambahan 30 record operasional khusus untuk 10 area menu: Identitas, Jolie Business OS, GIS, WhatsApp, SID Bridge, GPFFE Exchange, Platform Admin, Data Quality, Kegiatan/Komunitas, dan Layanan.

## Modul yang sudah memiliki dataset demo
Dataset demo tiga tahun yang sudah ada sebelumnya tetap menjadi sumber untuk:
- Berita/kabar desa: 33 artikel contoh.
- Agenda warga: 51 kegiatan.
- Ekonomi/UMKM: 57 profil usaha.
- Snapshot indikator ekonomi: 15 data agregat.
- Pengumuman: 12 data.

Migration ini bersifat idempotent untuk record dengan kode demo yang sama. Data contoh baru ditandai jelas agar tidak tercampur dengan data operasional. Tidak ada data NIK, nomor KK, alamat, atau kontak nyata yang digunakan.

## Penerapan
Jalankan migration melalui pipeline migration Supabase proyek yang sesuai. File yang berada di repository belum berarti sudah diterapkan ke database aktif. Setelah diterapkan, verifikasi jumlah record di tabel terkait dan pastikan RLS tetap membatasi akses data personal. Jangan pernah menampilkan identitas warga/KK atau catatan kematian pada halaman publik; gunakan agregat untuk dashboard publik.

## Batasan
Pemuatan workspace kini diarahkan ke module_code spesifik dan memakai fallback dalam modul yang sama untuk submenu yang belum memiliki record khusus. Ini memperbaiki keterlihatan dataset, tetapi bukan bukti bahwa semua menu telah melewati pengujian browser end-to-end. Tombol Update pada record operasional memerlukan autentikasi dan kebijakan RLS yang sesuai; jangan membuka akses tulis anonim ke database warga.


## Integrasi menu domain (9 Oktober 2026)

Menu yang telah dihubungkan ke tabel domain untuk tampilan data contoh:

- **RT → Data Warga / Warga Portal → Profil Warga:** `persons` yang dibatasi ke klasifikasi `CONFIDENTIAL` pada dataset demo (60 warga sintetis).
- **RT → Data Keluarga / KK / Warga Portal → Kartu Keluarga:** `households` dengan penanda `DEMO-KK-%` (20 KK sintetis), alamat contoh dari `addresses`.
- **RT → Data Kematian:** `death_records` yang ditautkan ke warga demo (2 record).
- **RT → Pindah / Datang dan Domisili & Pendatang:** `demo_residency_movements` yang ditautkan ke warga demo (6 record).
- **RT → Ekonomi & Usaha Warga / Perdagangan Lokal; Jolie Business OS → Marketplace/CRM:** `rt_business_profiles` dengan `source like DEMO_SEED%` (61 record pada wilayah demo).
- **Desa → Transparansi / Pelayanan Desa:** `public_announcements` pada wilayah demo (30 pengumuman terbit) dan `news_articles` dari sumber `SMART_VILLAGE` (maksimal 20 artikel terbaru per tampilan).

Tampilan domain menggunakan **baca-saja** untuk mencegah tombol Update generik menyimpan record dari tabel domain ke `demo_operational_records`. Tombol Update generik tetap hanya untuk record operasional demo. CRUD resmi untuk tabel domain harus menggunakan form dan kebijakan akses khusus masing-masing tabel; tidak membuka penulisan anonim untuk mengakomodasi trial publik.
