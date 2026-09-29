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
- [ ] `RT_VERIFY` mengubah SUBMITTED → RT_VERIFIED.
- [ ] Actor, timestamp, status, dan catatan tersimpan sebagai audit evidence.

### C. RW review
- [ ] Record yang telah diverifikasi RT masuk queue RW.
- [ ] RW hanya dapat mereview scope yang diizinkan.
- [ ] `RW_REVIEW` mengubah RT_VERIFIED → RW_REVIEW.
- [ ] `RW_APPROVE` mengubah RW_REVIEW → VILLAGE_REVIEW.
- [ ] `RW_CORRECT` mengarahkan record ke CORRECTION_REQUIRED.
- [ ] Evidence review tersimpan.

### D. Desa validation
- [ ] Record yang lolos RW masuk queue Desa.
- [ ] Validator Desa dapat memeriksa kelengkapan dan konsistensi.
- [ ] `VILLAGE_VALIDATE` mengubah VILLAGE_REVIEW → VILLAGE_VALIDATED.
- [ ] `VILLAGE_CORRECT` mengarahkan record ke CORRECTION_REQUIRED.
- [ ] Evidence validation tersimpan.

### E. F-1.09 mapping
- [ ] Tidak ada input ulang data keluarga.
- [ ] Nomor KK berasal dari hasil resmi bila sudah tersedia.
- [ ] Data kepala keluarga dan alamat berasal dari payload tervalidasi.
- [ ] Anggota keluarga berasal dari members[].
- [ ] Metadata hasil menyatakan F-1.09 sebagai result form.
- [ ] Sistem tidak mengklaim menerbitkan dokumen resmi.
- [ ] `AUTHORIZE` menghasilkan `AUTHORIZED_PROCESSING` dan menyimpan `result_form_mapping`.

## Current verification

### Source / contract
Frontend contract: PASS
JavaScript syntax: PASS
F-1.02 mapping: PASS
F-1.09 mapping: PASS

### Supabase runtime
Project: `Yudi8377's Project` (`gzdusguveeeflmlvvmwe`)
`rt-transaction`: ACTIVE, version 4, verify_jwt=true
`workflow-transition`: ACTIVE, version 2, verify_jwt=true
Deployed runtime source: retrieved and reconciled into GitHub branch.

### GitHub source reconciliation
The deployed Edge Function sources are now stored at:
- `supabase/functions/rt-transaction/index.ts`
- `supabase/functions/workflow-transition/index.ts`

Branch:
`feature/government-form-compliance-20260929`

### Actual authenticated E2E
Status: BLOCKED — test identity/role assignment is not yet present.

Current database inspection found:
- 2 Auth users exist.
- 0 active `role_assignments` currently exist.
- Pilot territories exist, including `PILOT-DESA`.
- No E2E transaction has been inserted.

The existing `bootstrap-pilot` function can assign `PILOT_VIEWER` after an authenticated session, but `PILOT_VIEWER` is intentionally not authorized for the workflow actions `RT_VERIFY`, `RW_REVIEW`, `RW_APPROVE`, `VILLAGE_VALIDATE`, or `AUTHORIZE`.

Therefore the final E2E acceptance cannot honestly be marked PASS until an authenticated test identity with the required scoped workflow roles is available.

## Security / performance observation
Supabase security advisor currently reports one warning: leaked-password protection is disabled for Auth.

Performance advisor reports existing informational findings, including unindexed foreign keys and unused indexes across the broader database. These are not being changed as part of the F-1.02/F-1.09 work.

## Exit criteria
Tahap E2E dinyatakan PASS hanya setelah satu transaksi nyata dibuktikan:
F-1.02 SUBMITTED → RT VERIFIED → RW REVIEWED → DESA VALIDATED → AUTHORIZED PROCESSING → F-1.09 mapped.

No production citizen transaction has been inserted during this verification step.
