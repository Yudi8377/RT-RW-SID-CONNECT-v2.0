# Production Security Gate — Verification Snapshot (2026-10-24)

Project: `gzdusguveeeflmlvvmwe`  
Repository: `Yudi8377/RT-RW-SID-CONNECT-v2.0`

## Verification performed

This snapshot was produced from a fresh Supabase Security Advisor response, read-only catalog queries, and inspection of the current definitions of the application SECURITY DEFINER RPCs. It is a status record, not a claim that the production gate is cleared.

### Confirmed unresolved database findings

- PostGIS 3.3.7 is still installed in `public`.
- `public.spatial_ref_sys` still has RLS disabled.
- All three `public.st_estimatedextent` overloads are still executable by both `anon` and `authenticated` (3 of 3 each).
- Supabase Security Advisor still reports PostGIS-in-public, spatial_ref_sys RLS disabled, three anonymous SECURITY DEFINER PostGIS RPCs, and leaked-password protection disabled.
- Five tables have RLS enabled with no policies: `public.household_person_memberships`, `public.organization_devices`, `public.subscription_audit_events`, `public.subscription_billing_events`, and `village.integration_tenant_mappings`. Prior ACL verification found no direct grants to `anon` or `authenticated`; keep these server-only unless a deliberate access design says otherwise.

### Application SECURITY DEFINER RPC review

The following functions were inspected read-only: `admin_household_link_candidates`, `admin_link_person_to_household`, `admin_territory_scope_options`, `admin_unlinked_person_directory`, `regional_dashboard_summary`, `rt_household_directory`, and `rt_resident_directory`.

The inspected definitions use an empty configured search_path and perform explicit `auth.uid()` / active role assignment checks. Admin workbench functions check `PLATFORM_ADMIN`; regional and RT/RW directory functions check the requested scope and compatible role/territory type. This source inspection is positive evidence, but is **not** a substitute for signed-in/unauthorized cross-tenant runtime tests. Continue to treat the Security Advisor warnings as review items; do not blanket-revoke application RPCs without validating intended callers and front-end dependencies.

## Required actions before commercial enablement

1. **PostGIS:** submit `28_DOCUMENTATION/SUPABASE_POSTGIS_SUPPORT_REQUEST.md` through the Supabase Support channel. Request provider-supported, non-destructive relocation to `extensions`, confirmation of a supported target version, and remediation of `st_estimatedextent` exposure. No support ticket has been submitted by this automation.
2. **Auth:** enable leaked-password protection in Supabase Dashboard → Authentication → Password Security (exact labels may vary), then rerun Security Advisor. This setting was not changed by automation because the available project connector exposes no Auth security-settings write operation.
3. **Authorization E2E:** use dedicated synthetic test accounts for Platform Admin, RT Operator, RW Reviewer, Village Validator, Kecamatan, and Kabupaten/Kota regional roles. Verify allowed same-scope reads, denied wrong-scope reads, denied cross-tenant access, expired/inactive assignment rejection, and audited admin mutations. Do not assign production users automatically or infer missing territory/org scope.
4. **Spatial regression after Support remediation:** verify PostGIS extension schema/version, geometry columns and spatial indexes, dependent views/functions, row counts, and synthetic spatial queries/territory workflows.
5. Keep `commercialTrialEnabled: false` and `aiCompanionEnabled: false` until all applicable gates pass.

## Safe verification SQL

Run after provider remediation:

```sql
select e.extname, e.extversion, n.nspname as extension_schema, e.extrelocatable
from pg_extension e
join pg_namespace n on n.oid = e.extnamespace
where e.extname = 'postgis';

select p.oid::regprocedure as signature,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'st_estimatedextent';
```


## Additional live Edge Function review (2026-10-24)

A second live review retrieved the deployed source for the anonymous Edge Functions. These findings are tracked separately; public access may be a product requirement, so do not blindly turn JWT verification on.

- **`village-preview` v2** (`verify_jwt=false`): uses the service-role key to query `platform_core`, `demo_requests`, `demo_documents`, `opensid_sync_batches`, and seven `village.*` tables for counts. It returns counts and selected platform metadata. Its helper captures raw database error text, although those helper error fields are not serialized in the current final response. It handles `OPTIONS` but does not explicitly reject other methods. Tracked in [issue #178](https://github.com/Yudi8377/RT-RW-SID-CONNECT-v2.0/issues/178).
- **`public-experience` v6** (`verify_jwt=false`): uses the service-role key for public agenda, announcement, and public business actions. Returned records include free-text `notes`; published announcements include `content`; caught errors are returned to callers as error messages. The request can select an active village by caller-supplied `territory_id`, rather than enforcing an explicit public-demo allowlist. Anonymous access may be intentional, but fields and territory selection need a defined public-data contract. Tracked in [issue #179](https://github.com/Yudi8377/RT-RW-SID-CONNECT-v2.0/issues/179).
- **`economic-evidence-ingest` v2** (`verify_jwt=false`): review of deployed source found an integration-specific HMAC signature, five-minute timestamp window, body-size cap, strict payload schema, tenant mapping lookup, idempotency check, and fixed error codes. Keep this endpoint's integration-secret and signature checks covered by negative tests; JWT being disabled alone is not evidence of a vulnerability.
- The review did not modify or redeploy any production Edge Function. No service-role key value was read or exposed.

## Latest workflow and gate tracking

The user-provided GitHub Pages deploy #534, Android Test APK #254, and Supabase Local Migration Validation #52 succeeded. These are build/deployment/migration-validation evidence only and do not close authenticated authorization or data-minimization gates. Issue [#177](https://github.com/Yudi8377/RT-RW-SID-CONNECT-v2.0/issues/177) remains open for the role/scope and tenant-isolation E2E matrix. Issues [#178](https://github.com/Yudi8377/RT-RW-SID-CONNECT-v2.0/issues/178) and [#179](https://github.com/Yudi8377/RT-RW-SID-CONNECT-v2.0/issues/179) remain open for public Edge Function reviews.


## Source-of-truth gap identified (2026-10-24)

A recursive Git tree inspection of `main` did not find version-controlled paths for the live `village-preview`, `public-experience`, or `economic-evidence-ingest` functions under `supabase/functions/<slug>/index.ts`. Their deployed source can be inspected through Supabase, but repository CI cannot currently prove that reviewed source matches deployed source. Track reconciliation in [issue #180](https://github.com/Yudi8377/RT-RW-SID-CONNECT-v2.0/issues/180). Do not overwrite or redeploy production functions until source is reconciled, reviewed, and tested.

## Release decision

**NOT CLEARED for commercial production.** Frontend/CI success is not proof of authenticated backend lifecycle, tenant isolation, or database security remediation. Do not run `DROP EXTENSION postgis CASCADE`, force extension ownership changes, or apply speculative production DDL to bypass provider-managed PostGIS objects.
