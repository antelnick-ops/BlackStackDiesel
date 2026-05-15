// Read-only diagnostic: why is fitment_makes sparse for PPE (39/567)
// while fitment_years (476) and fitment_engines (246) are much higher?
//
// Pulls one BSD PPE product WITH fitment_makes populated and one WITHOUT
// (but with fitment_engines), then fetches ASAP detail for both. Saves
// raw responses to tmp/ for inspection. Prints a side-by-side of:
//   - BSD product_name + description (the substrate parseFitment runs on)
//   - BSD fitment_makes / years / engines values
//   - BSD fitment_rows (ASAP-sourced structured fitment)
//   - ASAP detail.fitment field (raw from API)

require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const ASAP_BASE = 'https://api.asapnetwork.org/webapi';
const OUT_DIR = path.join(process.cwd(), 'tmp');

if (!process.env.ASAP_API_KEY) throw new Error('Missing ASAP_API_KEY in .env.local');
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local');
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function asapFetch(url) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.ASAP_API_KEY}`,
      Accept: 'application/json',
    },
  });
  const text = await res.text();
  if (!res.ok) return { __error: `HTTP ${res.status}`, __body: text.slice(0, 300) };
  try { return JSON.parse(text); } catch { return { __error: 'non-JSON', __body: text.slice(0, 300) }; }
}

async function pickWithMakes() {
  // Avoid array_length null parsing — use raw text search via .gt won't work for arrays.
  // Use .not('fitment_makes', 'is', null) and let JS filter for length > 0.
  const { data, error } = await supabase
    .from('products')
    .select('sku, product_name, description, fitment_makes, fitment_years, fitment_engines, fitment_rows')
    .ilike('brand', '%Pacific Performance%')
    .not('fitment_makes', 'is', null)
    .limit(50);
  if (error) throw new Error('with-makes pick failed: ' + error.message);
  const hit = (data || []).find((r) => Array.isArray(r.fitment_makes) && r.fitment_makes.length > 0);
  if (!hit) throw new Error('No PPE product found with non-empty fitment_makes');
  return hit;
}

async function pickWithoutMakes() {
  const { data, error } = await supabase
    .from('products')
    .select('sku, product_name, description, fitment_makes, fitment_years, fitment_engines, fitment_rows')
    .ilike('brand', '%Pacific Performance%')
    .not('fitment_engines', 'is', null)
    .limit(50);
  if (error) throw new Error('without-makes pick failed: ' + error.message);
  const hit = (data || []).find(
    (r) =>
      (!Array.isArray(r.fitment_makes) || r.fitment_makes.length === 0) &&
      Array.isArray(r.fitment_engines) &&
      r.fitment_engines.length > 0
  );
  if (!hit) throw new Error('No PPE product found with empty fitment_makes but non-empty fitment_engines');
  return hit;
}

function summariseBsd(label, row) {
  console.log(`\n=== BSD: ${label} (${row.sku}) ===`);
  console.log(`  product_name: ${row.product_name}`);
  console.log(`  description: ${(row.description || '').slice(0, 280)}${(row.description || '').length > 280 ? '…' : ''}`);
  console.log(`  fitment_makes: ${JSON.stringify(row.fitment_makes)}`);
  console.log(`  fitment_engines: ${JSON.stringify(row.fitment_engines)}`);
  console.log(`  fitment_years: ${JSON.stringify(row.fitment_years)}`);
  const rows = Array.isArray(row.fitment_rows) ? row.fitment_rows : [];
  console.log(`  fitment_rows count (ASAP-derived): ${rows.length}`);
  if (rows.length > 0) {
    const distinctMakes = Array.from(new Set(rows.map((r) => r.make).filter(Boolean))).sort();
    const distinctModels = Array.from(new Set(rows.map((r) => r.model).filter(Boolean))).sort();
    console.log(`  fitment_rows distinct makes: ${JSON.stringify(distinctMakes)}`);
    console.log(`  fitment_rows distinct models (first 5): ${JSON.stringify(distinctModels.slice(0, 5))}`);
    console.log(`  fitment_rows sample row[0]: ${JSON.stringify(rows[0])}`);
  }
}

function summariseAsapFitment(label, detail) {
  console.log(`\n=== ASAP detail.fitment: ${label} ===`);
  if (!detail || detail.__error) {
    console.log(`  (detail unavailable: ${detail?.__error || 'no detail'})`);
    return;
  }
  const f = detail.fitment;
  if (Array.isArray(f)) {
    console.log(`  type: array, length=${f.length}`);
    console.log(`  first row: ${JSON.stringify(f[0])}`);
    if (typeof f[0] === 'string') {
      const distinctMakes = new Set();
      for (const s of f) {
        const parts = String(s).split(',');
        if (parts[2]) distinctMakes.add(parts[2].trim());
      }
      console.log(`  distinct makes (parsed col[2]): ${JSON.stringify(Array.from(distinctMakes).sort())}`);
    } else if (f[0] && typeof f[0] === 'object') {
      const distinctMakes = new Set();
      for (const r of f) if (r.make) distinctMakes.add(r.make);
      console.log(`  distinct makes (object.make): ${JSON.stringify(Array.from(distinctMakes).sort())}`);
    }
  } else if (typeof f === 'string') {
    console.log(`  type: string, length=${f.length}, first 200 chars:`);
    console.log(`  ${f.slice(0, 200)}`);
    const distinctMakes = new Set();
    for (const s of f.split('|')) {
      const parts = s.split(',');
      if (parts[2]) distinctMakes.add(parts[2].trim());
    }
    console.log(`  distinct makes (parsed col[2]): ${JSON.stringify(Array.from(distinctMakes).sort())}`);
  } else {
    console.log(`  type: ${typeof f}, value: ${JSON.stringify(f)}`);
  }
}

async function main() {
  console.log('=== PPE fitment_makes sparseness investigation ===');

  console.log('\nStep 1: pick samples...');
  const [withMakes, withoutMakes] = await Promise.all([pickWithMakes(), pickWithoutMakes()]);
  console.log(`  with    makes: ${withMakes.sku}`);
  console.log(`  without makes: ${withoutMakes.sku}`);

  console.log('\nStep 2: fetch ASAP detail for each...');
  const [detailWith, detailWithout] = await Promise.all([
    asapFetch(`${ASAP_BASE}/product/${encodeURIComponent(withMakes.sku)}`),
    asapFetch(`${ASAP_BASE}/product/${encodeURIComponent(withoutMakes.sku)}`),
  ]);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'ppe-with-make.json'), JSON.stringify({ bsd: withMakes, asap_detail: detailWith }, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'ppe-without-make.json'), JSON.stringify({ bsd: withoutMakes, asap_detail: detailWithout }, null, 2));
  console.log('  saved tmp/ppe-with-make.json and tmp/ppe-without-make.json');

  summariseBsd('with makes', withMakes);
  summariseAsapFitment('with makes', detailWith);
  summariseBsd('without makes', withoutMakes);
  summariseAsapFitment('without makes', detailWithout);
}

main().catch((err) => {
  console.error('FAIL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
