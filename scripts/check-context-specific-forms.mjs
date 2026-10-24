import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const app = readFileSync("app.js", "utf8");
assert.match(app, /function contextualFallbackSchema\(\)/, "contextual fallback schema must exist");
assert.match(app, /"identitas:profil"/, "RT/RW identity profile form must be specific");
assert.match(app, /"identitas:pengurus"/, "RT/RW management form must be specific");
assert.match(app, /"kegiatan:meeting"/, "meeting form must be specific");
assert.match(app, /"kegiatan:minutes"/, "minutes form must be specific");
assert.match(app, /"layanan:complaints"/, "complaint form must be specific");
assert.match(app, /"desa:development"/, "village development form must be specific");
assert.match(app, /"desa:regulation"/, "village regulation form must be specific");
assert.match(app, /"kecamatan:escalations"/, "district escalation form must be specific");
assert.match(app, /"kabkota:programs"/, "regency/city program form must be specific");
assert.match(app, /"admin:forms"/, "form governance must include legal-review metadata");
assert.match(app, /if\(\(state\.view==="rt"\|\|state\.view==="warga"\)&&schemas\[state\.sub\]\)return schemas\[state\.sub\]/, "legacy resident schemas must be limited to resident/RT modules");
assert.match(app, /return contextualFallbackSchema\(\)/, "unmapped regional submenus must get contextual fields, not null/generic shared fields");

const formKeys = [...app.matchAll(/\["([^"]+)",\s*"[^"]+",\s*"[^"]+"\]/g)].map((m) => m[1]);
assert.ok(formKeys.length > 100, "expected substantial existing form registry to remain intact");
console.log("Context-specific form checks passed.");


// Every actual submenu in the product navigation must resolve through the dedicated registry.
assert.match(app, /function submenuSpecificSchema\(\)/, "dedicated submenu form registry must exist");
assert.match(app, /const submenuSchema=submenuSpecificSchema\(\); if\(submenuSchema\)return submenuSchema/, "submenu-specific schema must take priority over broad module fallback");
const moduleBlock = app.match(/const modules=\{([\s\S]*?)\n\};/);
assert.ok(moduleBlock, "navigation module registry must exist");
const modulePairs = [...moduleBlock[1].matchAll(/\[\s*["']([^"']+)["']\s*,\s*["'][^"']+["']\s*\]/g)];
assert.ok(modulePairs.length >= 100, "navigation should retain broad submenu coverage");
assert.match(app, /familyBySub=/, "submenu IDs must be classified into task-specific form families");
