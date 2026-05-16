require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function count(q) {
  const { count, error } = await q;
  if (error) throw error;
  return count;
}

async function main() {
  console.log('=== Fitment leak audit ===\n');

  const baseQuery = () =>
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('is_visible', true);

  const totalActive = await count(baseQuery());
  console.log(`Total active+visible products: ${totalActive.toLocaleString()}\n`);

  // Scope check 1: products missing fitment fields
  console.log('--- Scope 1: missing fitment data ---');
  const noMakes = await count(baseQuery().or('fitment_makes.is.null,fitment_makes.eq.{}'));
  const noEngines = await count(baseQuery().or('fitment_engines.is.null,fitment_engines.eq.{}'));
  const noYears = await count(baseQuery().or('fitment_years.is.null,fitment_years.eq.{}'));
  const noneAtAll = await count(
    baseQuery()
      .or('fitment_makes.is.null,fitment_makes.eq.{}')
      .or('fitment_engines.is.null,fitment_engines.eq.{}')
      .or('fitment_years.is.null,fitment_years.eq.{}')
  );
  console.log(`  no_makes:   ${noMakes.toLocaleString()} (${((noMakes / totalActive) * 100).toFixed(1)}%)`);
  console.log(`  no_engines: ${noEngines.toLocaleString()} (${((noEngines / totalActive) * 100).toFixed(1)}%)`);
  console.log(`  no_years:   ${noYears.toLocaleString()} (${((noYears / totalActive) * 100).toFixed(1)}%)`);
  console.log(`  no fitment data at all: ${noneAtAll.toLocaleString()} (${((noneAtAll / totalActive) * 100).toFixed(1)}%)\n`);

  // Scope check 2: multi-make products
  console.log('--- Scope 2: multi-make products ---');
  // Need raw fetch since PostgREST doesn't expose array_length easily.
  // Use RPC fallback or paged read.
  const PAGE = 1000;
  let from = 0;
  const counts = { multi: 0, threePlus: 0, fivePlus: 0 };
  const sampleMulti = [];
  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('sku, product_name, brand, fitment_makes, fitment_engines, fitment_years')
      .eq('status', 'active')
      .eq('is_visible', true)
      .not('fitment_makes', 'is', null)
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const p of data) {
      const m = Array.isArray(p.fitment_makes) ? p.fitment_makes.length : 0;
      if (m > 1) counts.multi += 1;
      if (m >= 3) counts.threePlus += 1;
      if (m >= 5) counts.fivePlus += 1;
      if (m >= 3 && sampleMulti.length < 5) sampleMulti.push(p);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  console.log(`  >=2 makes:  ${counts.multi.toLocaleString()}`);
  console.log(`  >=3 makes:  ${counts.threePlus.toLocaleString()}`);
  console.log(`  >=5 makes:  ${counts.fivePlus.toLocaleString()}`);
  console.log(`\n  Sample 3+make products:`);
  for (const p of sampleMulti) {
    console.log(`    ${p.sku} | ${(p.product_name || '').slice(0, 70)}`);
    console.log(`      brand=${p.brand} | makes=[${p.fitment_makes.join(', ')}]`);
    console.log(`      engines=[${(p.fitment_engines || []).join(', ')}]`);
  }

  // Scope check 3: simulate the actual filter behavior
  console.log('\n--- Scope 3: simulate the live filter (Ford F-250 7.3L 2001) ---');
  console.log('  The live UI applies ONLY .contains(fitment_years, [2001]) when vehicle');
  console.log('  is selected without a search term. Let\'s count what that returns.');

  const { count: yearOnlyCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .eq('is_visible', true)
    .contains('fitment_years', [2001]);
  console.log(`  Products visible under year=2001 filter alone: ${yearOnlyCount.toLocaleString()}`);

  // Now: of those, how many are NOT a Ford?
  const { count: yearNotFord } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .eq('is_visible', true)
    .contains('fitment_years', [2001])
    .not('fitment_makes', 'cs', '{Ford}');
  console.log(`  Of those, not flagged as Ford: ${yearNotFord.toLocaleString()}`);
  console.log(`  → these ${yearNotFord.toLocaleString()} products leak into a Ford 2001 vehicle filter.`);

  // Show samples of the leak
  console.log('\n  Sample leaking SKUs (year=2001 returned but Ford NOT in fitment_makes):');
  const { data: leakSample } = await supabase
    .from('products')
    .select('sku, product_name, brand, fitment_makes, fitment_engines, fitment_years, fitment_text')
    .eq('status', 'active')
    .eq('is_visible', true)
    .contains('fitment_years', [2001])
    .not('fitment_makes', 'cs', '{Ford}')
    .limit(10);
  for (const p of (leakSample || [])) {
    console.log(`\n    ${p.sku} | ${(p.product_name || '').slice(0, 80)}`);
    console.log(`      brand=${p.brand}`);
    console.log(`      makes=[${(p.fitment_makes || []).join(', ')}]`);
    console.log(`      engines=[${(p.fitment_engines || []).join(', ')}]`);
    console.log(`      years=[${(p.fitment_years || []).slice(0, 10).join(', ')}${(p.fitment_years || []).length > 10 ? ', ...' : ''}]`);
    if (p.fitment_text) console.log(`      fitment_text="${p.fitment_text.slice(0, 100)}"`);
  }

  // Scope check 4: empty-fitment behavior
  console.log('\n--- Scope 4: do empty-fitment products leak? ---');
  const { count: emptyYears2001 } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .eq('is_visible', true)
    .eq('fitment_years', '{}')
    .contains('fitment_years', [2001]);
  console.log(`  Products with fitment_years='{}' that pass year=2001 contains: ${emptyYears2001}`);
  console.log(`  (should be 0 — PostgreSQL @> on empty arrays returns false)`);
}

main().catch((err) => {
  console.error('FAIL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
