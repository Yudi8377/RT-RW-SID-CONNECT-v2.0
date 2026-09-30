# Smart Village Public Website — Rp0 Deployment Note

Date: 2026-09-30

## Migration
Hatchable v4 UI/UX was copied into `website/` and adapted for relative static assets.

## Runtime
No backend function is required by the current public prototype. Interactive actions are client-side and explicitly avoid pretending to create official government transactions.

## Data boundary
Public pages must use aggregated/public-safe information. Personal and operational RT/RW data remain behind the operational application's authorization boundary.

## Important
The existing RT/RW–SID operational core is not modified by this migration.

## Next deployment
Merge the dedicated website branch after review. The current repository's GitHub Pages deployment can serve the website at:

`/RT-RW-SID-CONNECT-v2.0/website/`

A future dedicated public website repository can use the same `website/` contents as its root.
