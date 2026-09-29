# Government Form Compliance — SIM RT/RW

## Baseline
SIM RT/RW / SMART VILLAGE menggunakan formulir administrasi pemerintah sebagai canonical reference. OpenSID–Umum digunakan sebagai implementation reference, bukan ketergantungan runtime.

## Regulatory baseline 2026
Permendagri 6 Tahun 2026 merupakan perubahan atas Permendagri 109 Tahun 2019 tentang Formulir dan Buku yang Digunakan Dalam Administrasi Kependudukan. Perubahan ini menyesuaikan formulir pengajuan pelayanan, termasuk F-1.02 sebagai Formulir Pendaftaran Peristiwa Kependudukan.

## KK workflow
- F-1.02 — formulir pengajuan pelayanan Pendaftaran Peristiwa Kependudukan.
- F-1.09 — Kartu Keluarga sebagai hasil pelayanan pendaftaran penduduk.
- F-1.01 — biodata keluarga; dipakai sebagai sumber data anggota keluarga/biodata, bukan pengganti F-1.02 untuk pengajuan layanan KK.
- SIM RT/RW tidak menerbitkan F-1.09 sebagai dokumen negara; sistem hanya menyiapkan/memetakan data hasil verifikasi untuk proses instansi berwenang.

## F-1.02 field mapping implemented
| Form government | SIM RT/RW field | Actor | Validation / role |
|---|---|---|---|
| I.1 Nama Lengkap | applicant_name | Pemohon | Wajib; identitas |
| I.2 NIK | applicant_nik | Pemohon | Kondisional; 16 digit bila tersedia |
| I.3 Nomor KK | household_number | Pemohon/RT | Kondisional; tidak boleh direka |
| II.I Kartu Keluarga | request_kk | Pemohon | Pilihan jenis KK |
| II.II KTP-el | request_ktp | Pemohon | Pilihan jenis KTP-el |
| II.III KIA | request_kia | Pemohon | Pilihan jenis KIA |
| II.IV Perubahan Data | request_change | Pemohon | KK/KTP-el/KIA |
| III Persyaratan | attach_* | Pemohon/RT | Checklist + metadata dokumen |
| Tanggal pengajuan | submission_date | Pemohon/RT | Tanggal valid |
| Petugas | officer_name | RT | Metadata workflow |
| Pemohon/signature | applicant_signature | Pemohon | Metadata signature/TTE; tidak membuat tanda tangan palsu |

## Data pendukung Smart Village
Data alamat, RT/RW, desa, kecamatan, kabupaten/kota, provinsi, kepala keluarga, alasan pengajuan, dan anggota keluarga disimpan sebagai data pendukung terstruktur. Data anggota mengikuti struktur biodata F-1.01 agar dapat dipakai ulang untuk pemetaan F-1.09 dan layanan lain.

## F-1.09 output mapping
F-1.09 diperlakukan sebagai output mapping. Field utama:
- nomor KK;
- nama kepala keluarga;
- alamat;
- RT/RW;
- kode pos;
- desa/kelurahan;
- kecamatan;
- kabupaten/kota;
- provinsi;
- daftar anggota keluarga;
- metadata tanda tangan/otoritas bila hasil resmi tersedia.

Layout preview aplikasi mengikuti struktur utama F-1.09: header identitas keluarga, tabel anggota, bagian lanjutan data keluarga, dan area otoritas/tanda tangan. Preview bukan pengganti blanko/dokumen resmi.

## Workflow authority
Pemohon/data entry → RT Verification → RW Review/Consolidation → Desa Review/Validation → proses instansi berwenang → hasil F-1.09 / dokumen resmi → mapping SID bila memenuhi syarat.

## Government Form Registry
Initial registry:
- F-1.01 — Formulir Biodata Keluarga
- F-1.02 — Formulir Pendaftaran Peristiwa Kependudukan
- F-1.03 — Formulir Pendaftaran Perpindahan Penduduk
- F-1.09 — Kartu Keluarga
- F-2.01A — Pelaporan Kelahiran/Lahir Mati/Kematian
- F-2.01B — Pelaporan Perkawinan/Pembatalan Perkawinan
- F-2.01C — Pelaporan Perceraian/Pembatalan Perceraian

## Versioning & governance
Setiap form definition wajib menyimpan kode, nama, tujuan, dasar/referensi regulasi, versi, peran input/output, field mapping, aktor pengisi/verifikator, aturan validasi, workflow, dan status perubahan.

Perubahan regulasi tidak boleh mengubah data inti secara destruktif. Form definition, mapping, dan renderer harus dapat hidup berdampingan antar-versi.

## Validation status
- Registry: IMPLEMENTED
- F-1.02 input structure: IMPLEMENTED
- F-1.02 field mapping: IMPLEMENTED
- F-1.09 output mapping: IMPLEMENTED
- Official layout preview: IMPLEMENTED (reference preview)
- RT/RW/Desa workflow integration: wired to existing transaction/workflow path; end-to-end runtime test remains required
- Production/main merge: NOT PERFORMED; branch/PR remains isolated

## Boundary
SIM RT/RW mengumpulkan, memeriksa, memverifikasi, mereview, dan memetakan data sesuai kewenangan. Sistem tidak mengklaim sebagai penerbit dokumen kependudukan yang menjadi kewenangan instansi pemerintah yang berwenang.
