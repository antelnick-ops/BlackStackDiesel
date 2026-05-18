require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const PAGE = 1000;

async function fetchAllActive(selectCols) {
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select(selectCols)
      .eq('status', 'active')
      .eq('is_visible', true)
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function main() {
  console.log('=== ASAP category / subcategory derivation probe ===\n');

  console.log('Fetching all active+visible products (paginated by 1000)...');
  const t0 = Date.now();
  const all = await fetchAllActive('sku, brand, category, asap_extras');
  console.log(`Fetched ${all.length} products in ${((Date.now() - t0) / 1000).toFixed(1)}s.\n`);

  const withCategory = all.filter(p => p.category != null && p.category !== '');
  const withAsap = all.filter(p => p.asap_extras != null && typeof p.asap_extras === 'object');
  console.log(`Products with non-empty category: ${withCategory.length}`);
  console.log(`Products with object-shaped asap_extras: ${withAsap.length}\n`);

  // Q1
  console.log('--- Q1: 5 sample rows from distinct categories (asap_extras structure) ---');
  const byCategory = new Map();
  for (const row of withAsap) {
    if (row.category && !byCategory.has(row.category) && byCategory.size < 5) {
      byCategory.set(row.category, row);
    }
  }
  const samples = [...byCategory.values()];
  console.log(`Selected ${samples.length} samples from distinct categories:\n`);
  for (const row of samples) {
    console.log(`  CATEGORY: ${row.category}`);
    console.log(`  SKU: ${row.sku}`);
    console.log(`  BRAND: ${row.brand}`);
    console.log('  asap_extras:');
    console.log(JSON.stringify(row.asap_extras, null, 2).split('\n').map(l => '    ' + l).join('\n'));
    console.log('');
  }

  // Q2
  console.log('--- Q2: distinct top-level keys in asap_extras (across all rows) ---');
  const keyFrequency = new Map();
  for (const row of withAsap) {
    for (const key of Object.keys(row.asap_extras)) {
      keyFrequency.set(key, (keyFrequency.get(key) || 0) + 1);
    }
  }
  const sortedKeys = [...keyFrequency.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`Distinct top-level keys across ${withAsap.length} rows with asap_extras (count, pct, key):`);
  for (const [key, count] of sortedKeys) {
    const pct = ((count / withAsap.length) * 100).toFixed(1);
    console.log(`  ${count.toString().padStart(6)} (${pct.padStart(5)}%)  ${key}`);
  }
  console.log('');

  // Q3
  console.log('--- Q3: categories containing delimiters (/, >, |, ,) ---');
  const distinctCats = new Set();
  for (const row of withCategory) distinctCats.add(row.category);
  const delimiters = ['/', '>', '|', ','];
  for (const d of delimiters) {
    const matching = [...distinctCats].filter(c => c.includes(d));
    console.log(`  '${d}': ${matching.length} distinct categories contain this delimiter`);
    if (matching.length > 0) {
      const show = Math.min(matching.length, 10);
      console.log(`    first ${show} examples:`);
      for (const c of matching.slice(0, show)) {
        console.log(`      ${c}`);
      }
    }
  }
  console.log('');

  // Q4
  console.log('--- Q4: total distinct category values ---');
  console.log(`  ${distinctCats.size} distinct categories (active+visible products)\n`);

  // Q5
  console.log('--- Q5: top 20 most common categories (by product count) ---');
  const catFrequency = new Map();
  for (const row of withCategory) {
    catFrequency.set(row.category, (catFrequency.get(row.category) || 0) + 1);
  }
  const sortedCats = [...catFrequency.entries()].sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of sortedCats.slice(0, 20)) {
    console.log(`  ${count.toString().padStart(6)}  ${cat}`);
  }
}

main().catch((err) => {
  console.error('FAIL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
