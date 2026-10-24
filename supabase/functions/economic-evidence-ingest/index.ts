import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const jsonHeaders = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const fail = (status: number, code: string) => new Response(JSON.stringify({ accepted: false, error: code }), { status, headers: jsonHeaders });
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const hasOnlyKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).every((key) => keys.includes(key));
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const shaPattern = /^[a-f0-9]{64}$/;
const opaqueRefPattern = /^[A-Za-z0-9._:-]{1,120}$/;
const metricCodes = new Set(["completed_orders", "active_businesses", "active_products", "production_volume", "training_participants", "aggregate_sales"]);
const evidenceKinds = new Set(["business_report", "activity_photo", "invoice_summary", "training_attendance", "production_summary"]);

function hex(bytes: Uint8Array) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sign(secret: string, value: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

function validDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

async function readBodyLimited(req: Request, maxBytes: number): Promise<string> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("PAYLOAD_TOO_LARGE");
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder("utf-8", { fatal: true }).decode(merged);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return fail(405, "METHOD_NOT_ALLOWED");

  const secret = Deno.env.get("JOLIE_INTEGRATION_HMAC_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret || secret.length < 32 || !supabaseUrl || !serviceKey) return fail(503, "INTEGRATION_NOT_CONFIGURED");

  const integrationId = req.headers.get("X-Integration-Id") ?? "";
  const eventHeader = req.headers.get("X-Event-Id") ?? "";
  const timestamp = req.headers.get("X-Timestamp") ?? "";
  const signature = req.headers.get("X-Signature") ?? "";
  if (integrationId !== "jolie-economic-evidence-v1" || !uuidPattern.test(eventHeader)) return fail(401, "INVALID_INTEGRATION_HEADERS");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp)) return fail(401, "INVALID_TIMESTAMP");
  const parsedTimestamp = Date.parse(timestamp);
  if (!Number.isFinite(parsedTimestamp) || Math.abs(Date.now() - parsedTimestamp) > 5 * 60 * 1000) return fail(401, "TIMESTAMP_OUTSIDE_WINDOW");

  const declaredLength = Number(req.headers.get("Content-Length") ?? "0");
  if (declaredLength > 65536) return fail(413, "PAYLOAD_TOO_LARGE");
  let rawBody: string;
  try { rawBody = await readBodyLimited(req, 65536); }
  catch (error) { return fail(error instanceof Error && error.message === "PAYLOAD_TOO_LARGE" ? 413 : 400, "INVALID_OR_OVERSIZED_BODY"); }

  const supplied = signature.match(/^v1=([a-f0-9]{64})$/i)?.[1]?.toLowerCase();
  if (!supplied) return fail(401, "INVALID_SIGNATURE");
  const expected = await sign(secret, timestamp + "." + rawBody);
  if (!safeEqual(supplied, expected)) return fail(401, "INVALID_SIGNATURE");

  let body: unknown;
  try { body = JSON.parse(rawBody); } catch { return fail(400, "INVALID_JSON"); }
  if (!isRecord(body) || !hasOnlyKeys(body, ["schema_version","event_id","event_type","source_system","source_tenant_ref","target_territory_ref","period","metric","program_ref","evidence","provenance"])) return fail(400, "INVALID_SCHEMA");
  if (body.schema_version !== "1.0" || body.event_type !== "business.metric.snapshot" || body.source_system !== "JOLIE" || body.event_id !== eventHeader) return fail(400, "INVALID_EVENT");
  if (typeof body.source_tenant_ref !== "string" || !opaqueRefPattern.test(body.source_tenant_ref) || typeof body.target_territory_ref !== "string" || !opaqueRefPattern.test(body.target_territory_ref)) return fail(400, "INVALID_TENANT_REFERENCE");

  const period = body.period;
  const metric = body.metric;
  const evidence = body.evidence;
  const provenance = body.provenance;
  if (!isRecord(period) || !hasOnlyKeys(period, ["start","end"]) || !validDate(period.start) || !validDate(period.end) || String(period.end) < String(period.start)) return fail(400, "INVALID_PERIOD");
  if (!isRecord(metric) || !hasOnlyKeys(metric, ["code","value","unit","aggregation","currency"]) || typeof metric.code !== "string" || !metricCodes.has(metric.code) || typeof metric.value !== "number" || !Number.isFinite(metric.value) || metric.value < 0 || typeof metric.unit !== "string" || metric.unit.length < 1 || metric.unit.length > 32 || !["tenant_period","program_period"].includes(String(metric.aggregation))) return fail(400, "INVALID_METRIC");
  if (metric.currency !== null && metric.currency !== undefined && (typeof metric.currency !== "string" || !/^[A-Z]{3}$/.test(metric.currency))) return fail(400, "INVALID_CURRENCY");
  if (!Array.isArray(evidence) || evidence.length > 5) return fail(400, "INVALID_EVIDENCE");
  for (const item of evidence) {
    if (!isRecord(item) || !hasOnlyKeys(item, ["evidence_ref","kind","sha256","captured_at","access"]) ||
      typeof item.evidence_ref !== "string" || !opaqueRefPattern.test(item.evidence_ref) ||
      typeof item.kind !== "string" || !evidenceKinds.has(item.kind) ||
      typeof item.sha256 !== "string" || !shaPattern.test(item.sha256) ||
      typeof item.captured_at !== "string" || !Number.isFinite(Date.parse(item.captured_at)) ||
      item.access !== "restricted") return fail(400, "INVALID_EVIDENCE");
  }
  if (!isRecord(provenance) || !hasOnlyKeys(provenance, ["generated_at","source_record_count","source_query_version","verification_status"]) ||
    typeof provenance.generated_at !== "string" || !Number.isFinite(Date.parse(provenance.generated_at)) ||
    !Number.isInteger(provenance.source_record_count) || Number(provenance.source_record_count) < 0 ||
    typeof provenance.source_query_version !== "string" || !/^[A-Za-z0-9._:-]{1,80}$/.test(provenance.source_query_version)) return fail(400, "INVALID_PROVENANCE");
  if (body.program_ref !== null && body.program_ref !== undefined && (typeof body.program_ref !== "string" || !uuidPattern.test(body.program_ref))) return fail(400, "INVALID_PROGRAM_REFERENCE");
  if (metric.aggregation === "program_period" && !body.program_ref) return fail(400, "PROGRAM_REQUIRED");

  const payloadHash = hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rawBody))));
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: mapping, error: mappingError } = await supabase.schema("village").from("integration_tenant_mappings")
    .select("organization_id,territory_id,target_territory_ref")
    .eq("source_system", "JOLIE")
    .eq("source_tenant_ref", body.source_tenant_ref)
    .eq("target_territory_ref", body.target_territory_ref)
    .eq("is_active", true)
    .maybeSingle();
  if (mappingError) return fail(503, "MAPPING_LOOKUP_FAILED");
  if (!mapping) return fail(403, "TENANT_MAPPING_NOT_APPROVED");

  let targetProgramId: string | null = null;
  if (body.program_ref) {
    const { data: program, error: programError } = await supabase.schema("village").from("programs")
      .select("id")
      .eq("id", body.program_ref)
      .eq("organization_id", mapping.organization_id)
      .eq("territory_id", mapping.territory_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (programError) return fail(503, "PROGRAM_LOOKUP_FAILED");
    if (!program) return fail(422, "PROGRAM_NOT_FOUND_IN_SCOPE");
    targetProgramId = program.id;
  }

  const { data: existing, error: existingError } = await supabase.schema("village").from("economic_evidence_inbox")
    .select("id,payload_sha256")
    .eq("source_system", "JOLIE")
    .eq("event_id", body.event_id)
    .maybeSingle();
  if (existingError) return fail(503, "IDEMPOTENCY_LOOKUP_FAILED");
  if (existing) {
    if (existing.payload_sha256 !== payloadHash) return fail(409, "EVENT_ID_PAYLOAD_CONFLICT");
    return new Response(JSON.stringify({ accepted: true, event_id: body.event_id, receipt_id: existing.id, status: "received", duplicate: true, received_at: new Date().toISOString() }), { status: 200, headers: jsonHeaders });
  }

  const safeEvidence = (evidence as Record<string, unknown>[]).map((item) => ({
    evidence_ref: item.evidence_ref,
    kind: item.kind,
    sha256: item.sha256,
    captured_at: item.captured_at,
    access: "restricted",
  }));
  const safeProvenance = {
    generated_at: provenance.generated_at,
    source_record_count: provenance.source_record_count,
    source_query_version: provenance.source_query_version,
    verification_status: "source_reported",
  };
  const { data: inserted, error: insertError } = await supabase.schema("village").from("economic_evidence_inbox").insert({
    source_system: "JOLIE",
    event_id: body.event_id,
    schema_version: body.schema_version,
    event_type: body.event_type,
    source_tenant_ref: body.source_tenant_ref,
    target_territory_ref: body.target_territory_ref,
    organization_id: mapping.organization_id,
    territory_id: mapping.territory_id,
    target_program_id: targetProgramId,
    period_start: period.start,
    period_end: period.end,
    metric_code: metric.code,
    metric_value: metric.value,
    metric_unit: metric.unit,
    aggregation_scope: metric.aggregation,
    currency: metric.currency ?? null,
    evidence: safeEvidence,
    provenance: safeProvenance,
    payload_sha256: payloadHash,
    status: "received",
  }).select("id,received_at").single();

  if (insertError?.code === "23505") return fail(409, "EVENT_ID_ALREADY_ACCEPTED");
  if (insertError || !inserted) return fail(503, "EVENT_PERSISTENCE_FAILED");
  return new Response(JSON.stringify({ accepted: true, event_id: body.event_id, receipt_id: inserted.id, status: "received", duplicate: false, received_at: inserted.received_at }), { status: 202, headers: jsonHeaders });
});
