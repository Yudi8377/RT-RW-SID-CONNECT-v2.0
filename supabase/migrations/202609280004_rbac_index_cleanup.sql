drop policy if exists "users can read own residencies" on public.residencies;
create index idx_households_address on public.households(address_id);
create index idx_organizations_territory on public.organizations(territory_id);
create index idx_role_assignments_role on public.role_assignments(role_id);
create index idx_role_assignments_organization on public.role_assignments(organization_id);
create index idx_role_permissions_permission on public.role_permissions(permission_id);