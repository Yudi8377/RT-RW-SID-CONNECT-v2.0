-- RT/RW-SID CONNECT v2.0
-- Community activity, arisan, RT/RW cashflow, socioeconomic assessment and GPFFE exchange foundation.
-- Applied to Supabase project gzdusguveeeflmlvvmwe on 2026-09-28.

create table if not exists public.community_events (
  id uuid primary key default gen_random_uuid(), territory_id uuid references public.territories(id),
  organization_id uuid references public.organizations(id),
  event_type text not null check (event_type in ('ARISAN','RUTINAN','PENGAJIAN','TAHLILAN','KERJA_BAKTI','POSYANDU','POSBINDU','RAPAT_RT','RAPAT_RW','GOTONG_ROYONG','OLAHRAGA','KEAMANAN','SOSIAL','LAINNYA')),
  name text not null, event_date date not null, location text,
  organizer_person_id uuid references public.persons(id), linked_death_person_id uuid references public.persons(id),
  linked_household_id uuid references public.households(id),
  status text not null default 'PLANNED' check (status in ('PLANNED','ONGOING','COMPLETED','CANCELLED')),
  notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(), event_id uuid not null references public.community_events(id) on delete cascade,
  person_id uuid references public.persons(id), role text,
  attendance_status text check (attendance_status in ('INVITED','PRESENT','ABSENT','EXCUSED')),
  contribution_amount numeric(18,2) not null default 0, notes text, created_at timestamptz not null default now(),
  unique(event_id, person_id)
);
create table if not exists public.death_records (
  id uuid primary key default gen_random_uuid(), person_id uuid not null references public.persons(id),
  household_id uuid references public.households(id), date_of_death date not null, place_of_death text,
  cause_category text, family_contact_person_id uuid references public.persons(id),
  verification_status text not null default 'DRAFT' check (verification_status in ('DRAFT','SUBMITTED','RT_VERIFIED','RW_REVIEW','VILLAGE_VALIDATED','AUTHORIZED')),
  source_document_path text, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.arisan_groups (
  id uuid primary key default gen_random_uuid(), territory_id uuid references public.territories(id),
  organization_id uuid references public.organizations(id), name text not null, cycle text not null,
  contribution_amount numeric(18,2) not null default 0, start_date date, end_date date,
  status text not null default 'ACTIVE' check (status in ('DRAFT','ACTIVE','PAUSED','CLOSED')),
  notes text, created_at timestamptz not null default now()
);
create table if not exists public.arisan_members (
  id uuid primary key default gen_random_uuid(), arisan_group_id uuid not null references public.arisan_groups(id) on delete cascade,
  person_id uuid references public.persons(id), join_date date not null default current_date,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','PAUSED','EXITED')), payout_sequence integer, notes text,
  unique(arisan_group_id, person_id)
);
create table if not exists public.arisan_transactions (
  id uuid primary key default gen_random_uuid(), arisan_group_id uuid not null references public.arisan_groups(id) on delete cascade,
  member_id uuid references public.arisan_members(id), transaction_date date not null default current_date,
  transaction_type text not null check (transaction_type in ('CONTRIBUTION','PAYOUT','FEE','ADJUSTMENT')),
  amount numeric(18,2) not null check (amount >= 0), period text, reference text, notes text, created_at timestamptz not null default now()
);
create table if not exists public.rt_rw_cash_accounts (
  id uuid primary key default gen_random_uuid(), territory_id uuid references public.territories(id),
  organization_id uuid references public.organizations(id), account_code text not null, account_name text not null,
  account_type text not null check (account_type in ('CASH','BANK','RECEIVABLE','PAYABLE','FUND','OTHER')),
  opening_balance numeric(18,2) not null default 0, status text not null default 'ACTIVE' check (status in ('ACTIVE','CLOSED')),
  created_at timestamptz not null default now(), unique(organization_id, account_code)
);
create table if not exists public.rt_rw_cash_transactions (
  id uuid primary key default gen_random_uuid(), account_id uuid not null references public.rt_rw_cash_accounts(id) on delete cascade,
  transaction_date date not null default current_date, transaction_code text not null,
  direction text not null check (direction in ('IN','OUT')), category text not null, description text not null,
  amount numeric(18,2) not null check (amount >= 0), counterparty_person_id uuid references public.persons(id),
  event_id uuid references public.community_events(id), reference text, evidence_path text,
  approval_status text not null default 'DRAFT' check (approval_status in ('DRAFT','SUBMITTED','REVIEW','APPROVED','REJECTED')),
  created_by uuid, created_at timestamptz not null default now()
);
create table if not exists public.social_economic_observations (
  id uuid primary key default gen_random_uuid(), territory_id uuid references public.territories(id),
  household_id uuid references public.households(id), person_id uuid references public.persons(id),
  observation_date date not null default current_date,
  dimension text not null check (dimension in ('INCOME','EMPLOYMENT','EDUCATION','HOUSING','ELECTRICITY','ASSET','HEALTH','FOOD_SECURITY','DEPENDENCY','SOCIAL_PROTECTION','BUSINESS','EXPENDITURE','OTHER')),
  metric text not null, value_numeric numeric(18,4), value_text text,
  source_type text not null check (source_type in ('SELF_REPORTED','RT_OBSERVATION','RW_REVIEW','VILLAGE_VALIDATION','DOCUMENT','SYSTEM_DERIVED','OFFICIAL_EXTERNAL')),
  verification_status text not null default 'DRAFT' check (verification_status in ('DRAFT','SUBMITTED','RT_VERIFIED','RW_REVIEW','VILLAGE_VALIDATED','AUTHORIZED')),
  classification text not null default 'SENSITIVE' check (classification in ('INTERNAL','CONFIDENTIAL','SENSITIVE','HIGHLY_SENSITIVE')),
  notes text, created_at timestamptz not null default now()
);
create table if not exists public.social_economic_assessments (
  id uuid primary key default gen_random_uuid(), household_id uuid references public.households(id),
  territory_id uuid references public.territories(id), assessment_date date not null default current_date,
  methodology_version text not null, local_observation_score numeric(8,4), official_reference text,
  official_decile integer check (official_decile between 1 and 10),
  vulnerability_band text check (vulnerability_band in ('VERY_LOW','LOW','MEDIUM','HIGH','VERY_HIGH','UNCLASSIFIED')),
  ai_analysis text, ai_confidence numeric(5,2), status text not null default 'DRAFT' check (status in ('DRAFT','REVIEW','VALIDATED','AUTHORIZED')),
  human_validator uuid, notes text, created_at timestamptz not null default now()
);
create table if not exists public.social_economic_evidence (
  id uuid primary key default gen_random_uuid(), assessment_id uuid references public.social_economic_assessments(id) on delete cascade,
  observation_id uuid references public.social_economic_observations(id) on delete cascade,
  evidence_type text not null check (evidence_type in ('PHOTO','DOCUMENT','VIDEO','FIELD_NOTE','OTHER')),
  storage_path text not null, captured_at timestamptz, captured_by uuid,
  consent_status text not null default 'PENDING' check (consent_status in ('PENDING','GRANTED','NOT_REQUIRED','REFUSED')),
  classification text not null default 'HIGHLY_SENSITIVE' check (classification in ('CONFIDENTIAL','SENSITIVE','HIGHLY_SENSITIVE')),
  verification_status text not null default 'UNVERIFIED' check (verification_status in ('UNVERIFIED','RT_VERIFIED','RW_REVIEW','VILLAGE_VALIDATED','AUTHORIZED')),
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.economic_analysis_snapshots (
  id uuid primary key default gen_random_uuid(), territory_id uuid references public.territories(id),
  period_start date not null, period_end date not null, metric_code text not null, metric_value numeric(20,4),
  methodology_version text not null, source_lineage jsonb not null default '{}'::jsonb,
  classification text not null default 'INTERNAL' check (classification in ('PUBLIC','INTERNAL','CONFIDENTIAL','SENSITIVE')),
  created_at timestamptz not null default now()
);
create table if not exists public.gpffe_economic_exchange (
  id uuid primary key default gen_random_uuid(), snapshot_id uuid references public.economic_analysis_snapshots(id),
  dataset_id uuid references public.exchange_datasets(id), export_id uuid references public.exchange_exports(id),
  purpose text not null, scope text not null, classification text not null check (classification in ('PUBLIC','INTERNAL','CONFIDENTIAL','SENSITIVE')),
  aggregate_only boolean not null default true, record_count integer not null default 0,
  lineage jsonb not null default '{}'::jsonb, approval_status text not null default 'DRAFT' check (approval_status in ('DRAFT','REVIEW','APPROVED','REJECTED')),
  created_at timestamptz not null default now()
);
create index if not exists idx_events_territory_date on public.community_events(territory_id,event_date);
create index if not exists idx_events_death on public.community_events(linked_death_person_id);
create index if not exists idx_participants_event on public.event_participants(event_id);
create index if not exists idx_death_person_date on public.death_records(person_id,date_of_death);
create index if not exists idx_arisan_member_group on public.arisan_members(arisan_group_id);
create index if not exists idx_arisan_tx_group_date on public.arisan_transactions(arisan_group_id,transaction_date);
create index if not exists idx_cash_tx_account_date on public.rt_rw_cash_transactions(account_id,transaction_date);
create index if not exists idx_observations_household_date on public.social_economic_observations(household_id,observation_date);
create index if not exists idx_assessments_household_date on public.social_economic_assessments(household_id,assessment_date);
create index if not exists idx_evidence_assessment on public.social_economic_evidence(assessment_id);
create index if not exists idx_econ_snapshots_territory_period on public.economic_analysis_snapshots(territory_id,period_start,period_end);
create index if not exists idx_gpffe_exchange_snapshot on public.gpffe_economic_exchange(snapshot_id);
alter table public.community_events enable row level security;
alter table public.event_participants enable row level security;
alter table public.death_records enable row level security;
alter table public.arisan_groups enable row level security;
alter table public.arisan_members enable row level security;
alter table public.arisan_transactions enable row level security;
alter table public.rt_rw_cash_accounts enable row level security;
alter table public.rt_rw_cash_transactions enable row level security;
alter table public.social_economic_observations enable row level security;
alter table public.social_economic_assessments enable row level security;
alter table public.social_economic_evidence enable row level security;
alter table public.economic_analysis_snapshots enable row level security;
alter table public.gpffe_economic_exchange enable row level security;
create or replace view public.v_arisan_summary with (security_invoker=true) as
select g.id,g.name,g.contribution_amount,g.status,count(distinct m.id) as member_count,
coalesce(sum(case when t.transaction_type='CONTRIBUTION' then t.amount else 0 end),0) as total_contribution,
coalesce(sum(case when t.transaction_type='PAYOUT' then t.amount else 0 end),0) as total_payout,
coalesce(sum(case when t.transaction_type='CONTRIBUTION' then t.amount else 0 end),0)-coalesce(sum(case when t.transaction_type='PAYOUT' then t.amount else 0 end),0) as net_balance
from public.arisan_groups g left join public.arisan_members m on m.arisan_group_id=g.id left join public.arisan_transactions t on t.arisan_group_id=g.id
group by g.id,g.name,g.contribution_amount,g.status;
create or replace view public.v_rt_rw_cashflow_monthly with (security_invoker=true) as
select a.id,a.account_name,date_trunc('month',t.transaction_date)::date as month,
sum(case when t.direction='IN' then t.amount else 0 end) as cash_in,
sum(case when t.direction='OUT' then t.amount else 0 end) as cash_out,
sum(case when t.direction='IN' then t.amount else -t.amount end) as net_cashflow
from public.rt_rw_cash_accounts a join public.rt_rw_cash_transactions t on t.account_id=a.id
where t.approval_status='APPROVED'
group by a.id,a.account_name,date_trunc('month',t.transaction_date);
revoke all on public.v_arisan_summary from anon, authenticated;
revoke all on public.v_rt_rw_cashflow_monthly from anon, authenticated;
