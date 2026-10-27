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

1. Apply reviewed migrations in order using the documented release procedure; do not blindly replay migrations on production.
2. Put the project's **publishable key** into `config.js`. Never commit a secret/service-role key.
3. Enable GitHub Pages with Settings → Pages → Source: GitHub Actions.
4. Pushes to `main` deploy automatically.

Supabase recommends publishable keys for browser clients and requires Row Level Security on exposed tables.

## Migration rule

Hatchable v13 is frozen as a reference only. Do not delete its project or data until this repository and Supabase implementation pass functional and security verification.

## Current implementation status

- Canonical territory, identity and RBAC foundation migrated to Supabase.
- CI includes regional, Trial/device, source-integrity, and deployment checks; passing CI is not proof of authenticated production authorization.
- GitHub Pages deployment is configured on `main`.
- The public frontend and Supabase production backend are separate release surfaces.
- Security Advisor and live authorization issues remain release blockers; see [Production Release Gate](docs/PRODUCTION_RELEASE_GATE.md).
- National/international standards and future Web3 design principles are documented in [Web3 Readiness & Standards Baseline](docs/WEB3_READINESS_AND_STANDARDS.md).

## Production release gate

**Current decision: NOT CLEARED FOR COMMERCIAL LAUNCH OR REAL-DATA NATIONAL PRODUCTION.**

The current baseline retains `commercialTrialEnabled: false` and `aiCompanionEnabled: false` until:
- Supabase PostGIS exposure/grants are remediated through a supported, verified path;
- RLS-without-policy tables and SECURITY DEFINER grants have documented least-privilege decisions;
- leaked-password protection is enabled and verified;
- authenticated positive/negative regional authorization tests pass for all scopes;
- RT operator role, organization, and territory mapping is corrected through an audited workflow;
- Trial 7 Hari start, one-device limit, expiry, and audit lifecycle passes authenticated tests;
- migration history and deployed function definitions are reconciled;
- backup/restore, rollback, accessibility, performance, support, and privacy evidence are recorded.

The active subscription catalog has a Trial 7 Hari plan, but there is no production subscription lifecycle evidence yet. Do not auto-assign real users or infer territory scope. Production contains synthetic/demo resident and household records; do not treat it as an empty database.

Detailed checklist: [Production Release Gate](docs/PRODUCTION_RELEASE_GATE.md).

## National, international and Web3 direction

The project will remain chain-neutral at its core. Future Web3 use is restricted initially to optional integrity proofs (e.g. Merkle-root anchoring) after privacy/security review; resident PII, NIK, addresses, household records, and confidential case data must never be written on-chain. Ordinary services must remain usable without wallets or tokens. See [Web3 Readiness & Standards Baseline](docs/WEB3_READINESS_AND_STANDARDS.md).

## Next implementation targets

Auth → real CRUD → progressive verification → Admin Center → Document Engine → GPFFE exchange → GIS → Smart Village → authenticated testing → controlled pilot → commercial release.

Deployment success proves publication only, not commercial readiness.
