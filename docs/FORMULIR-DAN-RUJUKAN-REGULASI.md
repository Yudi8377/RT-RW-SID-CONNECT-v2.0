# Matriks Formulir dan Rujukan Regulasi

Dokumen ini menjadi dasar desain form pada RT/RW-SID CONNECT. Registry UI berada di `form-registry.js`; setiap route menggunakan kunci `wilayah:submenu`. Formulir aplikasi adalah **form intake/workflow** dan tidak dengan sendirinya merupakan blangko resmi, surat yang sah, tanda tangan elektronik tersertifikasi, atau keputusan pejabat berwenang.

## Rujukan nasional yang dipakai

1. **Administrasi kependudukan** — UU 23/2006 sebagaimana diubah dengan UU 24/2013; PP 40/2019; Perpres 96/2018; Permendagri 108/2019; Permendagri 109/2019 sebagaimana diubah oleh **Permendagri 6/2026**. Gunakan bentuk dan persyaratan terkini dari JDIH Kemendagri/Disdukcapil; aplikasi RT/RW hanya mencatat, membantu pemeriksaan awal, atau meneruskan permohonan sesuai kewenangan.
2. **Administrasi pemerintahan desa** — Permendagri 47/2016 tentang Administrasi Pemerintahan Desa. Buku/register desa dan pelaporan perlu disesuaikan dengan ketentuan nasional serta Peraturan Bupati/Wali Kota yang berlaku.
3. **Lembaga kemasyarakatan desa dan RT/RW** — Permendagri 18/2018. Pengangkatan, masa bakti, susunan pengurus, tugas, dan mekanisme RT/RW juga harus mengikuti peraturan daerah/peraturan kepala daerah/keputusan kepala desa atau lurah yang relevan.
4. **Pelayanan publik dan informasi** — UU 25/2009; UU 14/2008; Peraturan Komisi Informasi dan ketentuan pelaksana yang berlaku, termasuk Permendagri 2/2026 tentang pengelolaan layanan informasi publik di Kemendagri, pemerintah daerah, dan pemerintah desa.
5. **Data pribadi** — UU 27/2022 tentang Pelindungan Data Pribadi dan aturan terkait. Batasi pengumpulan, akses, tampilan, ekspor, dan retensi; data kesehatan, kesejahteraan, identitas, serta lokasi rumah memerlukan kontrol akses yang lebih ketat.
6. **Tanda tangan elektronik** — UU 1/2024 (perubahan kedua UU ITE), PP 71/2019, dan ketentuan penyelenggara sertifikasi elektronik yang berlaku. Gambar tanda tangan, stempel gambar, atau QR semata bukan bukti bahwa tanda tangan elektronik tersertifikasi atau dokumen resmi telah diterbitkan.

## Prinsip pemetaan form

- Form identitas wilayah/pengurus memuat kode wilayah, masa bakti, dasar pengangkatan, penanggung jawab, dan catatan kewenangan.
- Form penduduk, KK, kelahiran, kematian, pindah/datang, domisili, dan perkawinan memakai referensi internal, daftar bukti, status pemeriksaan, dan jalur penerusan; hindari menjadikan formulir RT sebagai pengganti formulir/blangko Dukcapil.
- Form surat, verifikasi, delegasi, stempel/QR, dan TTE membedakan draf, pemeriksaan internal, penerusan, persetujuan, penandatanganan sah, dan penerbitan oleh instansi yang berwenang.
- Form kegiatan, musyawarah, kas, aset, pembangunan, pelayanan, pengaduan, keamanan, kebencanaan, GIS, integrasi, serta analitik menggunakan field yang relevan dengan prosesnya, termasuk referensi, periode, bukti, penanggung jawab, status, dan tindak lanjut.
- Dashboard kecamatan/kabupaten/kota mengutamakan data agregat dan metadata sumber; data pribadi individu tidak boleh dibuka lintas wilayah hanya karena dapat diagregasi.
- Field khusus daerah (kode surat, persyaratan layanan, masa bakti RT/RW, standar waktu, dan nomenklatur dokumen) harus dikonfigurasi berdasarkan regulasi daerah yang benar, bukan diasumsikan seragam secara nasional.

## Sumber hukum resmi untuk penelaahan

- JDIH BPK — Permendagri 6/2026: https://peraturan.bpk.go.id/Details/357691/permendagri-no-6-tahun-2026-perubahan-atas-peraturan-menteri-dalam-negeri-nomor
- JDIH BPK — Permendagri 18/2018: https://peraturan.bpk.go.id/Details/143587/permendagri-no-18-tahun-2018
- JDIH BPK — Permendagri 109/2019: https://peraturan.bpk.go.id/Read/129842/Permendagri%20109%20Tahun%202019.pdf
- Portal Kemendagri — Permendagri 47/2016: https://pamongdesa.kemendagri.go.id/regulation/detail/01j1bkabdhk0x1cp7zc48sdf33
- JDIH DPR RI — UU 23/2006 Administrasi Kependudukan: https://jdih.dpr.go.id/setjen/detail-dokumen/tipe/uu/id/79

## Catatan sebelum produksi

Ini adalah baseline nasional untuk desain dan demo. Sebelum dipakai untuk penerbitan/pelayanan resmi, lakukan pemetaan regulasi daerah berdasarkan kabupaten/kota sasaran, review pejabat/ahli hukum administrasi, validasi blangko terkini dari Disdukcapil, uji hak akses per wilayah, dan persetujuan tata kelola data. Jangan gunakan data demo sebagai data penduduk riil.
