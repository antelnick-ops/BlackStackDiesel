# Vehicle predicate coupling

Three RPCs share an identical vehicle-fit predicate so the PWA's tile
counts, dropdown options, and Home Popular list all agree on what
"fits the user's truck" means. If any of the three drifts, the UI
will start lying to users (a tile says "3 FIT" but tapping through
shows 0 results, etc.).

## The three coupled RPCs

| RPC | Migration | Phase | Role |
|---|---|---|---|
| `get_distinct_product_brands_filtered_v2` | `scripts/migrations/add-brands-cross-filter-rpc.sql` | pre-C | Powers the Parts-tab brand dropdown |
| `get_brand_counts_for_category` | `scripts/migrations/add-brand-counts-rpc.sql` | C | Powers `#s-category` and `#s-brands` tile counts |
| `get_popular_products_for_vehicle` | `scripts/migrations/add-popular-products-rpc.sql` | C | Powers the Home "Popular for the …" list |

## The predicate (canonical copy)

A product is considered to fit the user's vehicle when **`p_vehicle_make`
is NULL** (no vehicle set — vehicle filter disabled entirely), OR any of
the following hit:

```sql
-- pre-computed once per call:
--   v_disp_pat  := '%' || substring(p_vehicle_engine FROM '\d+\.\d+L?') || '%'   -- "%6.7L%", "%7.3%"
--   v_model_pat := '%' || p_vehicle_model || '%'                                 -- "%F-250%"

AND (
  p_vehicle_make IS NULL  -- no vehicle = no vehicle filter
  OR (
    (p_vehicle_year IS NOT NULL AND p.fitment_years @> ARRAY[p_vehicle_year])
    OR (p_vehicle_engine IS NOT NULL AND p.fitment_engines @> ARRAY[p_vehicle_engine])
    OR (v_disp_pat IS NOT NULL AND (p.fitment_text ILIKE v_disp_pat OR p.product_name ILIKE v_disp_pat))
    OR (v_model_pat IS NOT NULL AND (p.fitment_text ILIKE v_model_pat OR p.product_name ILIKE v_model_pat))
  )
)
```

### Why `p_vehicle_make IS NULL` is the master gate

A year-only vehicle (no make) gets no vehicle filter — matches the
"set your truck completely or not at all" UX. The PWA only emits a
vehicle payload to these RPCs when `V.year && V.make && V.model &&
V.engine` are all set, so in practice the asymmetry doesn't bite. But
the predicate is what it is, and the three RPCs must all share it.

### Why these four OR-clauses

| Clause | Catches |
|---|---|
| `fitment_years @> ARRAY[year]` | Authoritative year-array hit (importers populate this) |
| `fitment_engines @> ARRAY[engine]` | Exact engine-string match (e.g. "6.7L Power Stroke") |
| `fitment_text ILIKE '%<disp>%'` and `product_name ILIKE '%<disp>%'` | Displacement substring fallback for rows where the engine array is sparse (e.g. "6.7" or "7.3") |
| `fitment_text ILIKE '%<model>%'` and `product_name ILIKE '%<model>%'` | Model substring fallback (e.g. "F-250") for product copy that names the truck but not the engine |

Each clause is permissive on its own; the OR is the union. This is
deliberately loose — false-negatives (a part hides from a truck it
fits) are worse than false-positives (a non-fit shows up in the
dropdown and gets ranked low).

## Changing the predicate

1. Edit `get_distinct_product_brands_filtered_v2` (`plpgsql`,
   `DECLARE`-block style — locals `v_displacement`, `v_disp_pat`,
   `v_model_pat`).
2. Edit `get_brand_counts_for_category` (`sql STABLE`, predicate lives
   inside `COUNT(*) FILTER (WHERE …)` and references `vp.v_disp_pat`
   / `vp.v_model_pat` from the `vp` CTE).
3. Edit `get_popular_products_for_vehicle` (`sql STABLE`, predicate
   lives in the outer `WHERE` and references the same `vp` CTE).
4. Update the canonical copy in this file.
5. Re-run the test queries from each migration's verification notes
   to confirm tile counts still match Parts-tab row counts.
6. `NOTIFY pgrst, 'reload schema';` after the DDL.

If you find yourself wanting a different predicate for one RPC only
— stop and re-check whether the UI invariant still holds. The whole
reason these are coupled is that the user sees the same "fit"
verdict in three different surfaces.
