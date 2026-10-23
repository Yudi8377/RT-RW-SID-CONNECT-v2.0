import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const requiredRoles = [
  "RT_OPERATOR",
  "RW_REVIEWER",
  "VILLAGE_VALIDATOR",
  "DISTRICT_COORDINATOR",
  "REGENCY_CITY_ADMIN",
  "PLATFORM_ADMIN",
];

for (const role of requiredRoles) {
  assert.match(app, new RegExp(role), `missing role definition: ${role}`);
}

const requiredWorkspaces = [
  "function adminControlCenter(",
  "function renderRTDashboard(",
  "function renderRWDashboard(",
  "function renderVillageDashboard(",
  "function renderDistrictDashboard(",
  "function renderRegencyDashboard(",
];

for (const workspace of requiredWorkspaces) {
  assert.ok(app.includes(workspace), `missing workspace: ${workspace}`);
}

assert.match(
  app,
  /function previewDashboard\(code\)\{if\(!ADMIN_PREVIEW\|\|!\[\.\.\.ENTRY_ROLES,"PLATFORM_ADMIN"\]\.includes\(code\)\)return/,
  "role preview must remain limited to explicit development preview mode",
);
assert.match(
  app,
  /function previewRoleCode\(\)\{if\(!ADMIN_PREVIEW\)return "PLATFORM_ADMIN";const params=new URLSearchParams\(location\.search\),requested=params\.get\("role"\)/,
  "direct role selection must only be interpreted while preview=admin is active",
);
assert.match(
  app,
  /url\.searchParams\.set\("role",code\)/,
  "choosing a dashboard must produce a direct, shareable role-specific preview URL",
);
assert.match(
  app,
  /url\.searchParams\.delete\("role"\)/,
  "returning to Platform Admin must clear the selected regional preview",
);
assert.match(
  app,
  /PLATFORM_ADMIN:\s*null/,
  "Platform Admin must retain unrestricted module navigation in the UI role map",
);
assert.match(
  app,
  /Pratinjau dashboard per wilayah/,
  "Platform Admin development workbench must retain the regional dashboard launcher",
);

assert.ok(app.includes("function previewScopedWorkspace()"),"preview workspace renderer must exist");
for (const title of ["Meja kerja RT","Meja review RW","Meja validasi desa","Meja koordinasi kecamatan","Meja eksekutif daerah","Meja informasi SID","Meja kontrol platform"]) assert.ok(app.includes(title),`missing distinct role workspace: ${title}`);
assert.match(app,/PRATINJAU ALUR KERJA · TANPA DATA PRODUKSI/,"preview must disclose that production data is not loaded");
assert.doesNotMatch(app,/Workspace operasional dan tindakan yang dapat mengakses data produksi dinonaktifkan dalam mode pengembangan/,"the identical generic preview placeholder must not be reused");
console.log("Admin workspace regression smoke tests passed.");
console.log(`Verified roles: ${requiredRoles.join(", ")}`);
console.log(`Verified workspaces: ${requiredWorkspaces.join(", ")}`);

assert.ok(app.includes("Current Access & Scope Audit"), "access management must show role/scope audit");
assert.ok(app.includes("ORGANIZATION / TENANT"), "access management must show organization mapping");
assert.ok(app.includes("ROLE_SCOPE_TYPE_MISMATCH") === false, "browser UI must not claim backend validation is implemented client-side");
assert.ok(app.includes("assignment memerlukan audit scope") || app.includes("assignment memerlukan audit scope".replace("assignment","assignment")), "invalid scope assignments must be disclosed");
