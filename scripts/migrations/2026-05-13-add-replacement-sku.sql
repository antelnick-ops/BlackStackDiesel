-- Replacement SKU column for APG discontinued products.
-- Populated by scripts/importers/import-apg-feed.js when the description
-- contains "***Superseded to <SKU>***" or "*USE: <SKU>*".

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS replacement_sku TEXT;

CREATE INDEX IF NOT EXISTS idx_products_replacement_sku
  ON products(replacement_sku)
  WHERE replacement_sku IS NOT NULL;

-- PostgREST caches the schema; without this the next upsert that
-- references replacement_sku will fail with PGRST204.
NOTIFY pgrst, 'reload schema';
