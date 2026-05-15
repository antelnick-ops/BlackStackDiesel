require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const LINECARD_PATH = path.join(process.cwd(), 'data', 'asap-linecard.txt');
const OUT_JSON = path.join(process.cwd(), 'tmp', 'bsd-vs-asap-linecard.json');
const OUT_MD = path.join(process.cwd(), 'docs', 'BSD_VS_ASAP_LINECARD.md');
const PAGE_SIZE = 1000;

// BSD's currently-approved brands (subset of the line card BSD's API key can pull today).
// 25 from docs/ASAP_DATA_INSPECTION.md probe 2026-04-28, plus 3 added 2026-05-15
// from the ASAP dashboard: Choate, PPE, Crown Automotive.
// Keys MUST match the normalize() form of the line-card brand spelling.
const APPROVED_BRANDS_SET = new Set([
  'diablo sport',          // line card: "Diablo Sport"
  'holley',                // line card: "Holley" (not "Holley Performance")
  'rock krawler',
  'usa standard gear',
  'yukon gear & axle',     // line card uses ampersand
  'rigid',
  'skyjacker',
  'ez lynk',
  'icon vehicle dynamics',
  'bds suspension',
  'fox factory',
  'bd diesel',
  'bilstein',
  'edge products',
  'accel',
  'bak',
  'go rhino',
  'superlift',
  'nfab',
  'extang',
  'lund',
  'carli suspension',
  'rugged ridge',
  'retrax',
  'undercover',
  // Added 2026-05-15
  'choate performance',
  'pacific performance engineering',
  'crown automotive'
]);

// Manual aliases for BSD brand strings that don't trivially match the line card.
// Lowercased keys.
const ALIASES = {
  'accell (holley)': 'ACCEL',
  'holley': 'Holley',
  'holley performance products': 'Holley',
  'icon suspension (randys)': 'Icon Vehicle Dynamics',
  'bds suspension (fox)': 'BDS Suspension',
  'fox': 'Fox Factory',
  'fox racing shox': 'Fox Factory',
  'bd diesel performance': 'BD Diesel',
  'diablosport (holley)': 'Diablo Sport',
  'diablo sport (holley)': 'Diablo Sport',
  'diabloSport': 'Diablo Sport',
  'rigid industries': 'RIGID',
  'skyjacker suspension': 'Skyjacker',
  'skyjacker suspensions': 'Skyjacker',
  'usa standard (randys)': 'USA Standard Gear',
  'usa standard gear (randys)': 'USA Standard Gear',
  'yukon gear and axle (randys)': 'Yukon Gear & Axle',
  'yukon gear & axle (randys)': 'Yukon Gear & Axle',
  'yukon gear and axle': 'Yukon Gear & Axle',
  'bak industries': 'BAK',
  'n-fab': 'NFab',
  'n-fab (real truck)': 'NFab',
  'go rhino (real truck)': 'Go Rhino',
  'lund international': 'Lund',
  'lund (real truck)': 'Lund',
  'rugged ridge (real truck)': 'Rugged Ridge',
  'undercover inc (real truck)': 'UnderCover',
  'undercover inc': 'UnderCover',
  'rock krawler suspension': 'Rock Krawler',
  'rock-krawler': 'Rock Krawler',
  'carli suspension (randys)': 'Carli Suspension',
  'superlift (real truck)': 'Superlift',
  'extang (real truck)': 'Extang',
  'retrax (real truck)': 'Retrax',
  'edge products (holley)': 'Edge Products',
  // Brands on the line card under slightly different naming:
  'pacific performance engineerin': 'Pacific Performance Engineering',
  'ppe': 'Pacific Performance Engineering',
  'zumbrota (randys)': 'Zumbrota Drivetrain',
  'zumbrota drivetrain': 'Zumbrota Drivetrain',
  'fass': 'Fass Fuel',
  'fass fuel systems': 'Fass Fuel',
  'fass fuel system': 'Fass Fuel',
  'msd': 'MSD Ignition',
  'msd ignition': 'MSD Ignition',
  'diamond eye': 'Diamond Eye Performance',
  'diamond eye performance': 'Diamond Eye Performance',
  'cognito motorsports': 'Cognito Motorsports Truck',
  'cognito motorsports (randys)': 'Cognito Motorsports Truck',
  'banks': 'Banks Power',
  'banks engineering': 'Banks Power',
  'corsa performance': 'Corsa',
  'fleece': 'Fleece Performance',
  'mbrp': 'MBRP Exhaust',
  'no limit': 'No Limit Fabrication',
  'xdp': 'XDP Xtreme Diesel Performance',
  'sct': 'SCT Performance',
  'amp': 'AMP Research',
  'amp research power steps': 'AMP Research',
  'baja designs lighting': 'Baja Designs',
  'leer covers': 'LEER',
  'truxedo': 'Trxedo',
  'rough country suspension': 'Rough Country'
};

