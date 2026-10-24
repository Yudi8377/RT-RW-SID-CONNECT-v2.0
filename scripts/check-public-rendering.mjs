import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const source = readFileSync("website/app.js", "utf8");
const required = [
  "function escapeHtml(value)",
  'escapeHtml(x.id||x.agenda_id||""),',
  "escapeHtml(title)",
  "escapeHtml(type)",
  'escapeHtml(x.location||"Lokasi belum ditentukan")',
  "escapeHtml(b.business_name)",
  'escapeHtml(b.products_services||"Produk/jasa lokal")',
  'escapeHtml(x.summary||x.content||"")',
  "escapeHtml(x.name)",
  "escapeHtml(x.status)"
];
for (const token of required) assert.ok(source.includes(token), `missing public rendering escape: ${token}`);
assert.ok(!source.includes('<strong>`+x.title+`</strong>'), "announcement title must be escaped");
assert.ok(!source.includes('<strong>`+x.name+`</strong>'), "community title must be escaped");
console.log("Public rendering safety checks passed.");
