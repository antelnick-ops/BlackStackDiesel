// STAGE 1 SANDBOX SCRIPT — uses test environment only. Never run against production.
//
// Proves BSD can place a sales order via APG's REST API by POSTing a hard-coded
// dummy order to APG's test endpoint. The hostname and base path are hard-coded
// here (NOT pulled from APG_AUTH_URL / APG_API_BASE_URL env vars, which point at
// production). The only env var read is APG_API_KEY.
//
// Address and item number come from APG's documented examples; this is a true
// sandbox call — no real merchandise is shipped.

require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');

// Hard-coded test environment. Production endpoints intentionally NOT referenced.
const TEST_AUTH_URL = 'http://api-test.premierwd.com/api/v5/authenticate';
const TEST_BASE_URL = 'http://api-test.premierwd.com/api/v5';

// Sanity check: this script must NEVER hit production by accident.
// If TEST_BASE_URL contains 'api.premierwd.com' (without -test), bail loudly.
if (TEST_BASE_URL.includes('api.premierwd.com') && !TEST_BASE_URL.includes('api-test')) {
  console.error('FATAL: This script is for the SANDBOX only. TEST_BASE_URL appears to point at production.');
  process.exit(2);
}
if (TEST_AUTH_URL.includes('api.premierwd.com') && !TEST_AUTH_URL.includes('api-test')) {
  console.error('FATAL: This script is for the SANDBOX only. TEST_AUTH_URL appears to point at production.');
  process.exit(2);
}

async function authenticate() {
  const apiKey = process.env.APG_API_KEY;
  if (!apiKey) throw new Error('Missing APG_API_KEY in .env.local');

  const url = `${TEST_AUTH_URL}?apiKey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Auth failed: HTTP ${res.status}\n${text.slice(0, 500)}`);
  }

  let body;
  try { body = JSON.parse(text); }
  catch { throw new Error(`Auth response was not JSON: ${text.slice(0, 200)}`); }

  if (!body.sessionToken) {
    throw new Error(`No sessionToken in auth body: ${text.slice(0, 200)}`);
  }
  return body.sessionToken;
}

function buildOrderBody() {
  const timestamp = Date.now();
  const customerPurchaseOrderNumber = `BSD-TEST-${timestamp}`;
  const body = {
    customerPurchaseOrderNumber,
    note: 'BSD sandbox test - do not ship',
    salesOrderLines: [
      {
        itemNumber: 'AUT17203',
        quantity: 1,
        note: 'Sandbox test',
      },
    ],
    shipToAddress: {
      name: 'BSD Test Address',
      addressLine1: '278 E Dividend Dr',
      addressLine2: 'Suite 100',
      city: 'Rexburg',
      regionCode: 'ID',
      postalCode: '83440',
      countryCode: 'US',
      phone: '18884973666',
    },
  };
  return body;
}

async function placeOrder(token) {
  const body = buildOrderBody();

  console.log(`POST ${TEST_BASE_URL}/sales-orders/`);
  console.log(`PO number sent: ${body.customerPurchaseOrderNumber}`);
  console.log('Request body:');
  console.log(JSON.stringify(body, null, 2));
  console.log();

  const res = await fetch(`${TEST_BASE_URL}/sales-orders/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { /* leave null */ }

  return {
    status: res.status,
    ok: res.ok,
    raw: text,
    json: parsed,
    sentPoNumber: body.customerPurchaseOrderNumber,
  };
}

function saveResults(result) {
  const outDir = path.join(process.cwd(), 'tmp');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'apg-stage1-response.json');
  const payload = {
    captured_at: new Date().toISOString(),
    environment: 'test',
    request_url: `${TEST_BASE_URL}/sales-orders/`,
    request_po_number: result.sentPoNumber,
    response_status: result.status,
    response_ok: result.ok,
    response_json: result.json,
    response_raw: result.json ? null : result.raw,
  };
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(`Full results written to: ${outPath}`);
}

(async () => {
  console.log('=== APG Stage 1 sandbox: place test sales order ===\n');
  console.log(`Auth URL : ${TEST_AUTH_URL}`);
  console.log(`Base URL : ${TEST_BASE_URL}\n`);

  console.log('Step 1: Authenticate against TEST environment');
  let token;
  try {
    token = await authenticate();
  } catch (err) {
    console.error('AUTH FAILED:', err.message);
    process.exit(1);
  }
  console.log(`OK. Token prefix: ${token.slice(0, 20)}...\n`);

  console.log('Step 2: POST a hard-coded test sales order');
  const result = await placeOrder(token);

  console.log(`Response status: HTTP ${result.status}`);
  console.log('Response body:');
  if (result.json) {
    console.log(JSON.stringify(result.json, null, 2));
  } else {
    console.log(result.raw.slice(0, 2000) || '(empty body)');
  }
  console.log();

  if (!result.ok) {
    console.error(`POST failed with HTTP ${result.status}. Raw body shown above. Not retrying.`);
    saveResults(result);
    process.exit(1);
  }

  console.log('=== Verification checks ===');
  const data = result.json || {};

  // 1. Was the order accepted?
  console.log(`  Order accepted (2xx)        : YES (HTTP ${result.status})`);

  // 2. salesOrderNumber returned?
  const son = data.salesOrderNumber ?? data.salesOrderId ?? null;
  console.log(`  salesOrderNumber returned   : ${son ?? '(MISSING — investigate)'}`);

  // 3. isDropship per line
  const lines = Array.isArray(data.salesOrderLines) ? data.salesOrderLines : [];
  if (lines.length === 0) {
    console.log('  salesOrderLines             : (none returned)');
  } else {
    lines.forEach((line, i) => {
      const isDrop = ('isDropship' in line) ? line.isDropship : '(not present)';
      const wh = line.warehouseCode ?? '(not present at line)';
      const item = line.itemNumber ?? '?';
      const qty = line.quantity ?? '?';
      console.log(`  Line ${i + 1}: item=${item} qty=${qty} isDropship=${isDrop} warehouseCode=${wh}`);
    });
  }

  // 4. Order-level warehouseCode
  const orderWh = data.warehouseCode ?? '(not present at order level)';
  console.log(`  Order warehouseCode         : ${orderWh}`);

  // 5. PO number echo
  const echoedPo = data.customerPurchaseOrderNumber ?? '(not echoed)';
  console.log(`  customerPurchaseOrderNumber : ${echoedPo} (we sent: ${result.sentPoNumber})`);

  console.log();
  saveResults(result);
})().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
