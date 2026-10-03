# ai-data-intake

Authenticated M2-A extraction endpoint.

## Supported in v1
- CSV
- MANUAL

## Intentionally deferred
- PDF
- IMAGE
- SCAN
- EXCEL

Those source types return `PROVIDER_REQUIRED` until an approved parser/OCR adapter is configured and validated. This is deliberate: no unverified AI/OCR service is introduced into the sensitive-data path.

The endpoint requires JWT authentication, caller access to the intake batch, and writes only to intake/mapping pipeline tables. It does not mutate core `persons` or `households` records.
