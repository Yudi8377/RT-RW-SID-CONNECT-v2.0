# F-1.02 → F-1.09 End-to-End Acceptance Contract

## Objective
Membuktikan satu pengajuan KK Baru menggunakan F-1.02 dapat melewati workflow otoritas tanpa input ulang dan dapat dipetakan ke struktur F-1.09.

## Transaction contract
Frontend memanggil Edge Function: `rt-transaction`.

Request minimum mencakup `service_type=HOUSEHOLD`, `territory_id` dari scope RT, dan payload dengan `form_code=F-1.02`, `form_version=2026`, `result_form_code=F-1.09`, `compliance`, serta `workflow`.

Workflow contract:
- initial_status: SUBMITTED
- RT_VERIFICATION
- RW_REVIEW
- DESA_VALIDATION
- AUTHORIZED_PROCESSING
- source_form: F-1.02
- result_form: F-1.09

## Acceptance tests

### A. Input validation
- [ ] Nama pemohon wajib.
- [ ] Alamat wajib.
- [ ] RT dan RW wajib.
- [ ] Jenis permohonan KK wajib.
- [ ] NIK, bila diisi, harus 16 digit.
- [ ] Setiap anggota keluarga harus mempunyai nama.
- [ ] form_code = F-1.02.
- [ ] form_version = 2026.
- [ ] result_form_code = F-1.09.

### B. RT verification
- [ ] Transaction dibuat dengan status SUBMITTED.
- [ ] Scope territory berasal dari role_assignments.
- [ ] RT dapat memeriksa data.
- [ ] RT dapat APPROVE/REJECT/CORRECTION_REQUIRED.
- [ ] Actor, timestamp, status, dan catatan tersimpan sebagai audit evidence.

### C. RW review
- [ ] Record yang telah diverifikasi RT masuk queue RW.
- [ ] RW hanya dapat mereview scope yang diizinkan.
- [ ] RW dapat APPROVE/REJECT/CORRECTION_REQUIRED.
- [ ] Evidence review tersimpan.

### D. Desa validation
- [ ] Record yang lolos RW masuk queue Desa.
- [ ] Validator Desa dapat memeriksa kelengkapan dan konsistensi.
- [ ] Status VALIDATED/REJECTED/CORRECTION_REQUIRED tersimpan.
- [ ] Evidence validation tersimpan.

### E. F-1.09 mapping
- [ ] Tidak ada input ulang data keluarga.
- [ ] Nomor KK berasal dari hasil resmi bila sudah tersedia.
- [ ] Data kepala keluarga dan alamat berasal dari payload tervalidasi.
- [ ] Anggota keluarga berasal dari members[].
- [ ] Metadata hasil menyatakan F-1.09 sebagai result form.
- [ ] Sistem tidak mengklaim menerbitkan dokumen resmi.

## Current verification
Frontend contract: PASS
JavaScript syntax: PASS
F-1.02 mapping: PASS
F-1.09 mapping: PASS
Actual Edge Function runtime: BLOCKED FOR VERIFICATION

## Runtime blocker
Repository `Yudi8377/RT-RW-SID-CONNECT-v2.0` tidak memuat source Edge Function `rt-transaction`. Frontend memanggil function tersebut, tetapi backend function harus diverifikasi pada project Supabase yang menjadi runtime aplikasi.

Tidak ada perubahan database/production yang dilakukan pada tahap ini.

## Exit criteria
Tahap E2E dinyatakan PASS hanya setelah satu transaksi nyata dibuktikan: F-1.02 SUBMITTED → RT VERIFIED → RW REVIEWED → DESA VALIDATED → AUTHORIZED PROCESSING → F-1.09 mapped.
