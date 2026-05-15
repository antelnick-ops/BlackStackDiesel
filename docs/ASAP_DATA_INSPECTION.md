# ASAP Data Inspection

_Generated 2026-04-28. Source: 3 CSVs from initial ACCEL + BAK exports landed in `tmp/asap-data/`. Plus an end-to-end probe of the `/brands`, `/products`, `/product` API endpoints._

## Executive summary

ASAP delivers two parallel data paths: a **bulk CSV export** (manually generated per-brand, what just landed in `tmp/asap-data/`) and a **REST API** (`api.asapnetwork.org/webapi/`, working and probed today). Both paths return the same conceptual schema — SKU + manufacturer SKU, structured packaging dimensions, MAP pricing separate from list, AAIA-coded category and brand IDs, ACES-style fitment rows, and authentic CDN-hosted images. The product detail payload from the API is the richest representation; the CSV product files are very close, with each SKU as one row and fitment encoded as a single pipe-delimited cell. This is a clear quality upgrade over the APG keyword-parsing pipeline: structured fitment, real MAP/list pricing, official brand imagery, and UPCs all become first-class fields.

There are two data-quality issues worth knowing before any import work starts. **First**, the `_fitment` companion CSV is **headerless** and its SKU set does not overlap with the products CSV at all (71 fitment SKUs vs 216 product SKUs, zero intersection for ACCEL). The embedded `fitment` column in the products CSV is the actual usable fitment source — the companion file appears to cover a different/stale SKU universe and shouldn't drive ingest decisions until ASAP clarifies its scope. **Second**, the `/brands` endpoint reports **25 approved brands**, not the 27 you mentioned — flagging in case two are still mid-approval on ASAP's side. Recommendation below is to ingest from the embedded fitment column, treat the companion CSV as supplementary cross-reference data, and reorganize `tmp/asap-data/` into a per-brand subfolder layout to keep multi-snapshot history clean.

---

## API probe results

| Endpoint | Status | Result |
|----------|--------|--------|
| `GET /webapi/brands` | 200 | 25 brands approved |
| `GET /webapi/products/83748?type=Truck/SUV` (Icon Vehicle Dynamics) | 200 | 2,111 SKUs |
| `GET /webapi/product/252002-FRDK` | 200 | full detail payload retrieved |

Saved: `tmp/asap_approved_brands.json` (full /brands response).

**Approved brands (25):** DiabloSport, Holley Performance, Rock Krawler, USA Standard Gear, Yukon Gear and Axle, RIGID, Skyjacker, EZ Lynk, Icon Vehicle Dynamics, BDS Suspension, Fox Factory, BD Diesel, Bilstein, Edge Products, ACCEL, BAK, Go Rhino, Superlift, NFab, Extang, Lund, Carli Suspension, Rugged Ridge, Retrax, UnderCover.

**Note:** You said 27 brands approved, API returned 25. Likely two are still mid-approval — worth checking the ASAP dashboard for any in `requested` state.

### Product detail payload — top-level keys

```
sku, mfg_original_sku, title, grouping, grouping_title, date_updated,
price, discontinued_item, product_description, image, map_pricing,
product_packaging, color, finish, material, warranty, prop_65_warning,
lift_height, category, brand, aaiaid, fitment, vehicle_type, fuel_type,
installation_instructions, "" (empty key — quirk), field_specs
```

