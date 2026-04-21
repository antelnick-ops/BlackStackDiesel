# Catalog Refactor Spec — Black Stack Diesel

**For:** Claude Code working in `C:\Users\Nicho\OneDrive\Documents\BlackStackDiesel`
**File to modify:** `app/index.html`
**Date:** April 21, 2026
**Author of spec:** Another Claude instance (chat) — Nick reviewed and approved

---

## Context you need to understand before editing

Nick runs Black Stack Diesel, a mobile-first PWA selling diesel truck parts. He was just approved as a dealer for APG Wholesale, a distributor with ~577,000 products in their master feed. After filtering to diesel-relevant brands and categories, BSD will import approximately 30,000–80,000 products into Supabase.

The current `app/index.html` loads all products into the browser with `.select('*')` and filters client-side. This breaks at scale for three reasons:

1. **Supabase's default row limit is 1000** — a `.select('*')` on a 30K-row table silently returns only the first 1000 rows sorted by whatever the query specifies. The app would never see most of the catalog.
2. **Mobile RAM** — 30K product objects with description text, fitment text, and metadata won't fit in a phone's browser memory without lag or crashes.
3. **Cold start time** — downloading 30K rows over 4G takes 10–30 seconds before anything renders.

Your job is to refactor the catalog to query the database with filters already applied, paginate results with a "Load More" button, and move fitment filtering from client-side JavaScript into the SQL query itself.

**Do not import products during this task.** Nick has 0 products in the database right now (we just cleaned out 2000 bad rows). Test with manually inserted sample rows if needed. The real import is a separate task coming later.

---

## What exists today (do not assume — verify by reading the file)

### Relevant state variables (around line 474)
```javascript
let ALL_PRODUCTS = [];
let MATCHED_PRODUCTS = [];
```

### Relevant functions
- `loadProducts()` (around line 1061) — fetches all products, scores them, stores in `ALL_PRODUCTS`, calls `renderProducts()`
- `renderProducts()` (around line 1118) — reads `ALL_PRODUCTS`, filters by category/stage/brand/price/search, sorts, renders cards into `#pgrid`
- `scoreProductForVehicle(p)` (around line 901) — computes a fit score by scanning text fields
- `getVehicleAliases()` (around line 888) — returns lowercase variants of the user's vehicle
- `cleanImageUrl(v)` (around line 878) — normalizes image URL strings

### Relevant HTML elements
- `#pgrid` — product card grid container
- `#catTabs` — horizontal category tab strip
- `#brandDd` — brand dropdown
- `#priceDd` — price range dropdown
- `#sortDd` — sort dropdown
- `#searchInput` — search text input
- `.stg` — stage filter buttons (Stage 1/2/3)
- `.feed-msg` — informational message shown above results
- `.feed-empty` — empty state message

### Relevant Supabase client
```javascript
var sb = supabase.createClient('https://jfjbilfsiebifzddveof.supabase.co', '<anon key>');
```

### Vehicle state
Vehicle is stored in global `V` object: `{ year, make, model, engine }`. Populated after the user completes the 4-step vehicle selection flow.

### User decisions (already made, do not re-ask)
- **Pagination:** "Load More" button, 50 products per page
- **Default filter:** Show products that fit the user's truck by default, but ALSO show products in "universal" categories regardless of vehicle match
- **No vehicle selected:** Show all products (ranked by popularity or alphabetical), no fit filtering

---

## Database schema (the contract you must respect)

### `products` table — relevant columns

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key |
| `product_name` | text | Display name |
| `sku` | text | APG's Premier Part Number |
| `brand` | text | Manufacturer |
| `price` | numeric | Customer-facing price (usually = map_price) |
| `stock_qty` | integer | Combined warehouse inventory |
| `category` | text | Top-level category (e.g., "Exhaust", "Engine") |
| `stage` | smallint | Performance stage 1/2/3 (diesel tuning concept) |
| `fitment_text` | text | Raw fitment description for display |
| `fitment_makes` | text[] | Normalized array, e.g. `{Dodge, Ram}` |
| `fitment_years` | int4range | Year range, e.g. `[2003,2007)` |
| `fitment_engines` | text[] | Normalized array, e.g. `{5.9L Cummins, 6.7L Cummins}` |
| `image_url` | text | Primary product image |
| `is_visible` | boolean | Whether to show in catalog |
| `source` | text | `'distributor'` for APG items |
| `status` | text | Product lifecycle status |

