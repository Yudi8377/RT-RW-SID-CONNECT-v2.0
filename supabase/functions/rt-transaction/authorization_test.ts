import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { resolveTransactionAuthorization, type TransactionAssignment } from "../_shared/transaction-authorization.ts";

const now = Date.parse("2026-10-23T12:00:00.000Z");
const assignment = (overrides: Partial<TransactionAssignment> = {}): TransactionAssignment => ({
  active: true,
  starts_at: "2026-10-01T00:00:00.000Z",
  ends_at: "2026-11-01T00:00:00.000Z",
  organization_id: "org-1",
  organization_valid: true,
  roles: { role_code: "RT_OPERATOR" },
  ...overrides,
});

Deno.test("allows active RT operator only for RT territory", () => {
  const result = resolveTransactionAuthorization({
    territoryType: "RT", serviceType: "BUSINESS", assignments: [assignment()], now,
  });
  assertEquals(result.ok, true);
  assertEquals(result.scopedRoles, ["RT_OPERATOR"]);
});

Deno.test("rejects RT role on village territory", () => {
  const result = resolveTransactionAuthorization({
    territoryType: "VILLAGE", serviceType: "BUSINESS", assignments: [assignment()], now,
  });
  assertEquals(result.status, 403);
  assertEquals(result.ok, false);
});

Deno.test("rejects inactive, future, expired, or malformed date assignments", () => {
  for (const invalid of [
    assignment({ active: false }),
    assignment({ starts_at: "2026-10-24T00:00:00.000Z" }),
    assignment({ ends_at: "2026-10-23T11:59:59.000Z" }),
    assignment({ starts_at: "not-a-date" }),
  ]) {
    const result = resolveTransactionAuthorization({
      territoryType: "RT", serviceType: "BUSINESS", assignments: [invalid], now,
    });
    assertEquals(result.ok, false);
  }
});

Deno.test("rejects assignment without active organization-scope validation", () => {
  const result = resolveTransactionAuthorization({
    territoryType: "RT",
    serviceType: "BUSINESS",
    assignments: [assignment({ organization_id: null, organization_valid: false })],
    now,
  });
  assertEquals(result.ok, false);
});

Deno.test("platform admin does not gain resident transaction authority implicitly", () => {
  const result = resolveTransactionAuthorization({
    territoryType: "RT",
    serviceType: "BUSINESS",
    assignments: [assignment({ roles: { role_code: "PLATFORM_ADMIN" } })],
    now,
  });
  assertEquals(result.ok, false);
});

Deno.test("RW reviewer cannot submit sensitive health records", () => {
  const result = resolveTransactionAuthorization({
    territoryType: "RW",
    serviceType: "HEALTH",
    assignments: [assignment({ roles: { role_code: "RW_REVIEWER" } })],
    now,
  });
  assertEquals(result.ok, false);
  assertEquals(result.status, 403);
});

Deno.test("village validator may handle explicitly assigned health domain", () => {
  const result = resolveTransactionAuthorization({
    territoryType: "VILLAGE",
    serviceType: "HEALTH",
    assignments: [assignment({ roles: { role_code: "VILLAGE_VALIDATOR" } })],
    now,
  });
  assertEquals(result.ok, true);
});

Deno.test("allows legacy open-ended dates only when organization scope is valid", () => {
  const result = resolveTransactionAuthorization({
    territoryType: "RT",
    serviceType: "BUSINESS",
    assignments: [assignment({ starts_at: null, ends_at: null })],
    now,
  });
  assertEquals(result.ok, true);
});

Deno.test("rejects assignment expiring exactly at the current instant", () => {
  const result = resolveTransactionAuthorization({
    territoryType: "RT",
    serviceType: "BUSINESS",
    assignments: [assignment({ ends_at: new Date(now).toISOString() })],
    now,
  });
  assertEquals(result.ok, false);
});

Deno.test("rejects unknown and resident-only roles for write actions", () => {
  for (const role of ["PILOT_VIEWER", "WARGA", "UNKNOWN_ROLE"]) {
    const result = resolveTransactionAuthorization({
      territoryType: "RT",
      serviceType: "BUSINESS",
      assignments: [assignment({ roles: { role_code: role } })],
      now,
    });
    assertEquals(result.ok, false);
    assertEquals(result.status, 403);
  }
});
