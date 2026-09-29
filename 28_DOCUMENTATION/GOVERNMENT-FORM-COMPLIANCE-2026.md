# Government Form Compliance — SIM RT/RW

## Baseline
SIM RT/RW / SMART VILLAGE menggunakan formulir administrasi pemerintah sebagai canonical reference. OpenSID–Umum digunakan sebagai salah satu implementation reference, bukan sebagai ketergantungan runtime.

## KK workflow
- **F-1.02** — Formulir Pendaftaran Peristiwa Kependudukan: digunakan sebagai formulir pengajuan KK.
- **F-1.09** — Kartu Keluarga: digunakan sebagai referensi hasil pelayanan KK.
- **F-1.01** tetap tersedia untuk biodata keluarga/penduduk ketika konteksnya memang biodata, bukan menggantikan F-1.02 untuk pengajuan KK yang sudah tercakup basis data.

## Architecture
Government Form Registry
→ Contextual Digital Form
→ RT Verification
→ RW Review/Consolidation
→ Desa Review/Validation
→ Output/Mapping
→ SID / external government integration

## Current registry
F-1.01, F-1.02, F-1.03, F-1.09, F-2.01A, F-2.01B, F-2.01C.

## Governance
Setiap form harus menyimpan kode, nama, tujuan, dasar/referensi regulasi, versi, peran input/output, mapping data, dan workflow. Perubahan regulasi tidak boleh mengubah core data secara destruktif; form definition dan mapping harus versioned.

## Regulatory reference
Permendagri 109/2019 sebagaimana diubah Permendagri 6/2026. Permendagri 6/2026 mengubah/menyesuaikan formulir administrasi kependudukan dan mulai menjadi baseline terbaru untuk implementasi 2026.

## Important boundary
SIM RT/RW melakukan pengumpulan, pemeriksaan, verifikasi, review, dan mapping sesuai kewenangan. Sistem tidak menyatakan dirinya sebagai penerbit dokumen kependudukan yang merupakan kewenangan instansi berwenang.
