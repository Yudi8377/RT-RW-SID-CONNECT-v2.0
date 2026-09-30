# DEMO DATA — SMART VILLAGE PUBLIC EXPERIENCE — 3 YEARS

Status: IMPLEMENTED  
Period: October 2023 — September 2026  
Territory: PILOT-DESA / Desa Pilot  
Classification: Synthetic demo data only

## Purpose

This dataset simulates a Smart Village system that has operated for three years. It is intended for UI, dashboard, workflow, reporting, and editorial-feed testing before production data is introduced.

No real citizen identity, NIK, household number, or real event is represented by this seed.

## Seeded public experience

| Area | Source | Demo records |
|---|---|---:|
| Kabar Desa / News | `news_articles` → `news_syndication_feed` | 36 |
| Pengumuman | `public_announcements` | 18 |
| Agenda | `community_events` | 36 |
| Ekonomi Desa | existing `rt_business_profiles` | 57 total |
| Aktivitas ekonomi | existing `rt_trade_activities` | 25 total |
| Warga synthetic | `persons` | 250 |
| Wilayah | `territories` | PILOT-DESA |

The new three-year public seed uses the marker `DEMO_3YEAR` where the underlying table has a source field.

## Kabar Desa → Suara Ibukota architecture

`news_articles` is the editorial source of record.

The public view `news_syndication_feed` exposes only published, public, syndication-enabled articles. The existing Kabar Desa runtime already reads this feed.

Future Suara Ibukota should consume this canonical feed/API instead of copying the editorial database.

Recommended future flow:

SMART VILLAGE / KABAR DESA
→ news_articles
→ news_syndication_feed
→ SUARA IBukOTA editorial/media layer

For future Suara Ibukota-originated content, use the same canonical article model with explicit `source_system`, `source_article_id`, and `canonical_url`. Do not create an uncontrolled two-way replication loop.

## Public safety boundary

The public feed must never expose:
- NIK or household identifiers
- personal phone/email
- internal workflow records
- actor/user IDs
- emergency location records
- private RT/RW operational data

## Admin dashboard relationship

The public experience is an aggregation/presentation layer over the same Smart Village database. The RT/RW operational database remains the authoritative source for community operational records.

The canonical RT/RW transaction core remains LOCKED and is not modified by this demo-data seed.

## Go-live note

The seeded records are clearly synthetic and should be removed or replaced before a real village enters production data. Production editorial content should use approved source attribution and publication workflow.
