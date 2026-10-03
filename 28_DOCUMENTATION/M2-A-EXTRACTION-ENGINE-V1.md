# M2-A — Extraction Engine v1

## Status
Implemented as a provider-neutral first slice.

### Live capabilities
- Authenticated Edge Function: `ai-data-intake`
- CSV parsing with quoted-field handling.
- Deterministic field mapping for common Indonesian administrative headers.
- SHA-256 matching against existing `persons.national_id_hash` and `households.household_number_hash`.
- Duplicate detection inside the uploaded batch.
- Confidence + review status persisted to `data_intake_records`.
- Field mapping persisted to `data_intake_field_mappings`.
- Batch counters/status updated after processing.
- PDF/image/scan/Excel deliberately return `PROVIDER_REQUIRED` until an approved extraction provider/parser is configured.

## Safety boundary
The function is authenticated and uses the caller-scoped client to authorize access to the batch, then uses the privileged server client only for controlled pipeline writes/matching. It never commits extracted sensitive fields into `persons` or `households`; those core records remain unchanged.

AI/LLM is not claimed as production-ready here. The current CSV path is deterministic preprocessing and matching. An approved AI/OCR provider can be added behind the same function contract later.

## Client contract
POST JSON:
```json
{
  "batch_id": "uuid",
  "source_type": "CSV",
  "content": "NIK,KK,Nama\n...",
  "delimiter": ","
}
```

The response reports `matched`, `review`, `conflicts`, and the next workflow state. No sensitive values are returned in the response.

## Release boundary
This M2-A work is on a separate feature branch and does not modify the Windows v2.0.1 release baseline.
