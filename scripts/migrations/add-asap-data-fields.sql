-- =====================================================================
-- ASAP enrichment fields + archive intelligence
-- =====================================================================
-- Adds columns and indexes to support the ASAP Network enrichment pipeline.
-- Strategy: enrich-with-resurrection.
--   * ASAP UPDATEs existing rows only (APG remains source-of-truth for
--     catalog membership; unmatched ASAP SKUs go to a separate log table).
--   * Wrongly-archived products with ASAP-confirmed diesel fitment can be
--     resurrected.
--   * Intentional archives are protected by archive_tags (set during
--     prior cleanup operations).
-- See docs/ASAP_DATA_INSPECTION.md for the schema mapping rationale.

BEGIN;

-- =====================================================================
-- CORE ENRICHMENT COLUMNS
-- =====================================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS mfg_sku TEXT,
  ADD COLUMN IF NOT EXISTS map_price NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS aaia_brand_id TEXT,
  ADD COLUMN IF NOT EXISTS is_universal BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS upc TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_types TEXT[],
  ADD COLUMN IF NOT EXISTS vendor_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS product_packaging JSONB,
  ADD COLUMN IF NOT EXISTS fitment_rows JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS asap_extras JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.products.mfg_sku IS
  'Manufacturer-original SKU (ASAP mfg_original_sku). Cross-vendor match key when ASAP sku has an AAIA suffix that the APG sku does not. Example: "TST6" matches ASAP sku "TST6-BDDP".';

COMMENT ON COLUMN public.products.map_price IS
  'Minimum Advertised Price in USD (ASAP map_price / map_pricing). Must be enforced at checkout to honor manufacturer pricing policy. Distinct from price (display) and wholesale_price (cost).';

COMMENT ON COLUMN public.products.image_urls IS
  'Multi-image array from ASAP. Pipe-delimited "images" CSV field is split into this JSON array on import. Example: ["https://www.asapnetwork.org/sites/default/files/bkda/products/STR020-1-BKDA.jpg", "https://.../STR020-1_0-BKDA.jpg"]. Existing image_url column stays as primary; this carries the full set.';

COMMENT ON COLUMN public.products.aaia_brand_id IS
  'Auto Care Association brand code (ASAP aaiaid). Universal cross-vendor brand key. Examples: BDDP=ACCEL, FRDK=Icon Vehicle Dynamics, BKDA=BAK.';

COMMENT ON COLUMN public.products.is_universal IS
  'True when the product fits any vehicle (no specific fitment). Sourced from ASAP universal=Yes/No. Drives "fits any truck" filter behavior in the marketplace UI.';

COMMENT ON COLUMN public.products.upc IS
  'Universal Product Code (12 digits, occasionally 13 for EAN). High-confidence cross-vendor match key — used as fallback when sku/mfg_sku do not match.';

COMMENT ON COLUMN public.products.vehicle_types IS
  'Vehicle classification array from ASAP vehicle_type (pipe-split). Examples: {"Truck/SUV"}, {"Truck/SUV","Jeep"}, {"Van"}.';

COMMENT ON COLUMN public.products.vendor_updated_at IS
  'ASAP-side last_update timestamp for the source product. Drives incremental sync — only re-process if newer than asap_synced_at on this row.';

COMMENT ON COLUMN public.products.product_packaging IS
  'Packaging dimensions and weight from ASAP product_packaging. Structure: {"dim_length": "1.0", "dim_width": "4.0", "dim_height": "14.0", "dim_unit": "in", "weight": "1.0", "weight_unit": "lb"}. Distinct from existing weight_lbs (product weight) — this is the shipping carton.';

COMMENT ON COLUMN public.products.fitment_rows IS
  'Structured fitment from ASAP. Each row: {"year_start":"1996","year_end":"2000","make":"GMC","model":"K3500","sub_model":"Sierra SLE"}. Parsed from the ASAP fitment column (pipe-delimited rows, comma-delimited fields). Authoritative once populated; existing fitment_makes/years/engines arrays are APG keyword-derived and become legacy/backwards-compat.';

COMMENT ON COLUMN public.products.asap_extras IS
  'Brand-specific overflow columns from ASAP exports. Schema is per-brand (ACCEL has 62 cols, BAK has 44). Documented core fields land in dedicated columns; everything brand-specific (tonneau_cover_type, harmonized_tariff_code, eo_number, country_of_origin, prop_65_warning, series, sold_as, warranty, youtube_url, install_pdf_url, aces_term_id, grouping_key, etc.) goes here. Example: {"harmonized_tariff_code":"8708295025","nafta":"B","prop_65_warning":"CALIFORNIA WARNING..."}.';

