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
  'if(access.code==="RW_REVIEWER")return renderRWDashboard()' \
  'function renderRWDashboard()' \
  'function previewDashboard(code)' \
  'const ADMIN_PREVIEW=new URLSearchParams(location.search).get("preview")==="admin";' \
  'if(ADMIN_PREVIEW)return' \
  'Pratinjau dashboard per wilayah' \
  'function previewScopedWorkspace()' \
  'PRATINJAU ALUR KERJA · TANPA DATA PRODUKSI' \
  'Meja kerja RT' \
  'Meja review RW' \
  'Meja validasi desa' \
  'Meja koordinasi kecamatan' \
  'Meja eksekutif daerah' \
  'Meja informasi SID' \
  'Meja kontrol platform' \
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
grep -Fq 'AKSES BELUM DITETAPKAN' "$app"

grep -Fq 'Pratinjau UI · bukan status produksi' "$app"
grep -Fq 'Data live belum dihubungkan' "$app"
if grep -Eq '\["(1,284|326|17|READY)","(Warga|KK|Workflow|Platform)"' "$app"; then
  echo "Simulated production-looking admin KPI detected" >&2
  exit 1
fi

for token in '.territory-hero' '.territory-work-grid' '.rt-work-grid' '.village-workflow' '.district-overview' '.regency-banner' '.access-pending' '.regional-live-panel' '.regional-live-kpis' '.role-preview-grid' '.role-preview-toolbar' '.preview-workspace' '.preview-workspace-context' '.preview-flow-grid' '.preview-flow-step'
do
  grep -Fq "$token" "$css" || {
    echo "Territory workspace styling missing: $token" >&2
    exit 1
  }
done

echo "Territory-specific workspace checks passed."
