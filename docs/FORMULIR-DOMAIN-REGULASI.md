# Registri Formulir Domain dan Pemetaan Regulasi

Status dokumen: **rancangan implementasi untuk review hukum dan pemilik proses**. Ini bukan pendapat hukum final, bukan daftar persyaratan yang otomatis berlaku di semua daerah, dan bukan pengganti formulir resmi dari instansi yang berwenang.

## Prinsip desain wajib

1. Setiap menu/submenu harus menggunakan skema khusus sesuai objek dan prosesnya; tidak boleh jatuh ke formulir generik Nama/Scope/Status/Catatan.
2. Form harus menyatakan apakah ia merupakan **(A) formulir resmi/nasional yang dipetakan**, **(B) formulir internal/workflow RT/RW/SID**, atau **(C) formulir yang perlu konfigurasi peraturan/SOP daerah**.
3. RT/RW melakukan pendataan awal, pemeriksaan administratif atau rekomendasi sesuai kewenangan yang sah. UI tidak boleh menyatakan bahwa RT/RW menerbitkan KK, KTP-el, akta, TTE tersertifikasi, atau keputusan instansi lain.
4. Field wajib, lampiran, masa retensi, pejabat penandatangan, SLA dan tahapan approval harus dapat dikonfigurasi per kabupaten/kota/desa bila ditentukan aturan daerah atau standar pelayanan.
5. Terapkan minimisasi data, pembatasan akses berdasarkan peran dan wilayah, audit trail, serta larangan menyimpan kata sandi, token, atau data pribadi yang tidak diperlukan.
6. Data demo harus sintetis dan terpisah dari produksi. Form demo tidak boleh memicu mutasi database produksi atau mengeluarkan dokumen resmi.

## Sumber regulasi resmi yang sudah diperiksa

