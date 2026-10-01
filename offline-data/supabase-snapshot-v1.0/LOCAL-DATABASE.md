# Local Database Bootstrap — v1

This package is the controlled Supabase seed for the Windows Offline Installer.

## Runtime behavior
On first desktop launch, Electron reads `master-data.json`, creates a writable SQLite database under the Windows Electron user-data directory, creates the controlled seed tables plus `offline_queue`, and persists the seed locally.

## Included local tables
- platform_core
- territories
- roles
- permissions
- role_permissions
- organizations
- exchange_datasets
- offline_queue
- local_meta

## Data boundary
The seed is reference/master data only. It intentionally excludes resident, household, address, health, death, and production transaction records. No Supabase service-role or secret key is packaged.

## Verification target
Runtime verification must confirm first-run creation, seed row counts, persistence after restart, offline queue availability, and absence of cloud credentials in the packaged data path.

`v2.0.1` remains unreleased until those runtime gates pass.