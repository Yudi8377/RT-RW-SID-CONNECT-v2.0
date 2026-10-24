# PostGIS Production Remediation Status — 2026-10-24

Project ref: `gzdusguveeeflmlvvmwe`

## Current state

- PostGIS 3.3.7 remains installed in `public`; `extrelocatable=false`.
- `public.spatial_ref_sys` still has RLS disabled.
- Read-only ACL verification shows `anon` and `authenticated` can SELECT from `public.spatial_ref_sys`.
- The three `public.st_estimatedextent` overloads remain executable by `anon`, `authenticated`, and `service_role`.
- Supabase Security Advisor still reports the PostGIS-in-public, RLS-disabled spatial_ref_sys, and SECURITY DEFINER function findings.
- The migration tracker records `20261024150444 / restrict_public_st_estimatedextent_execute` as successful, but subsequent inspection of `pg_proc.proacl` and `has_function_privilege` shows that the expected revocations did **not** take effect. Treat this as an ineffective change, not a remediation. Do not repeat the same grant statements blindly.

## Safety decision

Do not run `DROP EXTENSION postgis CASCADE`, change extension ownership, force relocation, or disable spatial functionality in production. These could break application geometry columns and dependent objects.

## Next actions

1. Submit the support request in [SUPABASE_POSTGIS_SUPPORT_REQUEST.md](./SUPABASE_POSTGIS_SUPPORT_REQUEST.md) through the Supabase Support channel. The request has not been submitted by this automation.
2. Ask Supabase Support to execute the provider-supported non-destructive relocation of PostGIS to `extensions`, advise on the correct target version, and address `st_estimatedextent` privileges.
3. After provider remediation, verify extension schema/version, effective grants, geometry row counts, spatial indexes and dependent objects, and run synthetic spatial smoke tests.
4. Enable leaked-password protection through the supported Supabase Auth project settings.
5. Keep `commercialTrialEnabled` and `aiCompanionEnabled` disabled until authorization, tenant-isolation, and relevant E2E checks pass.

## Verification queries used

```sql
select e.extname, e.extversion, n.nspname as extension_schema, e.extrelocatable
from pg_extension e
join pg_namespace n on n.oid = e.extnamespace
where e.extname = 'postgis';

select p.oid::regprocedure as signature, p.proacl,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'st_estimatedextent';
```
