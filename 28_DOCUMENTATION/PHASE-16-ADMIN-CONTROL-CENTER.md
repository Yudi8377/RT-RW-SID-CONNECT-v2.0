# Phase 16 — Administrator Control Center

## Baseline
- Production branch: `main`
- Baseline commit: `05414c3838228149dee7e51d3b2f0c756cc97233`
- Direct administrator preview remains `?preview=admin`.
- No change to Supabase schema or Edge Functions.

## Scope
The administrator dashboard now has a dedicated Control Center for:
1. Tenant & Desa
2. Master Wilayah
3. Users
4. Roles & Permissions
5. Government Forms
6. Security Center
7. Audit Log
8. System Health

## Governance
- The preview shortcut does not create a production privilege.
- Production authorization remains governed by role assignment, territory scope, permissions and RLS.
- Existing non-admin dashboard behavior is preserved.
- Government Form Compliance remains available under Admin → Government Forms.

## Next implementation gate
The next step after this UI baseline is to connect **Master Wilayah** and **User/Role Assignment** to verified Supabase data with explicit scope and RLS checks, without altering existing RT/RW transaction workflows.
