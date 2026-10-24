-- Defense-in-depth attempt to prevent direct RPC access to PostGIS extent helpers.
-- Production verification on 2026-10-24 found this migration entry was tracked but
-- the effective ACL did not change. Do not consider this remediation complete unless
-- pg_proc.proacl and has_function_privilege checks confirm anon/authenticated are false.
-- Supabase Support is being asked to resolve the extension-managed ACL and schema safely.

REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text, boolean) FROM PUBLIC, anon, authenticated;
