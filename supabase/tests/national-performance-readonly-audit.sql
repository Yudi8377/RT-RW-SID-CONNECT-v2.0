-- RT/RW-SID CONNECT — read-only national performance audit
-- Run in an authorized Supabase SQL Editor session before approving indexes/policy rewrites.
-- SELECT-only. This script does not create indexes or change RLS/policies.

-- 1) Foreign keys without a valid B-tree index whose leading key columns cover
--    the FK columns in the same order. Advisor output should be reconciled with this.
SELECT
  ns.nspname AS schema_name,
  tbl.relname AS table_name,
  con.conname AS foreign_key_name,
  ARRAY(
    SELECT att.attname
    FROM unnest(con.conkey) WITH ORDINALITY AS fk(attnum, ordinality)
    JOIN pg_attribute AS att
      ON att.attrelid = con.conrelid AND att.attnum = fk.attnum
    ORDER BY fk.ordinality
  ) AS foreign_key_columns
FROM pg_constraint AS con
JOIN pg_class AS tbl ON tbl.oid = con.conrelid
JOIN pg_namespace AS ns ON ns.oid = tbl.relnamespace
WHERE con.contype = 'f'
  AND ns.nspname IN ('public', 'village')
  AND NOT EXISTS (
    SELECT 1
    FROM pg_index AS idx
    WHERE idx.indrelid = con.conrelid
      AND idx.indisvalid
      AND idx.indisready
      AND idx.indpred IS NULL
      AND ARRAY(
        SELECT keycol.attnum::integer
        FROM unnest(idx.indkey) WITH ORDINALITY AS keycol(attnum, ordinality)
        WHERE keycol.ordinality <= cardinality(con.conkey)
        ORDER BY keycol.ordinality
      ) = ARRAY(
        SELECT fkcol.attnum::integer
        FROM unnest(con.conkey) WITH ORDINALITY AS fkcol(attnum, ordinality)
        ORDER BY fkcol.ordinality
      )
  )
ORDER BY ns.nspname, tbl.relname, con.conname;

-- 2) Tables with multiple permissive policies for the same role/action.
--    Policies are OR-combined, so review effective access semantics before changes.
SELECT
  schemaname,
  tablename,
  roles,
  cmd,
  COUNT(*)::integer AS permissive_policy_count,
  ARRAY_AGG(policyname ORDER BY policyname) AS policy_names
FROM pg_policies
WHERE schemaname IN ('public', 'village')
  AND permissive = 'PERMISSIVE'
GROUP BY schemaname, tablename, roles, cmd
HAVING COUNT(*) > 1
ORDER BY schemaname, tablename, cmd;

-- 3) Largest application tables; sizes are diagnostic only and can vary by workload.
SELECT
  schemaname,
  relname AS table_name,
  n_live_tup::bigint AS estimated_live_rows,
  pg_total_relation_size(format('%I.%I', schemaname, relname)::regclass) AS total_bytes,
  pg_size_pretty(pg_total_relation_size(format('%I.%I', schemaname, relname)::regclass)) AS total_size
FROM pg_stat_user_tables
WHERE schemaname IN ('public', 'village')
ORDER BY pg_total_relation_size(format('%I.%I', schemaname, relname)::regclass) DESC
LIMIT 100;

-- Guardrails:
-- * Do not add all Advisor-reported indexes blindly; compare query plans, write cost,
--   storage, index selectivity, existing indexes, and measured workload.
-- * Do not drop "unused" indexes from a single short observation window.
-- * Do not combine permissive policies solely to reduce Advisor warnings; first prove
--   that the resulting policy preserves or tightens intended access.
-- * Capture EXPLAIN (ANALYZE, BUFFERS) only on safe, representative test queries and
--   avoid running expensive production scans during peak service.