**Notable fields:**
- `sku` is the AAIA-suffixed identifier (`252002-FRDK`); `mfg_original_sku` is the manufacturer's raw SKU (`252002`). The suffix is the brand's AAIA code.
- `aaiaid` is the AAIA brand ID (e.g. `FRDK` = Icon Vehicle Dynamics). This is the universal cross-vendor brand key.
- `price` and `map_pricing` are separate strings — MAP is the minimum advertised price BSD must respect.
- `product_packaging` is a structured array with `dim_length/width/height/dim_unit` and `weight/weight_unit`.
- `image` is an array of CDN URLs on `asapnetwork.org`. Universal items often have only the primary image.
- `fitment` is an array of structured fitment rows (empty for universal items).
- `category` is an array, ordered most-specific to most-general (`["Wrench", "Hand Tools", "Tools"]`).
- `field_specs` is an open-ended `{spec_name, spec_value}[]` array — UPC, Country of Origin, Sold As, Availability, Universal flag all live here.
- One **empty-string key** appears in the payload (`"": ""`) — appears to be a serializer artifact from ASAP's side. Ignore it.

---

## File: `206636-ACCEL-2026-04-28.csv` (products)

- **Size:** 886 KB
- **Rows:** 216 product SKUs
- **Encoding:** UTF-8, no BOM
- **Delimiter:** comma
- **Columns:** 62

### Column inventory (62)

```
sku, mfg_original_sku, title, description, grouping, grouping_title, grouping_id,
list_price, map_price, availability, discontinued_item, images,
dim_length, dim_width, dim_height, dim_unit, weight, weight_unit,
category, base_category, aces_term_id, country_of_origin,
exhaust_type*, finish_l, fuel_type, liter, material_l, prop_65_warning,
series, sold_as, warranty, universal, aaiaid, fitment, youtube_video,
vehicle_type, brand, upc, installation_instructions, color_l, style,
emission_code, cylinders, transmission_type*, eo_number*, valve_type*,
brand_logo, last_update, us_umwp_pricing, engine_manufacturer*, engine_years,
engine_designation, core_charge, psi, ems_code, cad_core_charge, location,
drive, installation_time, shipping_restriction, transmission_model, transmission
```

`*` = blank for every row in this export.

### Observations
- **`fitment` column is the real fitment source.** Format is pipe-separated rows, each row comma-separated as `year_start, year_end, make, model, sub_model`. One spot-checked SKU (TST6-BDDP) had 53 embedded fitment entries.
- **63% of ACCEL SKUs have fitment data** (137/216 with non-empty `fitment`); 6 are flagged `universal=Yes`; the remaining ~34% (73 SKUs) have neither — coverage gap on ASAP's side.
- `images` is **pipe-delimited** when multiple — same delimiter as fitment but different field meaning.
- `liter` is pipe-delimited multi-value (`"5.7|5.0|4.3|7.4|..."`) for engine displacement.
- `description` is HTML — needs sanitization before storage.
- 5 columns are entirely blank in this export (`exhaust_type, transmission_type, eo_number, valve_type, engine_manufacturer`). They're part of ASAP's universal schema, not always populated.

---

## File: `206636-ACCEL-2026-04-28_fitment.csv`

- **Size:** 473 KB
- **Rows:** 9,324 fitment rows
- **Encoding:** UTF-8, no BOM
- **Delimiter:** comma
- **HEADERLESS** — no column names in row 1.

### Inferred column order (no header)

| Index | Field | Sample |
|-------|-------|--------|
| 0 | `sku` (AAIA-suffixed) | `9044CK-BDDP` |
| 1 | `mfg_original_sku` | `9044CK` |
| 2 | `year_start` | `1995` |
| 3 | `year_end` | `1998` |
| 4 | `make` | `GMC` |
| 5 | `model` | `Sierra` |
| 6 | `sub_model` / trim | `SLE` (often blank) |

### Observations
- **The fitment file does NOT join to the products file.** 71 distinct SKUs in fitment, 216 in products, **zero overlap**. Spot-checked SKU TST6-BDDP has 53 embedded fitment rows in the product CSV but 0 rows in the fitment file.
- Avg fitment rows per SKU (in this file): **131.3** (median 116, max 870). For comparison, the embedded `fitment` column in the products CSV averages dozens-to-low-hundreds per SKU. So the fitment file represents long-tail / broad-application SKUs ASAP has on file but isn't currently exporting in the products feed.
- Top makes by row count: Chevrolet (2946), Ford (1826), GMC (1363), Dodge (978), Plymouth (413), Ram (395) — broad coverage skewed to legacy GM. Diesel-engine mentions: **only 84 rows** (<1%), as ACCEL is primarily an ignition / spark-plug brand for gas V8s.

