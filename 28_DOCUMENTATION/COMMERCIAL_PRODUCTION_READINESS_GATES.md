# Commercial Production Readiness Gates

**Snapshot date:** 2026-10-26  
**Project:** RT/RW-SID CONNECT v2.0  
**Production Supabase project:** `gzdusguveeeflmlvvmwe`  
**Policy:** A green frontend build or GitHub Pages deployment is not evidence that authenticated production workflows are safe. Keep commercial trial and AI Companion disabled until their gates below have evidence.

## Status legend

- **PASS** — supported by current, inspectable evidence.
- **BLOCKED** — known issue remains or provider/privileged action is required.
- **NOT VERIFIED** — evidence has not yet been produced. Do not infer success.
- **REVIEW** — requires a documented owner decision or product/security review.

## Verified snapshot

| Gate | Current evidence | Status |
|---|---|---|
| Source changes for the seven-day offer | PR #188 merged to main at `62eba190c46af40854c5fa77bd1c091deae92e0b`; selected migration validation and regional dashboard quality checks passed. | PASS (source/CI only) |
| Production trial plan | Read-only query on 2026-10-26 returned active `TRIAL_7_DAY`, display name `Trial 7 Hari`, duration 7 days, interval `TRIAL`, price 0. Production migration history includes `trial_7_day_reconciliation`. | PASS (plan row only) |
| Trial RPC access | Read-only privilege check shows `anon_execute=false` and `auth_execute=false` for `public.start_organization_trial(uuid,uuid,text)`. | PASS (grant check only) |
| Production trial end-to-end | No isolated authenticated test evidence yet for trial start, expiry, duplicate/replay, device limit, and audit event. The 2026-10-26 migration `202610260001_restore_seven_day_trial.sql` is not present in the latest production migration history snapshot; do not apply it blindly or assume its function definition is live. Compare it with the already-applied reconciliation first. | NOT VERIFIED |
| PostGIS public exposure | Security Advisor at 2026-10-26 still reports ERROR `rls_disabled_in_public` for `public.spatial_ref_sys`, WARN `extension_in_public` for PostGIS, and three anonymous-executable `st_estimatedextent` SECURITY DEFINER overloads. Read-only privilege check still reports INSERT/UPDATE on `spatial_ref_sys` for both `anon` and `authenticated`. | BLOCKED |
| Leaked-password protection | Security Advisor reports Supabase Auth leaked-password protection disabled. | BLOCKED |
| SECURITY DEFINER RPC review | Advisor reports 10 authenticated-executable SECURITY DEFINER functions; each needs a reviewed caller/scope guard. Do not revoke grants in bulk because some RPCs may be required by regional workspaces. | REVIEW |
| Regional authorization / tenant isolation | Dedicated synthetic identities and complete positive/negative runtime matrix across RT, RW, Desa/Kelurahan, Kecamatan, Kabupaten/Kota, and Platform Admin have not been evidenced. Existing production assignments are not valid fixtures. | NOT VERIFIED |
| Edge Function release integrity | Canonical sources for the reviewed functions are in the repository, but full inventory/version-to-commit reconciliation and deployment provenance remain incomplete. Do not redeploy production functions from memory or an unreviewed working tree. | NOT VERIFIED |
| Backup and restore | No evidenced restore drill with measured recovery point/time and application smoke tests. | NOT VERIFIED |
| Physical-device QA | CI Android APK build and browser/mobile checks do not replace a real Android device test; no completed production-like device acceptance record is attached here. | NOT VERIFIED |
| Regional data CRUD and exports | Menu/domain-specific create/read/update/delete, print/export, role boundary and audit tests remain to be evidenced across the full menu matrix. | NOT VERIFIED |

## Hard release blockers

### 1. PostGIS and Data API exposure

Do not try to fix the extension-owned table by changing ownership, enabling RLS without a reviewed read policy, dropping/recreating PostGIS, or running `DROP ... CASCADE`. The project SQL session cannot remove the effective owner-level grants. Use the documented provider-supported procedure in [POSTGIS_SUPPORT_REMEDIATION_RUNBOOK.md](POSTGIS_SUPPORT_REMEDIATION_RUNBOOK.md) and obtain confirmation from Supabase Support/project administration.

