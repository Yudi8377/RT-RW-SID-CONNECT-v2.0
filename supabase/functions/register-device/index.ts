import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isUuid } from "./policy.ts";
import { hashDeviceId, normalizeDeviceLabel } from "./_shared/device.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function json(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), { status, headers: corsHeaders });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json(401, { error: "UNAUTHORIZED" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return json(503, { error: "SERVICE_NOT_CONFIGURED" });
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json(401, { error: "UNAUTHORIZED" });

  const maxBodyBytes = 64 * 1024;
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
    return json(413, { error: "REQUEST_BODY_TOO_LARGE" });
  }

  let body: Record<string, unknown>;
  try {
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > maxBodyBytes) {
      return json(413, { error: "REQUEST_BODY_TOO_LARGE" });
    }
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return json(400, { error: "INVALID_REQUEST" });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return json(400, { error: "INVALID_REQUEST" });
  }

  if (!isUuid(body.organization_id) || !isUuid(body.device_id)) {
    return json(400, { error: "INVALID_DEVICE_REQUEST" });
  }
  const deviceHash = await hashDeviceId(body.device_id);
  const label = normalizeDeviceLabel(body.device_label);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.rpc("register_organization_device", {
    p_user_id: user.id,
    p_organization_id: body.organization_id,
    p_device_key_hash: deviceHash,
    p_device_label: label,
  });

  if (error) {
    if (error.code === "42501" || error.message?.includes("ORGANIZATION_ACCESS_DENIED")) {
      return json(403, { error: "ORGANIZATION_ACCESS_DENIED" });
    }
    if (error.message?.includes("DEVICE_LIMIT_REACHED")) return json(409, { error: "DEVICE_LIMIT_REACHED" });
    if (error.message?.includes("SUBSCRIPTION_INACTIVE")) return json(403, { error: "SUBSCRIPTION_INACTIVE" });
    if (error.message?.includes("DEVICE_ENTITLEMENT_NOT_CONFIGURED")) return json(503, { error: "DEVICE_ENTITLEMENT_NOT_CONFIGURED" });
    if (error.code === "22023") return json(400, { error: "INVALID_DEVICE_REQUEST" });
    return json(503, { error: "DEVICE_REGISTRATION_FAILED" });
  }

  return json(200, data && typeof data === "object" ? data as Record<string, unknown> : { error: "INVALID_DEVICE_RESPONSE" });
});
