# Compliance Matrix & Government Response Pack

## Tujuan
Dokumen ini mempersiapkan respons apabila ada pertanyaan dari pemerintah, warga, aparat, auditor, atau pihak lain.

## Pertanyaan: “Apakah RT/RW-SID CONNECT adalah aplikasi pemerintah?”
Jawaban standar:
> Tidak. RT/RW-SID CONNECT adalah perangkat lunak pendukung administrasi dan koordinasi RT/RW yang dikembangkan sebagai produk teknologi. Aplikasi tidak mengklaim sebagai sistem resmi pemerintah kecuali terdapat penunjukan/kerja sama tertulis dari instansi terkait.

## Pertanyaan: “Apakah RT/RW boleh memakai aplikasi ini?”
Jawaban standar:
> Penggunaan aplikasi adalah keputusan organisasi/pengguna sesuai kewenangan dan ketentuan lokal yang berlaku. Aplikasi dirancang sebagai alat bantu, sementara kewenangan RT/RW, tata naskah, pelayanan, dan hubungan dengan pemerintah tetap mengikuti peraturan perundang-undangan dan aturan daerah setempat.

## Pertanyaan: “Apakah data warga dikendalikan pengembang?”
Jawaban standar:
> Tidak secara otomatis. Arsitektur membedakan data operasional RT/RW dari metadata lisensi. Akses data dibatasi berdasarkan akun, peran, wilayah/scope dan kebijakan keamanan. Penyedia hanya memproses data sesuai fungsi, konfigurasi dan dasar yang berlaku.

## Pertanyaan: “Mengapa ada Rp250.000 per bulan?”
Jawaban:
> Ini adalah model komersial/support produk. Dokumen order/terms harus menyatakan dengan jelas apakah nominal tersebut merupakan subscription/support fee atau donasi sukarela. Tidak boleh disebut donasi bila pembayarannya diwajibkan sebagai syarat layanan.

## Pertanyaan: “Mengapa aplikasi memantau sistem?”
Jawaban:
> Monitoring lisensi hanya menggunakan metadata minimum seperti Installation ID, versi, status entitlement dan waktu terakhir terhubung. Isi database warga tidak menjadi data heartbeat lisensi.

## Matriks
| Area | Kontrol |
|---|---|
| Kewenangan RT/RW | aplikasi sebagai alat bantu, bukan pejabat |
| PDP | role/scope/RLS, minimisasi, audit, retensi |
| PSE | checklist status dan kewajiban PSE |
| ITE | integritas dan audit dokumen elektronik |
| Keamanan | dependency audit, access control, backup |
| Offline | signed entitlement, local DB, recovery |
| Pembayaran | invoice/receipt, status transaksi, audit |
| Update | release notes, changelog, security patch |
| Regulasi daerah | Local Regulation Checklist wajib |

## Prosedur menghadapi keberatan
1. Minta keberatan tertulis dan dasar pasal/peraturan.
2. Catat tanggal, instansi, pejabat/pengirim dan ruang lingkup.
3. Jangan berdebat di media sosial.
4. Berikan Product Description, Data Protection Notice, Architecture Summary dan Legal Basis Matrix.
5. Minta review bagian yang dianggap bermasalah.
6. Jika menyangkut kewenangan hukum, konsultasikan penasihat hukum.
7. Jangan mengubah data warga untuk merespons tekanan eksternal.
8. Simpan seluruh komunikasi sebagai legal/audit record.
