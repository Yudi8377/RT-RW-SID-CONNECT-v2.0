# Production Release Gate — RT/RW-SID CONNECT

**Last checked:** 2026-10-23  
**Current status:** Public frontend deployed; commercial backend not yet enabled.

## Confirmed

- GitHub Pages deployment for commit `bb133575` completed successfully.
- Disposable Supabase migration-chain validation passed on the repository workflow.
- Trial and device Edge Function code passes Deno type checks and migration smoke tests in CI.
- The entitlement expiry check now fails closed when commercial enforcement is enabled and no active entitlement exists.
- Frontend flags remain disabled: `commercialTrialEnabled: false`, `aiCompanionEnabled: false`.
- Production database has existing synthetic/demo records (at last read-only check: 6 organizations, 15 territories, 510 persons, 340 households, and 3 role assignments). This is not an empty database.
- Production role assignments currently include Platform Admin, RT Operator, and Warga. No active assignments were found for RW, Village, District, or Regency/City roles.
- Production migration history does not yet include `regional_dashboard_summary`, `subscription_plans`, `organization_subscriptions`, `organization_devices`, or `start_organization_trial_with_device`.
- Production Edge Function inventory does not yet include `start-trial` or `register-device`.
- Live Supabase Security Advisor reports findings, including `spatial_ref_sys` without RLS, PostGIS functions executable by anon/authenticated, a no-policy RLS table in schema `village`, and leaked-password protection disabled. These findings need individual impact review; do not assume they all expose resident data.

## Release blockers

1. Reconcile GitHub migration files with the actual production migration history before applying changes. Do not blindly replay the entire chain.
2. Deploy and verify the missing regional summary RPC and the server-authoritative subscription/device entitlement schema, preserving current data and existing grants unless a reviewed migration explicitly changes them.
3. Deploy `start-trial` and `register-device` only after their database RPCs and secrets are confirmed.
4. Exercise the complete live path: authenticated organization assignment → Trial 7 Hari → device registration → active status → expiry → denial of access → audit record.
5. Verify all five operational scopes independently: RT, RW, Desa/Kelurahan, Kecamatan, and Kabupaten/Kota. Preserve the existing Platform Admin role; do not automatically grant real users new scopes.
6. Review Security Advisor findings and confirm that access boundaries remain least-privilege after regional RPC grants are applied.
7. Only then enable `commercialTrialEnabled`. Keep `aiCompanionEnabled` off until its live authorization and response tests pass.
8. Run mobile/browser checks and verify the published URLs after each production deployment.

## Safe operating rules

- GitHub Pages success is not equivalent to commercial backend readiness.
- CI against disposable infrastructure is necessary but not a substitute for verifying production migration state.
- No production schema changes were made during the read-only verification on 2026-10-23.
- Do not activate paid plans until trusted payment confirmation and billing lifecycle are implemented; the current intended plan is the free 7-day, one-device trial only.
