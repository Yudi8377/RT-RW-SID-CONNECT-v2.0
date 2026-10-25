# Isolated Edge Function Contract Smoke Tests

Date prepared: 2026-10-25

## Purpose and safety

`scripts/test-edge-contracts.mjs` exercises rejection paths and public route contracts against an **isolated staging Supabase project**. It does not authenticate as a resident, does not submit a valid economic evidence event, and does not intentionally mutate application data. The known production project ref is blocked by the script.

Run only after deploying the candidate Edge Function source to staging. The suite is not a substitute for the authenticated regional authorization matrix or source/deployed-digest reconciliation.

## Run

```sh
SUPABASE_FUNCTIONS_URL="https://<staging-project-ref>.supabase.co/functions/v1" \
SUPABASE_PROJECT_REF="<staging-project-ref>" \
node scripts/test-edge-contracts.mjs
```

The URL must use HTTPS, end in `/functions/v1`, and match the supplied staging project ref. Do not use the production project.

## Included assertions

- `village-preview`: OPTIONS succeeds; GET returns `503 PUBLIC_PREVIEW_NOT_CONFIGURED` and no legacy global aggregate payload; POST returns 405.
- `public-experience`: OPTIONS succeeds; a non-allowlisted territory returns 403; unsupported methods return 405; malformed JSON returns 400.
- `economic-evidence-ingest`: unsupported methods return 405; missing integration headers, stale timestamp, and malformed signature are rejected before persistence.

## Deliberately not covered

- Valid HMAC event submission and idempotent replay/conflict tests. A valid event is persisted, so those tests must run against a disposable database with a dedicated synthetic tenant mapping and an isolated secret.
- Full public-experience response field minimization / approved-demo fixture verification.
- Authenticated RT/RW/Desa/Kecamatan/Kabupaten-Kota role and cross-tenant read/write matrix.
- Race-condition tests for duplicate event IDs, which require isolated concurrent requests and database inspection.

## Release gate

Record the staging project ref, deployed function versions, commit SHA, test output, and before/after row counts for the disposable inbox table. Invalid requests must produce no inbox insert. Do not deploy to production or enable trial/AI flags on the strength of this smoke suite alone.
