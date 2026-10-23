#!/usr/bin/env bash
set -euo pipefail

app="app.js"
css="theme.css"

test -s "$app"
test -s "$css"

for token in \
  'function renderRTDashboard()' \
  'function renderVillageDashboard()' \
  'function renderDistrictDashboard()' \
  'function renderRegencyDashboard()' \
  'function renderPublicSIDDashboard()' \
  'function loadRegionalDashboardSummary()' \
  'regional_dashboard_summary' \
  'function selectRegionalDashboardScope(scopeId)' \
  'function roleSpecificDashboard()' \
  'function liveDemoScope(){const ids=' \
  'sb.rpc("rt_resident_directory"' \
  'sb.rpc("rt_household_directory"' \
  'function isResidentDirectoryView(view,sub)' \
  'if(access.code==="RW_REVIEWER")return rwReviewWorkspace()' \
  'function rwReviewWorkspace()' \
  'roleDashboardHero("RT DIGITAL / OPERASIONAL"' \
  'roleDashboardHero("DESA / KELURAHAN"' \
  'roleDashboardHero("KECAMATAN DIGITAL"' \
  'roleDashboardHero("KABUPATEN / KOTA DIGITAL"'
do
  grep -Fq "$token" "$app" || {
    echo "Territory workspace missing required renderer/invariant: $token" >&2
    exit 1
  }
done

grep -Fq 'PILOT_VIEWER:["dashboard"]' "$app"
grep -Fq 'OPEN_SID_UMUM:["dashboard","desa","sid","layanan"]' "$app"
if grep -Fq 'return "f06b8420-54f5-4ee4-b487-bacc7b374dd2"' "$app"; then
  echo "Hardcoded demo territory scope detected" >&2
  exit 1
fi
if grep -Eq 'sb\.from\("(persons|households|addresses)"\)\.select' "$app"; then
  echo "Direct canonical PII table read detected; use scoped RPCs" >&2
  exit 1
fi
grep -Fq 'AKSES BELUM DITETAPKAN' "$app"

grep -Fq 'Pratinjau UI · bukan status produksi' "$app"
grep -Fq 'Data live belum dihubungkan' "$app"
if grep -Eq '\["(1,284|326|17|READY)","(Warga|KK|Workflow|Platform)"' "$app"; then
  echo "Simulated production-looking admin KPI detected" >&2
  exit 1
fi

for token in '.territory-hero' '.territory-work-grid' '.rt-work-grid' '.village-workflow' '.district-overview' '.regency-banner' '.access-pending' '.regional-live-panel' '.regional-live-kpis'
do
  grep -Fq "$token" "$css" || {
    echo "Territory workspace styling missing: $token" >&2
    exit 1
  }
done

echo "Territory-specific workspace checks passed."
