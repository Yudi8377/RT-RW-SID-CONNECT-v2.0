# Editorial AI + Website Companion — implementation notes

## Agent responsibilities
1. Image helper: local browser-only brightness/contrast adjustment, image preview and export. It does not fabricate or replace scene content, and it does not upload the original automatically.
2. Classifier: proposes a category from title/body keywords.
3. Summarizer: proposes a summary from supplied text.
4. Privacy/risk checker: flags obvious personal identifiers and missing source/date; heuristic only, not a full privacy detector.
5. Curator: proposes completeness and feature eligibility; never publishes automatically.
6. Workflow guard: publication status changes require a human editorial action and audit note.

Current agent implementation is deterministic local heuristics. A genuine model-backed multi-agent runtime needs a trusted server-side AI endpoint, secret management, rate limits, retention policy, and evaluations. Never put model API keys in browser code.

## Editorial states
DRAF -> DIAJUKAN -> DALAM_VERIFIKASI -> DISETUJUI -> (UNGGULAN optional) -> TERBIT. DIARSIPKAN and DITARIK are explicit editorial actions. AI never advances a record into a public status.

## Companion knowledge
- Embedded knowledge works offline and contains general guidance.
- The companion can read only PUBLISHED rows from public_knowledge_documents when the Supabase client is available.
- New internet-derived material should be proposed with source URL, source date/check date, license, and evidence. It remains PENDING_REVIEW until a human verifies and publishes it.
- Do not crawl or ingest unrestricted web content in the browser. A future server-side ingestion agent should use an allowlist of official sources, respect robots/terms/licensing, deduplicate, store provenance, and send candidates to human review. It must not learn from private citizen records or drafts.

## CMS / database deployment
Migration 202610220003_editorial_cms_knowledge.sql is additive and has not been applied automatically. Review schema assumptions, especially role_assignments.scope_territory_id, then test in a development Supabase project first. Apply to production only after explicit operator review and RLS cross-territory tests.

## Known limits
- CMS stores text drafts only; photo adjustment exports a file but the current CMS does not upload/store the processed file in Supabase Storage.
- The public website existing news_syndication_feed and editorial tables are not yet bridged. Migration is a separate editorial foundation; wire publication feed after review.
- CMS has no AI model API connected; recommendations are rules-based.
- A source URL catalog is available, but automatic internet research/knowledge ingestion is not active.
