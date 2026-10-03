# Legal & Regulatory Basis — RT/RW-SID CONNECT v2.0.1

## Status dokumen
Dokumen ini adalah **legal/compliance mapping teknis**, bukan opini hukum dan bukan pengganti penelaahan advokat/notaris/PPAT/konsultan pajak atau pejabat pemerintah yang berwenang.

## Dasar hukum utama

### 1. RT/RW dan lembaga kemasyarakatan
Peraturan Menteri Dalam Negeri Nomor 18 Tahun 2018 mengatur Lembaga Kemasyarakatan Desa dan Lembaga Adat Desa. Dalam materi yang dirujuk JDIH pemerintah, RT dan RW termasuk LKD/LKK dan memiliki fungsi pelayanan/administrasi kemasyarakatan. Implementasi teknis dapat berbeda menurut Perda/Perkada setempat.

Implikasi desain:
- aplikasi membantu administrasi dan koordinasi;
- aplikasi tidak mengangkat penyedia software menjadi pejabat pemerintahan;
- kewenangan RT/RW tetap mengikuti ketentuan daerah dan penetapan yang berlaku.

### 2. Sistem elektronik
PP Nomor 71 Tahun 2019 mengatur Penyelenggaraan Sistem dan Transaksi Elektronik.

Implikasi:
- keamanan sistem;
- tata kelola sistem elektronik;
- dokumentasi;
- keandalan;
- perlindungan informasi/dokumen elektronik;
- prosedur insiden dan pemulihan.

### 3. PSE lingkup privat
Permenkominfo Nomor 5 Tahun 2020 tentang PSE Lingkup Privat, sebagaimana diubah dengan Permenkominfo Nomor 10 Tahun 2021, perlu menjadi checklist bagi penyedia apabila konfigurasi layanan memenuhi kriteria PSE yang berlaku.

Pendaftaran/status PSE tidak boleh diasumsikan selesai hanya karena aplikasi telah dibuat. Status badan usaha, layanan online, domain, transaksi dan model pemrosesan harus diverifikasi secara aktual sebelum produksi.

### 4. Pelindungan Data Pribadi
UU Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi menjadi rujukan utama.

Desain aplikasi harus menerapkan:
- minimisasi data;
- tujuan pemrosesan yang jelas;
- kontrol akses berbasis peran dan scope;
- pencatatan audit;
- keamanan;
- backup/recovery;
- pengelolaan hak subjek data;
- prosedur insiden;
- penghapusan/retensi sesuai dasar dan kebutuhan yang sah.

Data pribadi umum/spesifik harus diperlakukan sesuai klasifikasinya.

### 5. Informasi dan Transaksi Elektronik
UU Nomor 1 Tahun 2024 adalah perubahan kedua atas UU ITE.

Aplikasi harus:
- menjaga integritas dokumen elektronik;
- menghindari penyalahgunaan akun;
- menyediakan audit trail;
- tidak membuat klaim bahwa output aplikasi otomatis merupakan keputusan pejabat pemerintah.

### 6. Perpajakan dan transaksi
UU Nomor 7 Tahun 2021 tentang Harmonisasi Peraturan Perpajakan beserta perubahannya menjadi rujukan untuk kewajiban perpajakan penyedia.

Rp250.000/bulan harus diperlakukan melalui model transaksi yang benar secara akuntansi/pajak. Status PKP/non-PKP, PPh, PPN, invoice dan bukti pembayaran harus ditentukan berdasarkan kondisi badan usaha dan ketentuan pajak yang berlaku pada saat transaksi.

## Regulasi lokal
Karena RT/RW dapat diatur lebih lanjut melalui Perda/Perkada, sebelum deployment pada wilayah tertentu wajib dibuat:
- Local Regulation Checklist;
- nama provinsi/kabupaten/kota;
- Perda/Perwali/Perbup/Perdes/ketentuan kelurahan yang berlaku;
- aturan tata naskah;
- aturan pengelolaan arsip;
- aturan tanda tangan/stempel bila output resmi digunakan.

## Posisi hukum produk
RT/RW-SID CONNECT adalah **perangkat lunak pendukung administrasi/kemasyarakatan**. Ia bukan pengganti kewenangan pemerintah, bukan sistem pemerintahan milik negara, dan bukan dasar tunggal untuk menetapkan hak/kewajiban seseorang.

## Klaim yang dilarang
Jangan menggunakan:
- “100% dijamin tidak melanggar hukum”;
- “disahkan pemerintah” tanpa bukti tertulis;
- “aplikasi resmi pemerintah” tanpa penunjukan resmi;
- “dokumen aplikasi pasti sah sebagai dokumen pemerintahan” tanpa konteks dan kewenangan.

Gunakan:
> “Dirancang dengan mengacu pada peraturan yang relevan dan harus dikonfigurasi sesuai ketentuan nasional serta regulasi daerah yang berlaku.”
