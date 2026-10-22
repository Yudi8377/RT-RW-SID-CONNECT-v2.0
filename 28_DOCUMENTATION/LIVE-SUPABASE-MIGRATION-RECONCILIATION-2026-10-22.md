# Live Supabase Migration Reconciliation — 2026-10-22

**Status:** read-only audit snapshot; not a schema certification and not an authorization to apply migrations.

## Executive result

The connected Supabase project `gzdusguveeeflmlvvmwe` reports **75 applied migration records**. The current `main` branch tree contains **32 SQL files** under `supabase/migrations/`. Comparing the database's migration `name` values to repository filenames (without `.sql`) produces only **4 exact name matches**.

This is a migration-provenance gap. It does **not**, by itself, prove that the live schema is broken: several files may be renamed, re-numbered, squashed, or superseded. It does mean that the repository's migration folder cannot currently be treated as a complete, exact replay history for the connected live database.

No DDL, grants, RLS policies, extension configuration, or data were changed during this audit.

## Exact matches observed

- `202609280001_initial`
- `202609280003_canonical_identity_rbac`
- `202609280004_rbac_index_cleanup`
- `202609280005_pilot_seed`

## Live migration names with no exact filename match

The following 71 applied migration names were returned by Supabase but do not match a current repository filename exactly:

```text
202609280002_security_performance_baseline
202609280007_pilot_read_rls
202609280008_fix_death_rls
202609280009_intelligence_views_core
202609280010_intelligence_views_exchange
202609280011_rt_service_workflow
202609280012_rt_service_requests_rls
rt_digital_domain_data
rw_review_workflow
202609280014_demo_full_platform_dataset
public_agenda_start_at
community_events_public_visibility
public_business_visibility
emergency_command_notification
ai_data_intake_assistance_v1
m2a_scoped_rls_v1
m2b_rules_engine_v1
mobile_citizen_registration_and_news_images_v1
smart_village_master_gis_emergency_v1
smart_village_public_map_context_v1
smart_village_person_projection_v1
smart_village_ai_emergency_plans_v1
smart_village_chat_e2ee_v1
smart_village_chat_e2ee_v1_impl
smart_village_chat_discovery_v1
smart_village_profile_avatar_storage_v1
smart_village_chat_integrity_v1
smart_village_chat_rls_recursion_fix_v1
smart_village_profile_avatar_storage_select_v1
smart_village_profile_avatar_private_v1
smart_village_chat_trigger_hardening_v1
smart_village_geo_trigger_hardening_v1
smart_village_demo_business_seed_v1
smart_village_demo_master_seed_v1
demo_account_role_assignment_v1
add_opensid_sync_batches
harden_public_auth_context_rpc
revoke_anonymous_auth_context_rpc
20261008142100_desa_ai_companion_governance_v1
20261008143000_desa_ai_module_knowledge_v1
nusa_core_phase_0_18_schema
nusa_rls_governance_phase_1_18
nusa_catalog_rls_hardening
nusa_workspace_bootstrap_rpc
harden_service_request_workflow_scope
set_service_workflow_function_search_path
audit_master_configuration_changes
create_jolie_economic_evidence_inbox
add_scoped_economic_evidence_review_rpc
harden_economic_evidence_review
allow_evidence_review_note_refresh
harden_my_context_valid_active_assignments
role_gate_sad_operational_module_writes
enforce_restore_and_evidence_review_permissions
expose_current_role_permissions_rpc
separate_update_archive_restore_permissions
grant_trigger_guard_execution
limit_master_configuration_to_update_permission
seed_sad_demo_operational_data_v1
create_scoped_population_summary
add_scoped_validated_demo_gis_layers
synthetic_demo_dataset_v1
module_specific_demo_records_v1
editorial_cms_knowledge_v1
knowledge_review_note_v1
community_chat_and_video
regional_video_moderation
video_submission_scope
regional_curator_scope
public_column_grants
community_least_privilege_grants
```

## Repository migration files without exact live-name matches

The following 28 SQL files exist on current `main` but are not present verbatim as names in the live migration history:

```text
202609280006_community_economy_intelligence.sql
20261003051401_m2a_scoped_rls_v1.sql
20261003062000_m2b_rules_engine_v1.sql
20261003070000_mobile_citizen_registration_and_news_images_v1.sql
20261003120000_smart_village_master_gis_emergency_v1.sql
20261003153000_smart_village_chat_e2ee_v1.sql
20261003154500_smart_village_chat_discovery_v1.sql
20261003160000_smart_village_profile_avatar_storage_v1.sql
20261003161500_smart_village_chat_integrity_v1.sql
20261003163000_smart_village_chat_rls_recursion_fix_v1.sql
20261003164500_smart_village_profile_avatar_storage_select_v1.sql
20261003165500_smart_village_chat_trigger_hardening_v1.sql
20261003170000_smart_village_profile_avatar_private_v1.sql
20261003171000_smart_village_geo_trigger_hardening_v1.sql
20261003_ai_data_intake_assistance_v1.sql
20261009090000_synthetic_demo_dataset_v1.sql
20261009100000_module_specific_demo_records_v1.sql
20261009150000_sad_integration_outbox_v1.sql
202610220001_regional_dashboard_roles.sql
202610220002_regional_dashboard_summary_rpc.sql
202610220003_editorial_cms_knowledge.sql
202610220004_knowledge_review_note.sql
202610220005_community_chat_and_video.sql
202610220006_regional_video_moderation.sql
202610220007_video_submission_scope.sql
202610220008_regional_curator_scope.sql
202610220009_public_column_grants.sql
202610220010_community_least_privilege_grants.sql
```