After remediation, capture:
- `pg_extension.extnamespace` and `extversion`;
- effective `has_table_privilege` results for `anon` and `authenticated`;
- effective EXECUTE privileges for each exposed PostGIS overload;
- fresh Security Advisor output;
- synthetic geometry/SRID/map regression tests proving application columns and indexes remain usable.

### 2. Authenticated role/scope matrix

Use only dedicated synthetic test identities, organizations, territories, and records in an isolated test environment. Do not grant roles to existing production users to make tests pass.

Required negative cases: anonymous protected RPC; no assignment; inactive, future, and expired assignment; wrong territory type; sibling/unrelated tenant; invalid organization mapping; non-admin calling Platform Admin workbench; malformed/oversized request; and denied mutation leaves no row or audit side effect except a deliberate denial audit where specified.

Required positive cases: each supported regional role can perform only the operations allowed within its assigned scope. Verify parent/descendant access rules explicitly. Keep Platform Admin separate from territorial authority.

### 3. Trial and device acceptance

Against an isolated synthetic organization, prove:
1. authorized user starts exactly one seven-day trial;
2. subscription timestamps differ by exactly seven days;
3. exactly one `TRIAL_STARTED` audit event is written;
4. first device succeeds, same-device retry is idempotent, second distinct device is denied;
5. revoked device slot can be reused only according to policy;
6. duplicate trial/replay, inactive organization, suspended subscription, future/expired role assignment, and unauthorized user are denied;
7. expiry denies access and cannot be bypassed by stale frontend state;
8. all denied requests make no unauthorized mutations.

Do not run valid-HMAC or write-path integration tests against production. Use synthetic isolated fixtures and redact tokens, credentials, NIK, resident data, and secrets from evidence.

### 4. Auth, privacy, and RPC review

- Enable leaked-password protection through the supported Supabase Auth configuration path and verify the setting.
- Review every SECURITY DEFINER function reported by Advisor for explicit authentication, scope/tenant validation, safe search path, and minimal output. Revoke only after caller/dependency review and regression tests.
- Confirm public endpoints return only approved published fields, reject unsupported methods and oversized/malformed bodies, and never leak raw provider/database errors or internal notes.
- Confirm service-role credentials remain server-side and are absent from frontend bundles, logs, fixtures, docs, and Git history.
- Use synthetic data for every acceptance test; do not include real resident PII in screenshots or test artifacts.

## Required evidence bundle before release approval

Create a dated release record with:
- source commit SHA and deployment identifiers for GitHub Pages, Android artifact, database migrations, and each active Edge Function;
- workflow links and results for lint, unit/contract tests, migration validation, browser/mobile smoke, and dependency/security checks;
- redacted positive/negative test results with synthetic test IDs, expected vs. actual status, and no-mutation assertions;
- latest Security Advisor output and resolution references for every ERROR/WARN;
- successful backup restore drill, measured RPO/RTO, and post-restore smoke test;
- physical Android and desktop/mobile browser QA results;
- reviewed privacy notice, terms, data retention/deletion process, incident response, support/escalation route, operator runbook, and release rollback steps;
- explicit go/no-go sign-off by the authorized project owner for residual risks and any commercial terms.

## Release decision

**NO-GO for real-data/commercial production at this snapshot.** The public demo can be tested with synthetic data, but production trial activation, AI Companion, and real-resident-data launch remain gated until the blocking security finding and required authenticated E2E/restore evidence are resolved. This is an evidence-based status, not a claim that the app is already production-ready.

## Next actions in order

1. Submit the documented PostGIS support request and complete the provider-supported remediation.
2. Verify leaked-password protection and review SECURITY DEFINER findings.
3. Reconcile active Edge Function inventory to canonical source and deployed versions.
4. Build/run the isolated synthetic regional authorization and trial/device E2E matrix.
5. Perform backup restore and physical-device acceptance tests.
6. Publish the signed evidence bundle and make a formal go/no-go decision.
