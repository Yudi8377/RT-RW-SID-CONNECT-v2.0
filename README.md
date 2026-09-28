# RT/RW–SID CONNECT v2.0

Community, Village & Smart Village Digital Operating Platform.

## Free-first production baseline

- GitHub Free: source + CI/CD
- GitHub Pages: public frontend
- Supabase Free: Postgres + Auth + Data API
- No Hatchable dependency in production
- Anonymous 7-day trial remains browser-local
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
- Security baseline applied; latest Supabase security advisor result: 0 findings.
- Authenticated workspace reads active role/scope assignments when provisioned.
- GitHub Pages deployment workflow is configured on `main`.

## Next implementation targets

Auth → real CRUD → progressive verification → Admin Center → Document Engine → GPFFE exchange → GIS → Smart Village → testing → pilot.



Deployment trigger verified: main branch is configured for GitHub Pages Actions.
