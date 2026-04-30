-- =====================================================================
-- get_distinct_product_brands_filtered_v2
-- =====================================================================
-- Replaces the v1 RPC (which only narrowed by category) with a version
-- that mirrors the PWA's product query filters. Brands returned are
-- distinct brand names that have at least one active+visible product
-- matching ALL of the supplied filter criteria.
--
-- Parameters:
--   p_category    text  — exact category match, NULL for any
--   p_search      text  — case-insensitive substring against
--                          product_name OR brand OR fitment_text;
--                          NULL or <2 chars = no search filter
--   p_stages      int[] — array of stage values (0=OEM, 1/2/3); NULL
--                          or empty array = no stage filter
--   p_vehicle_year   int  — user's truck year, NULL for none
--   p_vehicle_make   text — user's truck make, NULL for none
--   p_vehicle_model  text — user's truck model, NULL for none
--   p_vehicle_engine text — user's truck engine, NULL for none
--
-- The vehicle filter applies the same family of OR-clauses the PWA
-- uses in queryProducts: matches when any of the following hit:
--   - fitment_years contains user's year
--   - fitment_engines contains user's engine
--   - fitment_text or product_name contains the engine displacement
--   - fitment_text or product_name contains the model
--
-- Returns: rows of { brand text } with no duplicates, sorted A-Z.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_distinct_product_brands_filtered_v2(
  p_category       text DEFAULT NULL,
  p_search         text DEFAULT NULL,
  p_stages         int[] DEFAULT NULL,
  p_vehicle_year   int DEFAULT NULL,
  p_vehicle_make   text DEFAULT NULL,
  p_vehicle_model  text DEFAULT NULL,
  p_vehicle_engine text DEFAULT NULL
)
RETURNS TABLE(brand text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_displacement text;
  v_search_pat text;
  v_model_pat text;
  v_disp_pat text;
BEGIN
  -- Pre-compute displacement substring (e.g., "6.7L" or "7.3" from engine)
  IF p_vehicle_engine IS NOT NULL THEN
    v_displacement := substring(p_vehicle_engine FROM '\d+\.\d+L?');
  END IF;

  v_search_pat := CASE
    WHEN p_search IS NOT NULL AND length(p_search) >= 2
    THEN '%' || p_search || '%'
    ELSE NULL
  END;
  v_model_pat := CASE
    WHEN p_vehicle_model IS NOT NULL
    THEN '%' || p_vehicle_model || '%'
    ELSE NULL
  END;
  v_disp_pat := CASE
    WHEN v_displacement IS NOT NULL
    THEN '%' || v_displacement || '%'
    ELSE NULL
  END;

  RETURN QUERY
  SELECT DISTINCT p.brand
  FROM products p
  WHERE p.is_visible = true
    AND p.has_margin = true
    AND p.status NOT IN ('archived', 'discontinued', 'draft')
    AND p.brand IS NOT NULL
    AND p.brand <> ''
    -- Category filter
    AND (p_category IS NULL OR p.category = p_category)
    -- Stage filter
    AND (p_stages IS NULL OR array_length(p_stages, 1) IS NULL OR p.stage = ANY(p_stages))
    -- Search filter (matches either product_name, brand, or fitment_text)
    AND (
      v_search_pat IS NULL
      OR p.product_name ILIKE v_search_pat
      OR p.brand ILIKE v_search_pat
      OR p.fitment_text ILIKE v_search_pat
    )
    -- Vehicle filter (matches if ANY of: year array, engine array, displacement in text, model in text)
    AND (
      p_vehicle_make IS NULL  -- no vehicle = no vehicle filter
      OR (
        (p_vehicle_year IS NOT NULL AND p.fitment_years @> ARRAY[p_vehicle_year])
        OR (p_vehicle_engine IS NOT NULL AND p.fitment_engines @> ARRAY[p_vehicle_engine])
        OR (v_disp_pat IS NOT NULL AND (p.fitment_text ILIKE v_disp_pat OR p.product_name ILIKE v_disp_pat))
        OR (v_model_pat IS NOT NULL AND (p.fitment_text ILIKE v_model_pat OR p.product_name ILIKE v_model_pat))
      )
    )
  ORDER BY p.brand;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_distinct_product_brands_filtered_v2(
  text, text, int[], int, text, text, text
) TO anon, authenticated;

COMMENT ON FUNCTION public.get_distinct_product_brands_filtered_v2 IS
  'Returns distinct active brand names whose products match all supplied filter dimensions: category, search, stages, and vehicle. Mirrors the PWA queryProducts filter logic so the brand dropdown stays in sync with what the user can actually see.';
