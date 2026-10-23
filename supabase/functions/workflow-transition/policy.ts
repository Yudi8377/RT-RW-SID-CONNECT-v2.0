export type AssignmentWindow = {
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

const roleByAction: Record<string, string[]> = {
  RT_VERIFY: ["RT_OPERATOR", "PLATFORM_ADMIN"],
  RW_REVIEW: ["RW_REVIEWER", "PLATFORM_ADMIN"],
  RW_APPROVE: ["RW_REVIEWER", "PLATFORM_ADMIN"],
  RW_CORRECT: ["RW_REVIEWER", "PLATFORM_ADMIN"],
  VILLAGE_VALIDATE: ["VILLAGE_VALIDATOR", "PLATFORM_ADMIN"],
  VILLAGE_CORRECT: ["VILLAGE_VALIDATOR", "PLATFORM_ADMIN"],
  AUTHORIZE: ["VILLAGE_VALIDATOR", "PLATFORM_ADMIN"],
  RESUBMIT: ["RT_OPERATOR", "PLATFORM_ADMIN"],
};

const scopeTypesByAction: Record<string, string[]> = {
  RT_VERIFY: ["RT"],
  RESUBMIT: ["RT"],
  RW_REVIEW: ["RW"],
  RW_APPROVE: ["RW"],
  RW_CORRECT: ["RW"],
  VILLAGE_VALIDATE: ["VILLAGE"],
  VILLAGE_CORRECT: ["VILLAGE"],
  AUTHORIZE: ["VILLAGE"],
};

export function isCurrentAssignment(assignment: AssignmentWindow, now: number): boolean {
  if (assignment.active !== true) return false;
  const start = assignment.starts_at ? Date.parse(assignment.starts_at) : Number.NEGATIVE_INFINITY;
  const end = assignment.ends_at ? Date.parse(assignment.ends_at) : Number.POSITIVE_INFINITY;
  return Number.isFinite(start) || start === Number.NEGATIVE_INFINITY
    ? (start <= now && end > now)
    : false;
}

export function isRoleAllowedForAction(roleCode: string, scopeType: string, action: string): boolean {
  if (!(roleByAction[action] || []).includes(roleCode)) return false;
  if (roleCode === "PLATFORM_ADMIN") return ["RT", "RW", "VILLAGE"].includes(scopeType);
  return (scopeTypesByAction[action] || []).includes(scopeType);
}
