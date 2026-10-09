import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};
const rolesAllowed = new Set(["RT_OPERATOR", "RW_REVIEWER", "VILLAGE_VALIDATOR", "PLATFORM_ADMIN"]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const response = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: cors });

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
async function sha256(value: string) {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return response(405, { ok: false, error: "METHOD_NOT_ALLOWED" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("Authorization");
  if (!supabaseUrl || !anonKey || !serviceKey) return response(503, { ok: false, error: "SERVER_NOT_CONFIGURED" });
  if (!authorization) return response(401, { ok: false, error: "AUTHENTICATION_REQUIRED" });

  const declaredLength = Number(req.headers.get("Content-Length") ?? "0");
  if (declaredLength > 8192) return response(413, { ok: false, error: "PAYLOAD_TOO_LARGE" });

  let raw: string;
  try {
    raw = await req.text();
    if (new TextEncoder().encode(raw).byteLength > 8192) return response(413, { ok: false, error: "PAYLOAD_TOO_LARGE" });
  } catch {
    return response(400, { ok: false, error: "INVALID_BODY" });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not object");
    body = parsed as Record<string, unknown>;
  } catch {
    return response(400, { ok: false, error: "INVALID_JSON" });
  }
  if (Object.keys(body).some((key) => !["record_id", "territory_id"].includes(key)) ||
      typeof body.record_id !== "string" || !uuid.test(body.record_id) ||
      typeof body.territory_id !== "string" || !uuid.test(body.territory_id)) {
    return response(400, { ok: false, error: "INVALID_REQUEST_SCHEMA" });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return response(401, { ok: false, error: "INVALID_AUTHENTICATION" });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: assignments, error: assignmentError } = await admin
    .from("role_assignments")
    .select("organization_id,scope_territory_id,starts_at,ends_at,roles(role_code)")
    .eq("user_id", authData.user.id)
    .eq("scope_territory_id", body.territory_id)
    .eq("active", true);
  if (assignmentError) return response(503, { ok: false, error: "AUTHORIZATION_LOOKUP_FAILED" });

  const now = Date.now();
  const authorized = (assignments ?? []).filter((item: any) => {
    const starts = item.starts_at ? Date.parse(item.starts_at) : Number.NEGATIVE_INFINITY;
    const ends = item.ends_at ? Date.parse(item.ends_at) : Number.POSITIVE_INFINITY;
    return rolesAllowed.has(String(item.roles?.role_code ?? "")) &&
      typeof item.organization_id === "string" &&
      (!item.starts_at || Number.isFinite(starts)) &&
      (!item.ends_at || Number.isFinite(ends)) &&
      now >= starts && now <= ends;
  });
  if (!authorized.length) return response(403, { ok: false, error: "TERRITORY_ACCESS_DENIED" });

  const { data: record, error: recordError } = await admin
    .from("rt_service_requests")
    .select("id,territory_id,service_type,status,created_at,updated_at")
    .eq("id", body.record_id)
    .eq("territory_id", body.territory_id)
    .maybeSingle();
  if (recordError) return response(503, { ok: false, error: "SOURCE_RECORD_LOOKUP_FAILED" });
  if (!record) return response(404, { ok: false, error: "SOURCE_RECORD_NOT_FOUND_IN_SCOPE" });

  const verification = String(record.status ?? "").toUpperCase();
  const allowedStatuses = new Set(["SUBMITTED", "RT_VERIFIED", "RW_REVIEW", "VILLAGE_REVIEW", "VILLAGE_VALIDATED"]);
  if (!allowedStatuses.has(verification)) return response(422, { ok: false, error: "SOURCE_RECORD_NOT_ELIGIBLE" });

  const matchingAssignments = authorized.filter((item: any) => item.scope_territory_id === record.territory_id);
  let mapping: any = null;
  let mappingAssignment: any = null;
  for (const assignment of matchingAssignments) {
    const { data, error } = await admin.from("sad_integration_mappings")
      .select("target_organization_ref,target_territory_ref")
      .eq("source_system", "RT_RW_SID_CONNECT")
      .eq("source_organization_id", assignment.organization_id)
      .eq("source_territory_id", record.territory_id)
      .eq("active", true)
      .maybeSingle();
    if (error) return response(503, { ok: false, error: "APPROVED_MAPPING_LOOKUP_FAILED" });
    if (data) { mapping = data; mappingAssignment = assignment; break; }
  }
  if (!mapping) return response(409, { ok: false, error: "APPROVED_SAD_MAPPING_REQUIRED" });

  // Deliberately minimized: no names, NIK, phone, address, free text, or source payload.
  const safePayload = {
    source_record_id: record.id,
    service_type: String(record.service_type ?? "GENERAL").slice(0, 80),
    status: verification,
    source_created_at: record.created_at,
    source_updated_at: record.updated_at ?? record.created_at,
  };
  const sourceUpdatedAt = String(record.updated_at ?? record.created_at);
  const payloadHash = await sha256(JSON.stringify(safePayload));
  const { data: inserted, error: insertError } = await admin.from("sad_integration_outbox").insert({
    event_type: "service_request.submitted",
    source_record_id: record.id,
    source_updated_at: sourceUpdatedAt,
    source_organization_id: mappingAssignment.organization_id,
    source_territory_id: record.territory_id,
    target_organization_ref: mapping.target_organization_ref,
    target_territory_ref: mapping.target_territory_ref,
    verification_status: verification,
    payload: safePayload,
    payload_sha256: payloadHash,
    created_by: authData.user.id,
  }).select("id,event_id,status,created_at").maybeSingle();

  if (insertError?.code === "23505") {
    const { data: existing, error: existingError } = await admin.from("sad_integration_outbox")
      .select("id,event_id,status,created_at,payload_sha256")
      .eq("source_system", "RT_RW_SID_CONNECT")
      .eq("event_type", "service_request.submitted")
      .eq("source_record_id", record.id)
      .eq("source_updated_at", sourceUpdatedAt)
      .maybeSingle();
    if (existingError || !existing) return response(503, { ok: false, error: "IDEMPOTENCY_LOOKUP_FAILED" });
    if (existing.payload_sha256 !== payloadHash) return response(409, { ok: false, error: "IDEMPOTENCY_PAYLOAD_CONFLICT" });
    return response(200, { ok: true, queued: true, duplicate: true, event_id: existing.event_id, status: existing.status });
  }
  if (insertError || !inserted) return response(503, { ok: false, error: "OUTBOX_PERSISTENCE_FAILED" });

  return response(202, { ok: true, queued: true, duplicate: false, event_id: inserted.event_id, status: inserted.status, delivery_enabled: false });
});
