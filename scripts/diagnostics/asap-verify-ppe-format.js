// One-off: verify that stripping 'PPE' from a BSD SKU yields ASAP's
// mfg_original_sku format for Pacific Performance Engineering.
//
// Hypothesis: BSD SKU 'PPE115900900' → ASAP mfg_original_sku '115900900'.

require('dotenv').config({ path: '.env.local' });

const BASE = 'https://api.asapnetwork.org/webapi';
const PPE_BRAND_ID = '29425';
const TARGET_STRIPPED_SKU = '115900900';

async function main() {
  if (!process.env.ASAP_API_KEY) throw new Error('Missing ASAP_API_KEY in .env.local');

  const url = `${BASE}/products/${PPE_BRAND_ID}?type=${encodeURIComponent('Truck/SUV')}`;
  console.log('GET', url);
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${process.env.ASAP_API_KEY}`,
      Accept: 'application/json',
    },
  });
  console.log('Status:', res.status);
  const body = await res.json();

  // Defensive shape detection — same approach probe-asap.js uses.
  const productsField = body.products ?? body.data ?? body.skus ?? body;
  const list = Array.isArray(productsField)
    ? productsField
    : Object.values(productsField || {});

  console.log('Reported count:', body.count ?? '(none)');
  console.log('Parsed product count:', list.length);

  if (list.length === 0) {
    console.log('No products returned — cannot verify.');
    return;
  }

  // Print the first product fully so we can see field shape.
  console.log('\nFirst product (full shape):');
  console.log(JSON.stringify(list[0], null, 2));

  // Look for exact and contains matches against TARGET_STRIPPED_SKU.
  const exact = list.find((p) => p && p.mfg_original_sku === TARGET_STRIPPED_SKU);
  const contains = list.filter(
    (p) => p && typeof p.mfg_original_sku === 'string' && p.mfg_original_sku.includes(TARGET_STRIPPED_SKU)
  );

  console.log('\n=== Match against ' + TARGET_STRIPPED_SKU + ' ===');
  if (exact) {
    console.log('EXACT match found:');
    console.log(JSON.stringify(exact, null, 2));
  } else {
    console.log('No EXACT match for mfg_original_sku === ' + TARGET_STRIPPED_SKU);
  }
  if (contains.length) {
    console.log(`\nCONTAINS matches (${contains.length}):`);
    contains.slice(0, 5).forEach((p) => console.log('  ', JSON.stringify(p)));
  } else {
    console.log('No CONTAINS matches either.');
  }

  // Always print first 5 mfg_original_sku values so we see ASAP's format.
  console.log('\nFirst 5 mfg_original_sku values from ASAP:');
  list.slice(0, 5).forEach((p, i) => {
    console.log(`  [${i + 1}] mfg_original_sku=${p?.mfg_original_sku ?? '(missing)'} | sku=${p?.sku ?? '(missing)'}`);
  });
}

main().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
