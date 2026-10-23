-- Verified resident-to-household link workbench. Only platform administrators can resolve
-- legacy unlinked people; all mutations are audited and no identity number is returned.
CREATE UNIQUE INDEX IF NOT EXISTS household_person_memberships_one_active_head_per_household
  ON public.household_person_memberships (household_id)
  WHERE status = 'ACTIVE' AND is_head = true AND valid_to IS NULL;

CREATE OR REPLACE FUNCTION public.admin_territory_scope_options()
RETURNS TABLE (territory_id uuid, territory_name text, territory_type text, parent_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required' USING errcode = '28000'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.role_assignments ra JOIN public.roles r ON r.id=ra.role_id
    WHERE ra.user_id=v_user_id AND ra.active=true
      AND (ra.starts_at IS NULL OR ra.starts_at<=pg_catalog.now())
      AND (ra.ends_at IS NULL OR ra.ends_at>pg_catalog.now())
      AND r.role_code='PLATFORM_ADMIN'
  ) THEN RAISE EXCEPTION 'Platform administrator role required' USING errcode = '42501'; END IF;
  RETURN QUERY SELECT t.id,t.name,t.territory_type,t.parent_id
    FROM public.territories t WHERE t.active=true ORDER BY t.territory_type,t.name;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_unlinked_person_directory(
  p_search text DEFAULT NULL, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0
)
RETURNS TABLE (
  person_id uuid, full_name text, birth_place text, birth_date date,
  gender text, person_status text, person_created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_search text := NULLIF(pg_catalog.left(pg_catalog.btrim(COALESCE(p_search,'')),80),'');
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required' USING errcode = '28000'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.role_assignments ra JOIN public.roles r ON r.id=ra.role_id
    WHERE ra.user_id=v_user_id AND ra.active=true
      AND (ra.starts_at IS NULL OR ra.starts_at<=pg_catalog.now())
      AND (ra.ends_at IS NULL OR ra.ends_at>pg_catalog.now())
      AND r.role_code='PLATFORM_ADMIN'
  ) THEN RAISE EXCEPTION 'Platform administrator role required' USING errcode = '42501'; END IF;
  RETURN QUERY
  SELECT p.id,p.full_name,p.birth_place,p.birth_date,p.gender,p.status,p.created_at
  FROM public.persons p
  WHERE p.classification='CONFIDENTIAL' AND p.status IN ('ACTIVE','DECEASED')
    AND NOT EXISTS (
      SELECT 1 FROM public.household_person_memberships m
      WHERE m.person_id=p.id AND m.status='ACTIVE'
        AND m.valid_from<=CURRENT_DATE AND (m.valid_to IS NULL OR m.valid_to>=CURRENT_DATE)
    )
    AND (v_search IS NULL OR p.full_name ILIKE '%'||v_search||'%')
  ORDER BY p.full_name,p.id
  LIMIT LEAST(GREATEST(COALESCE(p_limit,50),1),100)
  OFFSET GREATEST(COALESCE(p_offset,0),0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_household_link_candidates(
  p_scope_territory_id uuid, p_search text DEFAULT NULL,
  p_limit integer DEFAULT 50, p_offset integer DEFAULT 0
)
RETURNS TABLE (
  household_id uuid, territory_id uuid, territory_name text,
  address_line text, household_status text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_search text := NULLIF(pg_catalog.left(pg_catalog.btrim(COALESCE(p_search,'')),80),'');
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required' USING errcode = '28000'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.role_assignments ra JOIN public.roles r ON r.id=ra.role_id
    WHERE ra.user_id=v_user_id AND ra.active=true
      AND (ra.starts_at IS NULL OR ra.starts_at<=pg_catalog.now())
      AND (ra.ends_at IS NULL OR ra.ends_at>pg_catalog.now())
      AND r.role_code='PLATFORM_ADMIN'
  ) THEN RAISE EXCEPTION 'Platform administrator role required' USING errcode = '42501'; END IF;
  IF p_scope_territory_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.territories t WHERE t.id=p_scope_territory_id AND t.active=true
  ) THEN RAISE EXCEPTION 'Active territory scope required' USING errcode = '22023'; END IF;
  RETURN QUERY
  WITH RECURSIVE descendants(id) AS (
    SELECT t.id FROM public.territories t WHERE t.id=p_scope_territory_id AND t.active=true
    UNION
    SELECT child.id FROM public.territories child
    JOIN descendants parent ON child.parent_id=parent.id WHERE child.active=true
  )
  SELECT h.id,a.territory_id,t.name,a.address_line,h.status
  FROM public.households h JOIN public.addresses a ON a.id=h.address_id
  JOIN public.territories t ON t.id=a.territory_id
  JOIN descendants d ON d.id=a.territory_id
  WHERE h.status='ACTIVE'
    AND (v_search IS NULL OR a.address_line ILIKE '%'||v_search||'%'
      OR t.name ILIKE '%'||v_search||'%' OR h.id::text ILIKE '%'||v_search||'%')
  ORDER BY t.name,a.address_line,h.id
  LIMIT LEAST(GREATEST(COALESCE(p_limit,50),1),100)
  OFFSET GREATEST(COALESCE(p_offset,0),0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_link_person_to_household(
  p_scope_territory_id uuid, p_person_id uuid, p_household_id uuid,
  p_relationship_label text, p_is_head boolean, p_verification_note text
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_household_territory_id uuid;
  v_membership_id uuid;
  v_existing_household_id uuid;
  v_note text := NULLIF(pg_catalog.left(pg_catalog.btrim(COALESCE(p_verification_note,'')),500),'');
  v_in_scope boolean := false;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authentication required' USING errcode = '28000'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.role_assignments ra JOIN public.roles r ON r.id=ra.role_id
    WHERE ra.user_id=v_user_id AND ra.active=true
      AND (ra.starts_at IS NULL OR ra.starts_at<=pg_catalog.now())
      AND (ra.ends_at IS NULL OR ra.ends_at>pg_catalog.now())
      AND r.role_code='PLATFORM_ADMIN'
  ) THEN RAISE EXCEPTION 'Platform administrator role required' USING errcode = '42501'; END IF;
  IF p_scope_territory_id IS NULL OR p_person_id IS NULL OR p_household_id IS NULL THEN
    RAISE EXCEPTION 'Scope, person and household are required' USING errcode = '22023';
  END IF;
  IF v_note IS NULL OR pg_catalog.length(v_note)<10 OR v_note ~ '[0-9]{16}' THEN
    RAISE EXCEPTION 'Verification note must be at least 10 characters and must not contain a national identity number' USING errcode = '22023';
  END IF;
  IF p_relationship_label NOT IN ('KEPALA_KELUARGA','PASANGAN','ANAK','ORANG_TUA','SAUDARA','LAINNYA') THEN
    RAISE EXCEPTION 'Unsupported relationship label' USING errcode = '22023';
  END IF;
  IF COALESCE(p_is_head,false) AND p_relationship_label<>'KEPALA_KELUARGA' THEN
    RAISE EXCEPTION 'Household head must use KEPALA_KELUARGA relationship' USING errcode = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.territories t WHERE t.id=p_scope_territory_id AND t.active=true) THEN
    RAISE EXCEPTION 'Active territory scope required' USING errcode = '22023';
  END IF;
  SELECT a.territory_id INTO v_household_territory_id
  FROM public.households h JOIN public.addresses a ON a.id=h.address_id
  WHERE h.id=p_household_id AND h.status='ACTIVE';
  IF NOT FOUND THEN RAISE EXCEPTION 'Active household with address required' USING errcode = '22023'; END IF;
  WITH RECURSIVE descendants(id) AS (
    SELECT t.id FROM public.territories t WHERE t.id=p_scope_territory_id AND t.active=true
    UNION
    SELECT child.id FROM public.territories child
    JOIN descendants parent ON child.parent_id=parent.id WHERE child.active=true
  )
  SELECT EXISTS(SELECT 1 FROM descendants d WHERE d.id=v_household_territory_id) INTO v_in_scope;
  IF NOT v_in_scope THEN RAISE EXCEPTION 'Household is outside selected territory scope' USING errcode = '42501'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.persons p WHERE p.id=p_person_id
      AND p.classification='CONFIDENTIAL' AND p.status IN ('ACTIVE','DECEASED')
  ) THEN RAISE EXCEPTION 'Person is unavailable for verified household linking' USING errcode = '22023'; END IF;
  SELECT m.id,m.household_id INTO v_membership_id,v_existing_household_id
  FROM public.household_person_memberships m
  WHERE m.person_id=p_person_id AND m.status='ACTIVE'
    AND m.valid_from<=CURRENT_DATE AND m.valid_to IS NULL LIMIT 1;
  IF FOUND THEN
    IF v_existing_household_id=p_household_id THEN
      RETURN pg_catalog.jsonb_build_object('ok',true,'status','ALREADY_LINKED','membership_id',v_membership_id);
    END IF;
    RAISE EXCEPTION 'Person already has an active household link' USING errcode = '23505';
  END IF;
  IF COALESCE(p_is_head,false) AND EXISTS (
    SELECT 1 FROM public.household_person_memberships m
    WHERE m.household_id=p_household_id AND m.status='ACTIVE' AND m.is_head=true
      AND m.valid_from<=CURRENT_DATE AND m.valid_to IS NULL
  ) THEN RAISE EXCEPTION 'Household already has an active head' USING errcode = '23505'; END IF;
  INSERT INTO public.household_person_memberships
    (household_id,person_id,relationship_label,is_head,status,valid_from,created_by)
  VALUES
    (p_household_id,p_person_id,p_relationship_label,COALESCE(p_is_head,false),'ACTIVE',CURRENT_DATE,v_user_id)
  RETURNING id INTO v_membership_id;
  INSERT INTO public.audit_logs
    (actor_user_id,action,entity_type,entity_id,scope_territory_id,before_data,after_data,reason,source,authority)
  VALUES
    (v_user_id,'HOUSEHOLD_PERSON_LINKED','household_person_memberships',v_membership_id,
     v_household_territory_id,NULL,
     pg_catalog.jsonb_build_object('person_id',p_person_id,'household_id',p_household_id,
       'relationship_label',p_relationship_label,'is_head',COALESCE(p_is_head,false)),
     v_note,'RESIDENT_MEMBERSHIP_WORKBENCH','PLATFORM_ADMIN');
  RETURN pg_catalog.jsonb_build_object('ok',true,'status','LINKED','membership_id',v_membership_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_territory_scope_options() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_unlinked_person_directory(text,integer,integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_household_link_candidates(uuid,text,integer,integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_link_person_to_household(uuid,uuid,uuid,text,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_territory_scope_options() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unlinked_person_directory(text,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_household_link_candidates(uuid,text,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_link_person_to_household(uuid,uuid,uuid,text,boolean,text) TO authenticated;
