import { readFileSync, existsSync } from "node:fs";
import assert from "node:assert/strict";

const required = [
  "supabase/functions/village-preview/index.ts",
  "supabase/functions/public-experience/index.ts",
  "supabase/functions/economic-evidence-ingest/index.ts",
];
for (const path of required) assert.ok(existsSync(path), `missing tracked Edge Function source: ${path}`);

const read = (path) => readFileSync(path, "utf8");
const preview = read(required[0]);
const publicApi = read(required[1]);
const ingest = read(required[2]);

assert.match(preview, /SUPABASE_SERVICE_ROLE_KEY/);
assert.doesNotMatch(preview, /eyJhbGciOi/);
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
for (const source of [preview, publicApi, ingest]) {
  assert.doesNotMatch(source, /service_role_key\s*[:=]\s*["'][^"']+["']/i, "service-role secret must not be hardcoded");
  assert.doesNotMatch(source, /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, "private key must not be committed");
}
console.log("Edge Function source integrity checks passed (static checks only; not a runtime security test).");
