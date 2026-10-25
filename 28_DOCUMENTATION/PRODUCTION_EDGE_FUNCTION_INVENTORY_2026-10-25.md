# Production Edge Function Inventory Snapshot

Snapshot captured: 2026-10-25 (read-only Supabase management API review)  
Project ref: `gzdusguveeeflmlvvmwe`  
Purpose: operational evidence for source-to-deployment reconciliation; **not** a security certification.

The `ezbr_sha256` values below identify the deployed Edge Function build/source snapshot reported by Supabase. They are not Git commit SHAs. Compare them with the reviewed repository source and record the exact release commit before every production rollout.

| Function | Version | JWT verification | Deployed SHA-256 |
|---|---:|---|---|
| `bootstrap-pilot` | 2 | on | `e31087d067f608c5e09a04c73b7a07d5ac2da33018b8c08cb72a15274838479b` |
| `rt-transaction` | 6 | on | `7ac17247005df2103f1c7d29f1014e12ab1f7288720fae7cefe56859e146279b` |
| `workflow-transition` | 2 | on | `86b394638c39d79c50ba9f2dc176808ddb1b70d5af1d0e5d0485d25247d74b0a` |
| `rw-review` | 1 | on | `88aff71ca4cef0259b423c003253dc01b3a20ad1e7e4e993c1e35e41e272a613` |
| `admin-access-management` | 1 | on | `0d2bf81740c6739aef40191f167d61537ee73f2e7bdbd8791ca2fcba15b8dbd0` |
| `public-service-request` | 2 | on | `cb3b6b2a11fd5c68828f2c9e22a548df6cc11ff9d845434be9bca236358c8760` |
| `citizen-room` | 2 | on | `8073b61d138de369b582abcc63f4373e0cd237d0552357afd9d4f6ee1e82a2e0` |
| `public-experience` | 6 | off | `1635835238f260492f7d401a47e7a37d2b0cc1b6206aa8e03f8533f83300da0f` |
| `citizen-location` | 8 | on | `d768a44371f1ace4e8c5acee1ebae657b314ece38469cb02d77e51d045ec6b3a` |
| `ai-data-intake` | 1 | on | `dfbcbb5616f9d7cea5f68222ce9a02d581e5a3e3d604c7df82857667c251da3b` |
| `assistance-rules-evaluate` | 1 | on | `b732d7ea9b912aa59b499bce9d41d5a4de0a80bad412a26d3b5eeab1fc58d63b` |
| `assistance-workflow` | 1 | on | `ddf2407e0cb807cf7b6057a3cae77713b176d46a310a0d2803c0d89e6f8f6066` |
| `ai-companion` | 6 | on | `49e85ea4f4788f1c7a2a63ffd280362d25b2464a7ef7fe41b07f2b39eb34aca3` |
| `village-preview` | 2 | off | `00dd0b96f79295097ac8ffba1a99182b3618774b24226580584781c251d9ca9a` |
| `economic-evidence-ingest` | 2 | off | `ab9114e852a0bccc3794d6087c80967102de31c97c4ea30a1d81149cc3ff449f` |
| `knowledge-ingest` | 1 | on | `ec1a879b37fbeea7a0f203aa0861e1986bf57f917b3246d419f91c330db9df33` |
| `editorial-ai` | 2 | on | `b2c98cb6f48b6219dab35496ab5e93f20bfc9c788d46b0c225466e055db4d54d` |
| `start-trial` | 2 | on | `c27e6970e9946396943e7597ec405085a06566f2a31e752305fa02041e39e85b` |
| `register-device` | 2 | on | `9ebbf927ab53fbd02cf666cbe9ce93ae9c49b87d14f3fc88c94554c3cd5a7f9e` |

## Immediate review priorities

1. `village-preview`: public/JWT-off and deployed source performs service-role global aggregate reads. The fail-closed repository candidate is not yet deployed.
2. `public-experience`: public/JWT-off and deployed source differs materially from checked-in source; it accepts caller-supplied territory IDs and returns raw event notes, announcement content, and selected business rows without the reviewed projection present in the repository candidate.
3. `economic-evidence-ingest`: public/JWT-off can be appropriate for a signed webhook, but verify HMAC, timestamp window, event ID idempotency, tenant mapping, and no-mutation rejection cases in disposable staging.
4. `start-trial` and `register-device`: JWT verification is on, but this does not itself prove role, assignment, tenant isolation, duplicate-trial, concurrency, or device-limit behavior.

## Reconciliation procedure

For each function, retrieve the deployed source and compare it with the repository candidate. Record whether the difference is intended, reviewed, and tested. Do not infer source parity from version numbers or a green repository CI job. Deploy only a reviewed commit; immediately re-read deployed version/hash and run approved read-only smoke tests. Never perform exploratory tenant enumeration or mutation tests against production.
