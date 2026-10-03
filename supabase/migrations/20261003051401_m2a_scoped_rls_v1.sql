-- RT/RW-SID CONNECT v2.x
-- M2-A scoped RLS for intake, assistance and print workflows.
-- Keep anonymous table access revoked; authenticated access is territory-scoped.

revoke all on table public.data_intake_batches, public.data_intake_records, public.data_intake_field_mappings,
  public.source_documents, public.government_programs, public.government_program_rules,
  public.assistance_applications, public.assistance_verifications, public.print_jobs, public.print_items
from anon;

grant select, insert, update on public.data_intake_batches to authenticated;
grant select, insert, update on public.data_intake_records to authenticated;
grant select, insert, update on public.data_intake_field_mappings to authenticated;
grant select, insert, update on public.source_documents to authenticated;
grant select on public.government_programs, public.government_program_rules to authenticated;
grant select, insert, update on public.assistance_applications to authenticated;
grant select, insert, update on public.assistance_verifications to authenticated;
grant select, insert, update on public.print_jobs, public.print_items to authenticated;

create policy "intake batches scoped read" on public.data_intake_batches for select to authenticated using (
  created_by = (select auth.uid()) or exists (
    select 1 from public.role_assignments ra
    where ra.user_id = (select auth.uid()) and ra.active = true and ra.scope_territory_id = data_intake_batches.territory_id
  )
);
create policy "intake batches scoped insert" on public.data_intake_batches for insert to authenticated with check (
  created_by = (select auth.uid()) and territory_id is not null and exists (
    select 1 from public.role_assignments ra
    where ra.user_id = (select auth.uid()) and ra.active = true and ra.scope_territory_id = data_intake_batches.territory_id
  )
);
create policy "intake batches scoped update" on public.data_intake_batches for update to authenticated
using (
  created_by = (select auth.uid()) or exists (
    select 1 from public.role_assignments ra
    where ra.user_id = (select auth.uid()) and ra.active = true and ra.scope_territory_id = data_intake_batches.territory_id
  )
) with check (
  territory_id is not null and exists (
    select 1 from public.role_assignments ra
    where ra.user_id = (select auth.uid()) and ra.active = true and ra.scope_territory_id = data_intake_batches.territory_id
  )
);

create policy "intake records scoped read" on public.data_intake_records for select to authenticated using (
  exists (select 1 from public.data_intake_batches b where b.id = data_intake_records.batch_id and (
    b.created_by = (select auth.uid()) or exists (
      select 1 from public.role_assignments ra where ra.user_id = (select auth.uid()) and ra.active = true and ra.scope_territory_id = b.territory_id
    )
  ))
);
create policy "intake records scoped insert" on public.data_intake_records for insert to authenticated with check (
  exists (select 1 from public.data_intake_batches b where b.id = data_intake_records.batch_id and (
    b.created_by = (select auth.uid()) or exists (
      select 1 from public.role_assignments ra where ra.user_id = (select auth.uid()) and ra.active = true and ra.scope_territory_id = b.territory_id
    )
  ))
);
create policy "intake records scoped update" on public.data_intake_records for update to authenticated
using (
  exists (select 1 from public.data_intake_batches b where b.id = data_intake_records.batch_id and (
    b.created_by = (select auth.uid()) or exists (
      select 1 from public.role_assignments ra where ra.user_id = (select auth.uid()) and ra.active = true and ra.scope_territory_id = b.territory_id
    )
  ))
) with check (
  exists (select 1 from public.data_intake_batches b where b.id = data_intake_records.batch_id and (
    b.created_by = (select auth.uid()) or exists (
      select 1 from public.role_assignments ra where ra.user_id = (select auth.uid()) and ra.active = true and ra.scope_territory_id = b.territory_id
    )
  ))
);

create policy "intake mappings scoped read" on public.data_intake_field_mappings for select to authenticated using (
  exists (select 1 from public.data_intake_batches b where b.id = data_intake_field_mappings.batch_id and (
    b.created_by = (select auth.uid()) or exists (
      select 1 from public.role_assignments ra where ra.user_id = (select auth.uid()) and ra.active = true and ra.scope_territory_id = b.territory_id
    )
  ))
);
create policy "intake mappings scoped insert" on public.data_intake_field_mappings for insert to authenticated with check (
  exists (select 1 from public.data_intake_batches b where b.id = data_intake_field_mappings.batch_id and (
    b.created_by = (select auth.uid()) or exists (
      select 1 from public.role_assignments ra where ra.user_id = (select auth.uid()) and ra.active = true and ra.scope_territory_id = b.territory_id
    )
  ))
);
create policy "intake mappings scoped update" on public.data_intake_field_mappings for update to authenticated
using (
  exists (select 1 from public.data_intake_batches b where b.id = data_intake_field_mappings.batch_id and (
    b.created_by = (select auth.uid()) or exists (
      select 1 from public.role_assignments ra where ra.user_id = (select auth.uid()) and ra.active = true and ra.scope_territory_id = b.territory_id
    )
  ))
) with check (
  exists (select 1 from public.data_intake_batches b where b.id = data_intake_field_mappings.batch_id and (
    b.created_by = (select auth.uid()) or exists (
      select 1 from public.role_assignments ra where ra.user_id = (select auth.uid()) and ra.active = true and ra.scope_territory_id = b.territory_id
    )
  ))
);

