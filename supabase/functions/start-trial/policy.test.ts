import { isCurrentAssignment, isUuid, trialPeriod } from "./policy.ts";

Deno.test("organization IDs must be UUIDs", () => {
  if (!isUuid("00000000-0000-4000-8000-000000000001")) throw new Error("valid UUID rejected");
  for (const value of ["", "org-1", null, 42, "00000000-0000-0000-0000-000000000000"]) {
    if (isUuid(value)) throw new Error("invalid UUID accepted: " + String(value));
  }
});

Deno.test("current assignment requires active and valid start/end window", () => {
  const now = Date.parse("2026-10-23T00:00:00.000Z");
  const assignment = { active: true, starts_at: null, ends_at: null };
  if (!isCurrentAssignment(assignment, now)) throw new Error("open-ended active assignment rejected");
  if (isCurrentAssignment({ ...assignment, active: false }, now)) throw new Error("inactive assignment accepted");
  if (isCurrentAssignment({ ...assignment, starts_at: "2026-10-24T00:00:00Z" }, now)) throw new Error("future assignment accepted");
  if (isCurrentAssignment({ ...assignment, ends_at: "2026-10-22T23:59:59Z" }, now)) throw new Error("expired assignment accepted");
  if (isCurrentAssignment({ ...assignment, starts_at: "not-a-date" }, now)) throw new Error("invalid start date accepted");
  if (isCurrentAssignment({ ...assignment, ends_at: "not-a-date" }, now)) throw new Error("invalid end date accepted");
});

Deno.test("trial period is seven full UTC days by default", () => {
  const start = new Date("2026-10-23T12:34:56.000Z");
  const period = trialPeriod(start);
  if (period.startsAt !== start.toISOString()) throw new Error("trial start was not normalized to UTC");
  if (Date.parse(period.endsAt) - Date.parse(period.startsAt) !== 7 * 24 * 60 * 60 * 1000) {
    throw new Error("trial duration is not seven full days");
  }
});

Deno.test("trial duration rejects invalid values", () => {
  for (const days of [0, -1, 1.5, 31, Number.NaN]) {
    let rejected = false;
    try { trialPeriod(new Date("2026-10-23T00:00:00Z"), days); } catch { rejected = true; }
    if (!rejected) throw new Error("invalid trial duration accepted: " + String(days));
  }
});
