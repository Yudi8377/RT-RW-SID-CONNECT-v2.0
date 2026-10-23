#!/usr/bin/env bash
set -euo pipefail

migration="supabase/migrations/202610230001_server_authoritative_entitlements.sql"
device_migration="supabase/migrations/202610230002_device_entitlement_enforcement.sql"
trial_fn="supabase/functions/start-trial/index.ts"
device_fn="supabase/functions/register-device/index.ts"
config="config.js"

test -s "$migration"
test -s "$trial_fn"
test -s "$device_migration"
test -s "$device_fn"

# Commercial trial must stay gated until production schema and runtime checks are complete.
grep -Eq 'commercialTrialEnabled[[:space:]]*:[[:space:]]*false' "$config"

# Required tenant-scoped schema and server-authoritative safeguards.
for token in \
  'public.subscription_plans' \
  'public.subscription_plan_features' \
  'public.organization_subscriptions' \
  'public.subscription_billing_events' \
  'public.subscription_audit_events' \
  'organization_subscriptions_one_current_per_org' \
  'organization_subscriptions_one_trial_per_org' \
  'public.start_organization_trial' \
  'o.active = true' \
  'TRIAL_7_DAY' \
  'TRIAL_STARTED' \
  'auth.uid()' \
  'PLATFORM_ADMIN' \
  'RT_OPERATOR' \
  'RW_REVIEWER' \
  'VILLAGE_VALIDATOR' \
  'DISTRICT_COORDINATOR' \
  'REGENCY_CITY_ADMIN' \
  'revoke all on function public.start_organization_trial(uuid, uuid, text) from public, anon, authenticated' \
  'grant execute on function public.start_organization_trial(uuid, uuid, text) to service_role'
do
  grep -Fq "$token" "$migration" || {
    echo "Entitlement migration missing required invariant: $token" >&2
    exit 1
  }
done

grep -Fq "set search_path = ''" "$migration"

# Edge Function must derive identity from a validated access token and accept only organization_id.
grep -Fq 'userClient.auth.getUser()' "$trial_fn"
grep -Fq 'organization_id' "$trial_fn"
grep -Fq 'admin.rpc("start_organization_trial_with_device"' "$trial_fn"
grep -Fq 'admin.rpc("register_organization_device"' "$device_fn"
grep -Fq 'hashDeviceId(deviceId)' "$trial_fn"
grep -Fq 'hashDeviceId(body.device_id)' "$device_fn"
grep -Fq 'DEVICE_LIMIT_REACHED' "$device_migration"
grep -Fq 'grant execute on function public.register_organization_device(uuid,uuid,text,text) to service_role' "$device_migration"
grep -Fq 'grant execute on function public.start_organization_trial_with_device(uuid,uuid,text,text,text) to service_role' "$device_migration"
if grep -Eq 'body[^;]*(plan_id|price_amount|status|trial_ends_at|activation_source)' "$trial_fn"; then
  echo "Client-controlled subscription fields detected in start-trial" >&2
  exit 1
fi

# This additive migration must not destroy existing production data.
if grep -Eiq '^[[:space:]]*(drop[[:space:]]+(table|schema|database)|truncate([[:space:]]|;)|delete[[:space:]]+from)' "$migration"; then
  echo "Destructive SQL detected in entitlement migration" >&2
  exit 1
fi

echo "Entitlement release-gate checks passed (production activation remains gated)."
