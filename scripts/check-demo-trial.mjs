import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("app.js", "utf8");
const helperStart = source.indexOf("function requestedTrialDays()");
const helperEnd = source.indexOf("function previewRoleCode()", helperStart);
assert(helperStart >= 0 && helperEnd > helperStart, "preview trial helpers must exist");
const helpers = source.slice(helperStart, helperEnd);

function harness({ search = "", stored = null, now = 1_800_000_000_000 } = {}) {
  const values = new Map();
  if (stored !== null) values.set("rtrw_sid_preview_trial_v1", stored);
  const sandbox = {
    URLSearchParams,
    location: { search },
    localStorage: {
      getItem: (key) => values.has(key) ? values.get(key) : null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    },
    Date: { now: () => now },
  };
  vm.createContext(sandbox);
  vm.runInContext('const PREVIEW_TRIAL_KEY = "rtrw_sid_preview_trial_v1";\n' + helpers + "\nthis.trialApi={requestedTrialDays,ensurePreviewTrial,previewTrialInfo,beginPreviewTrialIfMissing};", sandbox);
  return { api: sandbox.trialApi, values, setNow(value) { sandbox.Date = { now: () => value }; } };
}

{
  const h = harness();
  const info = h.api.beginPreviewTrialIfMissing();
  assert.equal(info.durationDays, 7, "default preview duration must be seven days");
  assert.equal(info.active, true);
  assert.equal(info.daysRemaining, 7);
}
{
  const h = harness({ search: "?trialDays=14" });
  const info = h.api.beginPreviewTrialIfMissing();
  assert.equal(info.durationDays, 14, "explicit evaluation preview may last fourteen days");
  assert.equal(info.daysRemaining, 14);
}
{
  const h = harness({ search: "?trialDays=14" });
  const started = h.api.beginPreviewTrialIfMissing();
  h.setNow(1_800_000_000_000 + 8 * 86_400_000);
  const expired = h.api.beginPreviewTrialIfMissing();
  assert.equal(expired.durationDays, 14, "changing time must not reset the stored duration");
  assert.equal(expired.active, true, "fourteen-day preview should still be active after eight days");
  h.setNow(1_800_000_000_000 + 15 * 86_400_000);
  assert.equal(h.api.previewTrialInfo().active, false, "preview must expire after the configured duration");
}
{
  const legacyStart = 1_800_000_000_000 - 8 * 86_400_000;
  const h = harness({ stored: String(legacyStart), now: 1_800_000_000_000 });
  const info = h.api.previewTrialInfo();
  assert.equal(info.durationDays, 7, "legacy timestamp trials must migrate to the authoritative seven-day duration");
  assert.equal(info.active, false, "expired legacy trial must not be reset during migration");
}
{
  assert.match(source, /if\(ADMIN_PREVIEW&&DEMO_MODE\).*?access\.code==="OPEN_SID_UMUM"/s, "public role must be blocked from demo writes");
  assert.match(source, /function persist\(\)\{try\{if\(DEMO_MODE&&!previewTrialInfo\(\)\.active\)return;/, "expired demo writes must not persist");
  assert.match(source, /function confirmDelete\(\)\{if\(DEMO_MODE&&\(!previewTrialInfo\(\)\.active\|\|access\.code==="OPEN_SID_UMUM"\)\)/, "expired/public demo deletes must be blocked");
  assert.match(source, /Sisa trial:/, "workspace must show remaining trial duration");
  assert.match(source, /Evaluasi demo · 14 hari/, "landing page must offer the fourteen-day evaluation preview");
}
console.log("Demo trial contract checks passed (7-day default, 14-day evaluation, expiry, legacy migration, public read-only, write guards).");
