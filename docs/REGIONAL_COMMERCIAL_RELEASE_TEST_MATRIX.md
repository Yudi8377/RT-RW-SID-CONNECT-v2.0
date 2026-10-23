# Regional Access and Commercial Trial Release Test Matrix

**Status:** test plan; not evidence of passing production tests.  
**Production project:** `gzdusguveeeflmlvvmwe`  
**Safety:** use dedicated test users and test organizations only. Do not grant test roles to real residents or expose production personal data.

## 1. Regional role/scope authorization

Run through authenticated UI/API calls against a controlled test scope. Record the request, expected HTTP/RPC result, actual result, user role, territory type, and test evidence. Never record resident personal data in test logs.

| Test | Setup | Expected result |
|---|---|---|
| Platform admin preservation | Existing platform-admin account, active valid assignment | Existing admin functions continue to work within intended platform-wide authority |
| RT exact scope | RT_OPERATOR assigned to an active RT territory | Allowed only for the assigned RT |
| RT cross-scope | Same RT user requests another RT or a parent/child territory not explicitly permitted | Denied |
| RW exact scope | RW_REVIEWER assigned to an active RW territory | Allowed only within documented RW authority |
| Village exact scope | VILLAGE_VALIDATOR assigned to an active VILLAGE territory | Allowed only within documented village authority |
| District exact scope | DISTRICT_COORDINATOR assigned to an active DISTRICT territory | Allowed only within documented district authority |
| Regency/city exact scope | REGENCY_CITY_ADMIN assigned to an active REGENCY_CITY territory | Allowed only within documented regency/city authority |
| Missing assignment | Authenticated user with no matching active role assignment | Denied |
| Inactive/future/expired assignment | Assignment inactive, starts in future, or ends in past | Denied |
| Invalid hierarchy | Role is assigned to a territory type it does not govern | Denied |
| Spoofed client role | Client submits a different privileged role code | Denied; no privileged response or history |
| Scope omission/ambiguity | User has multiple scopes but sends no territory identifier | Reject or require explicit scope |
| Platform admin regression | Run baseline admin workflow after regional tests | Pass with no privilege loss |

**Important known issue:** a live read-only query found the active RT_OPERATOR assignment scoped to a VILLAGE territory. Treat this as a release blocker; do not auto-correct it or infer intended scope. Verify the assignment owner and intended authority first.

## 2. Trial and device entitlement end-to-end

Use a disposable test organization and test account. Do not enable the public commercial trial flag until every step passes.

1. Create/verify an organization with an authorized owner/admin.
2. Start the 7-day trial using an authenticated session.
3. Verify exactly one eligible device can be registered for that organization.
4. Verify a second device is rejected with a clear, non-sensitive error and audit event.
5. Verify subscription status, start/end timestamps, and entitlement are read from server-side state.
6. Test an expired trial using a controlled test fixture or approved clock strategy; confirm protected operations are denied.
7. Verify duplicate/replayed requests do not create duplicate trials/devices.
8. Verify users from another organization cannot read or mutate the test organization's subscription, devices, or billing/audit events.
9. Verify audit records for activation, device registration, denial, and expiry without leaking secrets or personal data.
10. Verify payment/paid-plan status cannot be activated by a browser-supplied value.

Capture sanitized evidence and exact deployment commit/version for each case.

## 3. AI Companion authorization smoke tests

- Valid JWT and assigned WARGA role: allowed only for the general persona.
- Valid JWT with matching active RT/RW assignment and explicit authorized scope: allowed.
- Missing JWT, invalid JWT, no assignment, inactive/future/expired assignment: denied.
- Requested role differs from canonical role assignment: denied.
- Cross-territory request: denied.
- Conversation history and inserts are scoped to authenticated user + verified role + verified territory.
- Oversized request body: 413; malformed JSON: 400; provider timeout: safe fallback.
- CORS origin is restricted to the actual application origins where feasible; verify OPTIONS preflight and normal requests.

## 4. Data security and advisor findings

- Do not toggle RLS on PostGIS-owned `spatial_ref_sys` without confirming extension ownership and dependencies.
- For RLS-enabled tables with no policies, verify intended deny-by-default behavior, table grants, and service paths before adding policies.
- Review `st_estimatedextent` execute grants and PostGIS extension dependencies before revocation.
- Review every application `SECURITY DEFINER` function's identity, scope checks, search_path, grants, and returned columns.
- Prioritize unindexed foreign keys based on query plans and real access paths; do not add every suggested index blindly.
- Verify leaked-password protection setting and document any operational trade-off.

## 5. Release decision

A release reviewer may mark each gate PASS only with evidence:
- [ ] Regional role/scope positive and negative tests passed.
- [ ] Platform admin baseline passed.
- [ ] Trial → one device → second-device denial → expiry/denial → audit flow passed.
- [ ] Tenant isolation checks passed.
- [ ] AI Companion live authorization smoke tests passed.
- [ ] CORS and Security Advisor findings reviewed.
- [ ] Public and mobile/browser smoke checks passed after deployment.
- [ ] Rollback plan and deployed versions recorded.

Until then, keep `commercialTrialEnabled: false` and `aiCompanionEnabled: false`. A successful static-site deployment is not proof of commercial readiness.
