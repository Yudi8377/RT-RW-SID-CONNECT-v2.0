-- RT/RW CONNECT -> SAD Gate B foundation.
-- This migration creates a quarantined outbox only. It does not transmit data.
create extension if not exists pgcrypto;

create table if not exists public.sad_integration_mappings (
  id uuid primary key default gen_random_uuid(),
  source_system text not null default 'RT_RW_SID_CONNECT' check (source_system = 'RT_RW_SID_CONNECT'),
  source_organization_id uuid not null references public.organizations(id) on delete restrict,
  source_territory_id uuid not null references public.territories(id) on delete restrict,
  target_organization_ref text not null check (length(target_organization_ref) between 1 and 120),
  target_territory_ref text not null check (length(target_territory_ref) between 1 and 120),
  active boolean not null default false,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  approval_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_system, source_organization_id, source_territory_id),
  check ((active = false) or (approved_by is not null and approved_at is not null))
);

create table if not exists public.sad_integration_outbox (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique default gen_random_uuid(),
  contract_version text not null default 'rtrw-sad/v1' check (contract_version = 'rtrw-sad/v1'),
  source_system text not null default 'RT_RW_SID_CONNECT' check (source_system = 'RT_RW_SID_CONNECT'),
  event_type text not null check (event_type in ('service_request.submitted')),
  source_record_id uuid not null,
  source_updated_at timestamptz not null,
  source_organization_id uuid not null references public.organizations(id) on delete restrict,
  source_territory_id uuid not null references public.territories(id) on delete restrict,
  target_organization_ref text not null,
  target_territory_ref text not null,
  classification text not null default 'INTERNAL' check (classification in ('PUBLIC','INTERNAL','CONFIDENTIAL','SENSITIVE')),
  purpose_code text not null default 'VILLAGE_SERVICE_PROCESSING' check (purpose_code = 'VILLAGE_SERVICE_PROCESSING'),
  verification_status text not null check (verification_status in ('SUBMITTED','RT_VERIFIED','RW_REVIEWED','VILLAGE_REVIEW')),
  payload jsonb not null,
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  status text not null default 'PENDING' check (status in ('PENDING','DELIVERED','ACCEPTED','REJECTED','RETRYING','CONFLICT','DEAD_LETTER')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  last_error_code text,
  acknowledgement jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(source_system, event_type, source_record_id, source_updated_at)
);

create index if not exists sad_outbox_pending_idx
  on public.sad_integration_outbox(status, next_attempt_at, created_at)
  where status in ('PENDING','RETRYING');

create index if not exists sad_outbox_source_scope_idx
  on public.sad_integration_outbox(source_organization_id, source_territory_id, created_at desc);

alter table public.sad_integration_mappings enable row level security;
alter table public.sad_integration_outbox enable row level security;

revoke all on table public.sad_integration_mappings from anon, authenticated;
revoke all on table public.sad_integration_outbox from anon, authenticated;
grant all on table public.sad_integration_mappings to service_role;
grant all on table public.sad_integration_outbox to service_role;

create or replace function public.sad_integration_outbox_audit_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs(
    actor_user_id, action, entity_type, entity_id, scope_territory_id,
    after_data, reason, source, authority
  ) values (
    new.created_by,
    'SAD_INTEGRATION_EVENT_QUEUED',
    'sad_integration_outbox',
    new.id,
    new.source_territory_id,
    jsonb_build_object('event_id', new.event_id, 'event_type', new.event_type, 'status', new.status),
    'Minimized service-request event staged for approved SAD mapping; no network delivery performed.',
    'SAD_INTEGRATION_OUTBOX',
    'SAD_INTEGRATION_OUTBOX'
  );
  return new;
end;
$$;

drop trigger if exists sad_integration_outbox_audit_insert_trigger on public.sad_integration_outbox;
create trigger sad_integration_outbox_audit_insert_trigger
after insert on public.sad_integration_outbox
for each row execute function public.sad_integration_outbox_audit_insert();

comment on table public.sad_integration_mappings is
  'Explicitly approved source-to-SAD scope mapping. Inactive by default; no automatic territory creation.';
comment on table public.sad_integration_outbox is
  'Minimized, audited source events staged for SAD integration. Queue only; no dispatcher is enabled by this migration.';
