# Production Release Gate — RT/RW-SID CONNECT

**Last checked:** 2026-10-23  
**Current status (2026-10-23):** Regional RPCs and trial/device backend are deployed; regional dashboard preview UI is live on GitHub Pages. Commercial trial remains intentionally disabled pending authenticated end-to-end verification.

## Confirmed

- GitHub Pages deployment #489 completed successfully on commit `a6e0f8f4c7c693681a7d93b5c60360cd31aef2c5`; the Android Test APK #209 workflow is still running at the time of this check.
- Disposable Supabase migration-chain validation and the relevant regional/trial CI checks passed before rollout.
- The production database accepted the following reviewed additive migrations in order:
  - `regional_dashboard_roles` (production migration version `20261023075802`)
  - `regional_dashboard_summary_rpc` (`20261023075806`)
  - `server_authoritative_entitlements` (`20261023075811`)
  - `device_entitlement_enforcement` (`20261023075816`)
  - `scoped_resident_directory` (`20261023075820`)
  - `household_membership_admin_workbench` (`20261023075825`)
- Production now has RLS-enabled tables `subscription_plans`, `organization_subscriptions`, `subscription_billing_events`, `subscription_audit_events`, `organization_devices`, and `household_person_memberships`.
- Edge Functions `start-trial` and `register-device` are active at version 1 with JWT verification enabled.
- `verifyDeviceEntitlements()` fails closed when commercial enforcement is enabled and no valid subscription/device entitlement is found.
- Frontend flags remain disabled: `commercialTrialEnabled: false`, `aiCompanionEnabled: false`. This is intentional until the live trial path and role scopes are verified.
- The production database was already populated before rollout; the changes above were additive and did not intentionally delete or auto-link existing resident records.
- Legacy entitlement tables `sv_service_plans` and `sv_account_entitlements` still exist. The new organization subscription system is additive; no automatic conversion from legacy user-level entitlements has been performed.
- Read-only production verification shows active assignments only for Platform Admin, RT Operator, and Warga. The RT Operator points to a VILLAGE territory and has no `organization_id`; RW, Desa/Kelurahan, Kecamatan, and Kabupaten/Kota have no active assignments. No automatic role grants were made.
- Current Supabase Security Advisor findings include: RLS enabled without policies on `village.integration_tenant_mappings`, `public.spatial_ref_sys` without RLS (PostGIS extension table), PostGIS `st_estimatedextent` overloads executable by anon/authenticated, other SECURITY DEFINER function grants, PostGIS installed in `public`, and leaked-password protection disabled. Each needs impact-based review; do not apply blanket revocations or RLS changes without dependency analysis.

## Read-only audit procedure

- Run [`supabase/tests/regional-release-readonly-audit.sql`](../supabase/tests/regional-release-readonly-audit.sql) in the Supabase SQL Editor using an authorized audit connection before rollout.
- The script is SELECT-only: it summarizes active role/territory mappings, reports relevant RPC execute grants, checks RLS/policy counts for subscription/device tables, and confirms expected role codes. It does not mutate production state.
- Treat `SECURITY DEFINER`/`authenticated` grants as a review signal, not an automatic reason to revoke access. Verify each function body and intended caller before changing grants.
- The most recent read-only check confirms the current production scope mismatch remains unresolved; the script is evidence collection, not a repair mechanism.

## Remaining release blockers

1. **Authenticated end-to-end test:** verify organization assignment → Trial 7 Hari → one device registered → subscription active → expiry/denial → audit event. The functions are deployed, but this complete live flow has not yet been verified.
2. **Regional role and scope test:** verify RT, RW, Desa/Kelurahan, Kecamatan, and Kabupaten/Kota with dedicated test accounts and test scopes. Preserve Platform Admin; do not automatically grant new roles to real users.
3. **Entitlement model reconciliation:** decide how existing `sv_account_entitlements` should coexist with or migrate to `organization_subscriptions`; do not silently treat the two systems as interchangeable.
4. **Security Advisor triage:** review the current findings individually and confirm least-privilege after the regional RPC and resident-directory grants.
5. **Trial activation:** only enable `commercialTrialEnabled` after the authenticated end-to-end tests pass. Keep `aiCompanionEnabled` off until live authorization and response tests pass.
6. **Final release verification:** re-run browser/mobile checks and verify the published site after any frontend change.

## Safe operating rules

