# Territory-specific workspaces

## Product decision

RT/RW-SID CONNECT uses one shared application shell but separate role-specific workspaces. Each workspace has its own landing dashboard, navigation allowlist, action shortcuts, and scope-aware data access. A common shell is for accessibility and maintainability; it must not imply shared authority or shared data.

## Workspace map

| Role | Dedicated start page | Primary responsibilities |
|---|---|---|
| RT Operator | RT Digital | Resident/household records, letter requests, first-level verification, community agenda, RT reports |
| RW Reviewer | RW Review Center | Queue from assigned RT scope, review/correction, forwarding through the workflow |
| Village Validator | Desa/Kelurahan | Validate submissions, incoming documents, data quality, service monitoring |
| District Coordinator | Kecamatan Digital | Aggregated village/kelurahan reporting, service monitoring, escalations, district reports |
| Regency/City Administrator | Kabupaten/Kota Digital | Cross-district aggregate indicators, programs, regional infrastructure, executive reports |
| OPEN SID Umum | Public SID | Approved public information and permitted service tracking only |
| Platform Admin | Admin Control Center | Tenant, territory, role, governance and system operations; production authority still requires server-side authorization |

## Authorization rules

- The signup/login role picker is a navigation preference, not an authorization grant.
- A user must have an active role assignment and a valid territory scope before operational access is granted.
- PILOT_VIEWER has only the dashboard route. Without an assignment, the user sees an access-pending screen and cannot navigate to resident/RT/RW data modules.
- Row-level security and Edge Function authorization remain the source of truth. Hiding a menu item is not a security boundary.
- Regional dashboards must use scoped aggregate data. Do not display person-level data to district/regency roles by default.
- No production-looking KPIs may be fabricated. Until a scoped live query is connected and verified, show an unavailable/empty state rather than sample counts.
- The admin preview is a development-only demonstration. Its URL is guarded by the sessionStorage entry created by the landing-page preview action; do not remove that guard or allow preview code to query private production records.

## Release gates

1. Each role renderer and route mapping is covered by the territory workspace static checker.
2. JavaScript syntax and existing quality/security workflows pass.
3. Real counts and queues are enabled only after the underlying RLS policies, territory assignment model, and scoped queries are tested with separate test users for RT, RW, village, district, and regency.
4. Production migration and feature-flag changes require independent staging/runtime verification. This UI change does not apply database migrations or activate Trial/AI flags.
