# Production Edge Function Parity Follow-up — 2026-10-25

Status: **OPEN — NOT A RELEASE APPROVAL**

This document records source review and the subsequent controlled deployment of two public Edge Function remediations. Production function metadata and deployed source were re-read after deployment. HTTP runtime probes could not be completed from the current execution environment because DNS resolution for the Supabase project hostname failed; do not treat metadata as runtime contract proof.

Project ref: `gzdusguveeeflmlvvmwe`

## 1. `village-preview` — fail-closed remediation deployed

- Production deployment is now version **3**, `verify_jwt=false`, Supabase SHA `888bf410a0f304dde5baf5df58f1cf4746a32ef07971bc8a448df3fad43c01a7`.
- Deployed source was re-read and confirmed to contain no Supabase client creation, no service-role access, and no table queries.
- `OPTIONS` returns 200; `GET` returns `503 PUBLIC_PREVIEW_NOT_CONFIGURED`; unsupported methods return 405 `METHOD_NOT_ALLOWED`.
- This removes the previous anonymous global aggregate/count disclosure path. The preview API is intentionally unavailable until an explicit, reviewed public-data contract is configured.
- Repository `website/app.js` has no call to `village-preview` in the inspected source. This is not a guarantee that no external consumer exists; external integrations should still be checked before a future preview API is re-enabled.
- Runtime HTTP checks remain pending because this execution environment could not resolve the Supabase hostname.

## 2. `public-experience` — territory and public-field remediation deployed

- Production deployment is now version **8**, `verify_jwt=false`, Supabase SHA `210922022d392d182c10f611629c3f91bc915c69e3a231ce5daf15cdc612e13c`.
- Deployed source was re-read and confirmed to enforce fixed demo territory ID `f06b8420-54f5-4ee4-b487-bacc7b374dd2`; any other supplied territory ID returns 403 `TERRITORY_NOT_ALLOWED`.
- Agenda responses no longer return raw `notes`; announcement projection returns only `id,title,summary,category,published_at,image_url`, excluding raw `content`.
- Economy output is minimized to `id,business_name,business_type,sector,products_services,verification_status`. It no longer returns scale, worker count, sales channels, or licensing status. The website renderer was inspected and uses business name, sector/type, and products/services.
- Agenda queries remain scoped to the fixed territory and `public_visible=true`, excluding `CANCELLED`; announcements require `PUBLISHED`; economy rows require `public_visible=true` and exclude `DEMO_SEED`.
- The website's `territoryForArea()` returns the same fixed demo territory ID, so the fixed allowlist is compatible with the current public website's request contract. The RT/RW selector is a local presentation preference, not a different database territory selector.
- Runtime HTTP checks and fixture-backed review of each approved public field remain pending because there is no verified isolated staging project/branch and the current execution environment could not resolve the Supabase hostname. Deployment metadata/source verification is not a substitute for those tests.

## 3. `economic-evidence-ingest` — runtime remains unproven

- Live deployment: version 2, `verify_jwt=false`, SHA `ab9114e852a0bccc3794d6087c80967102de31c97c4ea30a1d81149cc3ff449f`.
- Static source review shows timestamp-window validation, HMAC validation, tenant mapping lookup, schema validation, payload-size limit, and event idempotency checks.
- This is source/hash parity evidence only, not proof that HMAC verification, tenant mapping, duplicate-event behavior, concurrency, or persistence/audit controls pass runtime tests. Exercise only against isolated staging with a test secret and synthetic fixtures.

## Required next steps

1. Run non-mutating HTTP contract checks from an environment with network/DNS access, confirming `village-preview` GET=503 and `public-experience` non-allowlisted territory=403, unsupported method=405, malformed JSON=400.
2. Create/identify an isolated staging Supabase project with a ref different from production before running fixture-backed tests. No staging project/branch was available in the connected account during this review; do not run mutating tests against production.
3. Test synthetic published, unpublished, cancelled, private, and foreign-territory agenda/announcement/business records; verify only explicitly approved public fields appear.
4. Reconcile all 19 active function versions/source/configuration against an approved release commit; current review did not establish runtime parity for every function.
5. Review regional RPC authorization, trial/device transactionality, backup/restore, and commercial operations gates.
6. Keep commercial trial and AI companion flags disabled until regional authorization and tenant-isolation tests pass.

## Evidence limits

- Git blob SHA and Supabase `ezbr_sha256` are different digest contexts and must not be compared as if they were the same hash format.
- `village-preview` and `public-experience` were deployed in production in this follow-up. No data migrations, synthetic records, valid signed ingestion, or database writes were performed.
- Production HTTP smoke checks were attempted but could not resolve the Supabase hostname from this execution environment; runtime status codes remain unverified.
- Green static CI and function metadata do not establish runtime authorization, tenant isolation, or public-output safety.
