import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "Pragma": "no-cache",
};

/**
 * Fail closed while the public demo aggregate contract is not configured.
 *
 * The previous implementation used the service-role key to count rows across
 * global tables and returned platform metadata without a territory boundary.
 * Do not re-enable data access until each source has an explicit demo
 * allowlist, approved aggregate fields, and runtime contract tests.
 */
Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ ok: false, error: "METHOD_NOT_ALLOWED" }), {
      status: 405,
      headers,
    });
  }
  return new Response(JSON.stringify({
    ok: false,
    error: "PUBLIC_PREVIEW_NOT_CONFIGURED",
  }), {
    status: 503,
    headers,
  });
});
