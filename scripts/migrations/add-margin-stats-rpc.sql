-- =====================================================================
-- MARGIN ANALYSIS — products page
-- =====================================================================
-- Quick check (run in Supabase SQL Editor right now to see your numbers):

SELECT 
  COUNT(*) AS total_active,
  COUNT(*) FILTER (WHERE wholesale_price IS NOT NULL AND price > 0) AS with_margin_data,
  ROUND(AVG((price - wholesale_price) / NULLIF(price, 0) * 100)::numeric, 1) AS avg_margin_pct,
  ROUND(AVG(price - wholesale_price)::numeric, 2) AS avg_margin_dollars,
  ROUND(SUM(price - wholesale_price)::numeric, 2) AS total_margin_potential,
  ROUND(MIN((price - wholesale_price) / NULLIF(price, 0) * 100)::numeric, 1) AS min_margin_pct,
  ROUND(MAX((price - wholesale_price) / NULLIF(price, 0) * 100)::numeric, 1) AS max_margin_pct
FROM products
WHERE status = 'active'
  AND is_visible = true
  AND wholesale_price IS NOT NULL
  AND price > 0
  AND price > wholesale_price;  -- exclude any inverted-margin rows

-- Margin distribution by stage
SELECT 
  CASE 
    WHEN stage = 0 THEN 'OEM'
    WHEN stage = 1 THEN 'Stage 1'
    WHEN stage = 2 THEN 'Stage 2'
    WHEN stage = 3 THEN 'Stage 3'
    ELSE 'Universal/Untagged'
  END AS stage_label,
  COUNT(*) AS product_count,
  ROUND(AVG((price - wholesale_price) / NULLIF(price, 0) * 100)::numeric, 1) AS avg_margin_pct,
  ROUND(AVG(price - wholesale_price)::numeric, 2) AS avg_margin_dollars
FROM products
WHERE status = 'active'
  AND is_visible = true
  AND wholesale_price IS NOT NULL
  AND price > 0
  AND price > wholesale_price
GROUP BY stage
ORDER BY stage NULLS LAST;

-- =====================================================================
-- RPC for the admin portal to call
-- =====================================================================
-- Faster than computing in JS (one query, no N+1, indexed)

CREATE OR REPLACE FUNCTION public.get_admin_margin_stats()
RETURNS TABLE(
  total_active           bigint,
  with_margin_data       bigint,
  avg_margin_pct         numeric,
  avg_margin_dollars     numeric,
  total_margin_potential numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint AS total_active,
    COUNT(*) FILTER (WHERE p.wholesale_price IS NOT NULL AND p.price > 0)::bigint AS with_margin_data,
    ROUND(AVG((p.price - p.wholesale_price) / NULLIF(p.price, 0) * 100)::numeric, 1) AS avg_margin_pct,
    ROUND(AVG(p.price - p.wholesale_price)::numeric, 2) AS avg_margin_dollars,
    ROUND(SUM(p.price - p.wholesale_price)::numeric, 2) AS total_margin_potential
  FROM products p
  WHERE p.status = 'active'
    AND p.is_visible = true
    AND p.wholesale_price IS NOT NULL
    AND p.price > 0
    AND p.price > p.wholesale_price;
END;
$$;

-- Restrict to authenticated users (admins are inside this group)
GRANT EXECUTE ON FUNCTION public.get_admin_margin_stats() TO authenticated;

COMMENT ON FUNCTION public.get_admin_margin_stats IS
  'Returns aggregate margin stats across active+visible products with wholesale_price set. Excludes inverted-margin rows. Restricted to authenticated users (admin RLS not enforced at function level — call only from admin context).';
