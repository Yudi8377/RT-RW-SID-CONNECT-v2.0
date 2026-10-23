#!/usr/bin/env bash
set -euo pipefail

migration="supabase/migrations/202610230001_server_authoritative_entitlements.sql"
test -f "$migration"

# Supabase migration versions must be unique across the repository.
version="${migration##*/}"
version="${version%%_*}"
matches="$(find supabase/migrations -maxdepth 1 -type f -name "${version}_*.sql" | wc -l | tr -d ' ')"
if [ "$matches" -ne 1 ]; then
  echo "Migration version collision detected: $version ($matches files)" >&2
  exit 1
fi

# Required tenant and billing controls must remain explicit in the migration.
grep -q "references public.organizations(id)" "$migration"
grep -q "references auth.users(id)" "$migration"
grep -q "alter table public.subscription_plans enable row level security" "$migration"
grep -q "alter table public.subscription_plan_features enable row level security" "$migration"
grep -q "alter table public.organization_subscriptions enable row level security" "$migration"
grep -q "alter table public.subscription_billing_events enable row level security" "$migration"
grep -q "alter table public.subscription_audit_events enable row level security" "$migration"

# Exactly one current subscription and one trial per organization.
grep -q "organization_subscriptions_one_current_per_org" "$migration"
grep -q "organization_subscriptions_one_trial_per_org" "$migration"
grep -q "unique (provider_code, provider_event_id)" "$migration"

# Client subscription access is read-only and must be tenant-scoped.
grep -q 'for select to authenticated' "$migration"
grep -q 'ra.user_id = (select auth.uid())' "$migration"
grep -q 'ra.organization_id = organization_subscriptions.organization_id' "$migration"
grep -q 'ra.starts_at <= now()' "$migration"
grep -q 'ra.ends_at > now()' "$migration"
grep -q 'revoke all on public.subscription_billing_events from anon, authenticated' "$migration"
grep -q 'revoke all on public.subscription_audit_events from anon, authenticated' "$migration"

# No destructive schema/data statements in this additive migration.
if grep -Eiq '^[[:space:]]*(drop[[:space:]]+(table|schema|database)|truncate([[:space:]]|;)|delete[[:space:]]+from)' "$migration"; then
  echo "Destructive SQL detected in entitlement migration" >&2
  exit 1
fi

echo "Entitlement migration static safety checks passed."
