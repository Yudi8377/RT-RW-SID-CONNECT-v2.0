# Critical Finding — Client API Roles Inherit the PostgreSQL Owner Role

**Observed:** read-only production metadata inspection on 2026-10-23.  
**Severity:** P0 / critical until remediated and independently verified.  
**Status:** candidate migration and regression test prepared; production role membership has not yet been changed.

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

The candidate migration is idempotent and runs before the spatial reference grant migration. Validate the exact production migration result and effective privileges after application. Keep real-data national production blocked until the full authorization and privacy release gates pass.
