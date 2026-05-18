-- =====================================================================
-- VEHICLE PREDICATE LIVES IN 4 RPCS:
--   - get_distinct_product_brands_filtered_v2
--   - get_brand_counts_for_category
--   - get_popular_products_for_vehicle
--   - get_our_picks_for_vehicle
-- If you change the predicate here, change it in ALL FOUR in lockstep.
-- Canonical reference: docs/VEHICLE_PREDICATE_COUPLING.md
--
-- NOTE: as of this migration the other two NEW RPCs
-- (add-brand-counts-rpc.sql, add-popular-products-rpc.sql) still carry
-- the 3-RPC version of this header. A separate propagation commit will
-- bring them and the coupling doc up to 4-RPC. Do not let that drift
-- linger — see the changelog for the propagation step.
-- =====================================================================

-- =====================================================================
-- get_our_picks_for_vehicle
-- =====================================================================
-- Returns the top N highest-margin products for a given vehicle. Powers
-- the Home "Our picks for [engine]" section, between the Popular list
-- and Recently Viewed. Hand-selected feel, but ranked by real margin
-- math so the shop isn't manually curating the section.
--
-- "Margin" here is the gross-margin percentage:
--   (price - wholesale_price) / NULLIF(price, 0)
-- wholesale_price is APG / Premier WD's invoice price to BSD — i.e.,
-- the actual per-unit cost for drop-shipped inventory, which is the
-- only variable cost component for the vast majority of the catalog.
-- It's currently populated for ~51,194 of 52,246 products (~98 %),
-- making it a usable margin signal at the catalog scale this RPC
-- operates on.
--
-- Why not products.cost?
-- ----------------------------------------------------------------------
-- The schema's products.cost column is currently 100 % NULL (0 / 52246).
-- An earlier draft of this RPC used cost; it was changed to
-- wholesale_price after the data audit. Populating cost is a separate
-- data-hygiene workstream, out of Phase C scope. If cost ever gets
-- backfilled in a way that's more accurate than wholesale_price (e.g.
-- including freight/handling/restocking on the inbound side), revisit
-- the ORDER BY here — the public interface doesn't have to change.
--
-- Items where price is 0 are excluded by NULLIF (would produce NULL,
-- which sorts last under DESC). Items where wholesale_price is NULL
-- or zero are excluded explicitly — they're either unpriced inventory
-- or freebies and don't belong in a margin ranking.
--
-- SECURITY INVOKER is correct here. products is already anon-readable
-- via PostgREST (the PWA browses it directly), so no extra elevation
-- is needed. wholesale_price IS read by this function but is NEVER
-- returned — the rank is computed server-side and only the ranked
-- product display columns reach the result set. The RPC therefore
-- does NOT expose wholesale_price or margin to clients, even though
-- the underlying column is queryable separately via the regular
-- products table (a pre-existing concern this RPC doesn't make better
-- or worse).
--
-- Vehicle predicate is COPIED VERBATIM from
-- get_distinct_product_brands_filtered_v2 / get_brand_counts_for_category
-- / get_popular_products_for_vehicle so all four RPCs agree on what
-- "fits the user's truck" means. See the header at the top of this
-- file for the lockstep coupling.
--
-- Parameters:
--   p_vehicle_year   int  — user's truck year, NULL for none
--   p_vehicle_make   text — master gate; NULL disables the vehicle
--                            predicate entirely (matches v2 semantics)
--   p_vehicle_model  text — user's truck model, NULL for none
--   p_vehicle_engine text — user's truck engine, NULL for none
--   p_limit          int  — row cap, default 5, clamped to [1, 50]
--
-- Returns: top N rows sorted by margin DESC, product_name ASC
--   (deterministic tiebreaker). Does NOT return wholesale_price or
--   margin_pct in the result set.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_our_picks_for_vehicle(
  p_vehicle_year   int  DEFAULT NULL,
  p_vehicle_make   text DEFAULT NULL,
  p_vehicle_model  text DEFAULT NULL,
  p_vehicle_engine text DEFAULT NULL,
  p_limit          int  DEFAULT 5
)
RETURNS TABLE (
  id           uuid,
  sku          text,
  product_name text,
  brand        text,
  price        numeric,
  image_url    text,
  image_urls   jsonb,
  category     text,
  is_universal boolean,
  weight_lbs   numeric,
  has_core     boolean,
  core_charge  numeric,
  stock_qty    int
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
    p.id,
    p.sku,
    p.product_name,
    p.brand,
    p.price,
    p.image_url,
    p.image_urls,
    p.category,
    p.is_universal,
    p.weight_lbs,
    p.has_core,
    p.core_charge,
    p.stock_qty
  FROM public.products p
  CROSS JOIN vp
  WHERE p.is_visible = true
    AND p.has_margin = true
    AND p.wholesale_price IS NOT NULL
    AND p.wholesale_price > 0
    AND p.price IS NOT NULL
    AND p.price > 0
    AND p.status NOT IN ('archived', 'discontinued', 'draft')
    AND (
      p_vehicle_make IS NULL  -- no vehicle = no vehicle filter
      OR (
        (p_vehicle_year IS NOT NULL AND p.fitment_years @> ARRAY[p_vehicle_year])
        OR (p_vehicle_engine IS NOT NULL AND p.fitment_engines @> ARRAY[p_vehicle_engine])
        OR (vp.v_disp_pat IS NOT NULL AND (p.fitment_text ILIKE vp.v_disp_pat OR p.product_name ILIKE vp.v_disp_pat))
        OR (vp.v_model_pat IS NOT NULL AND (p.fitment_text ILIKE vp.v_model_pat OR p.product_name ILIKE vp.v_model_pat))
      )
    )
  ORDER BY (p.price - p.wholesale_price) / NULLIF(p.price, 0) DESC, p.product_name ASC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 5), 50));
$$;

GRANT EXECUTE ON FUNCTION public.get_our_picks_for_vehicle(
  int, text, text, text, int
) TO anon, authenticated;

COMMENT ON FUNCTION public.get_our_picks_for_vehicle IS
  'Top-N highest-margin products for a given vehicle, powering the Home "Our picks for [engine]" section. Margin is computed server-side as (price - wholesale_price) / NULLIF(price, 0) — wholesale_price is APG''s invoice price (~98% catalog coverage); products.cost is currently 100% NULL and not used. Neither wholesale_price nor margin appears in the return type. SECURITY INVOKER (products is already anon-readable). Vehicle predicate matches the other three coupled RPCs — see docs/VEHICLE_PREDICATE_COUPLING.md. p_limit defaults to 5, clamped to [1, 50].';

NOTIFY pgrst, 'reload schema';