- GitHub Pages success and successful backend migration are not, by themselves, proof of commercial readiness.
- No resident records were automatically linked to households; existing relationships must be verified before being recorded.
- Paid plans remain inactive. Payment activation must come from a trusted provider webhook or approved server-side workflow, never from a browser request.
- The current intended self-serve offer is Trial 7 Hari for one device. Keep it hidden/disabled until the live flow is verified.

## Deployment update — 2026-10-23 (PR #128)

- PR #128 merged: request-body limits added to `start-trial` and `register-device` (64 KiB declared and actual UTF-8 body checks; oversized bodies return 413).
- Supabase production deployment verified after merge: `start-trial` ACTIVE version 2, `register-device` ACTIVE version 2; both retain `verify_jwt=true`.
- Deployed entrypoint imports were checked against the Supabase flat Edge Function file layout; deployed source was read back and confirmed to contain both the declared-length and actual-body checks.
- This was a function-only deployment. No database schema, RLS/policies, role assignments, subscription records, or frontend feature flags were changed.
- This verification confirms deployment and source contents, **not** the authenticated trial/device end-to-end path. The commercial trial and AI Companion frontend flags remain disabled pending dedicated authenticated test accounts and recorded E2E evidence.


## Finalization checklist — regional authorization and commercial launch

This checklist is intentionally fail-closed. A checked item requires recorded test evidence, not a source-code inspection alone.

### Authorization matrix
- [ ] Create dedicated non-production test identities for RT operator, RW reviewer, village validator, district coordinator, regency/city administrator, and platform administrator.
- [ ] Assign each identity only to an active territory of the matching type. Do not reuse the current mis-scoped production assignments as evidence.
- [ ] Verify each role can read only its assigned scope and permitted descendants; attempts to submit a sibling, parent, unrelated, inactive, future-dated, or expired scope must be denied.
- [ ] Verify Platform Admin administration is separate from regional data authority and that the UI does not grant authority merely because a preview role was selected.
- [ ] Test HEALTH and EDUCATION restricted domains with a valid role, a mismatched role on the same territory, and a user with no scoped role.
- [ ] Confirm the resident and household directory RPCs validate `auth.uid()`, assignment dates, requested territory scope, selected columns, pagination bounds, and relevant data sensitivity. Confirm no anonymous execution grant.

### Regional dashboard data correctness
- [ ] Seed synthetic records in a disposable test environment, not the production resident directory.
- [ ] Exercise create, edit, validation, approval, rejection, and cross-scope denial for supported RT workflows.
- [ ] Reconcile each parent-level aggregate against child-level source rows and test zero-row and mixed-status cases.
- [ ] Parent dashboards aggregate canonical records; they must not create duplicate resident/household copies.
- [ ] Ensure higher-level views expose only aggregated or explicitly authorized fields by default.

### Edge Function release procedure
- [ ] Run the latest `rt-transaction` code against disposable test data with valid scope, wrong scope type, invalid/inactive territory, future/expired assignment, mismatched role, restricted domain, malformed JSON, and request bodies exceeding 64 KiB.
- [ ] Confirm expected HTTP status codes and audit events; verify denied operations do not mutate records.
- [ ] Review the currently deployed function source/version and diff it against the reviewed main-branch source before deployment.
- [ ] Deploy only after the authorization matrix passes; immediately read back the deployed version/source and run authenticated smoke tests.
- [ ] Verify production logs and audit records show no unexpected denial spike or cross-scope access after deployment. Roll back if the tested release gates regress.

### Trial and commercial controls
- [ ] With a dedicated test organization and authenticated account, verify Trial 7 Hari → one device registration → active entitlement → second-device denial → expiry/denial → audit trail.
- [ ] Confirm paid entitlement cannot be activated by browser-side input and requires a trusted payment webhook or approved server-side process.
- [ ] Keep `commercialTrialEnabled` false until the entire trial/device path is verified.
- [ ] Keep `aiCompanionEnabled` false until live identity, scope authorization, sensitive-domain policy, and response tests pass.
- [ ] Re-run browser/mobile smoke tests, verify GitHub Pages deployment and responsive navigation, and record the tested commit SHA.

### Current decision
The repository contains the hardening from PRs #132–#134, but production `rt-transaction` was last verified as version 5 and does not yet contain that hardening. Active production assignments observed in the read-only audit include `RT_OPERATOR` and `PLATFORM_ADMIN` scoped to a VILLAGE territory. These assignments must be corrected through an authorized, identity-verified administrative workflow before a strict production rollout. No role grants, production data changes, or trial feature activation are authorized by this checklist alone.

**Release status: NOT CLEARED FOR COMMERCIAL LAUNCH** until every required gate above has evidence attached.
