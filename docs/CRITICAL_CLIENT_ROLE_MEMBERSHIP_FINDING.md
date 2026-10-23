# Critical Finding — Client API Roles Inherit the PostgreSQL Owner Role

**Observed:** read-only production metadata inspection on 2026-10-23.  
**Severity:** P0 / critical until remediated and independently verified.  
**Status:** role membership remediation applied and verified on 2026-10-23 15:08 UTC; the separate spatial_ref_sys write grants remain unresolved.

## Evidence

The production role-membership catalog reported:
- `anon` is a member of `postgres` with `INHERIT=true`, `SET=true`, and `ADMIN=true`.
- `authenticated` is a member of `postgres` with `INHERIT=true`, `SET=true`, and `ADMIN=true`.
- `postgres` has `BYPASSRLS=true` in this project, while `anon` and `authenticated` themselves are not superusers.
- `pg_has_role('anon','postgres','MEMBER'/'USAGE'/'SET')` and the corresponding authenticated checks returned true.

This means the client API roles can inherit privileges associated with `postgres` and can set that role. This can undermine RLS and least-privilege assumptions across the database. It is not evidence that an attacker exploited the configuration or that a breach occurred; logs and access paths should be reviewed after remediation.

## Immediate containment candidate

Migration `20261023143000_revoke_client_postgres_membership.sql`:
- finds any role membership granted to `anon` or `authenticated` where the granted role is superuser or has BYPASSRLS;
- revokes those memberships and fails if any remain;
- tests the same invariant using a disposable BYPASSRLS fixture role (the test runner cannot safely grant the actual `postgres` role to API roles).

The subsequent `20261023144500_restrict_spatial_ref_sys_write_grants.sql` migration removes client/public write privileges from `public.spatial_ref_sys` while retaining SELECT. Its first production attempt failed closed because the inherited role privileges remained; the transaction rolled back. Do not claim this table-grant fix is live until both migrations apply successfully and production checks pass.

## Required post-remediation verification

- [ ] `pg_has_role('anon','postgres','MEMBER') = false`
- [ ] `pg_has_role('authenticated','postgres','MEMBER') = false`
- [ ] both roles report no `USAGE` or `SET` capability on `postgres`
- [ ] `anon` and `authenticated` retain only intended table grants; RLS and API tests run as actual roles
- [ ] `spatial_ref_sys`: anon/authenticated have SELECT but no INSERT/UPDATE/DELETE/TRUNCATE
- [ ] re-run Supabase Security Advisor and privilege inventory
- [ ] inspect available audit/connection logs for suspicious role switching or unexpected data access; preserve evidence
- [ ] rotate credentials only where investigation shows exposure or policy requires it; do not rotate blindly without understanding service dependencies

## Safety

The role-membership migration was applied as production migration `revoke_client_postgres_membership` (version `20261023150838`). Follow-up checks confirm `anon` and `authenticated` have no MEMBER/USAGE/SET capability on `postgres` and no membership in any superuser/BYPASSRLS role. The spatial_ref_sys grant migration then failed its own assertion and rolled back: the current SQL connection lacks grant option to revoke direct table privileges recorded as granted by `supabase_admin`. `anon` and `authenticated` still have SELECT/INSERT/UPDATE/DELETE/TRUNCATE on `public.spatial_ref_sys`. This requires a privileged execution context and remains a critical blocker. Keep real-data national production blocked until the spatial grants and all other gates are resolved.


## Log review after containment
A read-only review of the available unified logs for the prior 24-hour window found no matching log rows containing `SET ROLE`, `BYPASSRLS`, `st_estimatedextent`, or `spatial_ref_sys` access attempts beyond the two failed migration attempts. Several `permission denied` messages for application tables were present and require correlation with expected application workflows. This limited search is **not** proof that no exploitation occurred: role switching or direct SQL activity may not be logged at a granularity sufficient to prove absence. Preserve logs and ask the platform/security operator to review broader database audit and access telemetry.
