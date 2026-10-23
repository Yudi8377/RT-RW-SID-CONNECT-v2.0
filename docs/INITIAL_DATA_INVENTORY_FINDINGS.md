# Initial Data Inventory Findings — RT/RW-SID CONNECT

**Snapshot:** read-only production schema and policy metadata reviewed on 2026-10-23.  
**Scope:** initial technical discovery, not a complete legal data inventory, not a penetration test, and not evidence of an incident. No resident row values were selected or copied.

## 1. Data classes visible in schema metadata

| Data class | Schema objects observed | Example fields | Initial sensitivity |
|---|---|---|---|
| Direct identity / contact | `public.persons`, `public.citizen_profiles`, `public.sv_master_persons`, `village.profiles` | `national_id_hash`, `national_id`, name, birth date/place, phone, email | High |
| Household and residence | `public.households`, `public.household_person_memberships`, `public.addresses`, `public.residencies`, `public.sv_master_households`, `public.sv_master_addresses` | household number/hash, head name, address, person/household relationship | High |
| Health and education | `public.rt_health_observations`, `public.rt_education_profiles` | observation notes, person ID, education status, classifications | Sensitive / high |
| Death and movement | `public.death_records`, `public.demo_residency_movements`, `village.population_events` | death date/place, family contact, movement events, payload/notes | High |
| Assistance / socioeconomic | `public.assistance_applications`, `public.assistance_verifications`, `public.social_economic_assessments`, `public.social_economic_observations` | person/household links, evidence, notes, consent status | High |
| Location and emergency | `public.citizen_location_events`, `public.sv_emergency_events`, `public.addresses`, `public.sv_master_addresses` | latitude/longitude, address, emergency contacts | High |
| Documents / attachments | `public.source_documents`, `public.death_records`, `public.rt_environment_issues`, `public.rt_infrastructure_assets`, `village.documents`, `village.legal_products` | document path, evidence path, attachment reference, document number | High if linked to a person |
| Communication / AI | `public.sv_chat_messages`, `public.sv_ai_companion_messages`, `public.community_chat_messages`, `public.ai_learning_queue` | message text/type, payload | Variable; treat as potentially sensitive |
| Audit / governance | `public.audit_logs`, `public.subscription_audit_events`, `village.audit_log`, role assignments | actor, action, scope, before/after payload, role and territory | High operational sensitivity |

The inventory is based on column-name discovery and must be completed by reviewing every table, view, RPC, storage bucket, Edge Function, log and integration.

## 2. Specific findings requiring action

### D-01 — Plaintext national identity number column
Schema metadata includes `public.sv_master_persons.national_id` with data type `text`. This confirms a plaintext NIK column exists in the schema; it does **not** establish how many records are populated or who can access them. The same schema also includes `public.persons.national_id_hash`.

Required:
- Identify all read/write paths, views, RPCs, exports, logs and backups involving this column.
- Determine whether the legacy field is still used by the app or integrations.
- Stop unnecessary exposure immediately through reviewed access policy changes if a path is confirmed.
- Design a staged migration to minimize collection and avoid returning NIK in list/search APIs; assess keyed HMAC/tokenization or encryption and key rotation with security review.
- Do not simply drop the column or switch hashing algorithms in place: that could break identity matching and may cause duplicate/incorrect resident links.

### D-02 — Deterministic unsalted hash of NIK
The current `rt-transaction` source calculates SHA-256 directly from the supplied NIK to search `persons.national_id_hash`. An unsalted deterministic hash of a low-entropy identifier can be susceptible to offline guessing and enables cross-system linkability.

Required:
- Map every writer/reader of `national_id_hash` before changing it.
- Evaluate a server-side keyed HMAC or tokenization scheme, secret rotation, dual-read migration, re-indexing and backfill.
- Keep raw NIK out of logs, analytics, audit JSON, URLs and AI prompts.
- Do not change the hash format until a migration and regression plan is approved.

### D-03 — Sensitive-domain policy overlaps
The production policy inventory shows multiple permissive policies on `public.rt_health_observations` and `public.rt_education_profiles`. One legacy `rt_scope_select` policy lists RT_OPERATOR, RW_REVIEWER, VILLAGE_VALIDATOR and PLATFORM_ADMIN, and checks an active assignment on the same territory without visibly checking assignment date window or territory type. Permissive policies combine with OR semantics; this may broaden access beyond the newer `my_context()`-based policy.

Required:
- Test effective SELECT/INSERT/UPDATE behavior under each role and mismatched territory type.
- Confirm dates, organization and territory status are checked.
- Replace overlapping policies only through a reviewed migration with negative tests and rollback plan.

### D-04 — Death record policy path requires validation
`public.death_records` has a SELECT policy named `pilot read death records` that checks an active role assignment against the household address territory but does not visibly check assignment dates or a role code. Meanwhile direct SELECT policies on `public.households` and `public.addresses` are explicit deny (`qual=false`). This may make the join-based policy ineffective under RLS; the effective behavior must be tested with real authenticated test roles and synthetic data. Do not infer exposure or availability from policy text alone.

### D-05 — Audit payload minimization
Several audit tables and `after_data` JSON fields can hold full records. Define a field allowlist for audit payloads; prefer identifiers, status transitions and hashes over duplicating NIK, address, health notes or full document contents.

## 3. Required next tests

- Verify table grants, views, RPC grants and Edge Function service-role call paths for every listed data class.
- Run role-based positive and negative tests: anonymous, Warga, RT, RW, Desa/Kelurahan, Kecamatan, Kabupaten/Kota, Platform Admin, revoked/expired assignment, wrong territory type and unrelated territory.
- Confirm that denying a direct table query does not leave a broader RPC or Edge Function route.
- Test no NIK appears in application responses, logs, AI messages, audit records or exports unless an explicitly approved purpose requires it.
- Test synthetic fixtures only; never use real resident data as test payloads or partner-demo materials.
- Record evidence with commit/function version, test identity/scope, expected/actual response and proof of no unauthorized mutation.

## 4. Release consequence

The national real-data gate remains **blocked** until D-01 through D-05 are assessed, remediation is reviewed and effective access is demonstrated through tests. These observations justify further security work; they do not establish that a breach has occurred or that all identified fields are exposed to every user.


### D-06 — Extension-managed spatial reference table is writable by API roles
A read-only ACL inspection confirmed `public.spatial_ref_sys` belongs to PostGIS, is owned by `supabase_admin`, has RLS disabled, and grants `anon` and `authenticated` all table privileges, while PUBLIC has read access. This is a stronger concern than the missing-RLS warning alone because API roles have explicit write grants on extension-managed reference metadata.

A narrowly scoped candidate migration is in [PR #144](https://github.com/Yudi8377/RT-RW-SID-CONNECT-v2.0/pull/144). It revokes only write-related privileges from `anon` and `authenticated` while preserving SELECT; it has not yet been deployed. Require disposable migration-chain tests and post-migration privilege verification before production rollout.


### D-07 — Client API roles inherit a privileged database role
Production role metadata showed `anon` and `authenticated` are members of `postgres` with `INHERIT`, `SET`, and `ADMIN` options; `postgres` has `BYPASSRLS`. This is a critical least-privilege finding. The containment migration is merged, but production execution remains blocked by grantor privileges because the available SQL connection is non-superuser `postgres` and the membership was granted by `supabase_admin`. Do not declare remediation complete until an authorized admin execution context removes the membership and effective privileges are rechecked. Details: `docs/CRITICAL_CLIENT_ROLE_MEMBERSHIP_FINDING.md`.