create policy "source documents scoped read" on public.source_documents for select to authenticated using (
  created_by = (select auth.uid()) or exists (
    select 1 from public.role_assignments ra where ra.user_id = (select auth.uid()) and ra.active = true and ra.scope_territory_id = source_documents.territory_id
  )
);
create policy "source documents scoped insert" on public.source_documents for insert to authenticated with check (
  created_by = (select auth.uid()) and territory_id is not null and exists (
    select 1 from public.role_assignments ra where ra.user_id = (select auth.uid()) and ra.active = true and ra.scope_territory_id = source_documents.territory_id
  )
);
create policy "source documents scoped update" on public.source_documents for update to authenticated
using (
  created_by = (select auth.uid()) or exists (
    select 1 from public.role_assignments ra where ra.user_id = (select auth.uid()) and ra.active = true and ra.scope_territory_id = source_documents.territory_id
  )
) with check (
  territory_id is not null and exists (
    select 1 from public.role_assignments ra where ra.user_id = (select auth.uid()) and ra.active = true and ra.scope_territory_id = source_documents.territory_id
  )
);

create policy "government programs authenticated read" on public.government_programs for select to authenticated using (true);
create policy "government program rules authenticated read" on public.government_program_rules for select to authenticated using (true);

create policy "assistance applications scoped read" on public.assistance_applications for select to authenticated using (
  exists (select 1 from public.role_assignments ra where ra.user_id = (select auth.uid()) and ra.active = true and ra.scope_territory_id = assistance_applications.territory_id)
);
create policy "assistance applications scoped insert" on public.assistance_applications for insert to authenticated with check (
  territory_id is not null and exists (select 1 from public.role_assignments ra where ra.user_id = (select auth.uid()) and ra.active = true and ra.scope_territory_id = assistance_applications.territory_id)
);
create policy "assistance applications scoped update" on public.assistance_applications for update to authenticated
using (exists (select 1 from public.role_assignments ra where ra.user_id = (select auth.uid()) and ra.active = true and ra.scope_territory_id = assistance_applications.territory_id))
with check (territory_id is not null and exists (select 1 from public.role_assignments ra where ra.user_id = (select auth.uid()) and ra.active = true and ra.scope_territory_id = assistance_applications.territory_id));

create policy "assistance verifications scoped read" on public.assistance_verifications for select to authenticated using (
  exists (
    select 1 from public.assistance_applications a join public.role_assignments ra on ra.scope_territory_id = a.territory_id
    where a.id = assistance_verifications.application_id and ra.user_id = (select auth.uid()) and ra.active = true
  )
);
create policy "assistance verifications scoped insert" on public.assistance_verifications for insert to authenticated with check (
  verified_by = (select auth.uid()) and exists (
    select 1 from public.assistance_applications a join public.role_assignments ra on ra.scope_territory_id = a.territory_id
    where a.id = assistance_verifications.application_id and ra.user_id = (select auth.uid()) and ra.active = true
  )
);
create policy "assistance verifications scoped update" on public.assistance_verifications for update to authenticated
using (exists (
  select 1 from public.assistance_applications a join public.role_assignments ra on ra.scope_territory_id = a.territory_id
  where a.id = assistance_verifications.application_id and ra.user_id = (select auth.uid()) and ra.active = true
)) with check (
  verified_by = (select auth.uid()) and exists (
    select 1 from public.assistance_applications a join public.role_assignments ra on ra.scope_territory_id = a.territory_id
    where a.id = assistance_verifications.application_id and ra.user_id = (select auth.uid()) and ra.active = true
  )
);

create policy "print jobs scoped read" on public.print_jobs for select to authenticated using (
  created_by = (select auth.uid()) or exists (
    select 1 from public.role_assignments ra where ra.user_id = (select auth.uid()) and ra.active = true and ra.scope_territory_id = print_jobs.territory_id
  )
);
create policy "print jobs scoped insert" on public.print_jobs for insert to authenticated with check (
  created_by = (select auth.uid()) and territory_id is not null and exists (
    select 1 from public.role_assignments ra where ra.user_id = (select auth.uid()) and ra.active = true and ra.scope_territory_id = print_jobs.territory_id
  )
);
create policy "print jobs scoped update" on public.print_jobs for update to authenticated
using (
  created_by = (select auth.uid()) or exists (
    select 1 from public.role_assignments ra where ra.user_id = (select auth.uid()) and ra.active = true and ra.scope_territory_id = print_jobs.territory_id
  )
) with check (
  territory_id is not null and exists (
    select 1 from public.role_assignments ra where ra.user_id = (select auth.uid()) and ra.active = true and ra.scope_territory_id = print_jobs.territory_id
  )
);

create policy "print items scoped read" on public.print_items for select to authenticated using (
  exists (
    select 1 from public.print_jobs j join public.role_assignments ra on ra.scope_territory_id = j.territory_id
    where j.id = print_items.print_job_id and ra.user_id = (select auth.uid()) and ra.active = true
  )
);
create policy "print items scoped insert" on public.print_items for insert to authenticated with check (
  exists (
    select 1 from public.print_jobs j join public.role_assignments ra on ra.scope_territory_id = j.territory_id
    where j.id = print_items.print_job_id and ra.user_id = (select auth.uid()) and ra.active = true
  )
);
create policy "print items scoped update" on public.print_items for update to authenticated
using (
  exists (
    select 1 from public.print_jobs j join public.role_assignments ra on ra.scope_territory_id = j.territory_id
    where j.id = print_items.print_job_id and ra.user_id = (select auth.uid()) and ra.active = true
  )
) with check (
  exists (
    select 1 from public.print_jobs j join public.role_assignments ra on ra.scope_territory_id = j.territory_id
    where j.id = print_items.print_job_id and ra.user_id = (select auth.uid()) and ra.active = true
  )
);
