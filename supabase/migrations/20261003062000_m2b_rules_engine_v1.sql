create table if not exists public.assistance_rule_evaluations (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.assistance_applications(id) on delete cascade,
  program_id uuid not null references public.government_programs(id),
  territory_id uuid not null references public.territories(id),
  candidate_status text not null default 'REVIEW_REQUIRED'
    check (candidate_status in ('CANDIDATE_MATCH','CANDIDATE_MISMATCH','REVIEW_REQUIRED')),
  rule_results jsonb not null default '[]'::jsonb,
  rule_snapshot jsonb not null default '{}'::jsonb,
  fact_keys jsonb not null default '[]'::jsonb,
  decision_support_only boolean not null default true,
  evaluated_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists assistance_rule_evaluations_application_idx on public.assistance_rule_evaluations(application_id, created_at desc);
create index if not exists assistance_rule_evaluations_territory_idx on public.assistance_rule_evaluations(territory_id, created_at desc);
alter table public.assistance_rule_evaluations enable row level security;
revoke all on public.assistance_rule_evaluations from anon;
grant select, insert on public.assistance_rule_evaluations to authenticated;
create policy "assistance rule evaluations scoped read" on public.assistance_rule_evaluations for select to authenticated
using (exists (select 1 from public.role_assignments ra where ra.user_id=(select auth.uid()) and ra.active=true and ra.scope_territory_id=assistance_rule_evaluations.territory_id));
create policy "assistance rule evaluations scoped insert" on public.assistance_rule_evaluations for insert to authenticated
with check (evaluated_by=(select auth.uid()) and exists (select 1 from public.role_assignments ra where ra.user_id=(select auth.uid()) and ra.active=true and ra.scope_territory_id=assistance_rule_evaluations.territory_id));