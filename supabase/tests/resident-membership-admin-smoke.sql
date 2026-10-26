SET statement_timeout = '30s';

DO $$
DECLARE n integer; v record; result jsonb;
BEGIN
  IF pg_catalog.has_function_privilege('anon','public.admin_unlinked_person_directory(text,integer,integer)','EXECUTE') THEN
    RAISE EXCEPTION 'anon must not execute unlinked person directory';
  END IF;
  IF NOT pg_catalog.has_function_privilege('authenticated','public.admin_unlinked_person_directory(text,integer,integer)','EXECUTE') THEN
    RAISE EXCEPTION 'authenticated role must execute RPC and be checked inside function';
  END IF;
  IF pg_catalog.has_table_privilege('authenticated','public.household_person_memberships','SELECT') THEN
    RAISE EXCEPTION 'authenticated must not directly read membership table';
  END IF;
  IF pg_catalog.pg_get_function_result('public.admin_unlinked_person_directory(text,integer,integer)'::regprocedure) ILIKE '%national_id%' THEN
    RAISE EXCEPTION 'unlinked directory must not return national identity data';
  END IF;

  -- A regular RT operator cannot inspect global unlinked residents.
  PERFORM pg_catalog.set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000008',false);
  BEGIN
    PERFORM * FROM public.admin_unlinked_person_directory(NULL,50,0);
    RAISE EXCEPTION 'non-admin unexpectedly read unlinked residents';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- Platform administrator can review only the minimum fields and unlinked people.
  PERFORM pg_catalog.set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000011',false);
  SELECT count(*) INTO n FROM public.admin_territory_scope_options();
  IF n < 1 THEN RAISE EXCEPTION 'platform admin territory options are empty'; END IF;
  SELECT * INTO v FROM public.admin_unlinked_person_directory(NULL,50,0);
  IF v.person_id <> '72000000-0000-4000-8000-000000000004'::uuid OR v.full_name <> 'Warga Uji Belum Terhubung' THEN
    RAISE EXCEPTION 'unexpected unlinked person result: %', row_to_json(v);
  END IF;
  SELECT count(*) INTO n FROM public.admin_unlinked_person_directory(NULL,50,0);
  IF n <> 1 THEN RAISE EXCEPTION 'unlinked directory count mismatch: %',n; END IF;

  SELECT count(*) INTO n FROM public.admin_household_link_candidates('30000000-0000-4000-8000-000000000003',NULL,50,0);
  IF n <> 2 THEN RAISE EXCEPTION 'district household candidates mismatch: %',n; END IF;

  -- A selected RT scope cannot link a household located in a sibling village.
  BEGIN
    PERFORM public.admin_link_person_to_household(
      '30000000-0000-4000-8000-000000000006',
      '72000000-0000-4000-8000-000000000004',
      '71000000-0000-4000-8000-000000000002',
      'KEPALA_KELUARGA',true,'Verifikasi dokumen fisik oleh admin'
    );
    RAISE EXCEPTION 'out-of-scope household link unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  result := public.admin_link_person_to_household(
    '30000000-0000-4000-8000-000000000003',
    '72000000-0000-4000-8000-000000000004',
    '71000000-0000-4000-8000-000000000002',
    'KEPALA_KELUARGA',true,'Verifikasi dokumen fisik oleh admin'
  );
  IF result->>'status' <> 'LINKED' THEN RAISE EXCEPTION 'link result mismatch: %',result; END IF;
  IF (SELECT count(*) FROM public.audit_logs WHERE action='HOUSEHOLD_PERSON_LINKED') <> 1 THEN
    RAISE EXCEPTION 'membership link audit event missing';
  END IF;
  IF (SELECT count(*) FROM public.admin_unlinked_person_directory(NULL,50,0)) <> 0 THEN
    RAISE EXCEPTION 'linked person still appears in unlinked queue';
  END IF;

  -- Future valid_to is still an active membership; do not link the same person twice.
  INSERT INTO public.persons (id,full_name,classification,status)
  VALUES ('72000000-0000-4000-8000-000000000005','Warga Uji Masa Berlaku','CONFIDENTIAL','ACTIVE');
  INSERT INTO public.household_person_memberships
    (id,household_id,person_id,relationship_label,is_head,status,valid_from,valid_to)
  VALUES
    ('73000000-0000-4000-8000-000000000004','71000000-0000-4000-8000-000000000001',
     '72000000-0000-4000-8000-000000000005','ANAK',false,'ACTIVE',CURRENT_DATE,CURRENT_DATE+30);
  BEGIN
    PERFORM public.admin_link_person_to_household(
      '30000000-0000-4000-8000-000000000003',
      '72000000-0000-4000-8000-000000000005',
      '71000000-0000-4000-8000-000000000002',
      'ANAK',false,'Verifikasi masa berlaku keanggotaan'
    );
    RAISE EXCEPTION 'person with a future valid_to membership was linked twice';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  IF (SELECT count(*) FROM public.household_person_memberships
      WHERE person_id='72000000-0000-4000-8000-000000000005') <> 1 THEN
    RAISE EXCEPTION 'future-valid membership duplicate side effect detected';
  END IF;

  BEGIN
    PERFORM public.admin_link_person_to_household(
      '30000000-0000-4000-8000-000000000003',
      '72000000-0000-4000-8000-000000000004',
      '71000000-0000-4000-8000-000000000001',
      'ANAK',false,'Verifikasi dokumen fisik oleh admin'
    );
    RAISE EXCEPTION 'person linked to a second household unexpectedly succeeded';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END;
$$;

RESET statement_timeout;
SELECT 'resident membership admin workbench smoke tests passed' AS result;