- [Permendagri Nomor 6 Tahun 2026 — perubahan atas Permendagri Nomor 109 Tahun 2019](https://peraturan.bpk.go.id/Details/357691/permendagri-no-6-tahun-2026-perubahan-atas-peraturan-menteri-dalam-negeri-nomor). JDIH BPK menyatakan aturan ini berlaku sejak 18 Februari 2026 dan menyesuaikan formulir/buku administrasi kependudukan.
- [Permendagri Nomor 109 Tahun 2019 — formulir dan buku administrasi kependudukan](https://peraturan.bpk.go.id/Details/138575/permendagri-no-109-tahun-2019). Gunakan bersama perubahan tahun 2026, bukan sebagai satu-satunya versi.
- [Contoh resmi formulir F-1.03 pada PPID Kemendagri](https://ppid.kemendagri.go.id/storage/dokumen/G2fNv8tqSVuXBjgR1tSZ2ieYVUPcoIXdOPESL1WP.pdf). Field yang tampak pada dokumen resmi mencakup data pemohon, alamat asal/tujuan, klasifikasi/alasan/jenis perpindahan, serta anggota keluarga yang pindah.
- [UU Nomor 27 Tahun 2022 — Pelindungan Data Pribadi](https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022-10). Dasar untuk merancang minimisasi, tujuan pemrosesan, kontrol akses, dan perlindungan data pribadi.
- [UU Nomor 25 Tahun 2009 — Pelayanan Publik](https://peraturan.bpk.go.id/Details/38748/uu-no-25-tahun-2009). Rujukan umum untuk alur, standar dan akuntabilitas pelayanan publik.
- [Permendagri Nomor 44 Tahun 2016 — Kewenangan Desa](https://peraturan.bpk.go.id/Details/215890/permendagri-no-44-tahun-2016). Rujukan kewenangan desa; produk hukum dan SOP lokal tetap perlu diperiksa sesuai daerah.

## Pemetaan tipe formulir

| Domain | Tipe formulir yang dirancang | Batas kewenangan |
|---|---|---|
| Biodata/keluarga | F-1.01 dan formulir pengajuan yang relevan sesuai versi regulasi aktif | Validasi field dan kode harus diselaraskan dengan lampiran peraturan terkini dan SOP Disdukcapil. |
| Permohonan KK/KTP-el/KIA/perubahan data | Form pengajuan yang relevan, termasuk F-1.02 jika sesuai dengan jenis permohonan dan versi yang berlaku | Form aplikasi tidak menerbitkan dokumen hasil pelayanan; dokumen resmi dikeluarkan instansi berwenang. |
| Pindah/datang | F-1.03 atau formulir pengajuan yang berlaku sesuai jenis peristiwa | Konfirmasi persyaratan, klasifikasi perpindahan, dan alur pada Disdukcapil setempat. |
| Kelahiran/kematian/peristiwa pencatatan sipil | Form pelaporan yang cocok dengan jenis peristiwa dan lampiran regulasi aktif | Jangan menganggap satu formulir generik mencakup seluruh peristiwa. RT/RW tidak menggantikan pencatatan sipil. |
| Surat RT/RW, identitas, pengurus, penomoran, kop, delegasi/stempel | Form internal yang disesuaikan dengan keputusan pengurus, tata naskah, dan aturan lokal | Tidak boleh mengklaim sebagai format nasional wajib tanpa dasar eksplisit. |
| Pelayanan, antrean, pengaduan, SLA | Form workflow/tiket dan catatan tindak lanjut | SLA adalah standar internal kecuali terhubung ke standar pelayanan resmi yang berlaku. |
| Desa/Kelurahan, Kecamatan, Kabupaten/Kota | Form agregasi, validasi, eskalasi, program dan laporan | Akses berdasarkan kewenangan dan scope; data individu tidak otomatis tersedia di tingkat yang lebih tinggi. |
| Dokumen, tanda tangan, QR dan arsip | Form registrasi, approval, metadata arsip, dan verifikasi | QR internal bukan bukti keaslian resmi dengan sendirinya. TTE tersertifikasi harus memakai penyelenggara dan proses yang berwenang. |
| GIS, Smart Village, data quality dan analitik | Form indikator, sumber data, metode, kualitas, risiko privasi dan tindakan | Hasil analitik harus menyebut sumber, periode, metode, keterbatasan dan ambang privasi. |
| Integrasi, ekspor dan pertukaran data | Form tujuan, pemilik data, dasar akses, field minimum, persetujuan, retensi dan audit | Tidak boleh mengekspor data pribadi tanpa dasar akses dan otorisasi yang sah. |
| Admin platform, tenant, peran, kebijakan, backup dan audit | Form kontrol konfigurasi dan governance | Aksi berisiko tinggi harus memerlukan otorisasi dan audit; jangan menyimpan secrets di field formulir. |

## Gate penerimaan sebelum rilis

- [ ] Semua menu yang menampilkan tombol tambah mempunyai schema terdaftar dan dapat ditelusuri ke modul/submenu.
- [ ] Tidak ada fallback generik pada kode maupun tes.
- [ ] Form administrasi kependudukan ditinjau terhadap lampiran regulasi aktif dan SOP Disdukcapil; jangan hanya mengandalkan nama kode formulir.
- [ ] Setiap form menyatakan klasifikasi: resmi/nasional, internal, atau konfigurasi daerah.
- [ ] Field wajib dan validasi diuji; tanggal, nomor identitas, angka, dan lampiran divalidasi sesuai konteks.
- [ ] Kewenangan RT/RW/Desa/Kecamatan/Kabupaten/Kota diuji; agregasi tidak membuka data pribadi tanpa otorisasi.
- [ ] Tindakan tulis, tanda tangan, ekspor, dan publikasi dilindungi approval serta audit trail.
- [ ] Uji browser mengklik tombol tambah pada seluruh submenu dan memverifikasi judul, field, pilihan, validasi, batal, dan simpan.
- [ ] Uji demo memastikan tidak ada mutasi database produksi.

## Catatan penting

Registry dalam kode adalah implementasi awal skema UI. Sebelum menyatakan **patuh regulasi**, tim harus membandingkan setiap field, kode formulir, dokumen pendukung, persyaratan, dan alur dengan teks/lampiran resmi terbaru serta peraturan kepala daerah, standar pelayanan dan SOP Disdukcapil untuk wilayah implementasi. Bila sumber resmi belum ditemukan atau berbeda antar-daerah, tandai **perlu verifikasi** alih-alih menebak.
