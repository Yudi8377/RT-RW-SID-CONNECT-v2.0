# PHASE 20 — PRODUCTION HARDENING CHECKLIST

Date: 2026-09-29
Repository: Yudi8377/RT-RW-SID-CONNECT-v2.0
Production target: GitHub Pages + Supabase

## Verified

- [x] Supabase project reachable.
- [x] Public application tables inspected; RLS is enabled on every table returned by the current public-schema inventory.
- [x] Active Edge Functions inventoried: bootstrap-pilot, rt-transaction, workflow-transition, rw-review, admin-access-management.
- [x] All five inspected Edge Functions currently have JWT verification enabled.
- [x] Frontend config uses a Supabase publishable key and no service-role key was found in the repository configuration inspected.
- [x] Phase 19 Citizen 360 is merged to main.
- [x] Frontend cache version was advanced so Phase 19 app.js is not intentionally pinned to the Phase 18 cache key.
- [x] Production readiness gate documented.

## Security advisor — 2026-09-29

Current Supabase Security Advisor reports one WARN: auth_leaked_password_protection.

This feature is disabled. It is recorded as an optional authentication hardening item and is not being treated as a free-first deployment blocker.

No production authorization bypass is introduced to compensate for this finding.

## Performance advisor — 2026-09-29

The Performance Advisor reports INFO findings for unindexed foreign keys and unused indexes.

These are tracked, not blindly changed. Index changes should be based on actual query paths/workload and verified after implementation.

## Data boundary

Synthetic pilot/demo records exist in the database. They are not real resident data and must remain clearly separated from real operational onboarding.

## UI data-boundary hardening — 2026-09-29

- [x] Dashboard KPI labels explicitly identify the figures as synthetic/demo pilot data.
- [x] Landing/preview copy identifies the pilot as synthetic demo data.
- [x] Authenticated administrator UI is no longer mislabeled as `ADMIN PREVIEW`; preview and authenticated admin states are distinguished.
- [x] Generic workspace copy explicitly states that local Insert/Update/Delete/Export/Print controls are pilot/demo UI and are not official production transactions.
- [x] No authorization, RLS, or Supabase Edge Function bypass was introduced by this UI hardening pass.

## Final acceptance gates

- [ ] Public browser smoke test
- [ ] Authenticated login test
- [ ] Admin access test
- [ ] RT scoped access test
- [ ] RW scoped access test
- [ ] RLS negative-access test
- [ ] F-1.02 submission
- [ ] RT verification
- [ ] RW review
- [ ] Desa validation
- [ ] Authorized processing
- [ ] F-1.09 mapping verification
- [ ] Final production sign-off

## Decision

Continue hardening and readiness work. Do not declare full production go-live until the authenticated workflow acceptance gate is completed.
