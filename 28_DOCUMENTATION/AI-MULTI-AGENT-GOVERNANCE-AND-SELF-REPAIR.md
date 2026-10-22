# RT/RW–SID CONNECT — Governed Multi-Agent AI, Continuous Knowledge and Self-Repair

Status: target architecture and operating policy. This document does not claim a production multi-agent runtime is already deployed.

## 1. Design goal

Provide reusable AI capabilities to all program modules while keeping tenant, territory, purpose, classification and human approval boundaries intact. The system should adapt to changing regulations, APIs, libraries and operational needs through a measurable update process—not through unrestricted self-modification.

A larger prompt or persistent memory alone does not equal learning. The platform must track source provenance, evaluation results, approved knowledge versions, regression history and rollback options.

## 2. Agent registry

Each agent must have a registry entry with:
- stable agent ID and version;
- domain and supported tasks;
- owner and accountable reviewer;
- allowed tools and read/write permissions;
- allowed data classifications and territory scope;
- model/provider configuration reference (never a secret);
- system prompt/policy version;
- knowledge collection and retention rules;
- evaluation suite and minimum acceptance threshold;
- rate/cost budget and timeout;
- audit and incident escalation destination;
- kill switch and rollback target.

Suggested agents:

| Agent | Responsibilities | Default privilege |
|---|---|---|
| Orchestrator | Decompose requests, route tasks, reconcile outputs | Task metadata; no broad data access |
| Knowledge Curator | Collect approved sources, normalize and version material | Read approved allowlisted sources; write candidates |
| Regulatory Watch | Detect new/changed official rules and affected modules | Read official source register; create review alerts |
| Compliance Analyst | Map rules to features and identify questions for counsel/official owner | Read policy metadata; recommendations only |
| Program Analyst | Analyze authorized indicators and draft summaries | Aggregate/read-only data |
| Domain Specialist | Help with education, tourism, environment, cooperative information, etc. | Module-scoped tools only |
| Editorial Assistant | Source checks, summary, privacy flags and draft support | Draft-only; cannot publish |
| Security Agent | Review permissions, dependencies, logs and suspicious patterns | Read-only scan and report |
| Engineering Diagnostician | Correlate errors, commits, schema and workflow failures | Read-only repo/log tools |
| Repair Agent | Propose patch, migration draft or configuration change | Branch/PR only; no direct production write |
| Test Agent | Run allowed checks and compare with acceptance criteria | Test environment only |
| Independent Reviewer | Check patch and evidence independently from authoring agent | Read-only diff/results |
| Release Agent | Prepare release notes and rollout/rollback checklist | No unilateral production deploy |
| Privacy/Audit Agent | Check data minimization, retention, source access and audit events | Read-only audit/metadata |
| Cost/Capacity Agent | Track quotas, latency, storage and token costs | Read-only metrics |

Agents may be combined in a low-cost first version. Agent count is not the success metric; verified outcomes, cost and safety are.

## 3. Knowledge lifecycle

1. Discover candidate change from an approved official source or trusted technical changelog.
2. Record source URL, source organization, jurisdiction, publication date, retrieval/check date, document version/hash, effective status and license/terms.
3. Compare with the prior version and identify exact changed sections.
4. Produce a structured summary with uncertainty and affected modules.
5. Run validation: source reachability, date/status checks, contradiction checks, duplication, relevance and automated evaluations.
6. Keep the item in CANDIDATE/PENDING_REVIEW until the required reviewer approves it.
7. Publish a versioned knowledge item and retain prior version for audit/rollback.
8. Re-evaluate agents that depend on changed material and notify affected module owners.

Official-source monitoring should start with a curated allowlist of JDIH, BPK, ministries, regulators, official local-government JDIH and official vendor/dependency release sources. Avoid unrestricted browser crawling. Respect access terms, copyright and rate limits. A web result or model assertion alone is not proof that a regulation is in force.

### Knowledge status model

DISCOVERED → CANDIDATE → VALIDATING → PENDING_REVIEW → APPROVED → ACTIVE → SUPERSEDED/REVOKED.

A source can be approved for general education but not for legal conclusions. Jurisdiction, effective date and authoritative source must be explicit.

## 4. Learning from feedback without leaking private data

- Store explicit feedback separately from raw conversation payloads where possible.
- Remove personal identifiers and secrets before building evaluation examples.
- Do not use private drafts, citizen complaints, health records, financial records or identity records as shared network memory.
- Tenant-specific knowledge remains tenant-scoped unless an authorized, documented sharing process creates a redacted reusable lesson.
- Feedback becomes a candidate, not an automatic change to production prompts, policies or model weights.
- Version prompts, retrieval rules, models and evaluation sets.
- Use regression suites to compare answer accuracy, citation/provenance quality, refusal behavior, privacy leakage, latency and cost.
- Preserve a way to revert to the last accepted configuration.

## 5. Application/database diagnosis and repair workflow

