# Matriks Workspace Admin RT/RW–SID CONNECT

## Keputusan arsitektur

Admin Utama / Platform Admin dipertahankan sebagai role terpisah. Dashboard tingkat wilayah bukan pengganti Admin Utama dan bukan sekadar label berbeda pada satu halaman. Setiap tingkat memiliki landing dashboard, navigasi, tugas, agregasi data, serta batas akses yang sesuai dengan role assignment aktif.

## Peran dan workspace

| Role | Workspace | Tanggung jawab utama | Batas data |
|---|---|---|---|
| `PLATFORM_ADMIN` | Admin Utama / Control Center | Tenant, struktur wilayah, akun, role/permission, keamanan, audit, kesehatan sistem, langganan platform | Akses administratif lintas tenant hanya melalui kebijakan platform yang eksplisit dan tercatat; bukan bypass diam-diam terhadap RLS |
| `RT_OPERATOR` | Admin RT | Data warga dan KK dalam scope RT, surat pengantar, kegiatan, pengaduan, iuran/kas bila modul tersedia, laporan RT | Hanya wilayah RT pada penugasan aktif |
| `RW_REVIEWER` | Admin RW | Review pengajuan RT, konsolidasi, koreksi, eskalasi dan laporan RW | RT yang berada di bawah RW pada penugasan aktif |
| `VILLAGE_VALIDATOR` | Admin Desa/Kelurahan | Validasi, layanan desa/kelurahan, dokumen, kualitas data dan laporan gabungan | Desa/kelurahan beserta wilayah turunannya yang ditugaskan |
| `DISTRICT_COORDINATOR` | Admin Kecamatan | Monitoring agregat lintas desa/kelurahan, eskalasi, indikator dan laporan kecamatan | Kecamatan dan data turunan sesuai permission; data individu diminimalkan |
| `REGENCY_CITY_ADMIN` | Admin Kota/Kabupaten | Dashboard eksekutif, perbandingan indikator agregat, program dan laporan lintas kecamatan | Kota/kabupaten dan agregat wilayah turunannya; data individu tidak otomatis dibuka |
| `OPEN_SID_UMUM` | SID Publik | Informasi publik dan fitur yang secara eksplisit dipublikasikan | Tidak ada akses operasional ke data pribadi warga |

## Perilaku UI

- Admin Utama tetap menjadi pintu masuk platform dan mempertahankan modul governance yang sudah ada.
- Setiap role wilayah mendapat dashboard khusus. Sidebar hanya menampilkan modul yang diizinkan oleh role.
- Preview dashboard hanya untuk desain/pengujian dan tidak boleh meniru autentikasi, membuat assignment, atau mengakses data produksi.
- Penggantian role operasional hanya boleh melalui assignment resmi yang diverifikasi server. Admin tidak boleh mengubah role dengan nilai dari browser/local storage.
- Label Kota/Kabupaten digabung pada satu workspace eksekutif; bila kebijakan daerah memerlukan perbedaan, nama dan scope wilayah ditentukan dari master wilayah.

## Prinsip keamanan dan integritas data

1. Role saja tidak cukup: setiap query memerlukan scope wilayah aktif dan validasi otorisasi backend.
2. RLS harus membatasi data; menyembunyikan menu di frontend bukan kontrol keamanan.
3. Data lintas wilayah di tingkat kecamatan/kota ditampilkan sebagai agregat secara default.
4. Jangan membuat pemetaan warga-ke-KK secara tebakan. Relasi yang belum diverifikasi harus tetap kosong sampai ada alur linking yang sah dan diaudit.
5. Perubahan role, scope, persetujuan, ekspor, dan tindakan terhadap data sensitif harus masuk audit trail.
6. Dashboard menandai data simulasi dengan jelas dan tidak menampilkan angka demo seolah-olah metrik produksi.

## Urutan implementasi dan gerbang rilis

- [ ] Pertahankan Admin Utama dan uji semua modul governance yang ada.
- [ ] Validasi landing dashboard dan sidebar khusus RT, RW, Desa/Kelurahan, Kecamatan, Kota/Kabupaten.
- [ ] Verifikasi scope dan RLS lintas dua wilayah berbeda untuk setiap role.
- [ ] Uji eskalasi RT → RW → Desa/Kelurahan → Kecamatan → Kota/Kabupaten tanpa memberi akses berlebih.
- [ ] Jalankan CI terbaru pada commit yang benar-benar diuji.
- [ ] Verifikasi preview publik dan backend sebelum menyatakan fitur live.
- [ ] Jangan menerapkan migrasi produksi sampai akses Supabase terverifikasi, migrasi direkonsiliasi, dan pengujian runtime lulus.

## Status yang diketahui saat dokumen dibuat

Role dan sejumlah dashboard wilayah telah ada di aplikasi. PR #102 menambahkan pembatasan direktori warga dan masih harus lolos pengujian baru; karena itu, dokumen ini tidak menyatakan bahwa pemisahan akses produksi atau keseluruhan platform sudah selesai.