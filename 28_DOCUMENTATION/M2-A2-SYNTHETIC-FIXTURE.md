# M2-A.2 Synthetic Fixture

This fixture contains synthetic identifiers only. It defines the minimum regression expectations for the provider-neutral extraction boundary.

## Assertions
- CSV input produces a normalized extraction envelope.
- Provider-required source types return PROVIDER_REQUIRED rather than an unverified fallback.
- The intake response does not return NIK/KK values.
- The extraction pipeline does not mutate persons or households.
- Assistance/eligibility remains decision support until authorized verification.

This fixture is documentation-level until the repository's Edge Function test harness is wired to execute Deno tests. No production provider is configured by this fixture.