function normalize(s) {
  if (!s) return '';
  return String(s).trim().toLowerCase().replace(/\s+/g, ' ');
}

function stripCommonSuffixes(norm) {
  let out = norm.replace(/\s*\([^)]*\)\s*$/g, '').trim();
  out = out.replace(/\s+(suspension|suspensions|industries|automotive|performance|products|inc\.?|llc|corp\.?|systems|fabrication|fab|mfg|usa|company|co\.?)$/i, '').trim();
  out = out.replace(/[.,]/g, '').trim();
  return out;
}

function loadLineCard() {
  const text = fs.readFileSync(LINECARD_PATH, 'utf8');
  const brands = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const byNorm = new Map(); // normalized line-card-brand -> canonical line-card brand
  for (const b of brands) {
    byNorm.set(normalize(b), b);
  }
  return { brands, byNorm };
}

function canonicalize(rawBrand, linecard) {
  const norm = normalize(rawBrand);
  if (!norm) return null;

  if (ALIASES[norm]) return ALIASES[norm];

  const stripped = stripCommonSuffixes(norm);
  if (ALIASES[stripped]) return ALIASES[stripped];

  if (linecard.byNorm.has(norm)) return linecard.byNorm.get(norm);
  if (linecard.byNorm.has(stripped)) return linecard.byNorm.get(stripped);

  // Last-resort: line-card brand whose full normalized form is a prefix of the BSD brand
  // (e.g. "skyjacker suspension" starts with "skyjacker "). Do NOT match against stripped
  // line-card forms — that collapses unrelated brands (Crown Automotive vs Crown Performance).
  for (const [lcNorm, canonical] of linecard.byNorm) {
    if (!lcNorm) continue;
    if (norm.startsWith(lcNorm + ' ')) return canonical;
  }
  return null;
}

async function fetchBsdBrands(supabase) {
  const all = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('products')
      .select('id, brand, price')
      .eq('status', 'active')
      .eq('is_visible', true)
      .not('brand', 'is', null)
      .not('brand', 'ilike', '%inactive%')
      .order('id')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Supabase fetch failed: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    process.stdout.write(`\r  Fetched ${all.length} BSD products...`);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  process.stdout.write('\n');
  return all;
}

function tally(products, linecard) {
  const byBrand = new Map();
  for (const p of products) {
    const raw = p.brand;
    if (!byBrand.has(raw)) {
      const canonical = canonicalize(raw, linecard);
      byBrand.set(raw, {
        raw_brand: raw,
        canonical_brand: canonical,
        on_linecard: !!canonical,
        approved_today: canonical ? APPROVED_BRANDS_SET.has(normalize(canonical)) : false,
        sku_count: 0,
        price_sum: 0,
        price_count: 0
      });
    }
    const e = byBrand.get(raw);
    e.sku_count += 1;
    const price = Number(p.price);
    if (Number.isFinite(price) && price > 0) {
      e.price_sum += price;
      e.price_count += 1;
    }
  }
  const result = [];
  for (const e of byBrand.values()) {
    result.push({
      ...e,
      avg_price: e.price_count > 0 ? Number((e.price_sum / e.price_count).toFixed(2)) : 0
    });
  }
  result.sort((a, b) => b.sku_count - a.sku_count);
  return result;
}

