-- Regional dashboard role foundation for RT/RW-SID CONNECT.
-- Additive only: no existing data is deleted or modified.
-- Grants are intentionally read-oriented; data access remains governed by RLS and territory scope.

insert into public.roles (role_code, role_name, critical)
values
  ('DISTRICT_COORDINATOR', 'Kecamatan Coordinator', true),
  ('REGENCY_CITY_ADMIN', 'Kabupaten/Kota Regional Administrator', true)
on conflict (role_code) do update
set role_name = excluded.role_name, critical = excluded.critical;

insert into public.permissions (permission_code, permission_name, critical)
values
  ('regional.dashboard.read', 'Read regional dashboard within assigned territory scope', false),
  ('regional.report.read', 'Read regional aggregate reports within assigned territory scope', false),
  ('regional.program.review', 'Review regional program information within assigned territory scope', true)
on conflict (permission_code) do update
set permission_name = excluded.permission_name, critical = excluded.critical;

-- The new roles receive only read-oriented dashboard permissions by default.
-- Program review remains unassigned until a deployment owner approves its policy.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.permission_code in ('workspace.read', 'regional.dashboard.read', 'regional.report.read')
where r.role_code in ('DISTRICT_COORDINATOR', 'REGENCY_CITY_ADMIN')
on conflict do nothing;