# Android Demo Accounts Rebuild Gate — 2026-10-03

Baseline commit: 6d5944418b8f80c052483260e464f2783d9ec6ab

Purpose: trigger a fresh Android Test APK build from `main` so the installed APK includes the one-tap demo account login/sign-up flow and role-aware demo data.

Required demo identities:
- demo.warga@rt-rw.local — WARGA — Trial — RT 04 / RW 02
- demo.rt@rt-rw.local — RT Operator — Community — RT 04 / RW 02
- demo.rw@rt-rw.local — RW Reviewer — Pro — RW 02
- demo.desa@rt-rw.local — Village Validator — Pro — Desa Demo Cerdas
- demo.admin@rt-rw.local — Platform Admin — Enterprise — Platform

This marker does not contain passwords and does not create Auth users. Supabase Auth remains the source of truth for credentials.
