-- =====================================================================
-- VEHICLE PREDICATE LIVES IN 3 RPCS:
--   - get_distinct_product_brands_filtered_v2
--   - get_brand_counts_for_category
--   - get_popular_products_for_vehicle
-- If you change the predicate here, change it in ALL THREE in lockstep.
-- Canonical reference: docs/VEHICLE_PREDICATE_COUPLING.md
-- =====================================================================

-- =====================================================================
-- get_brand_counts_for_category
-- =====================================================================
-- Returns per-brand aggregates for the Phase C brand-within-category and
-- Shop-by-Brand views. For each distinct brand in scope, yields:
--   - product_count: total active+visible+margin products in the category
--   - fit_count:     subset that ALSO matches the user's vehicle
--
-- The vehicle predicate is COPIED VERBATIM from
-- get_distinct_product_brands_filtered_v2 so fit_count on a brand tile
-- equals the row count the PWA renders when the user taps through to
-- Parts with (category, brand, vehicle) applied. If v2's predicate ever
-- changes, this function must change in lockstep.
--
-- Parameters:
--   p_category       text — exact category match; NULL = all categories
--                            (Step 4 #s-brands Shop-by-Brand uses NULL)
--   p_vehicle_year   int  — user's truck year, NULL for none
--   p_vehicle_make   text — user's truck make, NULL for none
--                            (acts as the master gate: NULL disables the
--                             entire vehicle predicate, matching v2)
--   p_vehicle_model  text — user's truck model, NULL for none
--   p_vehicle_engine text — user's truck engine, NULL for none
--
-- Returns: rows of { brand, product_count, fit_count } sorted by
--   product_count DESC, brand ASC (caller applies pinned-brand reorder).
--
-- When p_vehicle_make IS NULL (no vehicle set), fit_count == product_count
-- for every row, matching v2's "no vehicle = no filter" semantics.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_brand_counts_for_category(
  p_category       text,
  p_vehicle_year   int  DEFAULT NULL,
  p_vehicle_make   text DEFAULT NULL,
  p_vehicle_model  text DEFAULT NULL,
  p_vehicle_engine text DEFAULT NULL
)
RETURNS TABLE (
  brand         text,
  product_count int,
  fit_count     int
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH vp AS (
    SELECT
      CASE
        WHEN p_vehicle_engine IS NOT NULL
        THEN '%' || substring(p_vehicle_engine FROM '\d+\.\d+L?') || '%'
        ELSE NULL
      END AS v_disp_pat,
      CASE
        WHEN p_vehicle_model IS NOT NULL
        THEN '%' || p_vehicle_model || '%'
        ELSE NULL
      END AS v_model_pat
  )
  SELECT
    p.brand,
    COUNT(*)::int AS product_count,
    COUNT(*) FILTER (
      WHERE
        p_vehicle_make IS NULL  -- no vehicle = no vehicle filter
        OR (
          (p_vehicle_year IS NOT NULL AND p.fitment_years @> ARRAY[p_vehicle_year])
          OR (p_vehicle_engine IS NOT NULL AND p.fitment_engines @> ARRAY[p_vehicle_engine])
          OR (vp.v_disp_pat IS NOT NULL AND (p.fitment_text ILIKE vp.v_disp_pat OR p.product_name ILIKE vp.v_disp_pat))
          OR (vp.v_model_pat IS NOT NULL AND (p.fitment_text ILIKE vp.v_model_pat OR p.product_name ILIKE vp.v_model_pat))
        )
    )::int AS fit_count
  FROM public.products p
  CROSS JOIN vp
  WHERE p.is_visible = true
    AND p.has_margin = true
    AND p.status NOT IN ('archived', 'discontinued', 'draft')
    AND p.brand IS NOT NULL
    AND p.brand <> ''
    AND (p_category IS NULL OR p.category = p_category)
  GROUP BY p.brand
  ORDER BY product_count DESC, p.brand ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_brand_counts_for_category(
  text, int, text, text, text
) TO anon, authenticated;

COMMENT ON FUNCTION public.get_brand_counts_for_category IS
  'Per-brand aggregates (product_count + vehicle-fit_count) for a given category, or all categories when p_category IS NULL. Vehicle predicate is copied verbatim from get_distinct_product_brands_filtered_v2 so tile counts match the row count rendered on tap-through to Parts. Returns rows sorted by product_count DESC, brand ASC.';

-- Reload PostgREST schema cache so the new RPC is callable from the PWA
-- without restarting the Supabase API. Without this, the first call
-- returns PGRST204.
NOTIFY pgrst, 'reload schema';
