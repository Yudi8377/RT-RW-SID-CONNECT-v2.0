export type TransactionAssignment = {
  active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  organization_id?: string | null;
  organization_valid?: boolean;
  roles?: { role_code?: string | null } | null;
};

export type TransactionAuthorizationDecision = {
  ok: boolean;
  status: number;
  reason: string;
  scopedRoles: string[];
};

const ROLE_TERRITORY_TYPES: Record<string, string[]> = {
  RT_OPERATOR: ["RT"],
  RW_REVIEWER: ["RW"],
  VILLAGE_VALIDATOR: ["VILLAGE"],
};

// Platform administration and read-only pilot access do not themselves grant
// authority to create territorial records. They require a separate explicit
// territorial assignment/role rather than being treated as RT operators.
const SENSITIVE_SERVICE_TYPES = new Set(["HEALTH", "EDUCATION"]);

export function resolveTransactionAuthorization(input: {
  territoryType: string;
  serviceType: string;
  assignments: TransactionAssignment[];
  now?: number;
}): TransactionAuthorizationDecision {
  const now = input.now ?? Date.now();
  const scopedRoles = [...new Set(input.assignments
    .filter((assignment) => {
      if (assignment.active !== true || assignment.organization_valid !== true) return false;
      const start = assignment.starts_at ? Date.parse(assignment.starts_at) : null;
      const end = assignment.ends_at ? Date.parse(assignment.ends_at) : null;
      if (start !== null && (!Number.isFinite(start) || start > now)) return false;
      if (end !== null && (!Number.isFinite(end) || end <= now)) return false;
      const role = assignment.roles?.role_code;
      return Boolean(role && (ROLE_TERRITORY_TYPES[role] ?? []).includes(input.territoryType));
    })
    .map((assignment) => assignment.roles?.role_code)
    .filter((role): role is string => Boolean(role)))];

  if (scopedRoles.length === 0) {
    return {
      ok: false,
      status: 403,
      reason: "No valid active role is authorized for this territory and organization",
      scopedRoles: [],
    };
  }

  if (SENSITIVE_SERVICE_TYPES.has(input.serviceType) &&
      !scopedRoles.some((role) => role === "RT_OPERATOR" || role === "VILLAGE_VALIDATOR")) {
    return {
      ok: false,
      status: 403,
      reason: "This service requires an explicitly authorized sensitive-domain role",
      scopedRoles: [],
    };
  }

  return { ok: true, status: 200, reason: "Authorized", scopedRoles };
}

const RESTRICTED_PAYLOAD_KEYS = new Set([
  "status", "classification", "approvalstatus", "verificationstatus",
  "createdby", "approvedby", "verifiedby",
]);

function isRestrictedPayloadKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return normalized.includes("nik") ||
    normalized.includes("nationalid") ||
    normalized.includes("identitynumber") ||
    normalized.includes("nomorindukkependudukan") ||
    normalized.endsWith("personid") ||
    normalized.endsWith("householdid") ||
    normalized.endsWith("organizationid") ||
    normalized.endsWith("territoryid") ||
    RESTRICTED_PAYLOAD_KEYS.has(normalized);
}

/**
 * Removes direct national-identity identifiers and client-controlled authority
 * fields before generic JSON payloads are persisted or copied to audit records.
 * This is a data-minimization guard, not a replacement for schema allowlisting.
 */
export function sanitizeSensitivePayload<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSensitivePayload(item)) as T;
  }
  if (value !== null && typeof value === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (!isRestrictedPayloadKey(key)) sanitized[key] = sanitizeSensitivePayload(nested);
    }
    return sanitized as T;
  }
  return value;
}
