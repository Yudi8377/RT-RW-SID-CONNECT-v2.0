-- RT/RW-SID CONNECT v2.x
-- AI Data Intake + Government Assistance Intelligence + Print/Queue foundation
-- Remote Supabase migration: ai_data_intake_assistance_v1

create extension if not exists pgcrypto;

create table if not exists public.data_intake_batches (
  id uuid primary key default gen_random_uuid(),
  territory_id uuid references public.territories(id),
  source_type text not null check (source_type in ('EXCEL','CSV','PDF','IMAGE','SCAN','MANUAL','API')),
  source_name text,
  status text not null default 'UPLOADED' check (status in ('UPLOADED','EXTRACTING','MAPPING','REVIEW','APPROVED','REJECTED','COMPLETED','FAILED')),
  row_count integer not null default 0,
  accepted_count integer not null default 0,
  review_count integer not null default 0,
  conflict_count integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.data_intake_records (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.data_intake_batches(id) on delete cascade,
  source_row_number integer,
  extracted_data jsonb not null default '{}'::jsonb,
  normalized_data jsonb not null default '{}'::jsonb,
  match_status text not null default 'UNMATCHED' check (match_status in ('UNMATCHED','MATCHED','POSSIBLE_DUPLICATE','CONFLICT','NEW_RECORD','REVIEW_REQUIRED')),
  confidence numeric(5,4),
  matched_person_id uuid references public.persons(id),
  matched_household_id uuid references public.households(id),
  review_notes text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.data_intake_field_mappings (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.data_intake_batches(id) on delete cascade,
  source_field text not null,
  target_field text not null,
  confidence numeric(5,4),
  mapping_source text not null default 'AI' check (mapping_source in ('AI','OPERATOR','SYSTEM')),
  approved boolean not null default false,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.source_documents (
  id uuid primary key default gen_random_uuid(),
  territory_id uuid references public.territories(id),
  person_id uuid references public.persons(id),
  household_id uuid references public.households(id),
  document_type text not null,
  file_name text,
  storage_path text,
  content_hash text,
  classification text not null default 'HIGHLY_SENSITIVE' check (classification in ('INTERNAL','CONFIDENTIAL','SENSITIVE','HIGHLY_SENSITIVE')),
  extraction_status text not null default 'PENDING' check (extraction_status in ('PENDING','PROCESSING','REVIEW','VERIFIED','REJECTED')),
  extracted_data jsonb not null default '{}'::jsonb,
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.government_programs (
  id uuid primary key default gen_random_uuid(),
  program_code text not null unique,
  program_name text not null,
  government_level text not null check (government_level in ('NATIONAL','PROVINCE','REGENCY_CITY','DISTRICT','VILLAGE')),
  issuing_authority text,
  official_source_url text,
  legal_basis jsonb not null default '[]'::jsonb,
  eligibility_summary text,
  status text not null default 'DRAFT' check (status in ('DRAFT','ACTIVE','SUSPENDED','EXPIRED','ARCHIVED')),
  effective_from date,
  effective_to date,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.government_program_rules (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.government_programs(id) on delete cascade,
  rule_code text not null,
  rule_type text not null check (rule_type in ('ELIGIBILITY','EXCLUSION','DOCUMENT','VERIFICATION','DISTRIBUTION','REPORTING')),
  rule_expression jsonb not null default '{}'::jsonb,
  explanation text,
  legal_reference jsonb not null default '{}'::jsonb,
  priority integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.assistance_applications (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.government_programs(id),
  territory_id uuid references public.territories(id),
  person_id uuid references public.persons(id),
  household_id uuid references public.households(id),
  eligibility_status text not null default 'REVIEW_REQUIRED' check (eligibility_status in ('ELIGIBLE','INELIGIBLE','REVIEW_REQUIRED','INCOMPLETE','CONFLICT')),
  eligibility_reasons jsonb not null default '[]'::jsonb,
  rule_snapshot jsonb not null default '{}'::jsonb,
  workflow_status text not null default 'SUBMITTED' check (workflow_status in ('SUBMITTED','RT_VERIFIED','RW_VERIFIED','VILLAGE_VALIDATED','APPROVED','REJECTED','DISTRIBUTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assistance_verifications (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.assistance_applications(id) on delete cascade,
  verification_level text not null check (verification_level in ('RT','RW','VILLAGE')),
  decision text not null check (decision in ('VERIFIED','REJECTED','RETURNED','NEEDS_FIELD_CHECK')),
  notes text,
  evidence jsonb not null default '[]'::jsonb,
  verified_by uuid references auth.users(id),
  verified_at timestamptz not null default now()
);

create table if not exists public.print_jobs (
  id uuid primary key default gen_random_uuid(),
  territory_id uuid references public.territories(id),
  job_type text not null check (job_type in ('QUEUE_CARD','ASSISTANCE_COUPON','RECIPIENT_CARD','DISTRIBUTION_LIST','RECEIPT','OTHER')),
  reference_type text,
  reference_id uuid,
  template_version text,
  quantity integer not null default 1,
  status text not null default 'READY' check (status in ('READY','PRINTED','CANCELLED')),
  payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.print_items (
  id uuid primary key default gen_random_uuid(),
  print_job_id uuid not null references public.print_jobs(id) on delete cascade,
  sequence_number integer not null,
  public_code text not null unique,
  qr_payload jsonb not null default '{}'::jsonb,
  linked_person_id uuid references public.persons(id),
  linked_household_id uuid references public.households(id),
  status text not null default 'ISSUED' check (status in ('ISSUED','CHECKED_IN','FULFILLED','VOID')),
  checked_in_at timestamptz,
  checked_in_by uuid references auth.users(id)
);

alter table public.data_intake_batches enable row level security;
alter table public.data_intake_records enable row level security;
alter table public.data_intake_field_mappings enable row level security;
alter table public.source_documents enable row level security;
alter table public.government_programs enable row level security;
alter table public.government_program_rules enable row level security;
alter table public.assistance_applications enable row level security;
alter table public.assistance_verifications enable row level security;
alter table public.print_jobs enable row level security;
alter table public.print_items enable row level security;

create index if not exists data_intake_records_batch_idx on public.data_intake_records(batch_id);
create index if not exists data_intake_records_person_idx on public.data_intake_records(matched_person_id);
create index if not exists data_intake_records_household_idx on public.data_intake_records(matched_household_id);
create index if not exists source_documents_person_idx on public.source_documents(person_id);
create index if not exists source_documents_household_idx on public.source_documents(household_id);
create index if not exists assistance_applications_program_idx on public.assistance_applications(program_id);
create index if not exists assistance_applications_household_idx on public.assistance_applications(household_id);
create index if not exists assistance_applications_person_idx on public.assistance_applications(person_id);
create index if not exists assistance_verifications_application_idx on public.assistance_verifications(application_id);
create index if not exists print_items_job_idx on public.print_items(print_job_id);
