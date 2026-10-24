# Formulir kontekstual dan pemetaan regulasi

## Tujuan

Setiap tindakan tambah/edit harus memilih skema berdasarkan pasangan `module:submenu`, bukan hanya kode submenu. Contohnya, `rt:complaints` tidak boleh mewarisi formulir `warga:complaints`, dan formulir regional tidak boleh mewarisi formulir RT hanya karena kode submenunya sama.

## Prioritas pemilihan skema

1. Skema formulir administrasi kependudukan yang sudah ditetapkan dan ditinjau.
2. Skema eksternal khusus untuk `module:submenu`.
3. Override khusus `module:submenu`.
4. Skema tambahan khusus RT.
5. Skema warisan hanya untuk modul RT dan portal warga yang telah memiliki definisi bidangnya.
6. Fallback kontekstual untuk modul lain: label dan opsi dibentuk dari submenu serta konteks wilayah, bukan dari formulir generik bersama.

Fallback kontekstual merupakan formulir operasional awal, **bukan pernyataan bahwa ia adalah formulir pemerintah resmi**. Formulir resmi wajib ditautkan pada dasar hukum, versi, pemilik proses, persyaratan, dan status verifikasi sebelum diaktifkan untuk layanan nyata.

## Cakupan yang ditambahkan pada tahap ini

- Identitas RT/RW: profil, pengurus, wilayah/sekretariat, kop surat, penomoran, delegasi, dan QR verifikasi.
- Kegiatan: musyawarah, presensi, notulen/berita acara.
- Pelayanan: permohonan dan pengaduan.
- Desa/Kelurahan: program pembangunan dan produk hukum.
- Kecamatan: eskalasi.
- Kabupaten/Kota: program dan indikator agregat.
- Admin: katalog formulir dan status verifikasi regulasi.

Menu lain memakai fallback berdasarkan judul submenu dan konteks modul sampai definisi prosesnya diverifikasi dan ditambahkan. Jangan menandai fallback sebagai patuh regulasi hanya karena memiliki field khusus.

## Register regulasi yang perlu diverifikasi per layanan

- Administrasi kependudukan: UU 23/2006 jo. UU 24/2013; PP 40/2019; Perpres 96/2018; Permendagri 108/2019; Permendagri 109/2019 sebagaimana diubah oleh Permendagri 6/2026.
- Sistem Informasi Desa dan administrasi desa: UU Desa beserta perubahan yang berlaku dan peraturan pelaksana/Permendesa yang relevan untuk proses tertentu.
- Produk hukum desa, musyawarah, keuangan, aset, dan pembangunan: verifikasi aturan sektoral dan peraturan daerah/desa yang berlaku; jangan menerapkan satu dasar hukum untuk semua proses.
- Pelindungan data: UU 27/2022 tentang Pelindungan Data Pribadi dan aturan pelaksana yang berlaku.

## Batasan dan kriteria rilis

- RT/RW dapat menyiapkan catatan, pengantar, dan verifikasi awal sesuai kewenangan; tidak boleh mengaku menerbitkan dokumen resmi Dukcapil.
- Kecamatan dan Kabupaten/Kota secara default memakai agregat dan data minimum yang dibutuhkan.
- Data demo harus sintetis dan tetap terisolasi dari produksi.
- Setiap formulir nyata perlu diuji create/edit/validation, akses lintas-scope ditolak, audit trail, dan hasil dokumen.
- Status kepatuhan regulasi harus eksplisit: belum diverifikasi, dalam tinjauan, terverifikasi, atau kedaluwarsa.
