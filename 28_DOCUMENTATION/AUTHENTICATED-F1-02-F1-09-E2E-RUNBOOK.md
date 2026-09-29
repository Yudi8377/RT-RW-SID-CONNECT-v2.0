# Authenticated F-1.02 → F-1.09 E2E Runbook

## Purpose
Run one synthetic household transaction through the real authenticated boundary without inserting data directly by SQL.

## Test identities
- RT operator: `panaungan22@gmail.com`
- Global workflow authority: `dwahyudi8377@gmail.com` (`PLATFORM_ADMIN`)
- Territory: `PILOT-DESA`

Do not use real citizen data. Do not record passwords or access tokens in this repository.

## Synthetic transaction
Use clearly synthetic values:
- Applicant: `Warga E2E Synthetic 001`
- Synthetic NIK: `DEMO-E2E-001` only if the UI permits omission of NIK; do not enter a non-16-digit value because validation rejects it.
- Address: `Jl. E2E Synthetic No. 001`
- RT/RW: `001/001`
- Request: KK Baru
- Head of household: `Warga E2E Synthetic 001`
- Member: `Warga E2E Synthetic 001`

Prefer leaving NIK blank rather than entering a fake value that could resemble a real identifier.

## Execution sequence

### 1. RT authenticated session
Sign in as `panaungan22@gmail.com`.

Open RT Digital → layanan/household service and submit a new KK request using the synthetic data above.

Expected:
- Edge Function `rt-transaction` is called.
- Record status becomes `SUBMITTED`.
- Form metadata contains `F-1.02`, version `2026`, and result form `F-1.09`.
- Territory is `PILOT-DESA`.

Record the generated transaction/service-request ID.

### 2. Workflow authority session
Sign out and sign in as `dwahyudi8377@gmail.com`.

Open the workflow/administration workspace and process the same transaction:

1. `RT_VERIFY`
2. `RW_REVIEW`
3. `RW_APPROVE`
4. `VILLAGE_VALIDATE`
5. `AUTHORIZE`

Expected final status:
`AUTHORIZED_PROCESSING`

Expected result metadata:
- `result_form_code = F-1.09`
- `result_form_version = 2026`
- `result_form_mapping` populated
- no second household data entry

### 3. Acceptance verification
Verify for the same transaction:
- complete status progression is present;
- actor and timestamp evidence exists for each transition;
- audit evidence references the same transaction;
- F-1.09 mapping contains household/address/member data from the validated F-1.02 payload;
- the UI describes F-1.09 as a mapped/result form, not as an official document issued by this application.

## Pass criteria
The E2E gate is PASS only when one authenticated synthetic transaction demonstrates:

`F-1.02 SUBMITTED → RT VERIFIED → RW REVIEW → VILLAGE VALIDATED → AUTHORIZED PROCESSING → F-1.09 mapped`

## Security boundary
Do not bypass authentication with SQL, service-role credentials, browser-injected privilege flags, or manually fabricated JWTs. The objective of this test is specifically to prove the real JWT + role + territory + Edge Function + RLS boundary.

## Current state
As of 2026-09-29, infrastructure and role assignments are ready, but the authenticated browser transaction itself remains the final execution gate.
