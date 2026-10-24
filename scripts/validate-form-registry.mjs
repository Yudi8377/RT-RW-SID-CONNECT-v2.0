import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const registrySource = fs.readFileSync(new URL("../form-registry.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(registrySource, sandbox, { filename: "form-registry.js" });
const registry = sandbox.window.RTRW_SPECIFIC_FORM_SCHEMAS;
assert.ok(registry && typeof registry === "object", "form registry must be exported");
assert.ok(app.includes("window.RTRW_SPECIFIC_FORM_SCHEMAS&&window.RTRW_SPECIFIC_FORM_SCHEMAS[key()]"), "schema resolver must prefer route-specific schemas");
assert.ok(!app.includes('["Nama","text","Nama/objek"],["Scope","text","RT/RW/Desa"]'), "generic fallback must not return");

for (const [route, fields] of Object.entries(registry)) {
  assert.ok(Array.isArray(fields) && fields.length > 0, `${route} must define fields`);
  fields.forEach((field, index) => {
    assert.equal(field.length, 3, `${route} field ${index} must have label/type/hint`);
    assert.equal(typeof field[0], "string");
    assert.equal(typeof field[1], "string");
    assert.equal(typeof field[2], "string");
    assert.ok(field[0].trim(), `${route} field ${index} needs a label`);
    if (field[1] === "select") assert.ok(field[2].split("|").filter(Boolean).length >= 2, `${route} select ${index} needs options`);
  });
}

const modulesStart = app.indexOf("const modules=");
const modulesEnd = app.indexOf("const icons=", modulesStart);
assert.ok(modulesStart >= 0 && modulesEnd > modulesStart, "menu registry must exist");
const moduleSource = app.slice(modulesStart, modulesEnd);
const views = [...moduleSource.matchAll(/(?:^|\n)\s*([a-z][\w-]*):\["([^"]+)","[^"]+",\s*\[([\s\S]*?)\]\](?:,|\n)/g)];
const routeKeys = [];
for (const match of views) {
  const view = match[1];
  for (const sub of match[3].matchAll(/\[\s*"([^"]+)"\s*,\s*"([^"]+)"/g)) routeKeys.push(`${view}:${sub[1]}`);
}
const officialSource = app.slice(app.indexOf("const OFFICIAL_SCHEMAS="), app.indexOf("function officialSchema"));
const officialKeys = new Set([...officialSource.matchAll(/"([^"]+)":\[/g)].map(match => match[1]));
const missing = routeKeys.filter(route => !registry[route] && !officialKeys.has(route));
assert.deepEqual(missing, [], `every menu/submenu needs a specific schema: ${missing.join(", ")}`);
console.log(`Form registry OK: ${Object.keys(registry).length} route-specific schemas; ${routeKeys.length} menu routes covered; ${officialKeys.size} official intake schemas retained.`);
