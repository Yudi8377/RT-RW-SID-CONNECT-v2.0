import {
  authorizeCompanionRole,
  type RoleAssignment,
} from "./authorization.ts";

const now = new Date("2026-10-22T00:00:00.000Z");
const assignment = (
  role_code: string,
  scope_territory_id: string | null = "territory-rt-1",
  overrides: Partial<RoleAssignment> = {},
): RoleAssignment => ({
  role_code,
  scope_territory_id,
  active: true,
  starts_at: "2026-01-01T00:00:00.000Z",
  ends_at: null,
  ...overrides,
});

Deno.test("WARGA is the non-privileged default without an assignment", () => {
  const result = authorizeCompanionRole("WARGA", [], now);
  if (!result.allowed || result.role !== "WARGA" || result.scopeTerritoryId !== null) {
    throw new Error("Expected least-privilege WARGA access");
  }
});

Deno.test("RT operator assignment permits RT personas only in assigned scope", () => {
  const assignments = [assignment("RT_OPERATOR", "territory-rt-1")];
  const result = authorizeCompanionRole("KETUA_RT", assignments, now, "territory-rt-1");
  if (!result.allowed || result.scopeTerritoryId !== "territory-rt-1") {
    throw new Error("Expected scoped RT access");
  }
  const spoofedScope = authorizeCompanionRole("KETUA_RT", assignments, now, "territory-rt-2");
  if (spoofedScope.allowed || spoofedScope.status !== 403) {
    throw new Error("Expected cross-territory request to be denied");
  }
});

Deno.test("RW reviewer assignment permits RW personas but not RT personas", () => {
  const assignments = [assignment("RW_REVIEWER", "territory-rw-1")];
  const rw = authorizeCompanionRole("PENGURUS_RW", assignments, now, "territory-rw-1");
  const rt = authorizeCompanionRole("PENGURUS_RT", assignments, now, "territory-rw-1");
  if (!rw.allowed) throw new Error("Expected RW persona access");
  if (rt.allowed || rt.status !== 403) throw new Error("Expected RT persona denial");
});

Deno.test("inactive, not-yet-active and expired assignments are denied", () => {
  const invalid = [
    assignment("RT_OPERATOR", "territory-rt-1", { active: false }),
    assignment("RT_OPERATOR", "territory-rt-1", { starts_at: "2027-01-01T00:00:00.000Z" }),
    assignment("RT_OPERATOR", "territory-rt-1", { ends_at: "2026-10-21T23:59:59.000Z" }),
  ];
  for (const item of invalid) {
    const result = authorizeCompanionRole("KETUA_RT", [item], now);
    if (result.allowed || result.status !== 403) {
      throw new Error("Expected inactive or out-of-date assignment to be denied");
    }
  }
});

Deno.test("multiple scopes require explicit territory selection", () => {
  const assignments = [
    assignment("RT_OPERATOR", "territory-rt-1"),
    assignment("RT_OPERATOR", "territory-rt-2"),
  ];
  const missing = authorizeCompanionRole("KETUA_RT", assignments, now);
  const selected = authorizeCompanionRole("KETUA_RT", assignments, now, "territory-rt-2");
  if (missing.allowed || missing.reason !== "SCOPE_REQUIRED") {
    throw new Error("Expected explicit scope selection");
  }
  if (!selected.allowed || selected.scopeTerritoryId !== "territory-rt-2") {
    throw new Error("Expected selected scope to be accepted");
  }
});

Deno.test("unknown companion roles are rejected", () => {
  const result = authorizeCompanionRole("PLATFORM_ADMIN", [], now);
  if (result.allowed || result.status !== 400) {
    throw new Error("Expected unsupported role to be rejected");
  }
});
