import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const TRIAL_PLAN_CODE = "TRIAL_7_DAY";
const TRIAL_DAYS = 7;

type Assignment = {
  organization_id: string;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

function json(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), { status, headers: corsHeaders });
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isCurrentAssignment(assignment: Assignment, now: number): boolean {
  if (assignment.active !== true) return false;
  const start = assignment.starts_at ? Date.parse(assignment.starts_at) : Number.NEGATIVE_INFINITY;
  const end = assignment.ends_at ? Date.parse(assignment.ends_at) : Number.POSITIVE_INFINITY;
  return Number.isFinite(start) || start === Number.NEGATIVE_INFINITY
    ? (Number.isFinite(end) || end === Number.POSITIVE_INFINITY) && start <= now && end > now
    : false;
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

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const now = new Date();
  const nowMs = now.getTime();

  // Authorization is tied to the authenticated user's current organization assignment.
  const { data: assignments, error: assignmentError } = await admin
    .from("role_assignments")
    .select("organization_id, active, starts_at, ends_at")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .eq("active", true);
  if (assignmentError) return json(503, { error: "AUTHORIZATION_LOOKUP_FAILED" });
  if (!(assignments ?? []).some((item: Assignment) => isCurrentAssignment(item, nowMs))) {
    return json(403, { error: "ORGANIZATION_ACCESS_DENIED" });
  }

  // The browser cannot choose the plan, price, dates, status, or activation source.
  const { data: plan, error: planError } = await admin
    .from("subscription_plans")
    .select("id, plan_code, billing_interval, duration_days, active")
    .eq("plan_code", TRIAL_PLAN_CODE)
    .eq("active", true)
    .maybeSingle();
  if (planError) return json(503, { error: "PLAN_LOOKUP_FAILED" });
  if (!plan || plan.billing_interval !== "TRIAL" || plan.duration_days !== TRIAL_DAYS) {
    return json(503, { error: "TRIAL_PLAN_NOT_CONFIGURED" });
  }

  const { data: previousTrial, error: trialLookupError } = await admin
    .from("organization_subscriptions")
    .select("id, status, trial_ends_at")
    .eq("organization_id", organizationId)
    .not("trial_started_at", "is", null)
    .limit(1)
    .maybeSingle();
  if (trialLookupError) return json(503, { error: "TRIAL_LOOKUP_FAILED" });
  if (previousTrial) {
    return json(409, {
      error: "TRIAL_ALREADY_USED",
      status: previousTrial.status,
      trial_ends_at: previousTrial.trial_ends_at,
    });
  }

  const { data: currentSubscription, error: currentLookupError } = await admin
    .from("organization_subscriptions")
    .select("id, status")
    .eq("organization_id", organizationId)
    .in("status", ["TRIALING", "ACTIVE", "GRACE", "PAST_DUE"])
    .limit(1)
    .maybeSingle();
  if (currentLookupError) return json(503, { error: "SUBSCRIPTION_LOOKUP_FAILED" });
  if (currentSubscription) return json(409, { error: "SUBSCRIPTION_ALREADY_CURRENT" });

  const startsAt = now.toISOString();
  const endsAt = new Date(nowMs + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: subscription, error: insertError } = await admin
    .from("organization_subscriptions")
    .insert({
      organization_id: organizationId,
      plan_id: plan.id,
      status: "TRIALING",
      trial_started_at: startsAt,
      trial_ends_at: endsAt,
      current_period_starts_at: startsAt,
      current_period_ends_at: endsAt,
      activated_by: user.id,
      activation_source: "SYSTEM_TRIAL",
      metadata: { created_by: "start-trial-v1" },
    })
    .select("id, organization_id, status, trial_started_at, trial_ends_at, current_period_starts_at, current_period_ends_at")
    .single();

  if (insertError) {
    // Unique indexes are the final concurrency guard for one trial and one current subscription.
    if (insertError.code === "23505") return json(409, { error: "TRIAL_OR_SUBSCRIPTION_ALREADY_EXISTS" });
    return json(503, { error: "TRIAL_CREATION_FAILED" });
  }

  const { error: auditError } = await admin.from("subscription_audit_events").insert({
    organization_id: organizationId,
    subscription_id: subscription.id,
    actor_user_id: user.id,
    event_code: "TRIAL_STARTED",
    next_status: "TRIALING",
    reason: "Seven-day trial started by authenticated organization member",
    source: "SYSTEM",
    correlation_id: req.headers.get("x-request-id")?.slice(0, 128) ?? null,
    safe_metadata: { plan_code: TRIAL_PLAN_CODE, duration_days: TRIAL_DAYS },
  });

  if (auditError) {
    // The subscription is already committed; report this as a partial operational failure
    // rather than falsely claiming the audit event was persisted.
    return json(500, { error: "TRIAL_CREATED_AUDIT_PENDING", subscription_id: subscription.id });
  }

  return json(201, { subscription });
});
