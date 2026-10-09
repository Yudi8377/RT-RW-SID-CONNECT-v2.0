# Dataset Contoh RT/RW–SID CONNECT v1

Status: **SYNTHETIC DEMO — BUKAN DATA RESMI**
Migration: `supabase/migrations/20261009090000_synthetic_demo_dataset_v1.sql`

## Isi dataset
- 60 penduduk sintetis; identifier menggunakan prefix `DEMO-NIK-`, bukan NIK asli.
- 20 kartu keluarga sintetis; identifier menggunakan prefix `DEMO-KK-`, bukan nomor KK asli.
- 2 catatan kematian simulasi.
- 6 catatan pergerakan penduduk: pendatang, pindah masuk, pindah keluar, pindah RT, dan pindah RW.
- Wilayah fiktif: 1 desa contoh, 2 RW, 5 RT.
- Contoh permohonan layanan, dokumen, dan aktivitas untuk warga, kependudukan, kematian, pendatang/pindah, UMKM, berita desa, layanan/surat, kegiatan, kas RT/RW, GIS, bantuan sosial, keamanan, dan admin.

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
Data contoh ini adalah fondasi seed database, bukan jaminan bahwa setiap menu UI sudah membaca tabel yang sama. Menu yang masih memakai data statis atau belum terhubung ke backend perlu diintegrasikan bertahap dengan sumber data kanonik dan kontrol akses sesuai role RT, RW, Desa, Warga, dan Platform Admin.
