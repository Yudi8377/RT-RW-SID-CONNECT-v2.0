# DEMO DATA — SMART VILLAGE PUBLIC EXPERIENCE — 3 YEARS

Status: IMPLEMENTED / VERIFIED
Period: October 2023 — September 2026
Territory: PILOT-DESA / Desa Pilot
Classification: Synthetic demo data only

## Purpose

This dataset simulates a Smart Village system that has operated for three years. It is intended for UI, dashboard, workflow, reporting, and editorial-feed testing before production data is introduced.

No real citizen identity, NIK, household number, or real event is represented by this seed.

## Verified public experience

| Area | Source | Current records |
|---|---|---:|
| Kabar Desa / News | `news_articles` → `news_syndication_feed` | 69 published feed records |
| Pengumuman | `public_announcements` | 30 |
| Agenda | `community_events` | 87 |
| Ekonomi Desa | `rt_business_profiles` | 57 total |
| Aktivitas ekonomi | `rt_trade_activities` | 25 total |
| Warga synthetic | `persons` | 450 total |
| Wilayah | `territories` | 4 |

The three-year demo seed uses the marker `DEMO_3YEAR` where the underlying table has a source field. Existing synthetic data may also contain earlier demo markers.

## Kabar Desa → Suara Ibukota architecture

`news_articles` is the editorial source of record.

The public view `news_syndication_feed` exposes only published, public, syndication-enabled articles. The Kabar Desa detail/list runtime reads this canonical feed directly.

Current verified flow:

SMART VILLAGE / KABAR DESA
→ `news_articles`
→ `news_syndication_feed`
→ future SUARA IBUKOTA editorial/media layer

Future Suara Ibukota should consume this canonical feed/API instead of copying the editorial database.

For future Suara Ibukota-originated content, use the same canonical article model with explicit `source_system`, `source_article_id`, and `canonical_url`. Do not create an uncontrolled two-way replication loop.

## Article interaction contract

The public Kabar Desa cards are article links. Each article is addressable by:

`website/berita.html?slug=<article-slug>`

The article page loads the matching published record from `news_syndication_feed`, displays the full editorial content, and provides links to other published articles.

Example verified records include:
- Digitalisasi desa bukan sekadar teknologi. Ia tentang membuat layanan terasa lebih dekat.
- UMKM lokal menemukan ruang baru untuk tumbuh.
- Gotong royong menjadi agenda bersama warga.
- Informasi pelayanan desa kini lebih mudah ditemukan.

## Public feed security boundary

The public feed must never expose:
- NIK or household identifiers
- personal phone/email
- internal workflow records
- actor/user IDs
- emergency location records
- private RT/RW operational data

The `news_syndication_feed` grants are intentionally **read-only** for `anon` and `authenticated`. Public clients cannot INSERT, UPDATE, DELETE, TRUNCATE, or otherwise mutate the feed.

Only the editorial/source layer is responsible for creating or publishing articles.

## Admin dashboard relationship

The public experience is an aggregation/presentation layer over the same Smart Village database. The RT/RW operational database remains the authoritative source for community operational records.

The canonical RT/RW transaction core remains LOCKED and is not modified by this demo-data seed or the public syndication layer.

## Production transition

The current records are synthetic demo data and are suitable for demonstration/testing. Before a real village enters production:
1. replace or archive synthetic public records;
2. enable approved editorial accounts/workflow;
3. verify source attribution and canonical URLs;
4. retain the read-only public syndication boundary;
5. activate Suara Ibukota later as a consumer/editorial media layer without creating uncontrolled database replication.
