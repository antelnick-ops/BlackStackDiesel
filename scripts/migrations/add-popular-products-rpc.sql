-- =====================================================================
-- VEHICLE PREDICATE LIVES IN 3 RPCS:
--   - get_distinct_product_brands_filtered_v2
--   - get_brand_counts_for_category
--   - get_popular_products_for_vehicle
-- If you change the predicate here, change it in ALL THREE in lockstep.
-- Canonical reference: docs/VEHICLE_PREDICATE_COUPLING.md
-- =====================================================================

-- =====================================================================
-- get_popular_products_for_vehicle
-- =====================================================================
-- Returns the top N best-selling products (by order_count) for a given
-- vehicle, drawing from the order_items table aggregated by sku. Joins
-- back to products for display fields. Optionally filters by vehicle
-- using the SAME predicate as get_distinct_product_brands_filtered_v2
-- and get_brand_counts_for_category (so the three RPCs agree on "fits
-- the user's truck").
--
-- RLS / SECURITY DEFINER note
-- ----------------------------------------------------------------------
-- order_items and orders both have RLS policies (see
-- 2026-05-12-admin-orders-rls.sql) that limit SELECT to the row's own
-- customer or admins. Anon users have NO policy and see nothing.
-- SECURITY DEFINER is REQUIRED so this RPC can aggregate across all
-- customers; without it, anon callers (the PWA's default state) get
-- an empty result set.
--
-- ORDERS JOIN — filter-only, no PII in return type
-- ----------------------------------------------------------------------
-- The ranked CTE joins order_items to orders SOLELY to filter on
-- o.status IN ('confirmed', 'shipped', 'delivered'). This excludes
-- cancelled/refunded/pending orders from popularity ranking, which
-- would otherwise inflate counts for items that never reached the
-- customer. The shipped/delivered statuses don't exist yet but are
-- reserved for when the fulfillment pipeline lands — including them
-- now means this RPC keeps working without another migration. The
-- IN clause harmlessly ignores values that don't exist in the table.
--
-- Safety is preserved by:
--   1. The function returns ONLY aggregates (order_count, units_sold)
--      and PUBLIC products columns. is_visible = true + has_margin =
--      true + status NOT IN (archived/discontinued/draft) are enforced.
--   2. The orders JOIN is filter-only. NO orders columns reach the
--      return type — not order_id, not customer_email, not address,
--      nothing. The only orders columns read inside the function are
--      id (join key) and status (filter). The only order_items
--      columns read are sku, quantity, and order_id (join key).
--   3. All parameters are strongly typed — no string interpolation, no
--      dynamic SQL, no injection surface.
--   4. SET search_path = public prevents search-path hijacking.
--
-- Parameters:
--   p_vehicle_year   int  — user's truck year, NULL for none
--   p_vehicle_make   text — master gate; NULL disables the vehicle
--                            predicate entirely (matches v2 semantics)
--   p_vehicle_model  text — user's truck model, NULL for none
--   p_vehicle_engine text — user's truck engine, NULL for none
--   p_limit          int  — row cap, default 5, clamped to [1, 50]
--
-- Returns: top N rows sorted by order_count DESC, units_sold DESC,
--   product_name ASC (final deterministic tiebreaker). order_count
--   and units_sold are bigint (Postgres aggregate types).
--
-- Note on the "id" column: the PWA's renderPopularList uses p.id for
-- openProductDetail() — the row tap handler. The spec's return-column
-- list omitted id; I added it here so taps don't break.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_popular_products_for_vehicle(
  p_vehicle_year   int  DEFAULT NULL,
  p_vehicle_make   text DEFAULT NULL,
  p_vehicle_model  text DEFAULT NULL,
  p_vehicle_engine text DEFAULT NULL,
  p_limit          int  DEFAULT 5
)
RETURNS TABLE (
  id           uuid,
  sku          text,
  order_count  bigint,
  units_sold   bigint,
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
SECURITY DEFINER  -- see header: required to aggregate across customers
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
  ),
  ranked AS (
    -- Filter-only JOIN to orders so cancelled/refunded/pending rows
    -- don't inflate popularity. See header for the safety case —
    -- no orders columns reach the return type.
    SELECT
      oi.sku,
      COUNT(*)::bigint        AS order_count,
      SUM(oi.quantity)::bigint AS units_sold
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.sku IS NOT NULL
      AND oi.sku <> ''
      AND o.status IN ('confirmed', 'shipped', 'delivered')
    GROUP BY oi.sku
  )
  SELECT
    p.id,
    p.sku,
    r.order_count,
    r.units_sold,
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
  FROM ranked r
  JOIN public.products p ON p.sku = r.sku
  CROSS JOIN vp
  WHERE p.is_visible = true
    AND p.has_margin = true
    AND p.status NOT IN ('archived', 'discontinued', 'draft')
    AND (
      p_vehicle_make IS NULL
      OR (
        (p_vehicle_year IS NOT NULL AND p.fitment_years @> ARRAY[p_vehicle_year])
        OR (p_vehicle_engine IS NOT NULL AND p.fitment_engines @> ARRAY[p_vehicle_engine])
        OR (vp.v_disp_pat IS NOT NULL AND (p.fitment_text ILIKE vp.v_disp_pat OR p.product_name ILIKE vp.v_disp_pat))
        OR (vp.v_model_pat IS NOT NULL AND (p.fitment_text ILIKE vp.v_model_pat OR p.product_name ILIKE vp.v_model_pat))
      )
    )
  ORDER BY r.order_count DESC, r.units_sold DESC, p.product_name ASC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 5), 50));
$$;

GRANT EXECUTE ON FUNCTION public.get_popular_products_for_vehicle(
  int, text, text, text, int
) TO anon, authenticated;

COMMENT ON FUNCTION public.get_popular_products_for_vehicle IS
  'Cross-customer top-N popular products for a given vehicle. SECURITY DEFINER is required so anon callers can read aggregates from order_items / orders (per-customer RLS). The orders JOIN is filter-only — only o.status IN (confirmed, shipped, delivered) reaches the WHERE clause, excluding cancelled/refunded/pending orders. No orders columns appear in the return type. Returns no PII — only aggregates + public products fields. Vehicle predicate matches get_distinct_product_brands_filtered_v2. p_limit defaults to 5, clamped to [1, 50].';

NOTIFY pgrst, 'reload schema';
