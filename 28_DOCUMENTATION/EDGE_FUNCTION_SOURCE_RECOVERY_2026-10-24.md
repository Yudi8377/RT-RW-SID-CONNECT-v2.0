# Production Edge Function Source Reconciliation

Snapshot date: 2026-10-24. This inventory was read from the connected Supabase project. The source files in this PR are recovered source snapshots. **This is not approval to deploy.**

## Active function inventory

| Slug | Deployed version | JWT verification | Supabase source SHA-256 |
|---|---:|---|---|
| `bootstrap-pilot` | 2 | enabled | `e31087d067f608c5e09a04c73b7a07d5ac2da33018b8c08cb72a15274838479b` |
| `rt-transaction` | 6 | enabled | `7ac17247005df2103f1c7d29f1014e12ab1f7288720fae7cefe56859e146279b` |
| `workflow-transition` | 2 | enabled | `86b394638c39d79c50ba9f2dc176808ddb1b70d5af1d0e5d0485d25247d74b0a` |
| `rw-review` | 1 | enabled | `88aff71ca4cef0259b423c003253dc01b3a20ad1e7e4e993c1e35e41e272a613` |
| `admin-access-management` | 1 | enabled | `0d2bf81740c6739aef40191f167d61537ee73f2e7bdbd8791ca2fcba15b8dbd0` |
| `public-service-request` | 2 | enabled | `cb3b6b2a11fd5c68828f2c9e22a548df6cc11ff9d845434be9bca236358c8760` |
| `citizen-room` | 2 | enabled | `8073b61d138de369b582abcc63f4373e0cd237d0552357afd9d4f6ee1e82a2e0` |
| `public-experience` | 6 | disabled | `1635835238f260492f7d401a47e7a37d2b0cc1b6206aa8e03f8533f83300da0f` |
| `citizen-location` | 8 | enabled | `d768a44371f1ace4e8c5acee1ebae657b314ece38469cb02d77e51d045ec6b3a` |
| `ai-data-intake` | 1 | enabled | `dfbcbb5616f9d7cea5f68222ce9a02d581e5a3e3d604c7df82857667c251da3b` |
| `assistance-rules-evaluate` | 1 | enabled | `b732d7ea9b912aa59b499bce9d41d5a4de0a80bad412a26d3b5eeab1fc58d63b` |
| `assistance-workflow` | 1 | enabled | `ddf2407e0cb807cf7b6057a3cae77713b176d46a310a0d2803c0d89e6f8f6066` |
| `ai-companion` | 6 | enabled | `49e85ea4f4788f1c7a2a63ffd280362d25b2464a7ef7fe41b07f2b39eb34aca3` |
| `village-preview` | 2 | disabled | `00dd0b96f79295097ac8ffba1a99182b3618774b24226580584781c251d9ca9a` |
| `economic-evidence-ingest` | 2 | disabled | `ab9114e852a0bccc3794d6087c80967102de31c97c4ea30a1d81149cc3ff449f` |
| `knowledge-ingest` | 1 | enabled | `ec1a879b37fbeea7a0f203aa0861e1986bf57f917b3246d419f91c330db9df33` |
| `editorial-ai` | 2 | enabled | `b2c98cb6f48b6219dab35496ab5e93f20bfc9c788d46b0c225466e055db4d54d` |
| `start-trial` | 2 | enabled | `c27e6970e9946396943e7597ec405085a06566f2a31e752305fa02041e39e85b` |
| `register-device` | 2 | enabled | `9ebbf927ab53fbd02cf666cbe9ce93ae9c49b87d14f3fc88c94554c3cd5a7f9e` |

All 19 active function slugs now have tracked `supabase/functions/<slug>/index.ts` files in this branch. Four previously missing source directories were recovered: `rw-review`, `admin-access-management`, `public-service-request`, and `citizen-room`. A live-vs-repository comparison also found drift in `bootstrap-pilot`, `rt-transaction`, `assistance-rules-evaluate`, `assistance-workflow`, `start-trial`, and `register-device`; these source snapshots and required local dependencies were aligned to the deployed versions. `public-experience` intentionally differs from the deployed version in this PR because it contains proposed public-data minimization and territory restrictions; do not deploy it until frontend compatibility and anonymous contract tests pass.

## Environment variables

Only variable names are expected in source. Never commit values:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JOLIE_INTEGRATION_HMAC_SECRET` (economic-evidence-ingest)

## Mandatory review before deployment

1. Compare each snapshot against the live function version and source digest.
2. Review public response fields for least disclosure and territory allowlisting.
3. Add anonymous contract tests for public endpoints and negative signature/idempotency tests for the signed ingestion endpoint.
4. CI checks tracked source for all current active slugs; update the allowlist when functions are added/removed and ensure deployment consumes only reviewed commits.
5. Deploy only from a reviewed commit, then record the deployed function versions and commit SHA.
6. Keep Trial and AI Companion commercial flags disabled until authorization and tenant-isolation E2E tests pass.

No production function was changed or redeployed by this source recovery.
