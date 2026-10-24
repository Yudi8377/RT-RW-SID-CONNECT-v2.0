import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
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
function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}
const allSourceFiles = walk("supabase/functions").filter((file) => file.endsWith(".ts"));
for (const file of allSourceFiles) {
  const source = readFileSync(file, "utf8");
  assert.doesNotMatch(source, /eyJhbGciOi/);
  assert.doesNotMatch(source, /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/);
  assert.doesNotMatch(source, /service_role_key\s*[:=]\s*["'][^"']+["']/i);
  for (const match of source.matchAll(/from\s+["'](\.{1,2}\/[^"']+\.ts)["']/g)) {
    const target = path.resolve(path.dirname(file), match[1]);
    assert.ok(existsSync(target), `broken relative import in ${file}: ${match[1]}`);
  }
}
assert.match(preview, /SUPABASE_SERVICE_ROLE_KEY/);
console.log(`Source integrity checks passed for ${activeProductionSlugs.length} active functions and ${allSourceFiles.length} TypeScript files (static checks only; not runtime security tests).`);
