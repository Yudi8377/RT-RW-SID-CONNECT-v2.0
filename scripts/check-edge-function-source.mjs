import { readFileSync, existsSync } from "node:fs";
import assert from "node:assert/strict";

const activeProductionSlugs = [
  "bootstrap-pilot",
  "rt-transaction",
  "workflow-transition",
  "rw-review",
  "admin-access-management",
  "public-service-request",
  "citizen-room",
  "public-experience",
  "citizen-location",
  "ai-data-intake",
  "assistance-rules-evaluate",
  "assistance-workflow",
  "ai-companion",
  "village-preview",
  "economic-evidence-ingest",
  "knowledge-ingest",
  "editorial-ai",
  "start-trial",
  "register-device"
];
for (const slug of activeProductionSlugs) {
  const path = `supabase/functions/${slug}/index.ts`;
  assert.ok(existsSync(path), `missing tracked source for active production function: ${slug}`);
}
const read = (slug) => readFileSync(`supabase/functions/${slug}/index.ts`, "utf8");
const preview = read("village-preview");
const publicApi = read("public-experience");
const ingest = read("economic-evidence-ingest");

assert.match(publicApi, /PUBLIC_DEMO_TERRITORY_ID/);
assert.match(publicApi, /TERRITORY_NOT_ALLOWED/);
assert.match(publicApi, /METHOD_NOT_ALLOWED/);
assert.match(publicApi, /REQUEST_FAILED/);
assert.doesNotMatch(publicApi, /notes:x\.notes/);
assert.doesNotMatch(publicApi, /summary,content,category/);
assert.match(ingest, /JOLIE_INTEGRATION_HMAC_SECRET/);
assert.match(ingest, /TIMESTAMP_OUTSIDE_WINDOW/);
assert.match(ingest, /INVALID_SIGNATURE/);
assert.match(ingest, /EVENT_ID_PAYLOAD_CONFLICT/);
for (const slug of activeProductionSlugs) {
  const source = read(slug);
  assert.doesNotMatch(source, /eyJhbGciOi/);
  assert.doesNotMatch(source, /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/);
  assert.doesNotMatch(source, /service_role_key\s*[:=]\s*["'][^"']+["']/i);
}
assert.match(preview, /SUPABASE_SERVICE_ROLE_KEY/);
console.log(`Source integrity checks passed for ${activeProductionSlugs.length} active production functions (static checks only; not runtime security tests).`);
