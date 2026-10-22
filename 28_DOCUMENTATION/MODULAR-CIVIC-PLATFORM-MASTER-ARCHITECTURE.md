# RT/RW–SID CONNECT — Modular Civic Platform Master Architecture

Status: architecture proposal for review; not a production implementation or legal certification.

## 1. Direction

RT/RW–SID CONNECT is the shared digital foundation for a modular civic-service ecosystem. Each domain may have its own interface, operators, workflow and logically separated tables, while using the canonical identity, territory, organization, permission and audit foundations where authorized.

Do not build one giant application with every workflow coupled together. Do not create a new identity database for each module. Start with logical separation inside the existing PostgreSQL/Supabase project; move a module to a physically separate database only when measured scale, availability, security isolation, regulatory needs or release independence justify the extra cost and synchronization burden.

## 2. Current repository evidence and boundaries

The repository already contains migrations defining these reusable foundations:
- `public.territories`: hierarchy includes PROVINCE, REGENCY_CITY, DISTRICT, VILLAGE, HAMLET, RW and RT.
- `public.persons`, `public.addresses`, `public.households`, `public.residencies`: canonical person/residence-related records.
- `public.organizations`: organizations scoped to a territory.
- `public.roles`, `public.role_assignments`, `public.permissions`, `public.role_permissions`: role and scope assignment foundation.
- `public.audit_logs`: auditable actions.
- Existing AI-related tables in the initial migration include `ai_companion_interactions`, `ai_learning_queue`, `ai_companion_memory` and `ai_knowledge_items`.
- Existing exchange foundations include `exchange_datasets`, `exchange_requests`, `exchange_exports` and `exchange_audit_logs`.

This is a repository-code inventory, not a claim that every table is correctly provisioned or that every policy is production-ready. Before implementing data access, inspect the live Supabase schema, grants, RLS policies, functions, deployment settings and existing pending migrations. Never infer production state from a SQL file alone.

The public website under `website/` is the public-experience layer. The operational RT/RW core and Windows release gates remain separate and must not be silently replaced by this initiative.

## 3. Logical layers

### A. Shared platform core
- Identity references and authenticated sessions.
- Canonical territory hierarchy and organization references.
- Role + scope + permission checks.
- Data classification, purpose and consent/other lawful-basis records where appropriate.
- Audit trail, retention policy, feature/module entitlement and service health.

### B. Program management
Common concepts shared across programs:
- Program definition, version, owner organization and jurisdiction.
- Goals, activities, schedule, geographic scope and target group.
- Indicators, baseline, target, actual result, evidence and reporting period.
- Funding/budget metadata only when authorized and appropriately classified.
- Source/provenance, verification state, approvals, corrections and publication state.
- Attachment metadata and object-storage reference; do not store large media binaries in relational rows.
- Links to other program/activity records, not copies of personal records.

### C. Domain-owned data
Each module owns its operational details and lifecycle. Shared program management should not become the system of record for medical records, cooperative ledgers, editorial drafts, education assessments or personal assistance dossiers.

### D. Public projection
Public pages read only explicitly published fields or reviewed aggregates. Public data should carry source, reporting period, jurisdiction, last-verified date and known limitations. Do not expose internal records by simply adding a frontend filter.

### E. Integration layer
Use server-validated APIs or narrowly scoped database access. Every exchange must declare consumer, purpose, scope, requested fields, classification, approver, expiration and audit event. Reuse existing exchange tables only after checking the live implementation and policy semantics.

## 4. Proposed program portfolio