DETECT → TRIAGE → REPRODUCE → DIAGNOSE → PLAN → PATCH BRANCH → TEST → INDEPENDENT REVIEW → APPROVAL → DEPLOY → MONITOR → ROLLBACK IF NEEDED → POSTMORTEM.

### Detection signals
- GitHub Actions failures and changed quality checks.
- Client/server errors, function errors, failed API requests and elevated latency.
- Database query failures, migration drift, capacity limits and backup/restore alerts.
- RLS denials and suspicious cross-scope access attempts.
- External API/schema changes and dependency advisories.
- Public-page availability, accessibility and content freshness.

### Repair-agent duties
1. Gather only authorized logs/metadata.
2. Link the failure to recent commits, configuration changes and relevant schema.
3. State evidence, hypothesis, confidence and missing information.
4. Reproduce the issue in a disposable or development environment.
5. Create a focused branch/patch; do not push directly to the protected production branch.
6. Add or update a regression test.
7. Run build, tests, dependency/security checks and database policy checks.
8. Request independent review and show exact changed files plus test evidence.
9. Prepare rollback steps and post-deploy monitoring.
10. Record whether the repair actually fixed the symptom; do not mark success based only on a generated patch.

## 6. Autonomy and approval matrix

| Action | Allowed automation |
|---|---|
| Read authorized logs, check service health, summarize metrics | Automated within scope |
| Fetch allowlisted public documentation and create source candidates | Automated, rate-limited |
| Generate knowledge summary and draft training/evaluation examples | Automated; candidate only |
| Update internal documentation or open an issue | Automated when repository permissions allow |
| Create a branch, propose code patch and open pull request | Automated |
| Run unit/integration tests in isolated CI | Automated |
| Merge code that changes auth, RLS, data retention, billing or sensitive data paths | Human/security approval required |
| Apply production database migration | Explicit operator approval, validated backup/rollback and staging evidence required |
| Modify roles, permissions, RLS, secrets, identity, retention or audit controls | Explicit authorized approval; never self-approved |
| Publish news or public allegations | Human editorial decision required |
| Decide health treatment, legal eligibility, aid entitlement, citizen discipline or moral score | Not an autonomous agent decision |
| Transfer funds, commit cooperative transactions or delete production data | Not allowed without a separately authorized human-controlled workflow |

Low-risk automation should still be policy-bounded, logged, rate-limited and reversible. Human approval must be tied to the exact diff/configuration being approved, not a generic blanket approval.

## 7. Production repair safeguards

- Separate dev, staging and production credentials.
- Never expose service-role/secret keys to browser code, issue comments, logs or model context.
- Use least-privilege tool tokens and short-lived credentials where supported.
- Keep production database mutations behind a controlled operator workflow.
- Back up data and verify restore procedures before destructive or schema changes.
- Test both allowed and denied paths, especially cross-territory and cross-organization access.
- Require independent reviewer evidence for security-sensitive changes.
- Use canary/gradual rollout when feasible; define health checks and rollback triggers.
- Prevent prompt injection in user-submitted documents from changing agent policy or granting tools.
- Do not allow a model to create its own credentials, expand its tool permissions or disable its monitors.

## 8. Regulatory intelligence workflow

For each regulation, store:
- official title/number/year;
- issuing authority and jurisdiction;
- source URL and downloaded/source hash where legally allowed;
- publication date and effective date;
- amendment/revocation links and status;
- affected modules/data categories;
- summary and cited clauses;
- verification date and reviewer;
- review due date and unresolved interpretation questions.

The system can flag potential impacts and draft a compliance checklist. It must not label the platform “legally compliant” based only on a model-generated summary. Legal owners or qualified reviewers must resolve ambiguity.

## 9. Operational metrics

- Knowledge freshness: age since last official-source check.
- Provenance quality: percentage of answers/reports with valid source and date.
- Evaluation pass rate by agent version.
- Regression rate after prompt/model/knowledge updates.
- Privacy/security violation rate and confirmed leakage count.
- Mean time to detect (MTTD) and restore (MTTR).
- Percentage of proposed fixes with reproducible tests.
- Repair success rate after post-deploy verification.
- Rollback rate and failed-change impact.
- Cost per successful task, latency and quota utilization.
- Human override rate and reasons.

## 10. Implementation phases

Phase 1 — read-only diagnostics and source register.
Phase 2 — versioned knowledge candidates, evaluations and review queue.
Phase 3 — Engineering/Quality/Security agents that open branches and PRs.
Phase 4 — domain specialists connected to least-privilege module APIs.
Phase 5 — policy-bounded low-risk automation after observed reliability.
Phase 6 — capacity-driven model/provider improvements, never assumed to be self-learning.

## 11. Release acceptance

- No model/provider secrets are present in static frontend code.
- Tool permissions are enumerated and scoped.
- Private data is excluded from shared learning by default.
- Knowledge items have provenance, dates, status and version.
- Prompt-injection and cross-tenant retrieval tests exist.
- Repair patches have regression tests and independent review.
- Production changes have explicit approval and rollback evidence.
- Agent status pages distinguish configured, simulated, tested and production-active capabilities.
