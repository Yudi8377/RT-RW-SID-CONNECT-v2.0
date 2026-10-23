-- Scope-validated aggregate RPC for Kecamatan and Kabupaten/Kota dashboards.
-- Must be applied and security-tested before regional dashboards are treated as live.

create or replace function public.regional_dashboard_summary(p_scope_territory_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_role_code text;
  v_scope_type text;
  v_scope_name text;
  v_territory_count bigint := 0;
  v_service_total bigint := 0;
  v_service_open bigint := 0;
  v_infrastructure bigint := 0;
  v_assistance bigint := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select r.role_code, t.territory_type, t.name
    into v_role_code, v_scope_type, v_scope_name
  from public.role_assignments ra
  join public.roles r on r.id = ra.role_id
  join public.territories t on t.id = ra.scope_territory_id
  where ra.user_id = v_user_id
    and ra.scope_territory_id = p_scope_territory_id
    and ra.active = true
    and (ra.starts_at is null or ra.starts_at <= now())
    and (ra.ends_at is null or ra.ends_at > now())
    and ((r.role_code = 'DISTRICT_COORDINATOR' and t.territory_type = 'DISTRICT')
      or (r.role_code = 'REGENCY_CITY_ADMIN' and t.territory_type = 'REGENCY_CITY'))
  order by ra.created_at desc
  limit 1;

  if v_role_code is null then
    raise exception 'No active regional role assignment for requested scope' using errcode = '42501';
  end if;

  with recursive descendants(id, parent_id, territory_type) as (
    select t.id, t.parent_id, t.territory_type
    from public.territories t
    where t.id = p_scope_territory_id and t.active = true
    union all
    select child.id, child.parent_id, child.territory_type
    from public.territories child
    join descendants parent on child.parent_id = parent.id
    where child.active = true
  )
  select count(*) into v_territory_count from descendants where id <> p_scope_territory_id;

  with recursive descendants(id) as (
    select t.id from public.territories t where t.id = p_scope_territory_id and t.active = true
    union all
    select child.id from public.territories child join descendants parent on child.parent_id = parent.id where child.active = true
  )
  select count(*) into v_service_total
  from public.rt_service_requests s where s.territory_id in (select id from descendants);

  with recursive descendants(id) as (
    select t.id from public.territories t where t.id = p_scope_territory_id and t.active = true
    union all
    select child.id from public.territories child join descendants parent on child.parent_id = parent.id where child.active = true
  )
  select count(*) into v_service_open
  from public.rt_service_requests s
  where s.territory_id in (select id from descendants)
    and lower(coalesce(s.status, '')) not in ('completed','closed','rejected','cancelled','resolved','done');

  with recursive descendants(id) as (
    select t.id from public.territories t where t.id = p_scope_territory_id and t.active = true
    union all
    select child.id from public.territories child join descendants parent on child.parent_id = parent.id where child.active = true
  )
  select count(*) into v_infrastructure
  from public.rt_infrastructure_assets a where a.territory_id in (select id from descendants);

  with recursive descendants(id) as (
    select t.id from public.territories t where t.id = p_scope_territory_id and t.active = true
    union all
    select child.id from public.territories child join descendants parent on child.parent_id = parent.id where child.active = true
  )
  select count(*) into v_assistance
  from public.assistance_applications a where a.territory_id in (select id from descendants);

  return jsonb_build_object(
    'scope_name', v_scope_name,
    'scope_type', v_scope_type,
    'territory_count', v_territory_count,
    'service_requests_total', v_service_total,
    'service_requests_open', v_service_open,
    'infrastructure_assets', v_infrastructure,
    'assistance_applications', v_assistance,
    'generated_at', now()
  );
end;
$function$;

revoke all on function public.regional_dashboard_summary(uuid) from public;
revoke all on function public.regional_dashboard_summary(uuid) from anon;
grant execute on function public.regional_dashboard_summary(uuid) to authenticated;