| Domain module | Primary capability | Data boundary | Public outputs |
|---|---|---|---|
| Peta Program | Program registry, activities, goals, indicators and progress | Program-owned operational records | Approved goals, aggregate progress, sources |
| Jurnalisme Warga & Transparansi | Submissions, sources, fact-checking, corrections, editorial decisions | Private submissions/drafts separated from published articles | Reviewed and approved journalism |
| Pendidikan & Keterampilan | Courses, learning materials, attendance, assessment, credentials and portfolio | Learner records and assessments restricted by role | Course catalog and aggregate participation |
| Wisata Desa & Budaya | Destinations, events, guides, heritage, local stories | Contributor permissions, cultural/IP restrictions | Approved destination and event listings |
| Koperasi & Ekonomi Lokal | Cooperative information, member services, UMKM catalog and opportunities | Membership, transactions and finance restricted | Public catalog and approved aggregate reports |
| Ketahanan Pangan | Community gardens, food availability, farmer groups and food education | Household-level needs restricted | Aggregate food-resilience indicators |
| Lingkungan & Kebencanaan | Waste programs, environmental reports, risk education, preparedness and volunteer rosters | Reporter safety and sensitive site details considered | Verified advisories and aggregate progress |
| Aspirasi & Pengaduan | Ticketing, duplicate detection, routing and status tracking | Complainant identity and case details restricted | Redacted status and aggregate service metrics |
| Kesejahteraan & Kesehatan | Program participation, education, referral and aggregate service coverage | Health/benefit information highly restricted; no broad RT/RW access by default | Only authorized, sufficiently aggregated outputs |
| Sadar Hukum & Bantuan Rujukan | Legal literacy, verified source library, referral directory | Case details restricted; professional advice remains with authorized providers | General education and official source links |
| Inklusi & Aksesibilitas | Accessibility audits, barrier reports and accommodation requests | Disability/health details minimized and restricted | Verified accessibility information |
| Apresiasi Gotong Royong | Verified volunteer activity, contributions and recognition | No permanent moral score; no public shaming or rumor-based ranking | Opt-in recognition and aggregate volunteer impact |
| Arsip & Warisan Lokal | Community history, oral histories, local languages, crafts and heritage | Consent, copyright, cultural protocol and restricted knowledge | Approved materials with rights/provenance |
| Ketahanan Keluarga & Sosial | Family-support program navigation and community support referrals | Sensitive personal circumstances restricted | Public program availability and aggregate reach |
| Kesiapsiagaan Layanan Wilayah | Public facilities, maintenance requests and verified service status | Internal operational notes separated from public status | Approved service status and response metrics |

This portfolio is a roadmap, not a statement that modules are already implemented or that every service is within RT/RW authority.

## 5. Shared entity and reference rules

- Reuse canonical `territory_id`, `organization_id`, and authorized `person_id` references where present and semantically correct.
- Every domain record must identify its owning module and appropriate jurisdiction/scope.
- Do not copy names, national IDs, addresses, health data or financial details into program tables merely to simplify UI rendering.
- Use opaque identifiers in URLs and logs; avoid logging sensitive payloads.
- Separate public-safe summaries from private source records.
- Define lifecycle, retention and deletion/correction rules for every new data category before migration.
- Use controlled vocabularies and stable codes for indicators, status, module IDs and data classification.

## 6. Data classification and access

Suggested baseline labels: PUBLIC, INTERNAL, CONFIDENTIAL, SENSITIVE and HIGHLY_SENSITIVE. Classification must be attached to the dataset/field or record and enforced server-side.

Access should combine:
1. authenticated identity,
2. assigned role,
3. territorial/organizational scope,
4. permission,
5. data classification,
6. declared purpose and context,
7. lifecycle state.

RLS is mandatory for exposed Supabase tables. Policies must match the real role/scope model; `TO authenticated` alone is not authorization. Never disable RLS as a shortcut. Views, functions, Storage policies, exports and scheduled jobs require their own security review.

## 7. AI integration boundaries

AI is a cross-cutting service, not a privileged database owner. Each agent receives the minimum scoped tools needed for its task. The model must not receive raw sensitive records when a redacted aggregate or server-side function can meet the purpose. Knowledge retrieval must enforce source permissions before content is passed to a model.

AI can classify, summarize, compare, detect anomalies, suggest routing, draft code and prepare reports. Humans or authorized workflows retain decisions involving legal rights, eligibility, medical care, public publication, finance, discipline or destructive production changes.

## 8. Architecture and release phases

1. Inventory live schema, RLS, functions, current public website feeds and pending migrations.
2. Approve the data map and module ownership matrix.
3. Prototype program registry and indicator workflows on a development branch/environment.
4. Add one vertical slice end-to-end: create program → scope to territory → review → publish approved aggregate → audit.
5. Add shared AI knowledge and engineering agents in read-only/PR-first mode.
6. Add other domain modules incrementally, each with its own threat model and acceptance tests.
7. Consider physical database separation only after collecting usage, cost, risk and availability evidence.

## 9. Acceptance gates

- No duplicate canonical identity or territory records are introduced without a documented reason.
- No production migration is applied as part of this architecture-documentation phase.
- Each module has a named data owner, data classification, retention rule, access matrix and public projection contract.
- Cross-territory authorization tests and negative access tests pass before release.
- Published metrics have provenance, period, scope and verification state.
- The AI layer cannot bypass RLS or call privileged credentials from a browser.
- Existing Windows installer release blockers and manual acceptance gates remain independent and open until proven passed.
