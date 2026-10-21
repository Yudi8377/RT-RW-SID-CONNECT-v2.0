# Regional Dashboard Hierarchy — RT/RW CONNECT v2.0

## Purpose

Extend the existing RT/RW–SID CONNECT application, not replace it, with dedicated workspaces for:
1. RT Digital
2. RW Digital
3. Desa/Kelurahan Digital
4. Kecamatan Digital
5. Kabupaten/Kota Digital

The application already contains the `territories` hierarchy types `PROVINCE`, `REGENCY_CITY`, `DISTRICT`, `VILLAGE`, `HAMLET`, `RW`, and `RT`. The existing role/scope model is based on `role_assignments.scope_territory_id`. This implementation adds the two regional workspace definitions and role codes as an additive first phase.

## New role codes

- `DISTRICT_COORDINATOR`: coordination, service monitoring, escalation, and reporting for an assigned district/camatan scope.
- `REGENCY_CITY_ADMIN`: regional indicators, cross-district reports, programs, infrastructure, and GPFFE analysis for an assigned regency/city scope.

The frontend role definitions only control navigation and presentation. Production authorization must always be enforced by authenticated role assignments and database RLS; selecting a role in the browser is not an authorization grant.

## Workspace menu

### Kecamatan Digital
- Ringkasan Kecamatan
- Rekap Desa/Kelurahan
- Monitoring Pelayanan
- Eskalasi & Tindak Lanjut
- Indikator Kecamatan
- Laporan Kecamatan

### Kabupaten/Kota Digital
- Ringkasan Kabupaten/Kota
- Rekap Kecamatan
- Indikator Regional
- Program & Pembangunan
- Infrastruktur & Aset Wilayah
- Pengaduan Lintas Wilayah
- Laporan Eksekutif
- Analisis Program GPFFE

These menus are the initial workspace shell. They must not display fabricated production counts or claim live aggregation until scope-aware queries and end-to-end tests are complete.

## Data-flow contract

1. Records remain owned by their source workflow and territory.
2. Every regional query must derive its permitted territory from the authenticated `role_assignments` row, never from a user-supplied territory ID alone.
3. District-level aggregation may include authorized descendant village/kelurahan scopes only.
4. Regency/city aggregation may include authorized descendant district and village/kelurahan scopes only.
5. Personal/sensitive records should be excluded from regional dashboards by default; use aggregates and minimum-necessary fields.
6. GPFFE receives only approved datasets through the existing GPFFE Data Exchange workflow. This UI change does not activate a live GPFFE connector.
7. Each export, access request, and privileged action must be audited and policy-checked.

## Rollout sequence

- Phase A (this branch): role definitions, regional workspace menus, additive role/permission migration, and documentation.
- Phase B: apply the migration through the controlled Supabase migration process; provision roles and territory-scoped assignments for authorized test accounts.
- Phase C: implement server/database-enforced descendant-scope resolution and scope-aware aggregate queries.
- Phase D: add real dashboards for service queues, regional indicators, infrastructure, and program status with explicit empty/loading/error states.
- Phase E: connect approved aggregate datasets to GPFFE, test denial cases and tenant/territory isolation, then deploy.

## Acceptance criteria before production

- A district account cannot query another district's data by changing browser state or request parameters.
- A regency/city account sees only its assigned regency/city and authorized descendants.
- A village account cannot access district/regency administrative controls.
- Regional summaries contain no synthetic values and show their source/time window.
- RLS denial tests cover direct REST requests as well as UI navigation.
- Migration is applied and verified in the target Supabase project before the release is described as live.
- GPFFE integration is reported as connected only after a real authenticated exchange and audit record are verified.

## Operational caution

The Supabase project was reported as active/healthy during the current inspection. This branch has not applied the new migration to Supabase and does not claim that regional accounts or live regional aggregates have been provisioned.