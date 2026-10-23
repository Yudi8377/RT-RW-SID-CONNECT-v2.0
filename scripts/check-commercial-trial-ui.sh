#!/usr/bin/env bash
set -euo pipefail

grep -q 'commercialTrialWidget(u)' app.js
grep -q 'sb.functions.invoke("start-trial"' app.js
grep -q 'body:{organization_id:orgId,device_id:deviceInstallationId(),device_label:"Browser web"}' app.js
grep -q 'C.commercialTrialEnabled!==true' app.js
grep -q 'commercialTrialEnabled:false' config.js

# The browser must not be able to choose plan, price, status, or expiry.
if grep -Eq 'body:\{[^}]*\b(plan_id|price_amount|status|trial_ends_at|activation_source)\b' app.js; then
  echo "Client-controlled subscription fields detected" >&2
  exit 1
fi

echo "Commercial trial UI release-gate checks passed."