### Universal categories (show regardless of vehicle)

These categories from APG's Part Category field should ALWAYS be visible even when a vehicle filter is active, because they fit any diesel truck:

```javascript
const UNIVERSAL_CATEGORIES = [
  'Accessories and Fluids',
  'Tools and Equipment',
  'Chemicals',
  'Apparel',
  'Hardware',
  'Shop Supplies',
  'Electrical Lighting and Body',  // most lighting is universal
  'Tire and Wheel'                  // most wheels/tires cross-fit
];
```

If Nick's actual product categories differ from this list after import, he can adjust the array. This is a reasonable starting point based on APG's feed structure.

---

## Target behavior

### Query flow when the catalog opens

1. Read current filter state (vehicle, category, stage, brand, price, search)
2. Build a Supabase query with:
   - `is_visible = true`
   - Status is not an archived/disabled state
   - If vehicle is selected: `fitment_makes` overlaps vehicle make OR `fitment_engines` contains vehicle engine OR category is in UNIVERSAL_CATEGORIES
   - Apply category filter if set
   - Apply stage filter if set
   - Apply brand filter if set
   - Apply price range filter if set
   - Apply full-text search if search query non-empty
3. Order by: fits-first-then-price (if vehicle set), else brand+name
4. Limit to 50 rows, offset by (page - 1) * 50
5. Render results into `#pgrid`
6. If result count < 50, hide "Load More" button. Else show it.

### "Load More" button behavior

- Positioned at the bottom of the product grid
- On click: increment page counter, run the same query with new offset, APPEND results to grid (do not clear)
- During fetch: show a loading spinner state, disable the button
- If the next page is empty: remove the button and show "That's all" message
- When any filter changes (category, brand, price, search, stage, vehicle): reset page to 1, clear grid, re-query

### Count query

Also run a lightweight `count` query alongside the data query so we can show "Showing 50 of 3,247 results for your 2015 Ram 2500 6.7L Cummins". Use Supabase's `{ count: 'exact', head: true }` option. Do this only on filter-change, not on "Load More" — the count doesn't change just because we're loading another page of the same filter.

### Empty state

