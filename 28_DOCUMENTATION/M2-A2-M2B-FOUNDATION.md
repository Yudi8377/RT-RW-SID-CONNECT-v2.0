# M2-A.2 / M2-B Foundation

## Purpose
Establish a provider-neutral extraction adapter boundary and a safe government-assistance decision-support boundary without changing the Windows v2.0.1 release baseline.

## Current production boundary
- CSV/MANUAL extraction is live through `ai-data-intake`.
- PDF, IMAGE, SCAN and EXCEL remain `PROVIDER_REQUIRED` until an approved parser/OCR provider is configured and validated.
- No extraction path may autonomously update `persons` or `households`.
- Assistance eligibility is decision support only; an authorized operator/official must verify before any recipient status is committed.

## M2-A.2 adapter contract
Each adapter must normalize into the same envelope:
- source_type
- source_document_id
- page_or_row_reference
- extracted_fields
- field_confidence
- source_reference metadata
- review_status
- provider_id and provider_version

The adapter layer must be replaceable without changing the intake record schema or operator workflow.

## Provider policy
A provider is production-ready only when its credentials/configuration, data-retention behavior, synthetic fixtures, error handling, and redacted logging are verified. Until then the API returns `PROVIDER_REQUIRED`; it must not silently fall back to an unverified service.

## M2-B assistance foundation
Government programs/rules are scoped by territory and treated as explainable rules. The engine may produce candidate matches and reasons, but it must not make the final eligibility decision. Verification and approval remain explicit workflow steps with auditability.

## Release gates
1. Adapter fixtures pass with synthetic data.
2. Authenticated territory-scoped intake path is validated.
3. Sensitive values are absent from logs and response bodies.
4. Review queue is preserved for ambiguous/low-confidence extraction.
5. Core citizen records remain unchanged until explicit authorization.
6. Windows v2.0.1 files/branches remain untouched.
