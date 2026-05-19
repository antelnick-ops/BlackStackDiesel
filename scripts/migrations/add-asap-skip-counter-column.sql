-- =====================================================================
-- add-asap-skip-counter-column.sql
-- =====================================================================
-- Adds matched_active_skipped_already_enriched to asap_import_runs so
-- the audit trail captures how many BSD products the run skipped because
-- they had already been enriched by a prior asap-import.js invocation.
--
-- Context: scripts/importers/asap-import.js carries a "skip already
-- enriched" guard in its per-item loop (see the SKIP-ALREADY-ENRICHED
-- comment block above batchMatchByMfgSku). The guard fires for products
-- where status='active' AND asap_synced_at IS NOT NULL, saving the
-- per-item ASAP detail API call + DB write. Without this column, the
-- script's end-of-run audit row had to omit the counter (an inline
-- destructure stripped it out of the spread). Once this migration is
-- applied, that destructure can be removed and the counter persists
-- alongside the other matched_* / unmatched / errors counters.
--
-- Default 0 (NOT NULL) so historical rows backfill cleanly without
-- needing an UPDATE — they predate the guard and recorded zero skips
-- by definition.
-- =====================================================================

ALTER TABLE public.asap_import_runs
  ADD COLUMN matched_active_skipped_already_enriched int NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.asap_import_runs.matched_active_skipped_already_enriched IS
  'Count of BSD products skipped on this run because they already had asap_synced_at set (status=active + previously enriched). Added 2026-05-18 alongside the SKIP-ALREADY-ENRICHED guard in asap-import.js.';

-- Reload PostgREST schema cache so the new column is visible to the
-- service-key client used by scripts/importers/asap-import.js without
-- restarting the Supabase API. Without this, the first run after the
-- migration would still 400 with column-not-found via PGRST204.
NOTIFY pgrst, 'reload schema';
