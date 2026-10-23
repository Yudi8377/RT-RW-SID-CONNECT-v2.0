# Production Release Gate — RT/RW-SID CONNECT

**Last checked:** 2026-10-23  
**Current status:** Regional RPCs and trial/device backend are deployed; commercial trial remains intentionally disabled pending authenticated end-to-end verification.

## Confirmed

- GitHub Pages deployment #486 and Android Test APK #206 completed successfully on commit `9736260`.
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
- Production role assignments previously observed included Platform Admin, RT Operator, and Warga. Do not assume every region-level role has a valid live assignment.
- Current Supabase Security Advisor findings include: RLS enabled without policies on `village.integration_tenant_mappings`, `public.spatial_ref_sys` without RLS (PostGIS extension table), PostGIS `st_estimatedextent` overloads executable by anon/authenticated, other SECURITY DEFINER function grants, PostGIS installed in `public`, and leaked-password protection disabled. Each needs impact-based review; do not apply blanket revocations or RLS changes without dependency analysis.

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
