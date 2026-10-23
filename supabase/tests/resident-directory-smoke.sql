SET statement_timeout = '10s';

-- Scoped resident directory tests: assignment, hierarchy, minimal fields and least privilege.
-- Regression guard: household directory schema intentionally does not assume households.created_at.
INSERT INTO public.addresses (id, territory_id, address_line) VALUES
 ('70000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000006','Alamat uji RT'),
 ('70000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000007','Alamat uji wilayah lain');
INSERT INTO public.households (id, household_number_hash, address_id, status) VALUES
 ('71000000-0000-4000-8000-000000000001','HASH-UJI-1','70000000-0000-4000-8000-000000000001','ACTIVE'),
 ('71000000-0000-4000-8000-000000000002','HASH-UJI-2','70000000-0000-4000-8000-000000000002','ACTIVE');
INSERT INTO public.persons (id,full_name,birth_place,birth_date,gender,classification,status) VALUES
 ('72000000-0000-4000-8000-000000000001','Warga Uji RT','Kota Uji','1990-01-01','Laki-laki','CONFIDENTIAL','ACTIVE'),
 ('72000000-0000-4000-8000-000000000002','Warga Uji Wilayah Lain','Kota Uji','1991-01-01','Perempuan','CONFIDENTIAL','ACTIVE'),
 ('72000000-0000-4000-8000-000000000003','Data Internal Tidak Tampil','Kota Uji','1992-01-01','Perempuan','INTERNAL','ACTIVE');
INSERT INTO public.household_person_memberships
  (id,household_id,person_id,relationship_label,is_head,status,valid_from)
VALUES
 ('73000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000001','KEPALA_KELUARGA',true,'ACTIVE',CURRENT_DATE),
 ('73000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000002','72000000-0000-4000-8000-000000000002','ANGGOTA',false,'ACTIVE',CURRENT_DATE),
 ('73000000-0000-4000-8000-000000000003','71000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000003','ANGGOTA',false,'ACTIVE',CURRENT_DATE);

DO $$
DECLARE
  v record;
  n integer;
BEGIN
  RAISE NOTICE 'resident smoke: RT resident scope';
  -- RT sees only active CONFIDENTIAL residents assigned to that RT.
  PERFORM pg_catalog.set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000008',false);
  SELECT * INTO v FROM public.rt_resident_directory('30000000-0000-4000-8000-000000000006',50,0);
  IF v.full_name <> 'Warga Uji RT' OR v.is_head IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'RT directory returned unexpected row: %', row_to_json(v);
  END IF;
  SELECT count(*) INTO n FROM public.rt_resident_directory('30000000-0000-4000-8000-000000000006',50,0);
  IF n <> 1 THEN RAISE EXCEPTION 'RT directory leaked or omitted records: count %, rows %', n, (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('person_id',person_id,'territory_id',territory_id,'full_name',full_name)) FROM public.rt_resident_directory('30000000-0000-4000-8000-000000000006',50,0)); END IF;

  RAISE NOTICE 'resident smoke: RT household scope';
  SELECT * INTO v FROM public.rt_household_directory('30000000-0000-4000-8000-000000000006',50,0);
  IF v.address_line <> 'Alamat uji RT' THEN RAISE EXCEPTION 'RT household scope returned unexpected address: %', row_to_json(v); END IF;
  SELECT count(*) INTO n FROM public.rt_household_directory('30000000-0000-4000-8000-000000000006',50,0);
  IF n <> 1 THEN RAISE EXCEPTION 'RT household directory leaked or omitted records: %', n; END IF;

  RAISE NOTICE 'resident smoke: RW descendant scope';
  -- RW can see assigned descendant RT data, not unrelated village data.
  PERFORM pg_catalog.set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000009',false);
  SELECT count(*) INTO n FROM public.rt_resident_directory('30000000-0000-4000-8000-000000000005',50,0);
  IF n <> 1 THEN RAISE EXCEPTION 'RW descendant scope incorrect: %', n; END IF;
  SELECT count(*) INTO n FROM public.rt_household_directory('30000000-0000-4000-8000-000000000005',50,0);
  IF n <> 1 THEN RAISE EXCEPTION 'RW household descendant scope incorrect: %', n; END IF;

  RAISE NOTICE 'resident smoke: village descendant scope';
  -- Village validator sees descendants within its assigned village.
  PERFORM pg_catalog.set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000010',false);
  SELECT count(*) INTO n FROM public.rt_resident_directory('30000000-0000-4000-8000-000000000004',50,0);
  IF n <> 1 THEN RAISE EXCEPTION 'Village descendant scope incorrect: %', n; END IF;

  RAISE NOTICE 'resident smoke: reject mismatched roles';
  -- RT cannot use an RW scope and a regional role cannot call this person-level endpoint.
  PERFORM pg_catalog.set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000008',false);
  BEGIN
    PERFORM * FROM public.rt_resident_directory('30000000-0000-4000-8000-000000000005',50,0);
    RAISE EXCEPTION 'RT user unexpectedly used RW scope';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  PERFORM pg_catalog.set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',false);
  BEGIN
    PERFORM * FROM public.rt_resident_directory('30000000-0000-4000-8000-000000000003',50,0);
    RAISE EXCEPTION 'district role unexpectedly read person-level directory';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  RAISE NOTICE 'resident smoke: reject anonymous';
  PERFORM pg_catalog.set_config('request.jwt.claim.sub','',false);
  BEGIN
    PERFORM * FROM public.rt_resident_directory('30000000-0000-4000-8000-000000000006',50,0);
    RAISE EXCEPTION 'anonymous directory call unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE '28000' THEN NULL;
  END;
END;
$$;

DO $$
BEGIN
  IF pg_catalog.has_table_privilege('authenticated','public.household_person_memberships','SELECT') THEN
    RAISE EXCEPTION 'authenticated must not read household membership table directly';
  END IF;
  IF pg_catalog.has_function_privilege('anon','public.rt_resident_directory(uuid,integer,integer)','EXECUTE') THEN
    RAISE EXCEPTION 'anon must not execute resident directory RPC';
  END IF;
  IF NOT pg_catalog.has_function_privilege('authenticated','public.rt_resident_directory(uuid,integer,integer)','EXECUTE') THEN
    RAISE EXCEPTION 'authenticated must execute resident directory RPC';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    WHERE c.oid='public.household_person_memberships'::regclass AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'household_person_memberships must have RLS enabled';
  END IF;
  IF pg_catalog.pg_get_function_result('public.rt_resident_directory(uuid,integer,integer)'::regprocedure) ILIKE '%national_id%' THEN
    RAISE EXCEPTION 'resident directory must not expose national identifiers';
  END IF;
  IF pg_catalog.pg_get_functiondef('public.rt_household_directory(uuid,integer,integer)'::regprocedure) ILIKE '%h.created_at%' THEN
    RAISE EXCEPTION 'household directory must not depend on households.created_at';
  END IF;
END;
$$;

SELECT 'scoped resident directory smoke tests passed' AS result;
