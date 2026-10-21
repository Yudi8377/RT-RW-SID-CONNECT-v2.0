# Community Support & Activation — RT/RW-SID CONNECT v2.0.1

## Kebijakan produk
Community ditujukan kepada **unit RT/RW**, bukan kepada Desa sebagai pelanggan utama.

Harga dukungan yang direncanakan: **Rp250.000 per bulan per unit RT/RW**.

Dokumen komersial harus menyebut secara tegas apakah Rp250.000 merupakan:
1. donasi sukarela; atau
2. biaya berlangganan/support yang menjadi syarat layanan.

Untuk implementasi produksi, istilah **subscription/support fee** lebih tepat bila pembayaran memengaruhi entitlement. Jangan menggunakan istilah “donasi” bila secara kontraktual pembayaran tersebut wajib.

## Model kontrol
Setiap unit memiliki:
- Organization ID RT/RW
- License ID
- Installation ID
- Edition
- Entitlement
- status pembayaran/support
- status aktivasi
- audit history

Identitas sistem tidak sama dengan identitas warga.

## Alur
RT/RW → registrasi → verifikasi organisasi → license/entitlement → aktivasi Windows → signed entitlement → penggunaan offline/online.

Pro/Enterprise tidak boleh dibuka dengan kode statis di client.

## Pengingat
Control Center dapat menjadwalkan pengingat H-7, H-3, H-1 dan jatuh tempo. Untuk periode lewat jatuh tempo, gunakan grace period dan jangan menghapus/mengunci data warga secara destruktif.

## Pembaruan
Dukungan bulanan harus dikaitkan dengan siklus:
- security patch;
- bug fix;
- compatibility update;
- dokumentasi;
- release notes;
- backup/recovery guidance.

Pembayaran tidak boleh dijadikan alasan untuk menghapus data lokal.

## Prinsip
- RT/RW tetap pemilik/pengendali data yang mereka masukkan sesuai peran hukum dan kontrak.
- Penyedia aplikasi tidak boleh mengklaim data warga sebagai miliknya.
- Monitoring lisensi hanya mengumpulkan metadata minimum yang diperlukan.
- Tidak mengirim isi database warga melalui heartbeat lisensi.
