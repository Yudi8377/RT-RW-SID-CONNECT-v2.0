export type AssignmentWindow = {
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

export function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isCurrentAssignment(assignment: AssignmentWindow, now: number): boolean {
  if (assignment.active !== true) return false;
  const start = assignment.starts_at ? Date.parse(assignment.starts_at) : Number.NEGATIVE_INFINITY;
  const end = assignment.ends_at ? Date.parse(assignment.ends_at) : Number.POSITIVE_INFINITY;
  if (!(Number.isFinite(start) || start === Number.NEGATIVE_INFINITY)) return false;
  if (!(Number.isFinite(end) || end === Number.POSITIVE_INFINITY)) return false;
  return start <= now && end > now;
}