The first 18 files above include plausible semantic counterparts for several live names (for example, the `m2a`, `m2b`, community chat/video, editorial, and synthetic demo migrations), but **no pairing is accepted as proven** until the SQL contents, live objects, constraints, function definitions, grants, policies, and checksums are compared. The `20261022` files in the current repository need special scrutiny because the live history reports related migrations with different names and versions.

## Existing shared foundations observed in the live schema

A read-only query confirmed that the live database already has these reusable tables and domain concepts:

- `public.role_assignments` and `public.roles`: the access-control foundation (must be used with active assignment, territory scope, and current RLS/function rules).
- `public.audit_logs`: audit event records with actor, action, entity, scope, before/after JSON, reason, source, authority, and timestamp columns.
- `public.ai_agent_registry`: agent code/name/purpose, allowed and restricted action lists, knowledge domains, approval requirement, and active flag.
- `public.ai_action_recommendations`: agent/user/territory references, evidence, priority, status and due/resolution timestamps.
- `public.ai_knowledge_items` and `public.ai_regulations`: versioned knowledge and regulation records with source URL, status, affected modules, and metadata.
- `public.ai_companion_memory`: keyed JSON memory with source and an approval flag.
- `public.civic_inquiries`, `public.community_events`, and `public.rt_business_profiles`: existing community service, event and local-business domains.

This inventory supports the **logical-module-first** approach: program definitions and their activities should reference the canonical territory/organization and authorized actor identifiers, while education, cooperative transactions, editorial drafts, health details and other domain-specific records remain owned by their respective modules. The live schema needs a complete policy and relationship review before the implementation selects specific foreign keys or APIs. The query was a table/column inventory, not proof that each table's access policy is correct.

## Supabase advisor snapshot

Security advisor findings returned on 2026-10-22:

- `village.integration_tenant_mappings`: RLS enabled with no policies. Keep deny-by-default unless a reviewed, narrow access path is required.
- `public.spatial_ref_sys`: RLS disabled on a table exposed in the public schema. Review extension exposure and GIS dependencies; do not add a permissive policy as a shortcut.
- Three `public.st_estimatedextent` overloads are executable by `anon` and `authenticated` as `SECURITY DEFINER`. Verify intended GIS usage and least-privilege grants before changing.
- Supabase Auth leaked-password protection is disabled. Enable only through the supported Auth setting after assessing expected sign-in impact.

Performance advisor reported 166 unindexed foreign-key findings. This should be triaged by hot-path query evidence and table size, rather than blindly adding all indexes.

## Required reconciliation sequence

1. Capture a fresh, timestamped read-only inventory of applied migrations, table/column definitions, constraints, indexes, functions, grants, RLS state and policies.
2. For every applied migration, map it to a source file by verified SQL/object diff—not only by similar names. Mark each as exact, renamed-equivalent, superseded, manually applied, or unresolved.
3. Compare the final live definitions for `territories`, `organizations`, `role_assignments`, `audit_logs`, AI knowledge/regulation, editorial/community content, and public-safe projections.
4. Inspect whether the current repository migration files have been edited after application; preserve original migration content and checksums where available.
5. Create a staging-only, additive reconciliation plan and validate it against a disposable/staging database. Do not replay the whole repository against production.
6. After the reconciliation report is reviewed, implement the smallest additive program schema. Use existing canonical references and RLS; no new identity database, no duplicate person/territory data.
7. Keep AI agents read-only by default. Agents may propose a patch or PR and run checks; database DDL, grants, policy changes, production deploys and data repair require explicit, reviewed release controls.

## Go/no-go for Peta Program schema

**Current decision: NO-GO for new production DDL; GO for UI/API contracts and a staging-only prototype.**

The first Peta Program release should reuse canonical territory and organization references, audit events, agent registry and approved knowledge/regulation infrastructure where the live policy contract permits. It should store only program-specific definitions, activities, indicators, evidence references, reporting periods and publication state. Public pages must consume explicitly published fields or reviewed aggregates; they must not query private program records and hide them only in the frontend.

## Evidence limits

This snapshot is based on the connected project's migration listing, read-only schema column inventory, advisor output, and the current GitHub `main` tree as of 2026-10-22. It does not include a full SQL definition export/checksum comparison or live end-to-end RLS tests. Re-run the inventory before production decisions.
