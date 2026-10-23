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
  'function roleSpecificDashboard()' \
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
grep -Fq 'AKSES BELUM DITETAPKAN' "$app"

admin_block="$(sed -n '/function adminControlCenter(){/,/^function /p' "$app")"
printf '%s' "$admin_block" | grep -Fq 'PREVIEW · bukan status produksi'
printf '%s' "$admin_block" | grep -Fq 'Data live belum dihubungkan'
if printf '%s' "$admin_block" | grep -Eq '\["(1,284|326|17|READY)","(Warga|KK|Workflow|Platform)"'; then
  echo "Simulated production-looking admin KPI detected" >&2
  exit 1
fi

for token in '.territory-hero' '.territory-work-grid' '.rt-work-grid' '.village-workflow' '.district-overview' '.regency-banner' '.access-pending'
do
  grep -Fq "$token" "$css" || {
    echo "Territory workspace styling missing: $token" >&2
    exit 1
  }
done

echo "Territory-specific workspace checks passed."
