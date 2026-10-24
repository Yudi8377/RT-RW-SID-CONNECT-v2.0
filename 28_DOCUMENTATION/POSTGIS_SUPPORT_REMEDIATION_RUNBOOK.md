# Supabase Support Runbook — PostGIS in public (24 October 2026)

Status: **open production security gate**. This runbook documents a provider-owned extension issue. It does not perform or authorize a destructive database migration.

## Production facts verified read-only

Project: `gzdusguveeeflmlvvmwe`

- PostGIS version: `3.3.7`
- Extension schema: `public`
- `extrelocatable = false`
- `public.spatial_ref_sys` owner: `supabase_admin`
- RLS is disabled on `public.spatial_ref_sys`.
- The current grants include write-capable privileges for `anon` and `authenticated`; a migration run as `postgres` did not remove those privileges. Do not treat a successful `REVOKE` statement as proof: verify effective privileges after any remediation.
- Application geometry columns exist, including:
  - `public.sv_emergency_events.point geometry(Point,4326)`
  - `public.sv_master_addresses.point geometry(Point,4326)`
  - `public.sv_master_territories.centroid geometry(Point,4326)`
  - `public.sv_master_territories.polygon geometry(MultiPolygon,4326)`
  - `public.valid_detail.location geometry`
- Therefore, **do not drop/recreate PostGIS with CASCADE** as a quick fix. It may remove application columns, indexes, views, functions, and other dependent objects.

## Why normal SQL remediation is blocked

The extension-owned table and objects are owned by `supabase_admin`, not the project SQL session role `postgres`. The previous attempt to revoke grants failed its verification because effective privileges remained. Do not change ownership, attempt `SET ROLE supabase_admin`, or repeatedly issue ineffective grants/revokes.

Supabase's official PostGIS troubleshooting recommends contacting Supabase Support to move PostGIS into the non-exposed `extensions` schema when the database contains geometry/geography columns. The supported move is designed to preserve those columns, unlike drop/recreate.

References:
- https://supabase.com/docs/guides/database/extensions/postgis
- https://supabase.com/kb/troubleshooting/security-advisor-flags-spatial_ref_sys-and-other-postgis-objects-in-the-public-schema

## Support request text

> Please remediate the PostGIS extension placement for project `gzdusguveeeflmlvvmwe`. PostGIS 3.3.7 is installed in the exposed `public` schema, and `public.spatial_ref_sys` is owned by `supabase_admin`. The effective table grants currently allow `anon` and `authenticated` to write, and our project SQL role cannot revoke the extension-owner grants.
>
> This database contains application geometry columns (including `sv_emergency_events.point`, `sv_master_addresses.point`, and `sv_master_territories.centroid/polygon`). Please use the supported provider-side procedure to move PostGIS into the non-exposed `extensions` schema without dropping dependent application data. Before executing, confirm the backup/rollback approach and any expected connection restart or compatibility steps. Please also address the exposed `st_estimatedextent` extension functions as part of the supported move, then confirm the extension schema and effective Data API exposure after completion.

## Post-remediation verification checklist

Do not close this gate until all are checked:

- [ ] Supabase Support confirms provider-side move completed.
- [ ] `pg_extension.extnamespace` for PostGIS resolves to `extensions`.
- [ ] The `extensions` schema is not added to the Data API exposed schemas.
- [ ] Effective Data API access to `spatial_ref_sys` and PostGIS extension functions is no longer exposed.
- [ ] Re-run Supabase Security Advisor; confirm the PostGIS-related `public.spatial_ref_sys`, `extension_in_public`, and `st_estimatedextent` findings disappear.
- [ ] Smoke-test spatial operations against synthetic data: geometry reads/writes, SRID 4326 lookup, distance/containment functions used by the app, and any map/territory workflows.
- [ ] Restart/recycle application connection pools if Support recommends it.
- [ ] Confirm application geometry columns, indexes, views, and dependent functions still exist and are usable.
- [ ] Keep `commercialTrialEnabled` and `aiCompanionEnabled` disabled until this gate and end-to-end authorization tests are complete.

## Scope of this runbook

This is operational guidance, not a claim of legal compliance or proof that the production security finding is fixed. No database mutation is included here.
