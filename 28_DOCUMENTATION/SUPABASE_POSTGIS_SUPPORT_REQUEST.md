# Supabase Support Request — Relocate PostGIS safely

**Project ref:** `gzdusguveeeflmlvvmwe`  
**Environment:** Production  
**Priority:** Security remediation / production readiness  
**Status:** Draft prepared; not yet submitted to Supabase Support.

## Request

Please help safely relocate the existing PostGIS extension from the `public` schema to the dedicated `extensions` schema using the provider-supported procedure appropriate for this Supabase project.

The current installation reports PostGIS 3.3.7 in `public` and `extrelocatable = false`. Supabase Security Advisor flags `extension_in_public`, `public.spatial_ref_sys` with RLS disabled, and public `st_estimatedextent` overloads executable by `anon` / `authenticated`.

We do **not** authorize a destructive drop/recreate that could cascade-delete application objects. Please use a supported non-destructive relocation/upgrade procedure where possible, or provide a project-specific safe runbook and required maintenance window if that is not possible.

## Objects and data that must be preserved

- `public.sv_emergency_events.point geometry(Point,4326)`
- `public.sv_master_addresses.point geometry(Point,4326)`
- `public.sv_master_territories.centroid geometry(Point,4326)`
- `public.sv_master_territories.polygon geometry(MultiPolygon,4326)`
- `public.valid_detail.location geometry`
- All dependent spatial indexes, constraints, functions, views, triggers, and application data.

## Please advise / perform

1. Confirm the recommended provider-supported procedure for this project and supported PostGIS target version.
2. Relocate PostGIS into `extensions` without losing geometry data or dependent objects.
3. Address the exposed `st_estimatedextent` overloads and advise on safe execution privileges.
4. Confirm whether any application SQL must schema-qualify PostGIS functions/operators after relocation, and identify compatibility steps.
5. Confirm whether `extensions` is excluded from the Data API exposure configuration or advise the correct setting.
6. Provide verification steps to confirm extension schema/version, preserved objects and indexes, and safe effective grants.

## Acceptance criteria

- `pg_extension.extnamespace` resolves PostGIS to `extensions`.
- No geometry rows, indexes, constraints, views, functions, or triggers are lost.
- Spatial smoke tests for address points, territory centroids/polygons, and emergency-event points pass.
- The relevant Security Advisor findings are cleared or have a documented, justified disposition.
- No broad grants to `anon` or `authenticated` are introduced.
- The application can continue to use spatial functionality after the change.

## Safety note

We have not run `DROP EXTENSION postgis CASCADE` or attempted to force ownership/schema changes. A prior attempt to revoke privileges on `public.spatial_ref_sys` through a migration failed and rolled back, so we are not claiming that finding is fixed.

## References

- https://supabase.com/docs/guides/database/extensions/postgis
- https://supabase.com/kb/troubleshooting/security-advisor-flags-spatial_ref_sys-and-other-postgis-objects-in-the-public-schema
