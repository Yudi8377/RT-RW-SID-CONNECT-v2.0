export type ExtractionSourceType = "CSV" | "MANUAL" | "PDF" | "IMAGE" | "SCAN" | "EXCEL";

export type ExtractionReviewStatus = "AUTO" | "REVIEW_REQUIRED" | "PROVIDER_REQUIRED" | "FAILED";

export interface ExtractionField { target_field: string; value: string; confidence: number; }

export interface ExtractionEnvelope {
  source_type: ExtractionSourceType;
  source_document_id: string | null;
  page_or_row_reference: string | number | null;
  extracted_fields: ExtractionField[];
  field_confidence: number;
  source_reference: Record<string, unknown> | null;
  review_status: ExtractionReviewStatus;
  provider_id: string;
  provider_version: string;
}

export interface ExtractionAdapter {
  readonly id: string;
  readonly version: string;
  supports(sourceType: ExtractionSourceType): boolean;
  extract(input: { sourceType: ExtractionSourceType; sourceDocumentId?: string | null; content: string }): Promise<ExtractionEnvelope[]>;
}

export function providerRequiredEnvelope(sourceType: ExtractionSourceType, sourceDocumentId: string | null = null): ExtractionEnvelope {
  return { source_type: sourceType, source_document_id: sourceDocumentId, page_or_row_reference: null, extracted_fields: [], field_confidence: 0, source_reference: null, review_status: "PROVIDER_REQUIRED", provider_id: "none", provider_version: "0" };
}