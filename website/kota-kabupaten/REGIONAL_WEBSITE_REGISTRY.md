# Regional Website Registry

This directory is intentionally allowlisted. It must never guess a public website URL from a village, city, or region name.

## Registration contract

File: `website-registry.json`

Each public entry should contain:

- `name`: official name displayed to visitors.
- `territory_name`: territory name used for human-readable fallback matching.
- `territory_id`: exact active `public.territories.id` for the territory. This is preferred because it supports filtering by parent territory and descendants.
- `province`: optional province label.
- `url`: canonical HTTPS URL for the official public website.
- `status`: exactly `verified` before the entry is shown publicly.

Example shape (illustrative only; do not publish it as a real website):

```json
{
  "schema_version": 1,
  "description": "Only publish website entries after an administrator has verified ownership and HTTPS URL.",
  "websites": [
    {
      "name": "Nama Resmi Website Desa",
      "territory_name": "Nama Desa",
      "territory_id": "REPLACE_WITH_REAL_ACTIVE_TERRITORY_UUID",
      "province": "Nama Provinsi",
      "url": "https://example.invalid/",
      "status": "verified"
    }
  ]
}
```

The example above is documentation only. Do not copy its placeholder ID or URL into the live registry.

## Verification checklist

Before changing `status` to `verified`:

1. Confirm the territory exists, is active, and the ID belongs to that exact territory.
2. Confirm the site is operated by, or explicitly authorized by, the relevant local government/territory administrator.
3. Open the URL and confirm it uses HTTPS with a valid certificate and loads the expected public site.
4. Check redirects; do not register URL shorteners, redirectors, login-only destinations, private IPs, localhost, or internal administrative URLs.
5. Confirm the public site does not expose resident records or other sensitive information without authorization.
6. Use a canonical URL and verify the site owner has approved its publication in this directory.
7. Submit the change through a pull request so another maintainer can review it.

## Visitor behavior

- Only entries with `status: "verified"` and HTTPS URLs are rendered as external links.
- External links open in a new tab with `noopener noreferrer`.
- Selecting a parent territory filters the registry to entries assigned to that territory or its descendants when `territory_id` is present.
- An empty registry is an expected safe state: visitors can still browse active territory records and public news, but no unverified website links are invented.
- This file is a static GitHub Pages allowlist, not a self-service registration form. A future admin workflow should use authenticated, role-scoped approval before writing registry records.
