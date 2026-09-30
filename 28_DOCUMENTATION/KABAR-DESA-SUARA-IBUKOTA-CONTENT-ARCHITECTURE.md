# Kabar Desa ↔ Suara Ibukota — Content Architecture

Status: READY FOR MEDIA INTEGRATION

## Canonical source

Smart Village stores published editorial content in `public.news_articles`.

Public articles are eligible for syndication only when:
- `status = PUBLISHED`
- `published_at <= now()`
- `syndication_enabled = true`

## Public syndication contract

`public.news_syndication_feed` exposes only:
- slug
- title
- excerpt
- content
- category
- reading_minutes
- image_key
- published_at
- source_system
- source_article_id
- canonical_url

The view uses `security_invoker=true` and the source table's RLS policy remains the access boundary.

## Current Smart Village articles

Current articles use:
- source_system = SMART_VILLAGE
- source_article_id = article slug
- canonical_url = canonical Kabar Desa article URL

## Future Suara Ibukota integration

When Suara Ibukota is built, it should consume the syndication feed rather than copy database records directly.

### Smart Village → Suara Ibukota

Suara Ibukota stores the external source identity:
- source_system = SMART_VILLAGE
- source_article_id = Smart Village source_article_id
- canonical_url = Smart Village canonical URL

The media presentation must preserve source attribution and canonical origin.

### Suara Ibukota → Smart Village

For articles originating in Suara Ibukota and selected for publication in Kabar Desa:
- source_system = SUARA_IBUKOTA
- source_article_id = Suara Ibukota article ID
- canonical_url = Suara Ibukota canonical article URL

This allows bidirectional syndication without treating either publication as an anonymous duplicate.

## Editorial rule

The database record is the identity layer. A published article may be rendered by multiple frontends, but its source, attribution, identity, and canonical URL remain explicit.

## Current user flow

Kabar Desa card
→ `berita.html?slug=<slug>`
→ `news_syndication_feed`
→ full article
→ related articles

No login is required for published public news.

## Security boundary

Do not expose citizen records, operational RT/RW data, actor IDs, authentication tokens, or private workflow data through the news feed.
