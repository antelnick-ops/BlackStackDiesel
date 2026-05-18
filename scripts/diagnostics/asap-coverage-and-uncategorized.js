require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const PAGE = 1000;

async function fetchPaginated(builderFn, label) {
  const all = [];
  let from = 0;
  while (true) {
    const { data, error } = await builderFn().order('id').range(from, from + PAGE - 1);
    if (error) {
      console.error(`  [${label}] FETCH ERROR:`, error.message);
      throw error;
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

function hasNonEmptyExtras(extras) {
  return extras != null && typeof extras === 'object' && Object.keys(extras).length > 0;
}

async function main() {
  console.log('=== Phase C diagnostic: hybrid coverage + uncategorized brand probe ===\n');

  // ============================================================
  // Q6: asap_extras coverage by top-level category
  // ============================================================
  console.log('--- Q6: asap_extras coverage by top-level category ---');
  console.log('Filters: is_visible=true AND has_margin=true AND category IS NOT NULL');
  console.log('Fetching (paginated by 1000)...');
  const t6 = Date.now();
  const q6Rows = await fetchPaginated(
    () => supabase.from('products').select('category, asap_extras')
      .eq('is_visible', true)
      .eq('has_margin', true)
      .not('category', 'is', null),
    'Q6'
  );
  console.log(`Fetched ${q6Rows.length} rows in ${((Date.now() - t6) / 1000).toFixed(1)}s.\n`);

  const byCat6 = new Map();
  for (const r of q6Rows) {
    const cat = r.category;
    if (!byCat6.has(cat)) byCat6.set(cat, { total: 0, with_extras: 0, with_category_tags: 0 });
    const stats = byCat6.get(cat);
    stats.total++;
    if (hasNonEmptyExtras(r.asap_extras)) stats.with_extras++;
    if (r.asap_extras != null && typeof r.asap_extras === 'object' && 'category' in r.asap_extras) {
      stats.with_category_tags++;
    }
  }
  const sorted6 = [...byCat6.entries()]
    .map(([cat, s]) => ({
      category: cat,
      total_products: s.total,
      with_extras: s.with_extras,
      pct_coverage: s.total > 0 ? Math.round((s.with_extras / s.total) * 1000) / 10 : 0,
      with_category_tags: s.with_category_tags
    }))
    .sort((a, b) => b.pct_coverage - a.pct_coverage);

  console.log('category                              | total | extras | pct%  | cat_tags');
  console.log('-------------------------------------- | ----- | ------ | ----- | --------');
  for (const r of sorted6) {
    const cat = r.category.padEnd(38);
    const total = String(r.total_products).padStart(5);
    const extras = String(r.with_extras).padStart(6);
    const pct = (String(r.pct_coverage) + '%').padStart(5);
    const tags = String(r.with_category_tags).padStart(8);
    console.log(`${cat} | ${total} | ${extras} | ${pct} | ${tags}`);
  }
  console.log('');

  // ============================================================
  // Q7: subcategory tag distribution in diesel-perf categories
  // ============================================================
  console.log('--- Q7: asap_extras.category tag distribution for diesel-perf categories ---');
  const userRequested = ['Engine', 'Fuel System', 'Tuning', 'Exhaust', 'Cooling System', 'Air Intake', 'Air and Fuel Delivery', 'Emission Control', 'Ignition'];
  const allCatsInDb = new Set(q6Rows.map(r => r.category));
  const dieselCats = userRequested.filter(c => allCatsInDb.has(c));
  const skipped = userRequested.filter(c => !allCatsInDb.has(c));
  console.log(`Using categories present in DB: [${dieselCats.join(', ')}]`);
  console.log(`Skipped (not in DB per Q5/Q6 data): [${skipped.join(', ')}]`);
  console.log('Fetching (paginated)...');
  const t7 = Date.now();
  const q7Rows = await fetchPaginated(
    () => supabase.from('products').select('category, asap_extras')
      .eq('is_visible', true)
      .eq('has_margin', true)
      .in('category', dieselCats)
      .not('asap_extras', 'is', null),
    'Q7'
  );
  console.log(`Fetched ${q7Rows.length} rows in ${((Date.now() - t7) / 1000).toFixed(1)}s.`);
  const q7WithTags = q7Rows.filter(r => r.asap_extras && typeof r.asap_extras === 'object' && Array.isArray(r.asap_extras.category));
  console.log(`Of those, ${q7WithTags.length} have asap_extras.category as an array.\n`);

  const tagFreq = new Map();
  for (const r of q7WithTags) {
    for (const tag of r.asap_extras.category) {
      const key = r.category + '||' + String(tag);
      tagFreq.set(key, (tagFreq.get(key) || 0) + 1);
    }
  }
  const byCat7 = new Map();
  for (const [k, n] of tagFreq.entries()) {
    const sep = k.indexOf('||');
    const cat = k.slice(0, sep);
    const tag = k.slice(sep + 2);
    if (!byCat7.has(cat)) byCat7.set(cat, []);
    byCat7.get(cat).push({ tag, n });
  }
  const sortedCats7 = [...byCat7.keys()].sort();
  console.log('category | tag | n');
  console.log('-------- | --- | ---');
  for (const cat of sortedCats7) {
    const tags = byCat7.get(cat).sort((a, b) => b.n - a.n);
    for (const { tag, n } of tags) {
      console.log(`  ${cat} | ${tag} | ${n}`);
    }
  }
  if (sortedCats7.length === 0) {
    console.log('  (no rows with asap_extras.category arrays in diesel categories)');
  }
  console.log('');

  // ============================================================
  // Q8: brand breakdown of uncategorized products (top 50)
  // ============================================================
  console.log('--- Q8: brand breakdown of uncategorized products (top 50 by count) ---');
  console.log('Filters: is_visible=true AND has_margin=true AND category IS NULL');
  console.log('Fetching (paginated)...');
  const t8 = Date.now();
  const q8Rows = await fetchPaginated(
    () => supabase.from('products').select('brand, asap_extras, image_url, image_urls, price, stock_qty')
      .eq('is_visible', true)
      .eq('has_margin', true)
      .is('category', null),
    'Q8'
  );
  console.log(`Fetched ${q8Rows.length} uncategorized rows in ${((Date.now() - t8) / 1000).toFixed(1)}s.\n`);

  const byBrand = new Map();
  for (const r of q8Rows) {
    const b = r.brand || '(null brand)';
    if (!byBrand.has(b)) byBrand.set(b, { count: 0, asap_enriched: 0, has_image: 0, price_sum: 0, price_count: 0, stock_sum: 0 });
    const stats = byBrand.get(b);
    stats.count++;
    if (hasNonEmptyExtras(r.asap_extras)) stats.asap_enriched++;
    const hasImg = (r.image_url != null && r.image_url !== '') || (Array.isArray(r.image_urls) && r.image_urls.length > 0);
    if (hasImg) stats.has_image++;
    const p = typeof r.price === 'number' ? r.price : (r.price != null ? parseFloat(r.price) : NaN);
    if (!isNaN(p)) { stats.price_sum += p; stats.price_count++; }
    if (typeof r.stock_qty === 'number') stats.stock_sum += r.stock_qty;
    else if (r.stock_qty != null) { const s = parseInt(r.stock_qty, 10); if (!isNaN(s)) stats.stock_sum += s; }
  }
  const sorted8 = [...byBrand.entries()]
    .map(([brand, s]) => ({
      brand,
      uncategorized_products: s.count,
      asap_enriched: s.asap_enriched,
      has_image: s.has_image,
      avg_price: s.price_count > 0 ? Math.round((s.price_sum / s.price_count) * 100) / 100 : null,
      total_stock_qty: s.stock_sum
    }))
    .sort((a, b) => b.uncategorized_products - a.uncategorized_products)
    .slice(0, 50);

  console.log('brand                                  | uncat | enriched | image | avg_price | stock');
  console.log('-------------------------------------- | ----- | -------- | ----- | --------- | -----');
  for (const r of sorted8) {
    const b = (r.brand || '').padEnd(38).slice(0, 38);
    const u = String(r.uncategorized_products).padStart(5);
    const e = String(r.asap_enriched).padStart(8);
    const i = String(r.has_image).padStart(5);
    const ap = (r.avg_price != null ? String(r.avg_price) : 'null').padStart(9);
    const st = String(r.total_stock_qty).padStart(5);
    console.log(`${b} | ${u} | ${e} | ${i} | ${ap} | ${st}`);
  }
  console.log('');

  // ============================================================
  // Q9: high-value uncategorized products (price > 500, top 30)
  // ============================================================
  console.log('--- Q9: high-value uncategorized products (price > 500, top 30 by price DESC) ---');
  const t9 = Date.now();
  const { data: q9Rows, error: e9 } = await supabase
    .from('products')
    .select('brand, product_name, price, stock_qty')
    .eq('is_visible', true)
    .eq('has_margin', true)
    .is('category', null)
    .gt('price', 500)
    .order('price', { ascending: false })
    .limit(30);
  if (e9) throw e9;
  console.log(`Fetched ${q9Rows.length} rows in ${((Date.now() - t9) / 1000).toFixed(1)}s.\n`);
  console.log('brand | product_name | price | stock_qty');
  console.log('----- | ------------ | ----- | --------');
  for (const r of q9Rows) {
    console.log(`  ${r.brand} | ${r.product_name} | ${r.price} | ${r.stock_qty}`);
  }
}

main().catch((err) => {
  console.error('FAIL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
