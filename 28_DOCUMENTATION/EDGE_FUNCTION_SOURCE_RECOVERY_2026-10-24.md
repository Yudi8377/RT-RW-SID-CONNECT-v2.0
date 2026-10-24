# Production Edge Function Source Reconciliation

This branch captures source exported from the active Supabase project on 2026-10-24. It is a **source recovery snapshot**, not approval to deploy. Production functions must not be redeployed until the reviewed source, public-data contracts, automated tests, and deployment workflow are accepted.

## Captured functions

- `village-preview`: deployed version 2; status ACTIVE; verify_jwt=false; source SHA-256 reported by Supabase: `00dd0b96f79295097ac8ffba1a99182b3618774b24226580584781c251d9ca9a`.
- `public-experience`: deployed version 6; status ACTIVE; verify_jwt=false; source SHA-256 reported by Supabase: `1635835238f260492f7d401a47e7a37d2b0cc1b6206aa8e03f8533f83300da0f`.
- `economic-evidence-ingest`: deployed version 2; status ACTIVE; verify_jwt=false; source SHA-256 reported by Supabase: `ab9114e852a0bccc3794d6087c80967102de31c97c4ea30a1d81149cc3ff449f`.

## Environment variables

Only variable names are expected in source. Never commit values:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JOLIE_INTEGRATION_HMAC_SECRET` (economic-evidence-ingest)

## Mandatory review before deployment

1. Compare each snapshot against the live function version and source digest.
2. Review public response fields for least disclosure and territory allowlisting.
3. Add anonymous contract tests for public endpoints and negative signature/idempotency tests for the signed ingestion endpoint.
4. Add CI to fail when an active production slug lacks tracked source.
5. Deploy only from a reviewed commit, then record the deployed function versions and commit SHA.
6. Keep Trial and AI Companion commercial flags disabled until authorization and tenant-isolation E2E tests pass.

No production function was changed or redeployed by this source export.
