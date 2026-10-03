# M2-C — Assistance Verification Workflow v1

Flow: SUBMITTED -> RT_VERIFIED -> RW_VERIFIED -> VILLAGE_VALIDATED -> APPROVED.

Each transition requires an authenticated, territory-scoped role and creates an assistance_verifications record plus an audit_logs record.

The workflow never changes eligibility_status and always returns decision_support_only=true with final_eligibility_decision=null.

Windows v2.0.1 is outside this phase and remains untouched.