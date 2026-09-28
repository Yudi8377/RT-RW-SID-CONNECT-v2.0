-- RT/RW–SID CONNECT v2.0 pilot seed
insert into public.roles (role_code, role_name, critical)
values
('PILOT_VIEWER','Pilot Viewer',false),
('RT_OPERATOR','RT Operator',false),
('RW_REVIEWER','RW Reviewer',false),
('VILLAGE_VALIDATOR','Village Validator',true),
('PLATFORM_ADMIN','Platform Administrator',true)
on conflict (role_code) do update set role_name=excluded.role_name, critical=excluded.critical;

insert into public.permissions (permission_code, permission_name, critical)
values
('workspace.read','Read assigned workspace',false),
('demo.request.create','Create pilot request',false),
('workflow.verify','Verify workflow item',true),
('workflow.review','Review workflow item',true),
('workflow.validate','Validate workflow item',true),
('admin.manage','Manage platform configuration',true)
on conflict (permission_code) do update set permission_name=excluded.permission_name, critical=excluded.critical;

insert into public.territories (parent_id,territory_type,code,name)
select null,'PROVINCE','PILOT-ID-JB','Pilot Jawa Barat'
where not exists (select 1 from public.territories where code='PILOT-ID-JB');

with p as (select id from public.territories where code='PILOT-ID-JB' limit 1)
insert into public.territories (parent_id,territory_type,code,name)
select p.id,'REGENCY_CITY','PILOT-KAB','Kabupaten Pilot' from p
where not exists (select 1 from public.territories where code='PILOT-KAB');

with p as (select id from public.territories where code='PILOT-KAB' limit 1)
insert into public.territories (parent_id,territory_type,code,name)
select p.id,'DISTRICT','PILOT-KEC','Kecamatan Pilot' from p
where not exists (select 1 from public.territories where code='PILOT-KEC');

with p as (select id from public.territories where code='PILOT-KEC' limit 1)
insert into public.territories (parent_id,territory_type,code,name)
select p.id,'VILLAGE','PILOT-DESA','Desa Pilot' from p
where not exists (select 1 from public.territories where code='PILOT-DESA');

insert into public.organizations (organization_type,name,territory_id)
select 'VILLAGE','Desa Pilot',id from public.territories where code='PILOT-DESA'
and not exists (select 1 from public.organizations where name='Desa Pilot');

insert into public.role_permissions(role_id,permission_id)
select r.id,p.id from public.roles r cross join public.permissions p
where r.role_code='PILOT_VIEWER' and p.permission_code in ('workspace.read','demo.request.create')
on conflict do nothing;