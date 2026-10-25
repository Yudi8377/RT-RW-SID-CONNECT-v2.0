#!/usr/bin/env node
/**
 * Non-mutating Edge Function contract smoke tests.
 *
 * Run only against an isolated/staging Supabase project:
 *   SUPABASE_FUNCTIONS_URL=https://<staging-ref>.supabase.co/functions/v1 \
 *   SUPABASE_PROJECT_REF=<staging-ref> node scripts/test-edge-contracts.mjs
 *
 * This suite deliberately does not send a valid economic-evidence event because
 * that endpoint persists data. It tests only rejection paths that must occur
 * before any database mutation. The known production project is explicitly blocked.
 */
import assert from "node:assert/strict";

const base = (process.env.SUPABASE_FUNCTIONS_URL ?? "").replace(/\/+$/, "");
const projectRef = process.env.SUPABASE_PROJECT_REF ?? "";
const productionRef = "gzdusguveeeflmlvvmwe";

if (!base || !projectRef) {
  console.error("Set SUPABASE_FUNCTIONS_URL and SUPABASE_PROJECT_REF to an isolated staging project.");
  process.exit(2);
}
const parsed = new URL(base);
assert.equal(parsed.protocol, "https:", "The test target must use HTTPS.");
assert.match(parsed.hostname, new RegExp("^" + projectRef.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\.supabase\\.co$"),
  "URL hostname must match SUPABASE_PROJECT_REF.");
assert.notEqual(projectRef, productionRef, "Refusing to run smoke tests against the known production project.");
assert.ok(/(^|\/)(functions\/v1)$/.test(parsed.pathname), "SUPABASE_FUNCTIONS_URL must end in /functions/v1.");

let passed = 0;
const check = async (name, fn) => {
  try {
    await fn();
    passed++;
    console.log("PASS " + name);
  } catch (error) {
    console.error("FAIL " + name + ": " + (error?.stack ?? error));
    process.exitCode = 1;
  }
};
const endpoint = (slug) => base + "/" + slug;
const request = (slug, init = {}) => fetch(endpoint(slug), { redirect: "manual", ...init });
const json = (value) => ({ "content-type": "application/json", body: JSON.stringify(value) });

await check("village-preview OPTIONS preflight", async () => {
  const r = await request("village-preview", { method: "OPTIONS" });
  assert.equal(r.status, 200);
});
await check("village-preview GET fails closed without preview configuration", async () => {
  const r = await request("village-preview");
  assert.equal(r.status, 503);
  const body = await r.json();
  assert.equal(body.error, "PUBLIC_PREVIEW_NOT_CONFIGURED");
  assert.equal(body.status, undefined, "Must not return old global platform/count payload.");
});
await check("village-preview unsupported method is rejected", async () => {
  const r = await request("village-preview", { method: "POST" });
  assert.equal(r.status, 405);
  assert.equal((await r.json()).error, "METHOD_NOT_ALLOWED");
});

await check("public-experience OPTIONS preflight", async () => {
  const r = await request("public-experience", { method: "OPTIONS" });
  assert.equal(r.status, 200);
});
await check("public-experience rejects unapproved territory", async () => {
  const r = await request("public-experience", { method: "POST", ...json({ territory_id: "00000000-0000-4000-8000-000000000000" }) });
  assert.equal(r.status, 403);
  assert.equal((await r.json()).error, "TERRITORY_NOT_ALLOWED");
});
await check("public-experience rejects unsupported method", async () => {
  const r = await request("public-experience", { method: "PUT" });
  assert.equal(r.status, 405);
  assert.equal((await r.json()).error, "METHOD_NOT_ALLOWED");
});
await check("public-experience malformed JSON is rejected", async () => {
  const r = await request("public-experience", { method: "POST", headers: { "content-type": "application/json" }, body: "{" });
  assert.equal(r.status, 400);
  assert.equal((await r.json()).error, "INVALID_REQUEST");
});

await check("economic-evidence-ingest unsupported method is rejected", async () => {
  const r = await request("economic-evidence-ingest", { method: "GET" });
  assert.equal(r.status, 405);
  assert.equal((await r.json()).error, "METHOD_NOT_ALLOWED");
});
await check("economic-evidence-ingest missing integration headers is rejected", async () => {
  const r = await request("economic-evidence-ingest", { method: "POST", ...json({}) });
  assert.equal(r.status, 401);
  assert.equal((await r.json()).error, "INVALID_INTEGRATION_HEADERS");
});
await check("economic-evidence-ingest stale timestamp is rejected before signature/database checks", async () => {
  const r = await request("economic-evidence-ingest", {
    method: "POST",
    headers: { "content-type": "application/json", "X-Integration-Id": "jolie-economic-evidence-v1",
      "X-Event-Id": "123e4567-e89b-42d3-a456-426614174000", "X-Timestamp": "2000-01-01T00:00:00Z", "X-Signature": "v1=" + "0".repeat(64) },
    body: "{}"
  });
  assert.equal(r.status, 401);
  assert.equal((await r.json()).error, "TIMESTAMP_OUTSIDE_WINDOW");
});
await check("economic-evidence-ingest malformed signature is rejected before database checks", async () => {
  const now = new Date().toISOString();
  const r = await request("economic-evidence-ingest", {
    method: "POST",
    headers: { "content-type": "application/json", "X-Integration-Id": "jolie-economic-evidence-v1",
      "X-Event-Id": "123e4567-e89b-42d3-a456-426614174000", "X-Timestamp": now, "X-Signature": "not-a-signature" },
    body: "{}"
  });
  assert.equal(r.status, 401);
  assert.equal((await r.json()).error, "INVALID_SIGNATURE");
});

console.log(`\n${passed} contract checks passed.`);
if (process.exitCode) process.exit(process.exitCode);
