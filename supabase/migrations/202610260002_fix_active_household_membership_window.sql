-- Keep the household-link workflow consistent with the membership validity window.
-- Serialize link operations on the person and target household rows, and treat a
-- membership with a future valid_to date as active until that date expires.
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
  IF v_note IS NULL OR pg_catalog.length(v_note)<10 OR pg_catalog.regexp_replace(v_note,'[^0-9]','','g') ~ '[0-9]{16}' THEN
    RAISE EXCEPTION 'Verification note must be at least 10 characters and must not contain a national identity number' USING errcode = '22023';
  END IF;
  IF p_relationship_label NOT IN ('KEPALA_KELUARGA','PASANGAN','ANAK','ORANG_TUA','SAUDARA','LAINNYA') THEN
    RAISE EXCEPTION 'Unsupported relationship label' USING errcode = '22023';
  END IF;
  IF COALESCE(p_is_head,false) IS DISTINCT FROM (p_relationship_label='KEPALA_KELUARGA') THEN
    RAISE EXCEPTION 'KEPALA_KELUARGA relationship and head flag must agree' USING errcode = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.territories t WHERE t.id=p_scope_territory_id AND t.active=true) THEN
    RAISE EXCEPTION 'Active territory scope required' USING errcode = '22023';
  END IF;
  SELECT a.territory_id INTO v_household_territory_id
  FROM public.households h JOIN public.addresses a ON a.id=h.address_id
  WHERE h.id=p_household_id AND h.status='ACTIVE'
  FOR UPDATE OF h;
  IF NOT FOUND THEN RAISE EXCEPTION 'Active household with address required' USING errcode = '22023'; END IF;
  WITH RECURSIVE descendants(id) AS (
    SELECT t.id FROM public.territories t WHERE t.id=p_scope_territory_id AND t.active=true
    UNION
    SELECT child.id FROM public.territories child
    JOIN descendants parent ON child.parent_id=parent.id WHERE child.active=true
  )
  SELECT EXISTS(SELECT 1 FROM descendants d WHERE d.id=v_household_territory_id) INTO v_in_scope;
  IF NOT v_in_scope THEN RAISE EXCEPTION 'Household is outside selected territory scope' USING errcode = '42501'; END IF;
  PERFORM 1 FROM public.persons p
  WHERE p.id=p_person_id
    AND p.classification='CONFIDENTIAL' AND p.status IN ('ACTIVE','DECEASED')
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Person is unavailable for verified household linking' USING errcode = '22023'; END IF;

  SELECT m.id,m.household_id INTO v_membership_id,v_existing_household_id
  FROM public.household_person_memberships m
  WHERE m.person_id=p_person_id AND m.status='ACTIVE'
    AND m.valid_from<=CURRENT_DATE
    AND (m.valid_to IS NULL OR m.valid_to>=CURRENT_DATE)
  ORDER BY m.valid_from DESC, m.id
  LIMIT 1
  FOR UPDATE;
  IF FOUND THEN
    IF v_existing_household_id=p_household_id THEN
      RETURN pg_catalog.jsonb_build_object('ok',true,'status','ALREADY_LINKED','membership_id',v_membership_id);
    END IF;
    RAISE EXCEPTION 'Person already has an active household link' USING errcode = '23505';
  END IF;
  IF COALESCE(p_is_head,false) AND EXISTS (
    SELECT 1 FROM public.household_person_memberships m
    WHERE m.household_id=p_household_id AND m.status='ACTIVE' AND m.is_head=true
      AND m.valid_from<=CURRENT_DATE
      AND (m.valid_to IS NULL OR m.valid_to>=CURRENT_DATE)
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


REVOKE ALL ON FUNCTION public.admin_link_person_to_household(uuid,uuid,uuid,text,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_link_person_to_household(uuid,uuid,uuid,text,boolean,text) TO authenticated;
COMMENT ON FUNCTION public.admin_link_person_to_household(uuid,uuid,uuid,text,boolean,text) IS
  'Platform-admin-only, scoped and audited household linking. Serializes on person/household rows and treats valid_to >= current date as active.';
