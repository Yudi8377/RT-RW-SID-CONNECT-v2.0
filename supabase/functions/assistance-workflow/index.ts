import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const actionMap: Record<string, { level: "RT" | "RW" | "VILLAGE"; roles: string[]; from: string; to: string }> = {
  RT_VERIFY: { level: "RT", roles: ["RT_OPERATOR", "PLATFORM_ADMIN"], from: "SUBMITTED", to: "RT_VERIFIED" },
  RW_VERIFY: { level: "RW", roles: ["RW_REVIEWER", "PLATFORM_ADMIN"], from: "RT_VERIFIED", to: "RW_VERIFIED" },
  VILLAGE_VALIDATE: { level: "VILLAGE", roles: ["VILLAGE_VALIDATOR", "PLATFORM_ADMIN"], from: "RW_VERIFIED", to: "VILLAGE_VALIDATED" },
  AUTHORIZE: { level: "VILLAGE", roles: ["VILLAGE_VALIDATOR", "PLATFORM_ADMIN"], from: "VILLAGE_VALIDATED", to: "APPROVED" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) throw new Error("Authorization required");

    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authorization } } },
    );
    const { data: { user }, error: userError } = await anon.auth.getUser();
    if (userError || !user) throw new Error("Authenticated user required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const applicationId = String(body.application_id || "");
    const action = String(body.action || "").toUpperCase();
    const notes = body.notes ? String(body.notes).slice(0, 2000) : null;
    const evidence = Array.isArray(body.evidence) ? body.evidence.slice(0, 20) : [];

    if (!applicationId || !actionMap[action]) throw new Error("application_id and a valid workflow action are required");
    const transition = actionMap[action];

    const { data: application, error: applicationError } = await admin
      .from("assistance_applications")
      .select("*")
      .eq("id", applicationId)
      .maybeSingle();
    if (applicationError) throw applicationError;
    if (!application) throw new Error("Application not found");
    if (!application.territory_id) throw new Error("Application has no territory scope");

    const { data: assignments, error: assignmentError } = await admin
      .from("role_assignments")
      .select("roles(role_code)")
      .eq("user_id", user.id)
      .eq("scope_territory_id", application.territory_id)
      .eq("active", true);
    if (assignmentError) throw assignmentError;
    const roles = (assignments || []).map((x: any) => x.roles?.role_code).filter(Boolean) as string[];
    if (!transition.roles.some((role) => roles.includes(role))) {
      throw new Error("Role is not authorized for this assistance workflow action");
    }

    const current = String(application.workflow_status || "SUBMITTED");
    if (current !== transition.from) {
      throw new Error(`Invalid workflow transition from ${current} using ${action}`);
    }

    const verification = {
      application_id: applicationId,
      verification_level: transition.level,
      decision: action === "AUTHORIZE" ? "VERIFIED" : "VERIFIED",
      notes,
      evidence,
      verified_by: user.id,
    };
    const { data: verificationRow, error: verificationError } = await admin
      .from("assistance_verifications")
      .insert(verification)
      .select("*")
      .single();
    if (verificationError) throw verificationError;

    const { data: updated, error: updateError } = await admin
      .from("assistance_applications")
      .update({
        workflow_status: transition.to,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId)
      .eq("workflow_status", transition.from)
      .select("*")
      .single();
    if (updateError) throw updateError;

    await admin.from("audit_logs").insert({
      actor_user_id: user.id,
      action: "ASSISTANCE_" + action,
      entity_type: "assistance_applications",
      entity_id: applicationId,
      scope_territory_id: application.territory_id,
      before_data: { workflow_status: application.workflow_status },
      after_data: { workflow_status: updated.workflow_status },
      reason: notes,
      source: "ASSISTANCE_WORKFLOW",
      authority: roles.join(","),
    });

    return new Response(JSON.stringify({
      ok: true,
      action,
      from_status: current,
      to_status: updated.workflow_status,
      decision_support_only: true,
      final_eligibility_decision: null,
      verification: verificationRow,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: String(error?.message || error) }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});