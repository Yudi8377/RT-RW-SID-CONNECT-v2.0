import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isUuid } from "./policy.ts";

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

  let organizationId: unknown;
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json(400, { error: "INVALID_REQUEST" });
    }
    organizationId = (body as Record<string, unknown>).organization_id;
  } catch {
    return json(400, { error: "INVALID_REQUEST" });
  }
  if (!isUuid(organizationId)) return json(400, { error: "INVALID_ORGANIZATION_ID" });

  // A single database function performs authorization, trial uniqueness, creation,
  // and audit insertion in one transaction. The service-role key never leaves this server.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.rpc("start_organization_trial", {
    p_user_id: user.id,
    p_organization_id: organizationId,
    p_correlation_id: req.headers.get("x-request-id")?.slice(0, 128) ?? null,
  });

  if (error) {
    if (error.code === "42501" || error.message?.includes("ORGANIZATION_ACCESS_DENIED")) {
      return json(403, { error: "ORGANIZATION_ACCESS_DENIED" });
    }
    if (error.code === "23505") {
      const known = ["TRIAL_ALREADY_USED", "SUBSCRIPTION_ALREADY_CURRENT", "TRIAL_OR_SUBSCRIPTION_ALREADY_EXISTS"];
      const safeError = known.find((code) => error.message?.includes(code)) ?? "TRIAL_OR_SUBSCRIPTION_ALREADY_EXISTS";
      return json(409, { error: safeError });
    }
    if (error.code === "P0002" || error.message?.includes("TRIAL_PLAN_NOT_CONFIGURED")) {
      return json(503, { error: "TRIAL_PLAN_NOT_CONFIGURED" });
    }
    if (error.code === "22023") return json(400, { error: "INVALID_TRIAL_REQUEST" });
    return json(503, { error: "TRIAL_CREATION_FAILED" });
  }

  return json(201, data && typeof data === "object" ? data as Record<string, unknown> : { error: "INVALID_TRIAL_RESPONSE" });
});