-- =====================================================================
-- PROVENANCE COLUMNS
-- =====================================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'apg_keyword',
  ADD COLUMN IF NOT EXISTS asap_match_method TEXT,
  ADD COLUMN IF NOT EXISTS asap_synced_at TIMESTAMPTZ;

COMMENT ON COLUMN public.products.data_source IS
  'Provenance/quality of the row''s data. Values: apg_keyword (APG-sourced, no ASAP enrichment yet), asap_authoritative (fully replaced by ASAP), merged (ASAP fields layered on APG core). Distinct from the existing source column (apg_keyword vs. distributor refers to catalog origin; this column refers to data quality lineage).';

COMMENT ON COLUMN public.products.asap_match_method IS
  'How this row was matched to its ASAP source. Values: mfg_sku, upc, sku_direct, fuzzy. NULL when never enriched. Useful for diagnosing match-strategy effectiveness via per-method counts.';

COMMENT ON COLUMN public.products.asap_synced_at IS
  'Timestamp of last successful ASAP enrichment for this row. NULL = never synced. Compared against vendor_updated_at to skip unchanged products on re-run.';

-- =====================================================================
-- ARCHIVE INTELLIGENCE
-- =====================================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS archive_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS archive_recovery_reason TEXT,
  ADD COLUMN IF NOT EXISTS archive_recovered_at TIMESTAMPTZ;

COMMENT ON COLUMN public.products.archive_tags IS
  'Tags identifying why a product was archived. Used as a safety net during ASAP-driven resurrection — tagged archives are intentional and must NOT auto-resurrect even if ASAP confirms diesel fitment. Values: crown_jeep_cleanup, bestop_jeep_cleanup, daystar_jeep_cleanup, data_quality_archive.';

COMMENT ON COLUMN public.products.archive_recovery_reason IS
  'Free-text explanation populated when an archived product is resurrected (status flipped to active) by the ASAP import. Example: "ASAP confirms 2007.5 Cummins 6.7L fitment".';

COMMENT ON COLUMN public.products.archive_recovered_at IS
  'Timestamp of resurrection (status flipped from archived to active). NULL = never resurrected. Pairs with archive_recovery_reason.';

-- =====================================================================
-- INDEXES
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_products_mfg_sku
  ON public.products (mfg_sku) WHERE mfg_sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_aaia_brand_id
  ON public.products (aaia_brand_id);

CREATE INDEX IF NOT EXISTS idx_products_data_source
  ON public.products (data_source);

CREATE INDEX IF NOT EXISTS idx_products_upc
  ON public.products (upc) WHERE upc IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_asap_synced_at
  ON public.products (asap_synced_at) WHERE asap_synced_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_archive_tags
  ON public.products USING GIN (archive_tags);

CREATE INDEX IF NOT EXISTS idx_products_fitment_rows
  ON public.products USING GIN (fitment_rows);

-- =====================================================================
-- BACKFILL archive_tags from existing backup tables
-- =====================================================================
-- Each backup table represents one prior cleanup operation. Use array_append
-- so any pre-existing tags on a row are preserved. The @> guard prevents
-- duplicate tags if the migration is run twice (small deviation from spec
-- for re-run safety — remove the guards if pure spec-only is preferred).

UPDATE public.products p
SET archive_tags = array_append(p.archive_tags, 'crown_jeep_cleanup')
FROM public.products_backup_crown_archive_2026_04_24 b
WHERE p.id = b.id
  AND NOT (p.archive_tags @> ARRAY['crown_jeep_cleanup']);

UPDATE public.products p
SET archive_tags = array_append(p.archive_tags, 'bestop_jeep_cleanup')
FROM public.products_backup_bestop_2026_04_24 b
WHERE p.id = b.id
  AND NOT (p.archive_tags @> ARRAY['bestop_jeep_cleanup']);

UPDATE public.products p
SET archive_tags = array_append(p.archive_tags, 'daystar_jeep_cleanup')
FROM public.products_backup_daystar_jeep_2026_04_24 b
WHERE p.id = b.id
  AND NOT (p.archive_tags @> ARRAY['daystar_jeep_cleanup']);

COMMIT;
