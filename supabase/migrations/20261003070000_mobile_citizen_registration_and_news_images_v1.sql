create table if not exists public.citizen_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  requested_role text not null default 'WARGA' check (requested_role in ('WARGA','RT','RW')),
  approval_status text not null default 'AUTO_APPROVED' check (approval_status in ('AUTO_APPROVED','PENDING_REVIEW','REJECTED')),
  village_label text,
  rt_number text,
  rw_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.citizen_profiles enable row level security;
drop policy if exists citizen_profiles_select_own on public.citizen_profiles;
create policy citizen_profiles_select_own on public.citizen_profiles for select to authenticated using (user_id = auth.uid());
drop policy if exists citizen_profiles_update_own on public.citizen_profiles;
create policy citizen_profiles_update_own on public.citizen_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, update on public.citizen_profiles to authenticated;
revoke all on public.citizen_profiles from anon;
insert into public.roles (role_code, role_name, critical) select 'WARGA','Warga',false where not exists (select 1 from public.roles where role_code='WARGA');
create or replace function public.handle_new_citizen_profile() returns trigger language plpgsql security definer set search_path=public as $$
declare v_role_id uuid; v_requested_role text; v_status text;
begin
  v_requested_role:=upper(coalesce(new.raw_user_meta_data->>'requested_role','WARGA'));
  if v_requested_role not in ('WARGA','RT','RW') then v_requested_role:='WARGA'; end if;
  v_status:=case when v_requested_role='WARGA' then 'AUTO_APPROVED' else 'PENDING_REVIEW' end;
  insert into public.citizen_profiles(user_id,full_name,phone,requested_role,approval_status,village_label,rt_number,rw_number)
  values(new.id,coalesce(nullif(new.raw_user_meta_data->>'full_name',''),split_part(coalesce(new.email,''),'@',1)),nullif(new.raw_user_meta_data->>'phone',''),v_requested_role,v_status,nullif(new.raw_user_meta_data->>'village_label',''),nullif(new.raw_user_meta_data->>'rt_number',''),nullif(new.raw_user_meta_data->>'rw_number',''))
  on conflict(user_id) do update set full_name=excluded.full_name,phone=excluded.phone,requested_role=excluded.requested_role,village_label=excluded.village_label,rt_number=excluded.rt_number,rw_number=excluded.rw_number,updated_at=now();
  if v_requested_role='WARGA' then
    select id into v_role_id from public.roles where role_code='WARGA' limit 1;
    if v_role_id is not null then
      insert into public.role_assignments(user_id,role_id,active) select new.id,v_role_id,true where not exists(select 1 from public.role_assignments where user_id=new.id and role_id=v_role_id and active=true);
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists on_auth_user_created_citizen_profile on auth.users;
create trigger on_auth_user_created_citizen_profile after insert on auth.users for each row execute function public.handle_new_citizen_profile();
alter table public.public_announcements add column if not exists image_url text;
update public.public_announcements set image_url=case when category ilike '%DESA%' then 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80' when category ilike '%EKONOMI%' then 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80' else 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80' end where image_url is null;