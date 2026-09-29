# Phase 17 — Master Wilayah, User & Role Foundation

## Status
UI foundation implemented and released through GitHub Pages.

## Scope
- Master Wilayah reads the existing `public.territories` hierarchy.
- Role Registry reflects application role definitions.
- User & Role Assignment reads existing `public.role_assignments` for authenticated administrators.
- Administrator Preview remains demo-only and never creates production privileges.

## Security boundary
No browser-side privilege bypass, no direct Auth user administration, and no schema change in this phase. Production role assignment must be implemented server-side/Edge Function with RLS and audit controls.

## Next gate
Implement a server-side Administrator Access Management Edge Function for:
- list eligible Auth users
- assign role + territory scope
- deactivate/end assignment
- audit every access change
- prevent self-escalation and unsafe global scope
