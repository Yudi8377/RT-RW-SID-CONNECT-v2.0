import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const publicExperience = read("../supabase/functions/public-experience/index.ts");
const villagePreview = read("../supabase/functions/village-preview/index.ts");

test("public-experience pins all public reads to the approved demo territory", () => {
  assert.match(publicExperience, /const PUBLIC_DEMO_TERRITORY_ID\s*=\s*"[0-9a-f-]{36}"/i);
  assert.match(publicExperience, /body\.territory_id!==PUBLIC_DEMO_TERRITORY_ID\) return json\(\{ok:false,error:"TERRITORY_NOT_ALLOWED"\},403\)/);
  assert.match(publicExperience, /\.eq\("id",territoryId\)\.eq\("territory_type","VILLAGE"\)\.eq\("active",true\)/);
});

test("community event response does not serialize internal notes or organizer person IDs", () => {
  assert.match(publicExperience, /\.eq\("public_visible",true\)\.neq\("status","CANCELLED"\)/);
  assert.doesNotMatch(publicExperience, /notes\s*:\s*x\.notes/);
  assert.doesNotMatch(publicExperience, /organizer_person_id\s*:\s*x\.organizer_person_id/);
  assert.match(publicExperience, /description:eventDescription\(x\.event_type,x\.name,x\.notes\)/);
});

test("announcement response uses an explicit public field allowlist", () => {
  assert.match(publicExperience, /\.select\("id,title,summary,category,published_at,image_url"\)/);
  assert.doesNotMatch(publicExperience, /\.select\([^\n]*\bcontent\b/);
  assert.match(publicExperience, /\.eq\("status","PUBLISHED"\)/);
});

test("business response is scoped to visible records and excludes demo seed rows", () => {
  assert.match(publicExperience, /\.eq\("territory_id",territoryId\)\.eq\("public_visible",true\)\.not\("source","eq","DEMO_SEED"\)/);
  assert.match(publicExperience, /\.select\("id,business_name,business_type,sector,products_services,verification_status"\)/);
});

test("public-experience returns generic server errors rather than database details", () => {
  assert.match(publicExperience, /catch\(_e\)\s*\{return json\(\{ok:false,error:"REQUEST_FAILED"\},500\);\}/);
  assert.doesNotMatch(publicExperience, /error:\s*_e\.message/);
});

test("village-preview remains fail-closed without a service-role database client", () => {
  assert.match(villagePreview, /PUBLIC_PREVIEW_NOT_CONFIGURED/);
  assert.match(villagePreview, /status:\s*503/);
  assert.doesNotMatch(villagePreview, /SUPABASE_SERVICE_ROLE_KEY|createClient\(|\.from\(/);
});
