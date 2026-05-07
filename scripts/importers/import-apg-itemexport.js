require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { createClient } = require('@supabase/supabase-js');

const APG_VENDOR_ID = '013cd9a7-171e-45fe-9421-0320319dce33';
const FEED_PATH = path.join(process.cwd(), 'tmp', 'StandardExport.csv');
const DRY_RUN = true;
const CHUNK_SIZE = 500;
const CONCURRENCY = 50;

// Warehouses counted toward stock_qty. Matches import-apg-feed.js
// (NV + KY + WA + MFG). Texas and Shock Surplus are deliberately excluded
// so stock_qty doesn't drift based on which importer ran last; if we ever
// decide to include them, change both importers together.
const COUNTED_WAREHOUSES = [
  /^Nevada\b/i,
  /^Kentucky\b/i,
  /^Washington\b/i,
  /^(Manufacturer|MFG|Mfg)\b/i
];

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// =====================================================================
// HELPERS
// =====================================================================

function clean(value) {
  if (value === null || value === undefined) return null;
  let v = String(value).trim();
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) {
    v = v.slice(1, -1).trim();
  }
  if (!v.length) return null;
  if (v === 'NA' || v === 'N/A' || v === 'null' || v === 'NULL') return null;
  return v;
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).trim().replace(/[$,"]/g, '');
  if (!cleaned || cleaned === 'NA') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function roundMoney(n) {
  return Number(Number(n).toFixed(2));
}

function pickPrice(row) {
  const map = toNumber(row['Map']);
  const msrp = toNumber(row['MSRP']);
  const yourPrice = toNumber(row['Your Price']);
  const jobber = toNumber(row['JobberPrice']);
  if (map && map > 0) return roundMoney(map);
  if (msrp && msrp > 0) return roundMoney(msrp);
  if (yourPrice && yourPrice > 0) return roundMoney(yourPrice);
  if (jobber && jobber > 0) return roundMoney(jobber * 1.3);
  return 0;
}

// "Nevada Warehouse :0;Kentucky Warehouse :5;Texas Warehouse :2;..." → only
// counts segments matching COUNTED_WAREHOUSES (NV + KY + WA + MFG).
function parseStockQty(availability) {
  if (!availability || typeof availability !== 'string') return 0;
  let total = 0;
  for (const seg of availability.split(';')) {
    const trimmed = seg.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.lastIndexOf(':');
    if (colonIdx < 0) continue;
    const name = trimmed.slice(0, colonIdx).trim();
    if (!COUNTED_WAREHOUSES.some((re) => re.test(name))) continue;
    const n = parseInt(trimmed.slice(colonIdx + 1).trim(), 10);
    if (Number.isFinite(n) && n > 0) total += n;
  }
  return total;
}

async function fetchExistingApgSkus() {
  console.log('Fetching existing APG SKUs from BSD...');
  const skus = new Set();
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('sku')
      .eq('vendor_id', APG_VENDOR_ID)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const r of data) {
      if (r.sku) skus.add(r.sku);
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  console.log(`Loaded ${skus.size.toLocaleString()} existing APG SKUs from products table`);
  return skus;
}

// =====================================================================
// MAIN
// =====================================================================

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local');
  }
  if (!fs.existsSync(FEED_PATH)) {
    throw new Error(`Feed file not found: ${FEED_PATH}`);
  }

  console.log(`Reading feed: ${FEED_PATH}`);
  const csvText = fs.readFileSync(FEED_PATH, 'utf8');

  const rows = parse(csvText, {
    columns: true,
    delimiter: '|',
    skip_empty_lines: true,
    bom: true,
    relax_column_count: true,
    trim: true,
    quote: false
  });

  console.log(`Parsed ${rows.length.toLocaleString()} rows from ItemExport`);

  const existingSkus = await fetchExistingApgSkus();

  const stats = {
    total: rows.length,
    matched: 0,
    updated: 0,
    unmatched: 0,
    skipped: 0,
    errors: 0
  };
  const updates = [];

  for (const row of rows) {
    const sku = clean(row['Part Number']);
    if (!sku) { stats.skipped++; continue; }

    const price = pickPrice(row);
    if (price <= 0) { stats.skipped++; continue; }

    if (!existingSkus.has(sku)) { stats.unmatched++; continue; }

    stats.matched++;

    const stockQty = parseStockQty(row['Warehouse Availability']);
    const wholesale = toNumber(row['Your Price']);
    const map = toNumber(row['Map']);

    updates.push({
      sku,
      price,
      wholesale_price: wholesale && wholesale > 0 ? roundMoney(wholesale) : null,
      map_price: map && map > 0 ? roundMoney(map) : null,
      stock_qty: stockQty,
      in_stock: stockQty > 0
    });
  }

  console.log('\nFilter results:');
  console.log(`  total rows:    ${stats.total.toLocaleString()}`);
  console.log(`  matched (BSD): ${stats.matched.toLocaleString()}`);
  console.log(`  unmatched:     ${stats.unmatched.toLocaleString()}`);
  console.log(`  skipped:       ${stats.skipped.toLocaleString()} (no SKU or no price)`);
  console.log(`  → ${updates.length.toLocaleString()} updates queued`);

  if (DRY_RUN) {
    console.log('\nDRY RUN — no writes to Supabase.');
    console.log('\n=== 10 random samples ===');
    const shuffled = [...updates].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(10, shuffled.length); i++) {
      const u = shuffled[i];
      console.log(
        `${(i + 1).toString().padStart(2)}. ${u.sku.padEnd(20)} | price=$${u.price} ` +
        `| wholesale=$${u.wholesale_price ?? '—'} | map=$${u.map_price ?? '—'} | stock=${u.stock_qty}`
      );
    }
    const inStockCount = updates.filter((u) => u.in_stock).length;
    console.log(`\nIn stock: ${inStockCount.toLocaleString()} / ${updates.length.toLocaleString()}`);
    console.log(`\nWould update ${updates.length.toLocaleString()} products. Set DRY_RUN=false to write.`);
    return;
  }

  console.log(
    `\nWriting ${updates.length.toLocaleString()} updates in chunks of ${CHUNK_SIZE} ` +
    `(concurrency ${CONCURRENCY} per chunk)...`
  );
  const updatedAt = new Date().toISOString();

  for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
    const chunk = updates.slice(i, i + CHUNK_SIZE);

    for (let j = 0; j < chunk.length; j += CONCURRENCY) {
      const batch = chunk.slice(j, j + CONCURRENCY);
      const results = await Promise.all(
        batch.map((u) =>
          supabase
            .from('products')
            .update({
              price: u.price,
              wholesale_price: u.wholesale_price,
              map_price: u.map_price,
              stock_qty: u.stock_qty,
              in_stock: u.in_stock,
              updated_at: updatedAt
            })
            .eq('sku', u.sku)
            .eq('vendor_id', APG_VENDOR_ID)
        )
      );
      for (const { error } of results) {
        if (error) stats.errors++;
        else stats.updated++;
      }
    }

    console.log(
      `  ${Math.min(i + chunk.length, updates.length).toLocaleString()} / ` +
      `${updates.length.toLocaleString()} (errors so far: ${stats.errors})`
    );
  }

  console.log('\n=== APG ItemExport import complete ===');
  console.log(`  total rows:    ${stats.total.toLocaleString()}`);
  console.log(`  matched:       ${stats.matched.toLocaleString()}`);
  console.log(`  updated:       ${stats.updated.toLocaleString()}`);
  console.log(`  unmatched:     ${stats.unmatched.toLocaleString()}`);
  console.log(`  skipped:       ${stats.skipped.toLocaleString()} (no SKU or no price)`);
  console.log(`  errors:        ${stats.errors.toLocaleString()}`);
}

main().catch((err) => {
  console.error('❌ Import failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
