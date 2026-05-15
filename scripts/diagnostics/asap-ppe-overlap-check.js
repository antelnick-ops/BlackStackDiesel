// Read-only diagnostic: do BSD's PPE catalog and ASAP's brand_id 29425
// catalog share ANY matchable axis (SKU stem, UPC, or distinctive title
// tokens)? Output: tmp/asap-ppe-overlap.json with per-strategy match
// counts and sample matched/unmatched records for review.
//
// Decision rule (printed at the end):
//   - any > 0 via UPC   -> build UPC-based matcher
//   - any > 0 via SKU   -> PPE prefix-strip matcher viable
//   - any > 0 via title only -> consider fuzzy title matcher
//   - any == 0          -> abandon PPE enrichment via this import path

require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const ASAP_BASE = 'https://api.asapnetwork.org/webapi';
const PPE_BRAND_ID = '29425';
const OUT_PATH = path.join(process.cwd(), 'tmp', 'asap-ppe-overlap.json');
const CONCURRENCY = 5;
const DETAIL_PROGRESS_EVERY = 100;

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
  try { return JSON.parse(text); }
  catch { return { __error: 'non-JSON body', __body: text.slice(0, 300) }; }
}

async function loadBsdPpeProducts() {
  const PAGE = 1000;
  const out = [];
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from('products')
      .select('id, sku, mfg_sku, upc, product_name, brand')
      .ilike('brand', '%Pacific Performance%')
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw new Error('BSD load failed: ' + error.message);
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

// Strip the BSD `PPE` prefix to get the suspected mfg_sku stem.
function stripPpePrefix(sku) {
  if (!sku) return null;
  return sku.startsWith('PPE') ? sku.slice(3) : sku;
}

// Extract distinctive identifier-ish tokens from a product title.
// Targets digit runs >= 4 chars and alphanumeric model patterns
// (e.g. PPE116111220, FOX2.0). Excludes pure year-like 4-digit runs
// that aren't surrounded by other model context. We accept 4+ to cast
// a wide net; false positives surface in the report sample for review.
function extractTitleTokens(title) {
  if (!title) return new Set();
  const out = new Set();
  const upper = title.toUpperCase();
  const digitRuns = upper.match(/\d{4,}/g) || [];
  for (const r of digitRuns) out.add(r);
  const alnum = upper.match(/[A-Z]{2,}\d{2,}|\d{2,}[A-Z]{2,}/g) || [];
  for (const r of alnum) out.add(r);
  return out;
}

async function fetchDetailsConcurrent(skus) {
  const results = new Map();
  let cursor = 0;
  let completed = 0;

  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= skus.length) return;
      const sku = skus[idx];
      const detail = await asapFetch(`${ASAP_BASE}/product/${encodeURIComponent(sku)}`);
      results.set(sku, detail);
      completed++;
      if (completed % DETAIL_PROGRESS_EVERY === 0) {
        console.log(`   detail ${completed}/${skus.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  return results;
}

async function main() {
  console.log('=== ASAP / BSD PPE overlap check ===\n');

  console.log('1. Load BSD PPE products...');
  const bsdProducts = await loadBsdPpeProducts();
  console.log(`   BSD PPE products: ${bsdProducts.length}\n`);

  console.log(`2. Fetch ASAP PPE list (brand_id ${PPE_BRAND_ID})...`);
  const listResp = await asapFetch(
    `${ASAP_BASE}/products/${PPE_BRAND_ID}?type=${encodeURIComponent('Truck/SUV')}`
  );
  if (listResp.__error) {
    console.error('   List fetch failed:', listResp.__error, listResp.__body);
    process.exit(1);
  }
  const listField = listResp.products ?? listResp.data ?? listResp;
  const list = Array.isArray(listField) ? listField : Object.values(listField || {});
  console.log(`   ASAP PPE products listed: ${list.length}\n`);
  if (list.length === 0) {
    console.log('   No ASAP products to compare. Stopping.');
    return;
  }

  console.log(`3. Fetch detail for each ASAP product (concurrency ${CONCURRENCY})...`);
  const skus = list.map((p) => p.sku || p.SKU || p.id).filter(Boolean);
  const details = await fetchDetailsConcurrent(skus);
  console.log(`   detail fetches done: ${details.size}/${skus.length}\n`);

  // Build normalized ASAP records
  const asapRecords = [];
  let detailErrors = 0;
  for (const item of list) {
    const sku = item.sku || item.SKU || item.id;
    const detail = details.get(sku);
    if (!detail || detail.__error) {
      detailErrors++;
      asapRecords.push({
        asap_sku: sku,
        asap_mfg_sku: null,
        asap_upc: null,
        asap_title: item.title || null,
        detail_error: detail?.__error || 'no detail',
      });
      continue;
    }
    asapRecords.push({
      asap_sku: sku,
      asap_mfg_sku: detail.mfg_original_sku || null,
      asap_upc: detail.upc || null,
      asap_title: detail.title || item.title || null,
    });
  }
  if (detailErrors) console.log(`   (${detailErrors} detail fetches failed; counted as no-data)\n`);

  // BSD indexes
  const bsdBySkuStripped = new Map();
  const bsdByUpc = new Map();
  const bsdTitleIndex = []; // [{ row, tokens }]
  for (const row of bsdProducts) {
    const stripped = stripPpePrefix(row.sku);
    if (stripped) bsdBySkuStripped.set(stripped, row);
    if (row.upc) bsdByUpc.set(String(row.upc).trim(), row);
    bsdTitleIndex.push({ row, tokens: extractTitleTokens(row.product_name) });
  }

  console.log('4. Run match strategies...');
  const matches = { sku: [], upc: [], title: [] };
  for (const a of asapRecords) {
    if (a.asap_mfg_sku && bsdBySkuStripped.has(a.asap_mfg_sku)) {
      matches.sku.push({ asap: a, bsd: bsdBySkuStripped.get(a.asap_mfg_sku) });
    }
    if (a.asap_upc) {
      const key = String(a.asap_upc).trim();
      if (key && bsdByUpc.has(key)) {
        matches.upc.push({ asap: a, bsd: bsdByUpc.get(key) });
      }
    }
    if (a.asap_title) {
      const aTokens = extractTitleTokens(a.asap_title);
      if (aTokens.size > 0) {
        let found = null;
        let sharedToken = null;
        for (const { row, tokens } of bsdTitleIndex) {
          for (const t of aTokens) {
            if (tokens.has(t)) { found = row; sharedToken = t; break; }
          }
          if (found) break;
        }
        if (found) matches.title.push({ asap: a, bsd: found, shared: sharedToken });
      }
    }
  }

  const anyMatchSkus = new Set();
  for (const arr of Object.values(matches)) {
    for (const m of arr) anyMatchSkus.add(m.asap.asap_sku);
  }

  const noMatchSample = asapRecords
    .filter((a) => !anyMatchSkus.has(a.asap_sku))
    .slice(0, 10);

  const report = {
    checked_at: new Date().toISOString(),
    bsd_total: bsdProducts.length,
    asap_total: asapRecords.length,
    asap_with_mfg_sku: asapRecords.filter((a) => a.asap_mfg_sku).length,
    asap_with_upc: asapRecords.filter((a) => a.asap_upc).length,
    bsd_with_upc: bsdProducts.filter((r) => r.upc).length,
    detail_errors: detailErrors,
    match_counts: {
      sku: matches.sku.length,
      upc: matches.upc.length,
      title: matches.title.length,
      any: anyMatchSkus.size,
    },
    matches: {
      sku: matches.sku,
      upc: matches.upc,
      // Cap title matches to keep file readable; full count in match_counts.title
      title: matches.title.slice(0, 50),
    },
    asap_no_match_sample: noMatchSample,
    bsd_sample: bsdProducts.slice(0, 5),
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));

  console.log('');
  console.log('=== SUMMARY ===');
  console.log(`Total ASAP products      : ${report.asap_total}`);
  console.log(`Total BSD PPE products   : ${report.bsd_total}`);
  console.log(`ASAP with mfg_original_sku: ${report.asap_with_mfg_sku}`);
  console.log(`ASAP with upc            : ${report.asap_with_upc}`);
  console.log(`BSD with upc             : ${report.bsd_with_upc}`);
  console.log(`Detail fetch errors      : ${report.detail_errors}`);
  console.log('---');
  console.log(`Matches by SKU strategy  : ${matches.sku.length}`);
  console.log(`Matches by UPC strategy  : ${matches.upc.length}`);
  console.log(`Matches by title strategy: ${matches.title.length}`);
  console.log(`Products with ANY match  : ${anyMatchSkus.size}`);
  console.log('');
  console.log(`Report saved: ${path.relative(process.cwd(), OUT_PATH)}`);

  console.log('');
  if (anyMatchSkus.size === 0) {
    console.log('VERDICT: NO overlap on any axis. ASAP PPE catalog and BSD PPE catalog');
    console.log('         do not share a common product universe. Recommend abandoning');
    console.log('         PPE enrichment via the asap-import path.');
  } else if (matches.upc.length > 0) {
    console.log(`VERDICT: ${matches.upc.length} UPC matches. UPC-based matcher is viable.`);
  } else if (matches.sku.length > 0) {
    console.log(`VERDICT: ${matches.sku.length} SKU-strict matches. Prefix-strip matcher is viable.`);
  } else {
    console.log(`VERDICT: Only title-fuzzy matches (${matches.title.length}). Inspect samples`);
    console.log('         in the report before trusting — title overlap may be coincidental.');
  }
}

main().catch((err) => {
  console.error('FAIL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