function buildReport(linecard, products, tallied) {
  const today = new Date().toISOString().slice(0, 10);
  const onLinecard = tallied.filter((b) => b.on_linecard);
  const offLinecard = tallied.filter((b) => !b.on_linecard);
  const approvedToday = onLinecard.filter((b) => b.approved_today);
  const onLinecardNotApproved = onLinecard.filter((b) => !b.approved_today);

  const totalSkus = products.length;
  const skusOnLinecard = onLinecard.reduce((s, b) => s + b.sku_count, 0);
  const skusApprovedToday = approvedToday.reduce((s, b) => s + b.sku_count, 0);
  const skusOnLinecardNotApproved = onLinecardNotApproved.reduce((s, b) => s + b.sku_count, 0);
  const skusOffLinecard = offLinecard.reduce((s, b) => s + b.sku_count, 0);

  // Reverse view: ASAP line-card brands BSD doesn't carry today
  const carriedCanonical = new Set(
    onLinecard.map((b) => b.canonical_brand)
  );
  const linecardNotCarried = linecard.brands.filter((b) => !carriedCanonical.has(b));

  const lines = [];
  lines.push('# BSD Brands vs ASAP Line Card');
  lines.push('');
  lines.push(`_Generated ${today}. BSD source: Supabase \`products\` (active + visible). ASAP source: full line card at https://www.asapnetwork.org/brands (${linecard.brands.length} brands, cached at \`data/asap-linecard.txt\`)._`);
  lines.push('');
  lines.push('## Headline');
  lines.push('');
  lines.push(`- **BSD active SKUs:** ${totalSkus.toLocaleString()} across **${tallied.length}** distinct brand strings`);
  lines.push(`- **BSD SKUs whose brand IS on the ASAP line card:** ${skusOnLinecard.toLocaleString()} (${((skusOnLinecard / totalSkus) * 100).toFixed(1)}%) — ${onLinecard.length} BSD brands`);
  lines.push(`  - Already approved (data pullable today): ${skusApprovedToday.toLocaleString()} SKUs / ${approvedToday.length} brands`);
  lines.push(`  - **Authorization gap — on line card but not approved yet:** ${skusOnLinecardNotApproved.toLocaleString()} SKUs / ${onLinecardNotApproved.length} brands`);
  lines.push(`- **BSD SKUs whose brand is NOT on the ASAP line card:** ${skusOffLinecard.toLocaleString()} (${((skusOffLinecard / totalSkus) * 100).toFixed(1)}%) — ${offLinecard.length} BSD brands`);
  lines.push(`- **ASAP line-card brands BSD doesn't carry:** ${linecardNotCarried.length}`);
  lines.push('');

  lines.push('## 1. BSD brands on ASAP line card but not approved yet (request next)');
  lines.push('');
  lines.push('Biggest ROI for new ASAP authorization requests — ASAP rep already covers these brands, BSD just needs to get on the list.');
  lines.push('');
  lines.push('| Rank | BSD Raw Brand | ASAP Canonical | BSD SKUs | Avg Price |');
  lines.push('|------|---------------|----------------|----------|-----------|');
  onLinecardNotApproved.slice(0, 50).forEach((b, i) => {
    lines.push(`| ${i + 1} | ${b.raw_brand} | ${b.canonical_brand} | ${b.sku_count.toLocaleString()} | $${b.avg_price.toFixed(2)} |`);
  });
  lines.push('');

  lines.push('## 2. BSD brands already approved on ASAP');
  lines.push('');
  lines.push('Re-pull these CSVs to begin enrichment — APG remains catalog truth, ASAP layers fitment/imagery/MAP.');
  lines.push('');
  lines.push('| BSD Raw Brand | ASAP Canonical | BSD SKUs |');
  lines.push('|---------------|----------------|----------|');
  approvedToday.forEach((b) => {
    lines.push(`| ${b.raw_brand} | ${b.canonical_brand} | ${b.sku_count.toLocaleString()} |`);
  });
  lines.push('');

  lines.push('## 3. Top 50 BSD brands NOT on ASAP line card');
  lines.push('');
  lines.push('Authentic data for these would have to come from somewhere other than ASAP (direct manufacturer relationships, alternative data networks, or APG enrichment).');
  lines.push('');
  lines.push('| Rank | BSD Brand | BSD SKUs | Avg Price |');
  lines.push('|------|-----------|----------|-----------|');
  offLinecard.slice(0, 50).forEach((b, i) => {
    lines.push(`| ${i + 1} | ${b.raw_brand} | ${b.sku_count.toLocaleString()} | $${b.avg_price.toFixed(2)} |`);
  });
  lines.push('');

  lines.push('## 4. ASAP line-card brands BSD doesn\'t carry');
  lines.push('');
  lines.push('These exist in ASAP\'s rep universe but BSD has zero products under any matching brand string. Some are diesel-relevant (XDP, HSP Diesel, Banks Power) and could be sourcing targets; many are off-road or gas-only and not relevant to diesel-truck focus.');
  lines.push('');
  lines.push('Total: ' + linecardNotCarried.length);
  lines.push('');
  lines.push('<details>');
  lines.push('<summary>Show all</summary>');
  lines.push('');
  for (const b of linecardNotCarried) lines.push(`- ${b}`);
  lines.push('');
  lines.push('</details>');
  lines.push('');

  lines.push('## Notes');
  lines.push('');
  lines.push('- The line card was scraped on ' + today + ' and may shift as ASAP adds/removes brands. Re-fetch periodically.');
  lines.push('- Canonical matching uses an alias map + suffix-strip heuristic. False negatives are likely for brand strings APG mangles uniquely (e.g. typos, vendor prefixes). Inspect the "NOT on ASAP line card" table for plausible matches and extend `ALIASES` in `scripts/diagnostics/bsd-vs-asap-linecard.js` to fix.');
  lines.push('- "Approved today" = the 25 brands listed in `docs/ASAP_DATA_INSPECTION.md` (probed 2026-04-28). If ASAP has approved more since, update `APPROVED_BRANDS_SET`.');
  lines.push('- BSD\'s catalog is already filtered to diesel-truck applications via APG sourcing, so this comparison answers the diesel-relevance question implicitly — every BSD brand listed below has at least one diesel-targeted SKU.');
  return lines.join('\n');
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local');
  }

  console.log('STEP 1: Load ASAP line card');
  const linecard = loadLineCard();
  console.log(`  ${linecard.brands.length} brands loaded from ${path.relative(process.cwd(), LINECARD_PATH)}`);

  console.log('\nSTEP 2: Fetch BSD products');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const products = await fetchBsdBrands(supabase);
  console.log(`  Total BSD products: ${products.length.toLocaleString()}`);

  console.log('\nSTEP 3: Tally & match');
  const tallied = tally(products, linecard);
  console.log(`  Distinct BSD brand strings: ${tallied.length}`);
  console.log(`  On ASAP line card:         ${tallied.filter((b) => b.on_linecard).length}`);
  console.log(`  Off ASAP line card:        ${tallied.filter((b) => !b.on_linecard).length}`);

  console.log('\nSTEP 4: Write outputs');
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify({
    runAt: new Date().toISOString(),
    linecardBrandCount: linecard.brands.length,
    bsdProductCount: products.length,
    bsdBrandCount: tallied.length,
    byBrand: tallied
  }, null, 2));
  console.log(`  Wrote ${path.relative(process.cwd(), OUT_JSON)}`);

  const md = buildReport(linecard, products, tallied);
  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true });
  fs.writeFileSync(OUT_MD, md);
  console.log(`  Wrote ${path.relative(process.cwd(), OUT_MD)}`);
}

main().catch((err) => {
  console.error('FAIL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
