# Production Edge Function Parity Follow-up — 2026-10-25

Status: **OPEN — NOT A RELEASE APPROVAL**

This is a read-only comparison of the currently connected Supabase production project's deployed function metadata/source against the checked-in source on `main`. No production writes or endpoint probes were performed as part of this comparison.

Project ref: `gzdusguveeeflmlvvmwe`

## Findings

### 1. `village-preview` — remediation merged, production still old

- Checked-in `main` source now fails closed with `503 PUBLIC_PREVIEW_NOT_CONFIGURED` for GET, rejects unsupported methods with 405, and does not create a Supabase client.
- Live deployment reported by Supabase: version 2, `verify_jwt=false`, SHA `00dd0b96f79295097ac8ffba1a99182b3618774b24226580584781c251d9ca9a`.
- The deployed source still creates a client with `SUPABASE_SERVICE_ROLE_KEY` and reads global table counts plus platform metadata without a territory boundary.
- Conclusion: merge of the source fix is not deployment. This remains a production security blocker until external consumers are checked and the reviewed remediation is deployed and verified.

### 2. `public-experience` — material deployed/source discrepancy

- Checked-in `main` source SHA (Git blob): `f3aabbbe6767580d5b4419ddcddbb451d4cbc793`.
- Live deployment reported by Supabase: version 6, `verify_jwt=false`, SHA `1635835238f260492f7d401a47e7a37d2b0cc1b6206aa8e03f8533f83300da0f`.
- Both are anonymous, service-role-backed endpoints, but the deployed code differs materially:
  - deployed `territory_id` handling does not enforce the checked-in fixed demo-territory allowlist;
  - deployed agenda responses include raw `notes`;
  - deployed announcement responses select and return `content`;
  - deployed economy responses return selected business rows directly, including fields that the checked-in candidate maps to a smaller projection.
- The checked-in candidate validates a fixed demo territory and removes raw notes/content from its response, but still requires fixture-backed approval of every public field (including business profile fields) before it can be considered safe.
- Repository website code calls `public-experience` for agenda and economy views and passes a territory ID derived from the selected area. Therefore the fixed-demo behavior and its UX impact must be tested in staging; do not simply deploy a behavior change without validating the public site contract.
- Conclusion: potential cross-territory disclosure and excessive public fields remain unclosed until deployed source is reconciled, consumer compatibility is tested, and only approved published fields are returned.

### 3. `economic-evidence-ingest` — source hash matches, runtime remains unproven

- Checked-in source hash in repository history and live Supabase metadata both report `ab9114e852a0bccc3794d6087c80967102de31c97c4ea30a1d81149cc3ff449f`.
- Live deployment: version 2, `verify_jwt=false`. This is consistent with an integration endpoint authenticated by HMAC rather than end-user JWT.
- Static source review shows timestamp-window validation, HMAC validation, tenant mapping lookup, schema validation, payload-size limit, and event idempotency checks.
- This is source/hash parity evidence only, not proof that HMAC verification, tenant mapping, duplicate-event behavior, concurrency, or persistence/audit controls pass runtime tests. Exercise only against isolated staging with a test secret and synthetic fixtures.

## Required next steps

1. Provision or identify an isolated staging Supabase project with a project ref different from production.
2. Confirm no external consumer depends on the old `village-preview` aggregate payload; deploy the fail-closed source only after that compatibility review.
3. Test the website's `public-experience` agenda/economy requests in staging across the default demo area and non-demo areas. Confirm non-demo requests fail safely and the UI shows a clear, non-leaking empty/error state.
4. Create synthetic fixtures for published, unpublished, cancelled, private, and foreign-territory agenda/announcement/business records. Assert only explicitly approved public fields appear.
5. Reconcile deployed version/hash for every active function against an approved release commit; record deployment version and configuration after deployment.
6. Keep commercial trial and AI companion flags disabled until the regional authorization, trial/device, backup/restore, and commercial operations gates pass.

## Evidence limits

- Git blob SHA and Supabase `ezbr_sha256` are different digest contexts and must not be compared as if they were the same hash format.
- No production data enumeration, valid signed ingestion, mutating test, or production deployment was performed.
- Green static CI does not establish runtime authorization, tenant isolation, or public-output safety.
