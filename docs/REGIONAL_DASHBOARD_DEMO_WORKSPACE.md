# Regional dashboard demo workspace

**Purpose:** safe, disposable UI testing of regional dashboard forms before authenticated end-to-end workflows are certified.

## Synthetic RT residents

The RT → Data Warga list includes a small local demo fixture:
- DEMO-RT-001 — Siti Rahma
- DEMO-RT-002 — Bima Pratama
- DEMO-RT-003 — Nadia Lestari
- DEMO-RT-004 — Raka Wijaya (pending verification)
- DEMO-RT-005 — Maya Anggraini

These are fictional examples. They do not contain real NIKs, phone numbers, exact home addresses, or real government identity data. Status/notes are marked as DEMO. Do not use these fixture records as official evidence or import them into a production resident registry.

## What this fixture is for

- Inspect the residents table and forms.
- Exercise the existing local workspace insert/update/delete interaction where the app is running without an authenticated operational write path.
- Validate visual states and manual QA before connecting a dedicated test account and territory.

## Important limitation

This fixture is **not** a production database seed and is not a cross-level integration test. In local/preview mode, generic workspace records are persisted in browser localStorage; they do not automatically appear in RW, Desa/Kelurahan, Kecamatan, or Kota/Kabupaten. The authenticated resident directory and canonical domain records are read through Supabase RPC/table paths, and domain rows are currently read-only in the generic table.

Do not enable public trial or label the regional workflow production-ready until the dedicated test identities, exact role-to-territory assignments, canonical write workflows, approval transitions, cross-scope denial tests, and parent-level aggregate checks have passed.

## Acceptance checklist for the full operational release

- [ ] RT can create/edit and submit a resident/household record through a server-authorized canonical workflow.
- [ ] A valid RT record is visible to its assigned RW through a server-side relationship/aggregate, without copying the canonical person record.
- [ ] RW review/return/approval transitions are persisted and audited.
- [ ] Desa/Kelurahan validates the relevant workflow and sees only its authorized descendants.
- [ ] Kecamatan and Kota/Kabupaten display server-derived aggregate indicators for authorized descendants.
- [ ] Unauthorized sibling/parent/child territory access is denied by backend tests.
- [ ] Synthetic demo data is isolated from production and can be reset reproducibly.
- [ ] Platform Admin baseline, responsive browser checks, and release gate are verified.
