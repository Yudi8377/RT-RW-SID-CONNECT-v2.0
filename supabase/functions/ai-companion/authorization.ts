export const COMPANION_ROLE_CODES = [
  "WARGA",
  "KETUA_RT",
  "PENGURUS_RT",
  "KETUA_RW",
  "PENGURUS_RW",
] as const;

export type CompanionRole = (typeof COMPANION_ROLE_CODES)[number];

export interface RoleAssignment {
  role_code: string;
  scope_territory_id: string | null;
  active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
}

export type CompanionAuthorizationResult =
  | { allowed: true; role: CompanionRole; scopeTerritoryId: string | null }
  | {
      allowed: false;
      status: 400 | 403;
      reason: "INVALID_ROLE" | "ROLE_NOT_ASSIGNED" | "SCOPE_REQUIRED";
    };

const REQUIRED_CANONICAL_ROLE: Partial<Record<CompanionRole, string>> = {
  KETUA_RT: "RT_OPERATOR",
  PENGURUS_RT: "RT_OPERATOR",
  KETUA_RW: "RW_REVIEWER",
  PENGURUS_RW: "RW_REVIEWER",
};

function dateAllows(value: string | null | undefined, now: number, isStart: boolean): boolean {
  if (value == null || value === "") return true;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return false;
  return isStart ? parsed <= now : parsed > now;
}

function assignmentIsCurrent(assignment: RoleAssignment, now: number): boolean {
  return assignment.active === true &&
    dateAllows(assignment.starts_at, now, true) &&
    dateAllows(assignment.ends_at, now, false);
}

/**
 * WARGA is a least-privilege general companion and does not grant access to
 * administrative data. Operational personas require a matching active
 * canonical role assignment and a territory scope.
 */
export function authorizeCompanionRole(
  requestedRole: string,
  assignments: readonly RoleAssignment[],
  now: Date = new Date(),
  requestedTerritoryId: string | null = null,
): CompanionAuthorizationResult {
  if (!(COMPANION_ROLE_CODES as readonly string[]).includes(requestedRole)) {
    return { allowed: false, status: 400, reason: "INVALID_ROLE" };
  }

  const role = requestedRole as CompanionRole;
  if (role === "WARGA") {
    return { allowed: true, role, scopeTerritoryId: null };
  }

  const requiredRoleCode = REQUIRED_CANONICAL_ROLE[role];
  if (!requiredRoleCode) {
    return { allowed: false, status: 403, reason: "ROLE_NOT_ASSIGNED" };
  }

  const nowMs = now.getTime();
  const matches = assignments.filter((assignment) =>
    assignmentIsCurrent(assignment, nowMs) &&
    assignment.role_code === requiredRoleCode &&
    typeof assignment.scope_territory_id === "string" &&
    assignment.scope_territory_id.length > 0 &&
    (!requestedTerritoryId || assignment.scope_territory_id === requestedTerritoryId)
  );

  if (matches.length === 0) {
    return { allowed: false, status: 403, reason: "ROLE_NOT_ASSIGNED" };
  }

  const scopes = [...new Set(matches.map((assignment) => assignment.scope_territory_id!))];
  if (!requestedTerritoryId && scopes.length > 1) {
    return { allowed: false, status: 400, reason: "SCOPE_REQUIRED" };
  }

  return {
    allowed: true,
    role,
    scopeTerritoryId: requestedTerritoryId || scopes[0],
  };
}
