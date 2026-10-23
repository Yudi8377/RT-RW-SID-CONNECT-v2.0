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
- Frontend config keeps `commercialTrialEnabled: false` and `aiCompanionEnabled: false`.
- The production database migration history does not yet include the current regional summary RPC and server-authoritative subscription/device-entitlement migrations.
- The production Edge Function inventory does not yet include `start-trial` or `register-device`.
- Production contains existing synthetic/demo resident and household records; do not treat it as an empty database.
- Security Advisor findings remain open. Do not claim a zero-finding security posture until rechecked and remediated.

Do not enable commercial flags until the migration sequence is reconciled against production history, migrations and Edge Functions are deployed in a controlled order, entitlement and regional scope smoke tests pass against the actual backend, and Security Advisor findings are triaged. Do not auto-assign new regional administrators to real accounts; role assignments require an authorized platform administrator and the correct territory scope.

Detailed checklist: [Production Release Gate](docs/PRODUCTION_RELEASE_GATE.md).

## Next implementation targets

Auth → real CRUD → progressive verification → Admin Center → Document Engine → GPFFE exchange → GIS → Smart Village → testing → pilot.



Deployment trigger verified: main branch is configured for GitHub Pages Actions.
