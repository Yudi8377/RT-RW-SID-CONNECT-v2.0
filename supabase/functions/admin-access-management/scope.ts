export type Territory = {
  id: string;
  parent_id: string | null;
  territory_type: string;
  active: boolean;
};
export type Organization = {
  id: string;
  territory_id: string | null;
  organization_type: string;
  active: boolean;
};

export const ROLE_SCOPE_TYPES: Record<string, string> = {
  RT_OPERATOR: "RT",
  RW_REVIEWER: "RW",
  VILLAGE_VALIDATOR: "VILLAGE",
  OPEN_SID_UMUM: "VILLAGE",
  DISTRICT_COORDINATOR: "DISTRICT",
  REGENCY_CITY_ADMIN: "REGENCY_CITY",
};

export function expectedScopeType(roleCode: string): string | null {
  return ROLE_SCOPE_TYPES[roleCode] ?? null;
}

/** Resolve the organization that owns this role's data scope.
 * RT/RW roles inherit only the nearest active VILLAGE organization in their ancestor chain.
 * Village and regional roles require an organization mapped to the exact assigned territory.
 */
export function resolveOrganizationId(
  roleCode: string,
  target: Territory,
  ancestry: Territory[],
  organizations: Organization[],
): string | null {
  const expected = expectedScopeType(roleCode);
  if (!expected || !target.active || target.territory_type !== expected) return null;

  const activeOrgs = organizations.filter((org) => org.active && org.territory_id);
  if (roleCode === "RT_OPERATOR" || roleCode === "RW_REVIEWER") {
    const village = ancestry.find((territory) =>
      territory.active && territory.territory_type === "VILLAGE"
    );
    if (!village) return null;
    return activeOrgs.find((org) => org.territory_id === village.id && org.organization_type === "VILLAGE")?.id ?? null;
  }

  return activeOrgs.find((org) =>
    org.territory_id === target.id &&
    ((expected === "VILLAGE" && org.organization_type === "VILLAGE") ||
      (expected === "DISTRICT" && org.organization_type === "DISTRICT") ||
      (expected === "REGENCY_CITY" && org.organization_type === "REGENCY_CITY"))
  )?.id ?? null;
}
