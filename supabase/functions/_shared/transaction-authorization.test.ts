import {
  resolveTransactionAuthorization,
  sanitizeSensitivePayload,
  type TransactionAssignment,
} from "./transaction-authorization.ts";

function assignment(
  role: string,
  overrides: Partial<TransactionAssignment> = {},
): TransactionAssignment {
  return {
    active: true,
    starts_at: "2026-01-01T00:00:00.000Z",
    ends_at: "2027-01-01T00:00:00.000Z",
    organization_id: "org-test",
    organization_valid: true,
    roles: { role_code: role },
    ...overrides,
  };
}

const NOW = Date.parse("2026-10-24T00:00:00.000Z");

Deno.test("RT_OPERATOR may submit ordinary RT-domain service within valid RT scope", () => {
  const result = resolveTransactionAuthorization({
    territoryType: "RT",
    serviceType: "BUSINESS",
    assignments: [assignment("RT_OPERATOR")],
    now: NOW,
  });
  if (!result.ok || result.status !== 200 || !result.scopedRoles.includes("RT_OPERATOR")) {
    throw new Error(`Expected RT authorization, received ${JSON.stringify(result)}`);
  }
});

Deno.test("RW_REVIEWER cannot submit RT-scoped transaction", () => {
  const result = resolveTransactionAuthorization({
    territoryType: "RT",
    serviceType: "BUSINESS",
    assignments: [assignment("RW_REVIEWER")],
    now: NOW,
  });
  if (result.ok || result.status !== 403) {
    throw new Error(`Expected deny for role/territory mismatch, received ${JSON.stringify(result)}`);
  }
});

Deno.test("Platform Admin alone does not grant territorial write authority", () => {
  const result = resolveTransactionAuthorization({
    territoryType: "RT",
    serviceType: "BUSINESS",
    assignments: [assignment("PLATFORM_ADMIN")],
    now: NOW,
  });
  if (result.ok || result.status !== 403) {
    throw new Error(`Expected deny for Platform Admin without territorial role, received ${JSON.stringify(result)}`);
  }
});

Deno.test("inactive assignments are rejected", () => {
  const result = resolveTransactionAuthorization({
    territoryType: "RT",
    serviceType: "BUSINESS",
    assignments: [assignment("RT_OPERATOR", { active: false })],
    now: NOW,
  });
  if (result.ok || result.status !== 403) throw new Error("Inactive assignment must be denied");
});

Deno.test("assignments without a validated organization are rejected", () => {
  const result = resolveTransactionAuthorization({
    territoryType: "RT",
    serviceType: "BUSINESS",
    assignments: [assignment("RT_OPERATOR", { organization_valid: false })],
    now: NOW,
  });
  if (result.ok || result.status !== 403) throw new Error("Invalid organization mapping must be denied");
});

Deno.test("future assignments are rejected", () => {
  const result = resolveTransactionAuthorization({
    territoryType: "RT",
    serviceType: "BUSINESS",
    assignments: [assignment("RT_OPERATOR", { starts_at: "2027-01-01T00:00:00.000Z" })],
    now: NOW,
  });
  if (result.ok || result.status !== 403) throw new Error("Future assignment must be denied");
});

Deno.test("expired assignments are rejected", () => {
  const result = resolveTransactionAuthorization({
    territoryType: "RT",
    serviceType: "BUSINESS",
    assignments: [assignment("RT_OPERATOR", { ends_at: "2026-10-23T23:59:59.000Z" })],
    now: NOW,
  });
  if (result.ok || result.status !== 403) throw new Error("Expired assignment must be denied");
});

Deno.test("malformed assignment validity timestamps are rejected", () => {
  const result = resolveTransactionAuthorization({
    territoryType: "RT",
    serviceType: "BUSINESS",
    assignments: [assignment("RT_OPERATOR", { starts_at: "not-a-date" })],
    now: NOW,
  });
  if (result.ok || result.status !== 403) throw new Error("Malformed validity timestamp must be denied");
});

Deno.test("sensitive HEALTH service is denied for RW-only role", () => {
  const result = resolveTransactionAuthorization({
    territoryType: "RW",
    serviceType: "HEALTH",
    assignments: [assignment("RW_REVIEWER")],
    now: NOW,
  });
  if (result.ok || result.status !== 403) throw new Error("RW-only role must not submit sensitive HEALTH service");
});

Deno.test("sensitive HEALTH service requires matching RT role and scope", () => {
  const result = resolveTransactionAuthorization({
    territoryType: "RT",
    serviceType: "HEALTH",
    assignments: [assignment("RT_OPERATOR")],
    now: NOW,
  });
  if (!result.ok) throw new Error(`Expected authorized RT health workflow, received ${JSON.stringify(result)}`);
});

Deno.test("VILLAGE_VALIDATOR is valid only for VILLAGE territory", () => {
  const denied = resolveTransactionAuthorization({
    territoryType: "RT",
    serviceType: "BUSINESS",
    assignments: [assignment("VILLAGE_VALIDATOR")],
    now: NOW,
  });
  const allowed = resolveTransactionAuthorization({
    territoryType: "VILLAGE",
    serviceType: "BUSINESS",
    assignments: [assignment("VILLAGE_VALIDATOR")],
    now: NOW,
  });
  if (denied.ok || !allowed.ok) throw new Error("Village validator territory matrix is incorrect");
});

Deno.test("payload sanitizer removes authority and identity keys recursively", () => {
  const value = sanitizeSensitivePayload({
    status: "APPROVED",
    territory_id: "forged-territory",
    nested: {
      created_by: "forged-user",
      person_id: "forged-person",
      safe_note: "NIK 1234567890123456 must not persist",
    },
    ordinary: "community note",
  }) as Record<string, unknown>;
  const nested = value.nested as Record<string, unknown>;
  if ("status" in value || "territory_id" in value || "created_by" in nested || "person_id" in nested) {
    throw new Error("Authority or identity keys were not stripped");
  }
  if (nested.safe_note !== "NIK [REDACTED_NIK] must not persist" || value.ordinary !== "community note") {
    throw new Error("Sanitizer did not preserve safe fields and redact NIK-like strings");
  }
});
