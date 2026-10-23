-- Scoped resident directory: explicit person-to-household membership and least-privilege reads.
-- Additive only. Existing persons are not auto-linked to households because their relationship
-- cannot be inferred safely from the current schema.
CREATE TABLE IF NOT EXISTS public.household_person_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE RESTRICT,
  person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  relationship_label text NOT NULL DEFAULT 'ANGGOTA',
  is_head boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','INACTIVE','HISTORICAL')),
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  valid_to date,
  source_request_id uuid REFERENCES public.rt_service_requests(id) ON DELETE RESTRICT,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS household_person_memberships_one_active_household_per_person
  ON public.household_person_memberships (person_id)
  WHERE status = 'ACTIVE' AND valid_to IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS household_person_memberships_request_person_unique
  ON public.household_person_memberships (source_request_id, person_id)
  WHERE source_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS household_person_memberships_household_status_idx
  ON public.household_person_memberships (household_id, status, valid_from);

ALTER TABLE public.household_person_memberships ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.household_person_memberships FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.household_person_memberships TO service_role;

CREATE OR REPLACE FUNCTION public.rt_resident_directory(
  p_scope_territory_id uuid,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  person_id uuid,
  full_name text,
  birth_place text,
  birth_date date,
  gender text,
  person_status text,
  household_id uuid,
  relationship_label text,
  is_head boolean,
  territory_id uuid,
  person_created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_role_code text;
  v_scope_type text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '28000';
  END IF;

  SELECT r.role_code, t.territory_type
    INTO v_role_code, v_scope_type
  FROM public.role_assignments ra
  JOIN public.roles r ON r.id = ra.role_id
  JOIN public.territories t ON t.id = ra.scope_territory_id
  WHERE ra.user_id = v_user_id
    AND ra.scope_territory_id = p_scope_territory_id
    AND ra.active = true
    AND (ra.starts_at IS NULL OR ra.starts_at <= pg_catalog.now())
    AND (ra.ends_at IS NULL OR ra.ends_at > pg_catalog.now())
    AND t.active = true
    AND (
      (r.role_code = 'RT_OPERATOR' AND t.territory_type = 'RT')
      OR (r.role_code = 'RW_REVIEWER' AND t.territory_type = 'RW')
      OR (r.role_code = 'VILLAGE_VALIDATOR' AND t.territory_type = 'VILLAGE')
    )
  ORDER BY ra.created_at DESC
  LIMIT 1;

  IF v_role_code IS NULL THEN
    RAISE EXCEPTION 'No active resident-directory assignment for requested scope'
      USING errcode = '42501';
  END IF;

  RETURN QUERY
  WITH RECURSIVE descendants(id) AS (
    SELECT t.id
    FROM public.territories t
    WHERE t.id = p_scope_territory_id AND t.active = true
    UNION ALL
    SELECT child.id
    FROM public.territories child
    JOIN descendants parent ON child.parent_id = parent.id
    WHERE child.active = true
  )
  SELECT
    p.id,
    p.full_name,
    p.birth_place,
    p.birth_date,
    p.gender,
    p.status,
    h.id,
    m.relationship_label,
    m.is_head,
    a.territory_id,
    p.created_at
  FROM public.household_person_memberships m
  JOIN public.persons p ON p.id = m.person_id
  JOIN public.households h ON h.id = m.household_id
  JOIN public.addresses a ON a.id = h.address_id
  JOIN descendants d ON d.id = a.territory_id
  WHERE m.status = 'ACTIVE'
    AND m.valid_from <= CURRENT_DATE
    AND (m.valid_to IS NULL OR m.valid_to >= CURRENT_DATE)
    AND p.classification = 'CONFIDENTIAL'
    AND p.status IN ('ACTIVE','DECEASED')
    AND h.status = 'ACTIVE'
  ORDER BY m.is_head DESC, p.full_name ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$function$;

REVOKE ALL ON FUNCTION public.rt_resident_directory(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rt_resident_directory(uuid, integer, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.rt_household_directory(
  p_scope_territory_id uuid,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  household_id uuid,
  household_status text,
  address_line text,
  postal_code text,
  territory_id uuid,
  household_created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_role_code text;
  v_scope_type text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = '28000';
  END IF;

  SELECT r.role_code, t.territory_type
    INTO v_role_code, v_scope_type
  FROM public.role_assignments ra
  JOIN public.roles r ON r.id = ra.role_id
  JOIN public.territories t ON t.id = ra.scope_territory_id
  WHERE ra.user_id = v_user_id
    AND ra.scope_territory_id = p_scope_territory_id
    AND ra.active = true
    AND (ra.starts_at IS NULL OR ra.starts_at <= pg_catalog.now())
    AND (ra.ends_at IS NULL OR ra.ends_at > pg_catalog.now())
    AND t.active = true
    AND (
      (r.role_code = 'RT_OPERATOR' AND t.territory_type = 'RT')
      OR (r.role_code = 'RW_REVIEWER' AND t.territory_type = 'RW')
      OR (r.role_code = 'VILLAGE_VALIDATOR' AND t.territory_type = 'VILLAGE')
    )
  ORDER BY ra.created_at DESC
  LIMIT 1;

  IF v_role_code IS NULL THEN
    RAISE EXCEPTION 'No active household-directory assignment for requested scope'
      USING errcode = '42501';
  END IF;

  RETURN QUERY
  WITH RECURSIVE descendants(id) AS (
    SELECT t.id FROM public.territories t
    WHERE t.id = p_scope_territory_id AND t.active = true
    UNION ALL
    SELECT child.id
    FROM public.territories child
    JOIN descendants parent ON child.parent_id = parent.id
    WHERE child.active = true
  )
  SELECT h.id, h.status, a.address_line, a.postal_code, a.territory_id, h.created_at
  FROM public.households h
  JOIN public.addresses a ON a.id = h.address_id
  JOIN descendants d ON d.id = a.territory_id
  WHERE h.status = 'ACTIVE'
  ORDER BY h.created_at DESC, h.id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$function$;

REVOKE ALL ON FUNCTION public.rt_household_directory(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rt_household_directory(uuid, integer, integer) TO authenticated;
