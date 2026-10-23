# RT/RW–SID CONNECT v2.0

Community, Village & Smart Village Digital Operating Platform.

## Free-first production baseline

- GitHub Free: source + CI/CD
- GitHub Pages: public frontend
- Supabase Free: Postgres + Auth + Data API
- No Hatchable dependency in production
- Admin preview is browser-local and is not a commercial subscription; commercial Trial stays disabled until server-side entitlements are deployed and verified
- Production authorization remains Role + Scope + Permission + Classification + Purpose + Context

## Supabase setup

Project reference: gzdusguveeeflmlvvmwe

1. Apply `supabase/migrations/202609280001_initial.sql` in the Supabase SQL Editor.
2. Put the project's **publishable key** into `config.js`. Never commit a secret/service-role key.
3. Enable GitHub Pages with Settings → Pages → Source: GitHub Actions.
4. Pushes to `main` deploy automatically.

Supabase recommends publishable keys for browser clients and requires Row Level Security on exposed tables. See the official documentation linked below.

## Migration rule

Hatchable v13 is frozen as a reference only. Do not delete its project or data until this repository and Supabase implementation pass functional and security verification.

## Current implementation status

- Canonical territory, identity and RBAC foundation migrated to Supabase.
- Security baseline is present, but the live Supabase Security Advisor still reports findings; see `docs/PRODUCTION_RELEASE_GATE.md`.
- Authenticated workspace reads active role/scope assignments when provisioned.
- GitHub Pages deployment workflow is configured on `main`.

## Production release gate

The public GitHub Pages site and the production Supabase backend are separate release surfaces. A successful Pages deployment does not mean that subscription or regional operations are live.

As verified on 2026-10-23:
- Frontend config still keeps `commercialTrialEnabled: false` and `aiCompanionEnabled: false`.
- Production migration history includes `regional_dashboard_roles`, `regional_dashboard_summary_rpc`, `server_authoritative_entitlements`, `device_entitlement_enforcement`, `scoped_resident_directory`, and `household_membership_admin_workbench` (versions `20261023075802` through `20261023075825`). These were checked directly against `supabase_migrations.schema_migrations`.
- Production Edge Functions `start-trial` and `register-device` are ACTIVE with JWT verification enabled.
- The active subscription catalog currently contains only `TRIAL_7_DAY` (7 days, IDR 0); there are no rows in `organization_subscriptions` or `organization_devices` yet.
- Current active assignments are Platform Admin, RT Operator, and Warga. The RT Operator assignment points to a VILLAGE territory and has no organization mapping; RW, Desa/Kelurahan, Kecamatan, and Kabupaten/Kota have no active assignments. Do not auto-assign real users or infer scope.
- Production contains existing synthetic/demo resident and household records; do not treat it as an empty database.
- Security Advisor findings remain open, including deny-by-default RLS tables, PostGIS-related grants/table exposure, and leaked-password protection disabled. See `docs/PRODUCTION_RELEASE_GATE.md`.

Do not enable commercial flags until the live authenticated trial/device lifecycle is verified, the RT role-to-territory and organization mismatch is corrected through the audited admin flow, dedicated test accounts cover all regional roles, and security findings are triaged. A successful Pages deploy proves frontend publication only—not commercial readiness.

Detailed checklist: [Production Release Gate](docs/PRODUCTION_RELEASE_GATE.md).

## Next implementation targets

Auth → real CRUD → progressive verification → Admin Center → Document Engine → GPFFE exchange → GIS → Smart Village → testing → pilot.



Deployment trigger verified: main branch is configured for GitHub Pages Actions.
