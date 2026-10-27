# Synthetic cross-level database/security fixtures

These scripts exercise the existing `public.demo_operational_records` table against the existing DEMO hierarchy. They are intentionally separate from resident/household master data.

## Files

- `rt_rw_city_security_seed.sql` — idempotently inserts six synthetic workflow records at RT, RW, Desa/Kelurahan, Kecamatan, Kabupaten/Kota, and Provinsi. It refuses to run unless all six expected active `DEMO-*` territory nodes exist.
- `rt_rw_city_security_verify.sql` — asserts six records exist, none links to `persons` or `households`, payloads contain no common personal-data keys, RLS is enabled, no anonymous/public SELECT policy exists, and an authenticated exact-territory SELECT policy exists. It also runs an anonymous-role query that should return zero fixture rows.

## Run

1. Confirm the selected Supabase project is the intended test/demo environment.
2. Review the six `DEMO-*` territory rows before seeding.
3. Execute `rt_rw_city_security_seed.sql` in the Supabase SQL editor.
4. Execute `rt_rw_city_security_verify.sql`.
5. Confirm the final per-level output has exactly one row at each of the six levels, and the anonymous-role count is zero.
6. Re-run the seed once to verify idempotency; it must remain at six fixture rows.

## Data boundaries

- The seed only inserts into `public.demo_operational_records`.
- It does not insert or update `persons`, `households`, `addresses`, `residencies`, role assignments, or canonical service-request tables.
- Fixture rows have no `person_id` / `household_id`, use `[DATA DEMO]` titles, and set `synthetic=true`, `contains_personal_data=false`, and `public_publishable=false`.
- These fixtures are not proof that an authenticated RT/RW/Desa/Kecamatan/Kota account can perform positive and negative cross-scope operations. That requires dedicated test identities with approved role assignments and JWT-backed API tests.
- The connected database already contained 510 rows in `public.persons`; all 510 had `national_id_hash` and phone values, 450 had email values, and only 60 used an explicit `DEMO` / `TEST` marker in the hash field. The data provenance of those existing rows has not been established by this fixture task. Treat them as potentially sensitive until provenance is verified; do not copy them into these fixtures.

## Verification observed for this execution

- Six fixture records present across six distinct hierarchy levels.
- Zero fixture records linked to person/household rows.
- Zero common PII keys found in fixture payloads.
- RLS enabled on `demo_operational_records`; no anonymous/public SELECT policy.
- Running as PostgreSQL role `anon` returned zero rows from the fixture query.
- The table has an effective SELECT table grant for `anon`, but RLS currently denies visibility because no anon/public SELECT policy exists. Do not add such a policy. A later least-privilege review may assess revoking the unnecessary grant, after checking dependency and Data API behavior.
- Authenticated cross-scope positive/negative tests remain outstanding because the existing active role assignments are only at Village scope; no test assignments were created by this task.