### Working hypothesis

The fitment file is generated independently against ASAP's broader fitment universe (likely sourced from the manufacturer's full ACES export), while the products file is filtered to the SKUs your account is authorized for. They will converge as more SKUs come into your authorized scope, but **today you should drive ingest from the embedded `fitment` column in the products file** and treat the companion fitment CSV as supplementary cross-reference data.

**Action:** Confirm scope/intent of `_fitment.csv` with ASAP before writing the import. Possible the file is meant to be parsed without headers as a flat ACES table, in which case it could power "do we have any product for this vehicle?" analysis even when product data is missing.

---

## File: `206636-BAK-2026-04-28.csv` (products)

- **Size:** 1,813 KB
- **Rows:** 444 product SKUs
- **Encoding:** UTF-8, no BOM
- **Delimiter:** comma
- **Columns:** 44 (vs ACCEL's 62 — schema is per-brand, not universal)
- **No companion fitment file** in this export.

### BAK-only columns
`tonneau_cover_type, bed_length_foot, nafta, harmonized_tariff_code`

These are tonneau-cover-specific attributes plus customs/trade fields. The harmonized tariff code is a notable extra useful for international shipping/duties — worth capturing if BSD ever ships internationally.

### Observations
- 40 columns shared with ACCEL; 4 BAK-only; 22 ACCEL-only. **The schema is brand-shaped** — every export contains the universal core plus brand-specific extension columns. Import code must treat every column except a documented core set as optional/unknown.
- BAK products have shorter embedded fitment lists (max ~10 entries per SKU vs ACCEL's 50+).
- BAK ships with `nafta` and `harmonized_tariff_code` — supports international and customs use cases ACCEL doesn't.
- `installation_instructions` for BAK is a **PDF URL** on `asapnetwork.org`. ACCEL's column is empty in this export. Worth storing.

---

## Schema mapping: ASAP → BSD `products`

| ASAP column | BSD `products` column | Notes |
|-------------|-----------------------|-------|
| `sku` | `sku` | Use the AAIA-suffixed form as canonical (matches API). |
| `mfg_original_sku` | **NEW** `mfg_sku` | Add column. Useful for cross-vendor matching against APG. |
| `title` | `product_name` | Direct map. |
| `description` | `description` | HTML — sanitize on import (strip dangerous tags, keep formatting). |
| `list_price` | `price` | List/MSRP. |
| `map_price` | **NEW** `map_price` | Add column. Required to enforce MAP at checkout. |
| `availability` | `status` (mapped) | "Available" → `active`; "Discontinued" → `discontinued`. |
| `discontinued_item` | `status` (cross-check with availability) | If `true`, force discontinued regardless of availability. |
| `images` | `image_url` (primary) + **NEW** `image_urls[]` | Pipe-split. Store first as primary, rest in `image_urls` jsonb. |
| `dim_length`, `dim_width`, `dim_height`, `dim_unit` | **NEW** `pkg_length`, `pkg_width`, `pkg_height`, `pkg_unit` | Add packaging dim columns. Currently no analog on BSD. |
| `weight`, `weight_unit` | `weight_lbs` | Convert kg → lb if `weight_unit=kg`. ACCEL/BAK both use `lb`. |
| `category` | `category` | Use leaf (`base_category`) for the BSD category column; full path can populate breadcrumb if added. |
| `base_category` | `category` | Alternative source — already-leaf string, easier to map. |
| `aces_term_id` | **NEW** `aces_term_id` | Optional. Useful if BSD ever joins to other ACES-aware data sources. |
| `country_of_origin` | **NEW** `country_of_origin` | Useful for filtering "Made in USA" etc. |
| `prop_65_warning` | **NEW** `prop_65_warning` | Boolean or text — required for CA shoppers. |
| `series` | **NEW** `series` | Brand-specific product line tag (e.g. "BAKFlip CS"). |
| `sold_as` | **NEW** `sold_as` | "Each", "Kit", "Pair", etc. Currently inferred — make explicit. |
| `warranty` | **NEW** `warranty` | Free text or duration. |
| `universal` | **NEW** `is_universal` | Boolean. Important — drives "fits any truck" filter behavior. |
| `aaiaid` | **NEW** `aaia_brand_id` | AAIA brand code (FRDK, BDDP, BKDA, ...) — universal brand key for cross-vendor joins. |
| `fitment` | `fitment_makes`, `fitment_engines`, `fitment_years` (existing) **+ NEW** `fitment_rows` jsonb | Parse the pipe-delimited rows into structured records. Keep arrays for backwards compat with current filters; store full structured rows in jsonb for engine-aware filtering. |
| `youtube_video` | **NEW** `youtube_url` | Useful on PDP. |
| `vehicle_type` | **NEW** `vehicle_types[]` | Pipe-split (`Truck/SUV|Jeep|Van`). |
| `brand` | `brand` | Direct. Use ASAP's brand string as canonical (overrides APG keyword parse). |
| `upc` | **NEW** `upc` | Important — universal product code, useful for de-dup against APG. |
| `installation_instructions` | **NEW** `install_pdf_url` | PDF URL. |
| `liter`, `cylinders`, `fuel_type`, `engine_designation`, `engine_years` | `fitment_engines` (enriched) | Combine into engine-aware filter strings. Critical for diesel-truck targeting. |
| `core_charge`, `cad_core_charge` | `core_charge`, `has_core` (existing) | Cross-check vs APG's core data. |
| `nafta`, `harmonized_tariff_code` (BAK-only) | **NEW** `harmonized_tariff_code` | Skip `nafta` for now; capture HTC if international ever matters. |
| `brand_logo` | **NEW** `brand_logo_url` (on a brands table) | Don't denormalize per-product — store once per brand. |
| `last_update` | `vendor_updated_at` | Useful for incremental sync. |
| `grouping`, `grouping_id`, `grouping_title` | **NEW** `grouping_key` | ASAP's product grouping (variant family). Optional but useful for kits/bundles. |
| `field_specs` (API only) | jsonb extension column | API delivers `{spec_name, spec_value}[]`; CSV doesn't carry these directly. Capture if ingesting from the API. |

### Schema gaps — new BSD columns to add

Required for usable ASAP ingest:
- `mfg_sku` (text) — manufacturer's raw SKU.
- `map_price` (numeric) — MAP enforcement at checkout.
- `image_urls` (jsonb) — multi-image array.
- `pkg_length`, `pkg_width`, `pkg_height`, `pkg_unit` — packaging dims.
- `aaia_brand_id` (text) — cross-vendor brand key.
- `is_universal` (bool) — drives universal-fit filter.
- `upc` (text, indexed) — de-dup against APG.
- `fitment_rows` (jsonb) — structured fitment for engine-aware filtering.
- `vehicle_types` (text[]) — pipe-split source.
- `vendor_updated_at` (timestamptz) — incremental sync.

Nice-to-have:
- `country_of_origin`, `prop_65_warning`, `series`, `sold_as`, `warranty`, `youtube_url`, `install_pdf_url`, `aces_term_id`, `harmonized_tariff_code`, `grouping_key`.

---

## Quality comparison: ACCEL on ASAP vs current BSD/APG data

> Skipped the live Supabase comparison query as requested — running that manually.

Run these manually to quantify the upgrade:

```sql
-- BSD fitment coverage on ACCEL today (APG keyword-parsed)
select
  count(*) as accel_total,
  count(*) filter (where fitment_makes is null or array_length(fitment_makes,1) is null) as no_makes,
  count(*) filter (where fitment_engines is null or array_length(fitment_engines,1) is null) as no_engines,
  count(*) filter (where image_url is null) as no_image
from products
where brand ilike '%accel%' and status = 'active';

-- Sample 5 ACCEL products to eyeball
select sku, product_name, fitment_makes, fitment_years, fitment_engines, category, image_url
from products
where brand ilike '%accel%' and status = 'active'
limit 5;
```

**What to expect from ASAP vs APG (predicted):**

| Dimension | APG keyword-parsed (today) | ASAP CSV (incoming) |
|-----------|----------------------------|---------------------|
| Fitment makes | Heuristic regex on description text — frequently wrong on shared model names | Structured year/make/model/sub from manufacturer's ACES feed |
| Fitment engines | Often empty for non-truck-specific brands | Explicit `liter` + `cylinders` + diesel/gas `fuel_type` |
| Images | APG-provided, sometimes wrong vehicle (see SKU `BDD1045297` blacklist in import-apg-feed.js) | Manufacturer-authentic from ASAP CDN |
| MAP price | Not captured | Explicit `map_price` field |
| UPC | Not captured | Explicit |
| Universal flag | Inferred from missing fitment | Explicit `universal=Yes/No` |
| Description | APG marketing text | Manufacturer description with structured detail bullets |

The upgrade is **substantive** — ASAP gives BSD authoritative data sourced from the manufacturer, replacing inferred/heuristic values.

---

## Recommendations

### 1. Folder structure: per-brand subfolders

**Recommended layout:**

```
tmp/asap-data/
├── accel/
│   ├── 2026-04-28-products.csv
│   └── 2026-04-28-fitment.csv
├── bak/
│   └── 2026-04-28-products.csv
├── icon-vehicle-dynamics/
│   └── 2026-05-02-products.csv
└── _archive/   (optional — old snapshots)
```

**Why:** at scale (25+ approved brands × monthly exports), a flat layout becomes hundreds of files and `ls` is unreadable. Per-brand subfolders keep each brand's history together so import scripts can `import-asap.js --brand accel --date 2026-04-28` cleanly. The fitment companion lives next to its products file.

**Migration path:** one-time `mv` script to relocate the 3 existing files, plus a small helper that watches `~/Downloads/` for `{user_id}-{BRAND}-{date}.csv` and routes them to the right subfolder. Or a simpler manual rename when downloading.

### 2. Sort out the fitment file scope before importing

Email/message ASAP support: "What is the intended scope of the `_fitment.csv` companion file relative to the products CSV? In our ACCEL export the SKU sets do not overlap." Don't burn import effort on a file that may turn out to be an unrelated ACES dump.

For now, drive fitment ingest from the **embedded `fitment` column** in the products CSV. It's reliable, structured, and joins trivially.

### 3. Pre-import schema migration

Write `scripts/migrations/add-asap-product-fields.sql` adding the required new columns listed above before writing `scripts/asap-import.js`. Include:
- `mfg_sku`, `map_price`, `image_urls jsonb`, `pkg_length/width/height/unit`, `aaia_brand_id`, `is_universal`, `upc`, `fitment_rows jsonb`, `vehicle_types text[]`, `vendor_updated_at`.

Index `upc` and `mfg_sku` for de-dup against APG.

### 4. Import strategy: enrichment-only (UPDATE, never INSERT)

**Hard rule:** ASAP data UPDATEs existing BSD products and never INSERTs new rows. APG is the single source of truth for catalog membership; ASAP layers richer data onto rows BSD already carries.

**Match strategy** (try in order, first hit wins):
1. Exact match on `sku` (after normalizing case and stripping whitespace)
2. Exact match on `mfg_sku` (once the new column is populated; APG-side mfg SKU may need extraction from item descriptions)
3. Exact match on `upc` (once the new column is populated; high-confidence universal key)

If none match, write the ASAP row to an `asap_unmatched_skus` log table — don't insert into products. Schema:

```sql
create table asap_unmatched_skus (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  asap_sku text not null,
  mfg_original_sku text,
  upc text,
  title text,
  category text,
  source_file text,
  observed_at timestamptz default now(),
  resolved_at timestamptz,        -- set when this SKU later matches and gets enriched
  unique (brand, asap_sku, source_file)
);
```

**Why log the unmatched:** (a) when APG later adds a SKU that matches, the import can resolve historical unmatched rows and enrich without re-pulling from ASAP; (b) a persistently high unmatched rate per brand is the signal that match strategy needs strengthening (try UPC-based, try fuzzy mfg_sku, etc.).

**Field precedence on UPDATE:** ASAP wins for `title` (when richer), `description`, `image_urls`, `fitment_rows`, `category`, `map_price`, `upc`, `aaia_brand_id`, `is_universal`, `vehicle_types`. APG wins for `price` (real-time), `wholesale_price` (dealer cost), `stock_qty` (inventory). The brand string normalizes to ASAP's canonical name when matched.

### 5. Track ingestion state per brand

Once the `asap_brand_requests` migration is applied (already drafted in `scripts/migrations/create-asap-brand-requests-table.sql` from the earlier task), use `last_synced_at` on each row to drive incremental imports — only re-process a brand's CSV if its file mtime > `last_synced_at`.

### 6. Naming convention for incoming exports

Lock in: `{user_id}-{BRAND}-{YYYY-MM-DD}[_fitment].csv` matches what ASAP already generates. Keep as-is for the file ASAP ships, **but** the import script should rename to `{date}-products.csv` / `{date}-fitment.csv` when relocating into the per-brand subfolder. That way the brand is already implicit from the path and the filename only carries date + content type.

---

## Quantitative quality comparison: ACCEL

_Added 2026-04-28 from `scripts/compare-accel-asap-vs-bsd.js`. Source files: `tmp/asap-data/accel/2026-04-28-products.csv` (216 rows) vs Supabase `products` filtered to `brand ILIKE '%accel%' AND status='active'` (6 rows)._

### Headline numbers

| Metric | ASAP (216 SKUs) | BSD today (6 SKUs) |
|--------|-----------------|---------------------|
| SKUs in catalog | **216** | **6** |
| Image coverage | **100.0%** (216/216) | **0.0%** (0/6) |
| Structured fitment coverage | **63.4%** (137/216 with non-empty embedded `fitment`) | **0.0%** `fitment_makes`, **0.0%** `fitment_years`, **0.0%** `fitment_engines` |
| Avg fitment applications per SKU | **79.5** (pipe-delimited rows in embedded column) | **0** (no fitment data on any of the 6) |
| Universal items | 6 explicitly flagged | n/a (no flag) |

### SKU intersection: 0 of 216

**Zero overlap.** Tried matching ASAP `sku` (with AAIA suffix) and `mfg_original_sku` against BSD's `sku` column. Neither produced a single match. The two SKU universes are completely disjoint — this is not a normalization bug, the products are genuinely different.

| Side | Sample SKUs | SKU pattern |
|------|-------------|-------------|
| ASAP | `TST6-BDDP`, `TST4HP-BDDP`, `TST4-BDDP`, `9044CK-BDDP` | manufacturer SKU + `-BDDP` AAIA suffix |
| BSD (via APG) | `ACC7121A`, `ACC40116`, `ACC40200`, `ACC40111B` | `ACC` prefix + APG internal numbering |

### Brand normalization issue

BSD's 6 products are stored under the brand string **`Accell (Holley)`** — note the misspelling (two L's) and the parenthetical sub-label. ASAP's canonical brand string is `ACCEL`. The import script will need a brand-alias map to connect these:

```
"Accell (Holley)"  →  "ACCEL"  (aaia_brand_id=BDDP)
"Accel"            →  "ACCEL"
"ACCEL Performance"→  "ACCEL"
```

This is symptomatic of APG's keyword-parsed brand assignment — expect similar typos and parentheticals across the rest of the BSD catalog. Recommend building the alias map as a side product of the ASAP import (one entry per approved ASAP brand × variant strings found in BSD today).

### What BSD's 6 ACCEL products actually are

All 6 are ignition / electrical accessories (oil pressure gauge, starter switches, solenoids, tach pigtail) sourced from APG with the `Accell (Holley)` brand label. They are **not** part of ACCEL's ignition-kit product line that ASAP exports. Practical interpretation: BSD has effectively **no** real ACCEL catalog presence today — what's there is APG inventory that incidentally got tagged with an Accel-related brand string.

### Implications for the import (enrichment-only model)

**The import strategy is enrichment-only — ASAP data UPDATEs existing BSD products and never INSERTs new rows.** APG remains the single source of truth for catalog membership; ASAP layers richer fitment, imagery, MAP, and metadata onto rows BSD already carries. With that rule applied to today's ACCEL data:

1. **0 of 216 ASAP ACCEL SKUs will produce updates.** Zero SKU intersection means every row goes to the unmatched-SKU log, not the products table. ACCEL's ASAP data is effectively stranded until BSD's APG catalog grows into it.
2. **The unmatched log is the deliverable, not enriched products.** Two reasons it matters: (a) when APG later adds an ACCEL SKU that does match, an enrichment becomes possible without re-fetching from ASAP, and (b) a high unmatched rate is a signal that the matching strategy needs strengthening (e.g., trying UPC-based or fuzzy mfg_sku matching beyond exact equality).
3. **Brand alias map is still useful — for future matches.** Even with 0 overlaps today, the `Accell (Holley)` → `ACCEL` mapping prepares us for the case where APG starts carrying ASAP-mappable ACCEL SKUs. Build it now; don't wait for the first match.
4. **Quality observations still hold for sizing the eventual upside.** ASAP's 100% image / 63.4% structured fitment / avg 79.5 fitment apps per SKU describe what BSD products *will look like* once the SKU sets begin overlapping. They're a forecast of the enrichment ceiling, not a current state.

**Larger brands may tell a different story.** ACCEL is a small brand (216 SKUs in ASAP) and the SKU-pattern mismatch with APG is severe. Icon Vehicle Dynamics (2,111 ASAP SKUs), Holley Performance, and BD Diesel are likely to show much higher overlap rates with BSD's APG inventory. Run the same comparison against those before drawing conclusions about expected enrichment hit rate across the program.

### Caveat: ACCEL is a small sample

ACCEL is a small brand (216 SKUs in ASAP). Larger approved brands (Icon Vehicle Dynamics with 2,111 Truck/SUV SKUs) may show different overlap patterns with BSD's APG inventory. Recommend running the same comparison for Icon, Holley Performance, and BD Diesel before generalizing the "no SKU overlap" conclusion across all 25 approved brands.

---

## Summary for next steps

1. ~~Move existing 3 files into `tmp/asap-data/accel/` and `tmp/asap-data/bak/` per the new layout.~~ **Done** — files reorganized into per-brand subfolders.
2. ~~Run the manual SQL queries above to quantify the BSD-vs-ASAP quality gap on ACCEL.~~ **Done** — see "Quantitative quality comparison" section above.
3. Run the same comparison for Icon, Holley Performance, and BD Diesel to validate the "no SKU overlap" pattern.
4. Reach out to ASAP about the fitment file scope.
5. Build a brand-alias map (BSD brand string → ASAP canonical name + AAIA ID) for the 25 approved brands.
6. Write the schema migration adding the new columns.
7. Then — and only then — write `scripts/asap-import.js`. Use this doc as the design reference; the column mapping table is the contract.