If the first query returns 0 results:
- If vehicle is selected and filters are active: "No parts match your filters for this truck. Try clearing a filter or [browse all parts]."
- If vehicle is selected and no other filters: "No products in the catalog fit this truck yet. Check back soon — we're adding inventory daily."
- If no vehicle is selected and no filters: "No products in the catalog yet." (this shouldn't happen once imports run)
- If search query returned nothing: "No results for '<query>'. Try a different search term."

---

## Implementation guidance

### State management

Replace `ALL_PRODUCTS` and `MATCHED_PRODUCTS` with:

```javascript
let PRODUCT_STATE = {
  page: 1,
  pageSize: 50,
  totalCount: 0,
  displayedProducts: [],  // accumulated as user clicks Load More
  isLoading: false,
  hasMore: true,
  currentFilters: {
    category: 'all',
    stages: [],
    brand: '',
    priceRange: '',
    search: '',
    sort: 'relevance'
  }
};
```

Every filter change resets `page: 1`, `displayedProducts: []`, `hasMore: true` before re-querying.

### Supabase query shape

Example showing the structure (actual implementation is yours to build):

```javascript
async function queryProducts(filters, page, pageSize) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  let query = sb.from('products')
    .select('*', { count: 'exact' })
    .eq('is_visible', true)
    .range(from, to);
  
  // Apply filters conditionally
  if (filters.category && filters.category !== 'all') {
    query = query.eq('category', filters.category);
  }
  
  if (filters.brand) {
    query = query.eq('brand', filters.brand);
  }
  
  // Vehicle-based fitment filter (the tricky part)
  if (V.make && V.engine) {
    // Show products where:
    //   fitment_makes overlaps user's make  OR
    //   fitment_engines contains user's engine  OR
    //   category is in UNIVERSAL_CATEGORIES
    // 
    // Use Supabase's .or() with PostgREST filter syntax.
    // Arrays use 'cs' (contains) or 'ov' (overlaps).
    // Example (verify exact syntax against PostgREST docs):
    const vehicleFilter = [
      `fitment_makes.cs.{${V.make}}`,
      `fitment_engines.cs.{${V.engine}}`,
      `category.in.(${UNIVERSAL_CATEGORIES.map(c => `"${c}"`).join(',')})`
    ].join(',');
    query = query.or(vehicleFilter);
  }
  
  // Price range
  if (filters.priceRange === 'Under $100') query = query.lt('price', 100);
  else if (filters.priceRange === '$100–$500') query = query.gte('price', 100).lte('price', 500);
  else if (filters.priceRange === '$500–$1K') query = query.gte('price', 500).lte('price', 1000);
  else if (filters.priceRange === '$1K+') query = query.gte('price', 1000);
  
  // Search — use full-text search for speed (index already exists: idx_products_search)
  if (filters.search && filters.search.length >= 2) {
    query = query.textSearch('fts_searchable', filters.search, { type: 'websearch' });
    // Note: the GIN index is on to_tsvector of product_name + fitment_text + brand.
    // Nick will need to create a generated column or the textSearch call needs adjustment.
    // Fallback: use .or() with ilike on product_name, brand, fitment_text.
  }
  
  // Sort
  if (filters.sort === 'Low → High') query = query.order('price', { ascending: true });
  else if (filters.sort === 'High → Low') query = query.order('price', { ascending: false });
  else query = query.order('brand').order('product_name');
  
  const { data, error, count } = await query;
  return { data: data || [], error, count: count || 0 };
}
```

**IMPORTANT caveat about the full-text search:** the existing GIN index (`idx_products_search`) is built on an expression, not a column. Supabase's `.textSearch()` method expects a column name. Two options:

**Option A (simpler):** Don't use the full-text index yet. Use `.or()` with `ilike` filters:
```javascript
if (filters.search) {
  const q = `%${filters.search}%`;
  query = query.or(`product_name.ilike.${q},brand.ilike.${q},fitment_text.ilike.${q}`);
}
```
Slightly slower but works today, no schema changes needed.

**Option B (faster, more work):** Add a generated column `fts_searchable` on the products table:
```sql
ALTER TABLE products ADD COLUMN fts_searchable tsvector 
  GENERATED ALWAYS AS (to_tsvector('english', 
    coalesce(product_name, '') || ' ' || 
    coalesce(fitment_text, '') || ' ' || 
    coalesce(brand, '')
  )) STORED;
CREATE INDEX idx_products_fts ON products USING gin(fts_searchable);
```
Then use `.textSearch('fts_searchable', filters.search)`.

**Recommend Option A for now.** Revisit if search feels slow after the import.

### Rendering changes

`renderProducts()` currently does two things: filter the in-memory array AND build the DOM. Split it:

- `rebuildProductCategoryDropdowns()` — builds category tabs and brand dropdown from **a separate lightweight query** that runs once on catalog open, not on every filter change. E.g. `select('category').not('category', 'is', null)` distinct. Cache the result.
- `appendProductCards(products)` — takes an array, builds card HTML, appends to `#pgrid`. Does not clear the grid. Used for initial render AND "Load More."
- `clearAndRenderProducts(products)` — clears `#pgrid` first, then calls `appendProductCards`. Used on filter changes.

### Fit badge

Products are no longer scored client-side since filtering is server-side. To still show a "✓ Fits" badge on especially-good matches, compute a simple client-side score on the already-filtered results for display only — not for filtering or ranking. Keep it to engine-specific matches (user's engine string found in fitment_text or fitment_engines array).

### Keep working

- The user's vehicle selection flow
- The cart, checkout, and Stripe integration
- The product detail view (if any — check if it exists in this file)
- The login/auth flow
- Service worker registration

---

## State transitions — specific scenarios to handle

### Scenario 1: User opens app with saved vehicle
- On catalog screen load: run initial query with vehicle filter applied
- Show "Showing 50 of X fits for your 2015 Ram 2500" header
- Render first page, show Load More button if `totalCount > 50`

### Scenario 2: User changes category tab
- Reset page to 1, clear grid
- Re-query with new category filter + existing vehicle + other active filters
- Update the header message
- Show/hide Load More based on new result count

### Scenario 3: User types in search box
- Debounce input by 300ms (don't query on every keystroke)
- On debounce fire: reset page, re-query with search term
- Don't query until at least 2 characters typed

### Scenario 4: User taps "Load More"
- Increment page counter
- Disable button, show spinner
- Query same filters with new offset
- Append new cards (don't clear existing)
- Hide button if fewer than 50 results returned

### Scenario 5: User changes vehicle
- Reset page, clear grid
- Rebuild category tabs (different vehicle may have different categories available — actually no, categories are from APG's taxonomy, not vehicle-specific. Skip the rebuild. Just re-query products.)
- Update header message

### Scenario 6: No vehicle selected, user browsing generally
- No vehicle filter applied to query
- Sort by brand+name
- No "fits" badges shown
- Everything else works normally

---

## What NOT to change (scope fence)

- Do NOT modify the vehicle selection flow
- Do NOT modify the cart or checkout code
- Do NOT modify the authentication code
- Do NOT modify the bottom navigation
- Do NOT modify the CSS / visual design
- Do NOT add new npm packages — this is a single-file HTML PWA with no build step
- Do NOT delete the `scoreProductForVehicle()` function — repurpose it for the "✓ Fits" badge only
- Do NOT change the Supabase anon key or API URL
- Do NOT import products — Nick will handle that separately

---

## Testing checklist (before Nick pushes to production)

Manually verify each of these after your changes:

1. [ ] App loads without JavaScript errors (check browser console)
2. [ ] Open DevTools Network tab. Confirm initial catalog query returns max 50 rows, not thousands
3. [ ] With 0 products in the database, catalog shows appropriate empty state, no JS errors
4. [ ] Insert 5 test products manually into Supabase (different brands, categories, with fitment_makes populated). Verify they display.
5. [ ] Select a vehicle. Verify query adds vehicle filter (check Network tab → request URL has `fitment_makes` or `or` parameter)
6. [ ] Change category tab. Verify grid clears and re-queries
7. [ ] Type in search box. Verify debounce (doesn't query until you stop typing for 300ms)
8. [ ] Open a product → go to cart → return to catalog. Verify catalog state is reasonable (either preserved or cleanly reset — decide which feels better)
9. [ ] On a slow connection (throttle to 3G in DevTools), verify Load More button shows loading state correctly
10. [ ] Verify that unrelated screens (cart, checkout, login, vehicle picker) still work

---

## How to commit

When finished, commit with a clear message:

```
git add app/index.html
git commit -m "Refactor catalog to server-side filtering + pagination

- Move filtering from client to Supabase query with vehicle-aware .or() filter
- Add Load More pagination (50 products per page)  
- Show count header ('X of Y results')
- Universal categories (fluids, tools, apparel) bypass vehicle filter
- Keep existing vehicle flow, cart, and auth untouched
- Scoped scoreProductForVehicle() to fit badge only, not filtering"
```

Then push:

```
git push origin main
```

---

## Escalation

If you encounter schema mismatches, broken assumptions, or ambiguous requirements that aren't resolved by this spec, STOP and tell Nick to ask the other Claude (in his web chat). Do not guess on:

- Exact Supabase `.or()` syntax for array-overlap filtering (verify against docs)
- Whether any additional tables need to change
- Whether to delete or preserve the existing `scoreProductForVehicle` function

The "other Claude" has full business context, access to the APG CSV structure, and designed the import pipeline. This spec is the handoff — but it can't anticipate every edge case.
