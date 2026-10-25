# Commercial Launch Readiness — RT/RW-SID CONNECT

Date: 2026-10-25  
Status: **NOT CLEARED FOR COMMERCIAL PRODUCTION**  
Production project: `gzdusguveeeflmlvvmwe` (read-only review only)

This checklist is a release control, not a claim that the listed checks have passed. Keep trial, AI companion, billing, and other paid-activation flags disabled until the applicable gates have evidence attached.

## 1. Current verified evidence

- PR #181 reconciled checked-in sources for the 19 active Edge Functions and added source-integrity quality checks.
- PR #182 makes the checked-in `village-preview` endpoint fail closed and adds non-mutating rejection-contract smoke tests.
- The current PR #182 head has successful **static CI** for Edge Function Source Integrity and Edge Contract Smoke Quality.
- These CI checks do not prove deployed runtime behavior, authenticated role authorization, tenant isolation, or production deployment state.
- Connected Supabase account exposed only the production project and no branches at the time of review. No runtime smoke tests have been sent to production.
- Production `village-preview` was observed as version 2 with `verify_jwt=false` and service-role-backed global aggregate access. The PR change is not deployed, so this finding remains open until a controlled release is verified.
- `public-experience` is an anonymous service-role-backed demo endpoint. Public access may be intentional; it needs fixture-backed field minimization and publication-control verification before release.

## 2. Mandatory release gates

| Gate | Required evidence | Current disposition |
|---|---|---|
| Edge source/deployment parity | For every active function: deployed version, source SHA/digest, JWT setting, and release commit recorded and reconciled | Open |
| Public preview exposure | Confirm all consumers of `village-preview`; approve compatibility behavior; deploy fail-closed change or a reviewed, explicitly scoped public contract | Open |
| Public experience data minimization | Fixture-backed tests prove only approved public fields are returned; unpublished/cancelled/foreign-territory/private records never appear | Open |
| Regional authorization | Full positive/negative matrix for RT, RW, Desa/Kelurahan, Kecamatan, Kabupaten/Kota, and Platform Admin; no cross-scope read or mutation | Open |
| Household relationship mutation | Validate scope, relationship, household-head flags, verification notes, and audit event for allowed and denied paths | Open |
| Trial and device limits | Authenticated scope, duplicate-trial prevention, plan/device limits, replay/tenant isolation, and audit events verified | Open |
| Database and RLS | Review grants and policies for all tenant tables; prove deny-by-default behavior; no blanket policy/grant changes | Open |
| Supabase Auth hardening | Enable leaked-password protection after user-impact review and validate sign-in/reset flows | Open |
| Provider-managed PostGIS findings | Obtain Supabase-supported remediation for `spatial_ref_sys`, extension placement, and `st_estimatedextent` grants; do not blindly modify extension objects | Open |
| Billing/legal/commercial | Subscription terms, privacy notice, retention/deletion, incident process, pricing, support channel, refund/cancellation and tax/accounting process reviewed | Open |
| Recovery/operations | Backup and restore rehearsal, alerting, logs, rollback instructions, owner/on-call, incident drill, and production smoke checks | Open |
| Public UX and accessibility | Mobile/browser checks, error/empty/loading states, Indonesian copy, keyboard access, no demo credentials/secrets in client bundle | Open |

## 3. Regional authorization test matrix

Run against an isolated staging project with synthetic fixtures only. Record test run URL, fixture IDs, actor role, assigned territory, expected result, actual result, and post-test audit/database verification.

1. Anonymous caller is denied for every protected RPC and protected Edge Function.
2. Authenticated user with no active territory assignment is denied.
3. Expired, revoked, or inactive assignment is denied.
4. RT Operator can access only the assigned RT.
5. RW Reviewer can access only the assigned RW and explicitly permitted descendants.
6. Village Validator can access only the assigned village.
7. Kecamatan and Kabupaten/Kota roles can access only their assigned scope and approved descendants.
8. Two users with the same role but different tenant assignments cannot read or mutate each other's data.
9. Platform Admin-only workbench functions reject every non-admin role.
10. Household membership create/update/delete rejects out-of-scope households, invalid relationships, invalid household-head transitions, and missing verification/audit metadata.
11. Trial activation rejects duplicate trial claims and enforces expiry and device limits under concurrent requests.
12. Device registration/revocation rejects cross-tenant device IDs and records an audit event.
13. Verify denied mutations left no partial writes; verify allowed mutations created the expected audit records.
14. Remove synthetic fixtures or record exactly why retained staging fixtures are safe and isolated.

**Pass criteria:** all negative cases denied, all positive cases limited to the assigned scope, no cross-scope leakage, expected audit trail present, and no unexplained data mutation.

## 4. Safe execution protocol

1. Provision/identify a dedicated staging Supabase project; confirm its ref is not `gzdusguveeeflmlvvmwe`.
2. Apply reviewed migrations and deploy the exact candidate Edge Function sources to staging.
3. Run `scripts/test-edge-contracts.mjs` with staging-only environment variables.
4. Run the full regional authorization and public-output fixture suite.
5. Verify database rows and audit events after tests.
6. Resolve every failure and rerun all required checks.
7. Review `public-experience` consumers and approve its public data contract before changing or disabling its behavior.
8. Only after evidence is reviewed, merge the candidate, deploy to production in a controlled window, and verify deployed function versions/settings and read-only smoke checks.
9. Enable commercial flags separately, starting with a limited pilot and a documented rollback trigger.

## 5. Explicit stop conditions

Do not mark the product commercially live if any of these are true:

- Runtime authorization tests have not run in isolated staging.
- The source-to-deployment mapping for any active function is unknown.
- Public endpoints return data without a reviewed allowlist/field contract.
- Any role can cross tenant or territory boundaries.
- Feature flags are enabled without their acceptance tests.
- Backups, rollback, incident ownership, or customer-facing terms are missing.

A green GitHub workflow is necessary but not sufficient for production readiness.
