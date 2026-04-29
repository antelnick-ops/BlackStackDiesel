-- Filtered distinct-brands RPC for the catalog filter dropdown.
-- Drives category-narrows-brand UX: when user picks a category chip,
-- the brand dropdown only shows brands that have products in that
-- category. Pass NULL or 'all' for the unfiltered list (default page state).

CREATE OR REPLACE FUNCTION get_distinct_product_brands_filtered(
  p_category text DEFAULT NULL
)
RETURNS TABLE(brand text) AS $$
  SELECT DISTINCT products.brand FROM products
  WHERE status = 'active'
    AND is_visible = true
    AND brand IS NOT NULL
    AND brand != ''
    AND (p_category IS NULL OR p_category = 'all' OR category = p_category)
  ORDER BY products.brand;
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION get_distinct_product_brands_filtered(text)
  TO anon, authenticated;
