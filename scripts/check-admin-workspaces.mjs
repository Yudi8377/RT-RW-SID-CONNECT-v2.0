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
  /function previewDashboard\(code\)\{if\(!ADMIN_PREVIEW\|\|!ENTRY_ROLES\.includes\(code\)\)return/,
  "role preview must remain limited to explicit development preview mode",
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

console.log("Admin workspace regression smoke tests passed.");
console.log(`Verified roles: ${requiredRoles.join(", ")}`);
console.log(`Verified workspaces: ${requiredWorkspaces.join(", ")}`);
