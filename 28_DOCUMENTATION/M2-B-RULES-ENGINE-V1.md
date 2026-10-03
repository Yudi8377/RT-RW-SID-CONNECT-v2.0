# M2-B Rules Engine v1

## Status
M2-B foundation is implemented as a decision-support evaluator. It does not approve, reject, or mutate an assistance application.

## Flow
1. An authenticated operator submits an application ID and structured facts.
2. The caller must have an active RT/RW/Village/Platform role scoped to the application's territory.
3. The engine loads the active government program and active rules.
4. Rules use deterministic JSON expressions: all, any, eq, neq, gt, gte, lt, lte, in, exists.
5. The result is CANDIDATE_MATCH, CANDIDATE_MISMATCH, or REVIEW_REQUIRED.
6. Only rule keys/reasons are persisted; raw fact values are not persisted in the evaluation result.
7. The application eligibility/workflow fields are not changed.
8. Explicit RT -> RW -> Village validation and final administrative action remain separate workflow steps.

## Safety boundary
- No autonomous eligibility commitment.
- No mutation of persons or households.
- No sensitive fact values returned in the response.
- Evaluation is always marked decision_support_only=true.
- Missing facts produce UNKNOWN and therefore REVIEW_REQUIRED.
- Program status and effective dates are enforced.
- Territory and role scope are enforced.

## Important limitation
The current v1 accepts structured facts from an authenticated operator/integration. These facts are treated as decision-support inputs, not authoritative evidence. Production integrations should populate them from verified records/documents and preserve provenance before any administrative decision.

## Verification gate
The live authenticated end-to-end gate still requires a real user session and synthetic test data. Connector tooling does not currently expose a reusable authenticated session for this scenario, so that gate remains unobserved until exercised.
