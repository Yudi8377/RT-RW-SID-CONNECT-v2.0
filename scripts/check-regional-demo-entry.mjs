import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
assert.match(app, /const DEMO_MODE=ADMIN_PREVIEW&&new URLSearchParams\(location\.search\)\.get\("demo"\)==="1";/, "demo mode must require explicit opt-in");
assert.match(app, /function startRegionalDemo\(\).*const code=selectedRole\(\).*u\.searchParams\.set\("role",code\)/, "selected region must be passed to the dashboard URL");
assert.match(app, /u\.searchParams\.set\("demo","1"\)/, "regional entry must activate isolated demo mode");
assert.match(app, /function startAdminPreview\(\).*u\.searchParams\.set\("role","PLATFORM_ADMIN"\)/, "Admin Utama must remain a separate explicit entry");
assert.match(app, /Buka Demo Interaktif Wilayah Terpilih/, "landing page must direct users to the selected regional demo");
assert.match(app, /rtrw_demo_records_v1/, "demo records must use a separate local-storage namespace");
assert.match(app, /if\(!DEMO_MODE&&C\.supabasePublishableKey&&window\.supabase\)/, "demo mode must not initialize the Supabase client");
assert.match(app, /DEMO INTERAKTIF · DATA SINTETIS TERISOLASI/, "regional demo must disclose synthetic isolated data");
assert.match(app, /Kembali ke Pemilihan Wilayah/, "regional demo must offer a clear way back to the region picker");
console.log("Regional demo entry regression checks passed.");
