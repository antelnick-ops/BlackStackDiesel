-- =====================================================================
-- ASAP import support tables
-- =====================================================================
-- Two operational tables that the ASAP enrichment script writes to:
--   * asap_unmatched_skus — every ASAP SKU we couldn't match to an
--     existing BSD product. Acts as a queue: when APG later adds a SKU
--     that matches, we can resolve historical entries without re-fetching
--     from ASAP. Also a signal — high unmatched rate means the matching
--     strategy needs strengthening.
--   * asap_import_runs — audit trail for every script invocation. One
--     row per run (dry-run or commit), with all bucket counters and an
--     errors jsonb log. Use to compare runs over time, check coverage
--     improvements as APG fills in mfg_sku/upc, and to debug failures.

BEGIN;

-- =====================================================================
-- asap_unmatched_skus
-- =====================================================================
CREATE TABLE IF NOT EXISTS asap_unmatched_skus (
  id uuid primary key default gen_random_uuid(),
  asap_sku text not null,
  asap_mfg_sku text,
  asap_upc text,
  asap_brand_id text,
  asap_brand_name text,
  asap_product_title text,
  discovered_at timestamptz default now(),
  UNIQUE (asap_sku, asap_brand_id)
);

COMMENT ON TABLE asap_unmatched_skus IS
  'ASAP SKUs that did not match any existing BSD product on mfg_sku, upc, or sku-direct. Logged so the import remains auditable; resolved when APG later adds a matching SKU.';

-- =====================================================================
-- asap_import_runs
-- =====================================================================
CREATE TABLE IF NOT EXISTS asap_import_runs (
  id uuid primary key default gen_random_uuid(),
  brand_id text not null,
  brand_name text,
  started_at timestamptz default now(),
  completed_at timestamptz,
  dry_run boolean not null,
  asap_sku_count int default 0,
  matched_active int default 0,
  matched_archived_resurrected int default 0,
  matched_archived_skipped_tagged int default 0,
  matched_archived_skipped_no_diesel_fitment int default 0,
  unmatched int default 0,
  errors int default 0,
  error_log jsonb default '[]'::jsonb
);

COMMENT ON TABLE asap_import_runs IS
  'Audit trail for asap-import.js invocations. One row per run, dry or committed. The bucket counters describe what the script saw (and would have done, in dry-run); error_log captures per-SKU failures.';

CREATE INDEX IF NOT EXISTS idx_asap_import_runs_brand_started
  ON asap_import_runs (brand_id, started_at DESC);

-- =====================================================================
-- RLS
-- =====================================================================
ALTER TABLE asap_unmatched_skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE asap_import_runs ENABLE ROW LEVEL SECURITY;

-- Drop-then-create so the migration is re-runnable (small deviation from
-- spec for re-run safety).
DROP POLICY IF EXISTS "admin_all_asap_unmatched" ON asap_unmatched_skus;
CREATE POLICY "admin_all_asap_unmatched" ON asap_unmatched_skus
  FOR ALL USING (is_current_user_admin());

DROP POLICY IF EXISTS "admin_all_asap_runs" ON asap_import_runs;
CREATE POLICY "admin_all_asap_runs" ON asap_import_runs
  FOR ALL USING (is_current_user_admin());

COMMIT;
