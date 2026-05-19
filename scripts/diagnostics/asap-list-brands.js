// =====================================================================
// asap-list-brands.js
// =====================================================================
// READ-ONLY diagnostic: fetches GET /webapi/brands from ASAP Network
// and compares against tmp/asap_approved_brands.json. Reports the diff
// in both directions (live-only and local-only) plus a summary count.
//
// Does NOT modify tmp/asap_approved_brands.json. probe-asap.js exists
// for that side effect; this script intentionally does not.
//
// Usage:
//   node scripts/diagnostics/asap-list-brands.js
// =====================================================================

require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');

const BASE = 'https://api.asapnetwork.org/webapi';
const LOCAL_PATH = path.join(process.cwd(), 'tmp', 'asap_approved_brands.json');

function listBrands(brandsField) {
  if (!brandsField) return [];
  if (Array.isArray(brandsField)) return brandsField;
  return Object.values(brandsField);
}

async function fetchLive() {
  if (!process.env.ASAP_API_KEY) {
    throw new Error('Missing ASAP_API_KEY in .env.local');
  }
  const res = await fetch(`${BASE}/brands`, {
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

function loadLocal() {
  if (!fs.existsSync(LOCAL_PATH)) {
    throw new Error(`Local file not found: ${LOCAL_PATH}`);
  }
  return JSON.parse(fs.readFileSync(LOCAL_PATH, 'utf8'));
}

function indexById(brands) {
  const map = new Map();
  for (const b of brands) {
    if (!b || !b.brand_id) continue;
    map.set(String(b.brand_id), b);
  }
  return map;
}

(async () => {
  console.log('Fetching live /webapi/brands …');
  const live = await fetchLive();
  const liveBrands = listBrands(live.brands);
  console.log(`  live reported count: ${live.count ?? '(none)'}`);
  console.log(`  live parsed count:   ${liveBrands.length}`);

  console.log('\nLoading local tmp/asap_approved_brands.json …');
  const local = loadLocal();
  const localBrands = listBrands(local.brands);
  console.log(`  local reported count: ${local.count ?? '(none)'}`);
  console.log(`  local parsed count:   ${localBrands.length}`);

  const liveById = indexById(liveBrands);
  const localById = indexById(localBrands);

  const onlyInLive = [];
  for (const [id, b] of liveById.entries()) {
    if (!localById.has(id)) onlyInLive.push(b);
  }
  const onlyInLocal = [];
  for (const [id, b] of localById.entries()) {
    if (!liveById.has(id)) onlyInLocal.push(b);
  }

  console.log('\n========================================================');
  console.log(`In live but NOT in local (${onlyInLive.length}):`);
  console.log('========================================================');
  if (onlyInLive.length === 0) {
    console.log('  (none)');
  } else {
    for (const b of onlyInLive) {
      console.log(`  brand_id=${b.brand_id} | term_name=${b.term_name || '(none)'} | name=${b.name || '(none)'}`);
    }
  }

  console.log('\n========================================================');
  console.log(`In local but NOT in live (${onlyInLocal.length}):`);
  console.log('========================================================');
  if (onlyInLocal.length === 0) {
    console.log('  (none)');
  } else {
    for (const b of onlyInLocal) {
      console.log(`  brand_id=${b.brand_id} | term_name=${b.term_name || '(none)'} | name=${b.name || '(none)'}`);
    }
  }

  console.log('\nSummary:');
  console.log(`  live: ${liveBrands.length}, local: ${localBrands.length}`);
  console.log(`  diff: +${onlyInLive.length} new, -${onlyInLocal.length} retired`);
})().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
