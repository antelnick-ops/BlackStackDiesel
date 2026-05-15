// PRODUCTION API PROBE — read-only tracking lookup. No DB writes, no APG state change.
//
// Stage 4 pre-work: verify shape of APG's /tracking and /sales-orders/{son}
// responses for an order we've already submitted. Use this once the first
// real BSD order has been forwarded to APG (api/place-apg-order) and we
// have a salesOrderNumber stored in orders.supplier_order_id.
//
// Usage:
//   node scripts/diagnostics/apg-probe-tracking.js <salesOrderNumber>

require('dotenv').config({ path: '.env.local' });

const APG_AUTH_URL = 'https://api.premierwd.com/api/v5/authenticate';
const APG_API_BASE_URL = 'https://api.premierwd.com/api/v5';

// Inverted safety guardrail: this script intentionally hits production.
if (!APG_API_BASE_URL.includes('api.premierwd.com') || APG_API_BASE_URL.includes('api-test')) {
  console.error('FATAL: APG_API_BASE_URL is not a production URL.');
  process.exit(2);
}

async function authenticate() {
  if (!process.env.APG_API_KEY) throw new Error('Missing APG_API_KEY in .env.local');
  const url = `${APG_AUTH_URL}?apiKey=${encodeURIComponent(process.env.APG_API_KEY)}`;
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok) throw new Error(`Auth failed: HTTP ${res.status} ${text.slice(0, 300)}`);
  const body = JSON.parse(text);
  if (!body.sessionToken) throw new Error('No sessionToken in auth body');
  return body.sessionToken;
}

async function get(token, path) {
  console.log(`GET ${path}`);
  const res = await fetch(`${APG_API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  console.log(`  status: ${res.status}`);
  const text = await res.text();
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2));
  } catch {
    console.log('(non-JSON body, first 2000 chars)');
    console.log(text.slice(0, 2000));
  }
}

(async () => {
  const son = process.argv[2];
  if (!son) {
    console.error('Usage: node scripts/diagnostics/apg-probe-tracking.js <salesOrderNumber>');
    console.error('       (use orders.supplier_order_id from a real submitted order)');
    process.exit(1);
  }

  console.log('=== APG tracking probe ===');
  console.log(`Sales order number: ${son}\n`);

  const token = await authenticate();
  console.log(`Auth ok, token prefix: ${token.slice(0, 12)}...\n`);

  console.log(`--- /tracking?salesOrderNumber=${son} ---`);
  await get(token, `/tracking?salesOrderNumber=${encodeURIComponent(son)}`);
  console.log('');

  console.log(`--- /sales-orders/${son} ---`);
  await get(token, `/sales-orders/${encodeURIComponent(son)}`);
})().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
