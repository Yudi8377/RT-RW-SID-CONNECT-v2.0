# National, International & Web3 Readiness Baseline

**Project:** RT/RW–SID CONNECT v2.0  
**Status:** Engineering baseline and release checklist — not a compliance certificate  
**Last reviewed:** 27 October 2026

## 1. Purpose

This document establishes measurable targets for an Indonesian community/local-government platform. It separates legal duties, engineering controls, organizational evidence, and future Web3 design. A successful CI run or published website alone does not prove legal compliance, security, or commercial readiness.

## 2. Indonesian national alignment

### UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)

The product/operator must determine applicable controller/processor roles and lawful bases with qualified Indonesian counsel. Engineering should support:
- documented purposes, lawful basis, minimization, and transparent privacy notices;
- role/scope-based access, confidentiality, audit trails, and correction/request workflows where applicable;
- data inventory, retention schedules, secure deletion/anonymization, legal holds, vendor/processor inventory, and transfer assessment;
- special handling for children, health, financial, identity, and other sensitive data;
- incident response and breach notification procedures assessed against applicable legal deadlines.

Official source: https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022

### Perpres No. 95 Tahun 2018 tentang SPBE

Use this as a government-alignment reference where the deployment and operator fall within its scope. Government adoption requires the relevant agency's architecture, governance, procurement, records, security, and interoperability approvals. A software product is not automatically SPBE-compliant.

Official source: https://peraturan.bpk.go.id/Details/96913/perpres-no-95-tahun-2018

Before government production rollout, conduct a documented legal/agency review of current rules for village and population administration, electronic signatures, archives/records, public information, procurement, and sector-specific requirements. Do not claim official integration, approval, or certification without evidence.

## 3. International engineering targets

These are targets and audit references, not claims of certification.

| Area | Target | Evidence |
|---|---|---|
| Security management | ISO/IEC 27001:2022 | Risk register, control mapping/SoA, access reviews, incident/BCP records, internal audit |
| Privacy management | ISO/IEC 27701 (applicable edition) | Data inventory, privacy roles, impact assessments where warranted, processor register, rights/retention workflows |
| Application security | OWASP ASVS 5.0.0 | Versioned requirement-to-test matrix |
| API security | OWASP API Security Top 10 | Object-level authorization, input validation, rate/resource limits, inventory, abuse tests |
| Accessibility | WCAG 2.2 AA target | Keyboard, focus, contrast, zoom/reflow, labels/errors, screen-reader and manual tests |
| Cybersecurity governance | NIST CSF 2.0 | Govern, Identify, Protect, Detect, Respond, Recover owners and evidence |
| Secure delivery | SLSA-inspired provenance | Locked dependencies, least-privilege CI, secret scanning, artifact hashes, rollback evidence |
| Future Web3 | OWASP Smart Contract guidance + chain-specific threat model | Independent review, fuzz/property tests, upgrade and incident plan before mainnet |

References: https://asvs.owasp.org/ · https://www.nist.gov/cyberframework · https://www.w3.org/TR/WCAG22/ · https://www.iso.org/standard/27001 · https://www.iso.org/standard/27701.html · https://owasp.org/www-project-smart-contract-top-10/

## 4. Non-negotiable platform controls

### Identity and authorization
- Enforce authorization in trusted server/database paths for every read and write. Hiding a menu is not authorization.
- Use the canonical policy tuple: **Role + Scope + Permission + Classification + Purpose + Context**.
- Resolve active assignment, organization, and territory from trusted server-side records. Never trust client-supplied role, territory, owner, plan, or subscription status.
- Deny by default and test both allowed and denied actions for RT, RW, Desa/Kelurahan, Kecamatan, Kabupaten/Kota, Platform Admin, and residents.
- Audit administrative delegation, make it time-bounded, and support revocation.
- Keep service-role credentials out of browsers, Android packages, logs, and source control.

### Data and public endpoints
- Keep resident identity, household records, addresses, contacts, incidents, and private documents off public endpoints and off-chain.
- Public endpoints require explicit field allowlists, fixed/demo scope, safe output encoding, generic errors, rate limits, and anonymous positive/negative contract tests.
- Use synthetic data in CI/staging; never use production resident PII in tests or screenshots.
- Maintain backups, restore drills, retention/deletion controls, incident response, and restricted audit-log access.

### Reliability and delivery
- Separate staging and production. Review migrations, test them on disposable databases, back up before production changes, and verify after deployment.
- Maintain health/error/uptime monitoring, release notes, rollback steps, incident ownership, and documented recovery targets before offering an SLA.
- Verify web, Android, and backend release versions against the same commit; retain artifact/version evidence.
- Provide Indonesian-first, responsive, accessible UI and understandable errors.

## 5. Web3-ready architecture: prepare now, do not prematurely launch

