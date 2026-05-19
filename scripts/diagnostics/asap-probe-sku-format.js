// =====================================================================
// asap-probe-sku-format.js
// =====================================================================
// READ-ONLY diagnostic. For each target brand:
//   1. List call: GET /webapi/products/{brand_id}?type=Truck/SUV
//   2. Take first 5 list SKUs.
//   3. For each, GET /webapi/product/{list-sku} for detail.
//   4. Compare normalizeAsapSku(list-sku) vs detail.mfg_original_sku.
// Verdict: list-mode works (all match) vs needs match_via: 'detail'.
//
// Confirms or rules out the PPE-pattern (list-sku stem is internal ID,
// not manufacturer part number) for brands that 0-matched in the bulk
// run (BDS, Fox) and for brands that completed in bulk but might have
// silently 0-matched (ADS, Skyjacker, Icon — premium-suspension neighbors).
//
// No DB writes. No PREFIX_RULES edits. Reads only tmp/asap_approved_brands.json
// and ASAP's API. Disposable diagnostic kept in scripts/diagnostics/ for
// future reuse.
// =====================================================================

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const BASE = 'https://api.asapnetwork.org/webapi';
const APPROVED_PATH = path.join(process.cwd(), 'tmp', 'asap_approved_brands.json');
const PRODUCT_TYPE = 'Truck/SUV';
const SAMPLE_SIZE = 5;
const RATE_LIMIT_MS = 100;

// Hardcoded brand-name targets. Resolved to brand_id at runtime via
// case-insensitive substring match against asap_approved_brands.json.
// If a name doesn't resolve, the script warns and skips that brand.
const TARGET_BRAND_NAMES = [
  'BDS Suspension',
  'Fox Factory',
  'ADS Racing Shocks',
  'Skyjacker',
  'Icon Vehicle Dynamics'
];

// Identical to normalizeAsapSku in scripts/importers/asap-import.js.
// Strips the trailing AAIA suffix (everything after the last hyphen).
function normalizeAsapSku(sku) {
  if (!sku) return sku;
  const i = sku.lastIndexOf('-');
  return i < 0 ? sku : sku.substring(0, i);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callAsap(url) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.ASAP_API_KEY}`,
      Accept: 'application/json'
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

function listAsArray(field) {
  if (!field) return [];
  if (Array.isArray(field)) return field;
  return Object.values(field);
}

(async () => {
  if (!process.env.ASAP_API_KEY) throw new Error('Missing ASAP_API_KEY in .env.local');
  if (!fs.existsSync(APPROVED_PATH)) throw new Error(`Missing ${APPROVED_PATH}`);

  const approved = JSON.parse(fs.readFileSync(APPROVED_PATH, 'utf8'));
  const allBrands = listAsArray(approved.brands);

  // Resolve names → brand objects. Case-insensitive substring match.
  const probeBrands = [];
  for (const name of TARGET_BRAND_NAMES) {
    const target = name.toLowerCase();
    const hit = allBrands.find((b) => (b.name || '').toLowerCase().includes(target));
    if (!hit) {
      console.warn(`WARNING: "${name}" not found in asap_approved_brands.json — skipping`);
      continue;
    }
    probeBrands.push(hit);
  }

  for (const brand of probeBrands) {
    console.log('\n========================================================');
    console.log(`Brand: ${brand.name} (brand_id=${brand.brand_id})`);
    console.log('========================================================');

    const listUrl = `${BASE}/products/${encodeURIComponent(brand.brand_id)}?type=${encodeURIComponent(PRODUCT_TYPE)}`;
    let listResp;
    try {
      listResp = await callAsap(listUrl);
    } catch (err) {
      console.log(`  list call FAILED: ${err.message}`);
      continue;
    }
    const products = listAsArray(listResp.products ?? listResp.data ?? listResp);
    const sample = products.slice(0, SAMPLE_SIZE);
    console.log(`Total in list: ${products.length}`);
    console.log(`Probing first ${sample.length}:`);

    let matches = 0;
    let differs = 0;
    let detailErrors = 0;

    for (let i = 0; i < sample.length; i++) {
      const item = sample[i];
      const listSku = item.sku || item.SKU || item.id;
      const normalized = normalizeAsapSku(listSku);

      let detail;
      try {
        detail = await callAsap(`${BASE}/product/${encodeURIComponent(listSku)}`);
      } catch (err) {
        console.log(`  [${i + 1}] list_sku=${listSku} — DETAIL ERROR: ${err.message}`);
        detailErrors++;
        await sleep(RATE_LIMIT_MS);
        continue;
      }

      const mfgOriginal = detail.mfg_original_sku || '(none)';
      const matchedQ = normalized === mfgOriginal;
      console.log(`  [${i + 1}] list_sku=${listSku}`);
      console.log(`      normalized        = ${normalized}`);
      console.log(`      mfg_original_sku  = ${mfgOriginal}`);
      console.log(`      ${matchedQ ? '✓ MATCH' : '✗ DIFFER'}`);
      if (matchedQ) matches++;
      else differs++;

      await sleep(RATE_LIMIT_MS);
    }

    console.log(`\n  Verdict for ${brand.name}:`);
    console.log(`    matches: ${matches}/${sample.length}`);
    console.log(`    differs: ${differs}/${sample.length}`);
    console.log(`    detail errors: ${detailErrors}/${sample.length}`);
    if (differs === 0 && matches > 0) {
      console.log(`    → list-mode works (current PREFIX_RULES default OK for this brand)`);
    } else if (matches === 0 && differs > 0) {
      console.log(`    → list-mode FAILS; needs match_via: 'detail'`);
    } else if (matches > 0 && differs > 0) {
      console.log(`    → MIXED — list-mode partial; needs investigation`);
    } else {
      console.log(`    → INCONCLUSIVE (all detail calls failed)`);
    }
  }
})().catch((err) => {
  console.error('\n❌ Probe failed:', err.message);
  process.exit(1);
});