The product must remain useful without a wallet, token, or blockchain. Web3 should be an optional integrity/verification layer, not a replacement for privacy, authorization, records management, or the relational database.

### Phase 0 — Chain-neutral foundation (now)
- Give audit events a stable event ID, schema version, timestamp, actor/service identity, organization scope, action, target reference, outcome, and correlation ID.
- Use canonical serialization, integrity protection, append-only/tamper-evident audit storage, restricted access, and key rotation.
- Keep personal payloads and secrets out of logs. Define retention/access rules and a versioned export format.
- Keep audit history independent of any chain vendor.

### Phase 1 — Off-chain integrity proofs (after security/privacy gates)
- Batch eligible, minimized audit-event digests into a Merkle tree and periodically anchor only the Merkle root, schema version, and non-identifying metadata.
- Retain signed inclusion proofs and verification tooling off-chain.
- Never publish NIK, resident/household IDs, addresses, phone numbers, case descriptions, or reversible hashes of low-entropy personal data.
- Threat-model timing correlation, metadata leakage, re-identification, and deletion/retention conflicts before anchoring.

### Phase 2 — Separate ledger pilot (explicit approval required)
- Compare permissioned and public ledgers on governance, data residency, cost volatility, finality, key custody, vendor lock-in, incident recovery, and legal review.
- Start with non-sensitive proof-of-integrity for public aggregate reports or document versions, not resident data, entitlements, elections, or legally binding approvals.
- Before mainnet, require independent contract review, testnet rehearsal, threat model, multisig/role controls, emergency pause where appropriate, upgrade policy, and recovery plan.
- Do not require tokens or speculative financial mechanics to access civic services.

### Phase 3 — Optional verifiable credentials
- Evaluate only for a legitimate use case and an authorized issuer. Minimize disclosure and support status/revocation checks.
- A wallet signature is not civil identity proof without a trusted, legally authorized issuer and verification process.
- Provide non-wallet alternatives and assisted service for residents with limited connectivity/digital access.

### Web3 security invariants
1. No personal or confidential government data on-chain.
2. No wallet required for ordinary resident services.
3. Chain outage must not block core RT/RW operations.
4. Blockchain proof supplements, never replaces, source-of-truth records and legal procedures.
5. Never store plaintext private keys in application tables or browser local storage.
6. Smart-contract deployment requires independent review and explicit release approval.
7. Anchoring is gated by data class, documented purpose, and privacy/legal review.
8. Resolve immutability versus correction, deletion, retention, and lawful disclosure before production use.

## 6. Blocking production release gates

- [ ] Supabase-supported PostGIS remediation completed and verified; no destructive drop/recreate workaround.
- [ ] Security Advisor findings triaged and effective grants verified.
- [ ] Each RLS-enabled table without a policy has a documented access decision and verified server-only call path, or a tested appropriate policy.
- [ ] Leaked-password protection enabled and tested in deployed auth configuration.
- [ ] Regional positive/negative authorization tests pass for all roles/scopes, including cross-organization and cross-territory attempts.
- [ ] RT operator role/organization/territory mapping is consistent and audited; no guessed assignments.
- [ ] Signed-in Trial tests pass: start, repeat-start prevention, one-device cap, expiry, grace/suspension, audit event, server-side entitlement enforcement.
- [ ] Production migration history and deployed function definitions reconciled without blindly replaying migrations or duplicating state.
- [ ] Public Edge Functions pass anonymous runtime tests for published/unpublished/private/cancelled and cross-territory fixtures, invalid inputs, abuse limits, and stored-XSS payloads.
- [ ] Backup restore and rollback drills have evidence.
- [ ] Web/Android/backend release versions and artifacts are recorded.
- [ ] Privacy notice, terms, retention schedule, incident contacts, support process, and runbooks approved.
- [ ] Accessibility and performance checks have documented results.
- [ ] Web3 stays disabled until separate threat model, privacy/legal review, independent contract review, and pilot approval.

Keep `commercialTrialEnabled` and `aiCompanionEnabled` disabled until applicable production gates pass.

## 7. Evidence register

For every gate, record control ID, test/review, environment and commit/version, pass/fail/not-tested result, evidence link, reviewer/date, finding/exception and expiry, owner, and due date. Risk acceptance requires a named risk owner, rationale, compensating controls, and review date. Critical security, privacy, and cross-tenant findings must not be silently waived.

## 8. Operational and commercial definition of done

**Controlled pilot:** critical security/privacy gates pass, recovery is tested, core workflows pass with synthetic accounts, support/incident ownership is active, and pilot users have a rollback path.

**Commercial general release:** pilot exit criteria pass; subscription/device enforcement is server-authoritative; terms, pricing, support/refund, and service objectives are approved; monitoring and restore are demonstrated; launch-blocking findings are closed or formally accepted by the accountable risk owner.

Do not claim ISO certification, government approval, legal compliance, or Web3 audit without relevant independent evidence.
