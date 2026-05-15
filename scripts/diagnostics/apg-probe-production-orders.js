// PRODUCTION API PROBE — uses real account but sends invalid body to fail safe at validation.
//
// Stage 1.5: APG sandbox didn't provision customer 770002784, so we can't
// confirm sandbox-side that order placement works. This script probes the
// PRODUCTION sales-orders endpoint with a deliberately invalid request body
// so it validates auth + customer + endpoint reachability, but FAILS at
// line-level (item-not-found) validation. No real order should be created.
//
// Strategy: send a syntactically valid order whose itemNumber cannot resolve
// to any APG SKU. The expected outcome is HTTP 400 "item not found" — that
// proves the account is provisioned for production order placement and we
// just need a real SKU. Any other outcome is categorized below.

require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');

// Hard-coded PRODUCTION environment. https, no -test suffix.
const PROD_AUTH_URL = 'https://api.premierwd.com/api/v5/authenticate';
const PROD_BASE_URL = 'https://api.premierwd.com/api/v5';

// Inverted safety guardrail: this script is intentionally hitting production.
// If the URLs don't look like production, bail loudly so we don't probe the
// wrong host with a "production" mindset.
if (!PROD_BASE_URL.includes('api.premierwd.com') || PROD_BASE_URL.includes('api-test')) {
  console.error('FATAL: This script must target PRODUCTION. PROD_BASE_URL is not a production URL.');
  process.exit(2);
}
if (!PROD_AUTH_URL.includes('api.premierwd.com') || PROD_AUTH_URL.includes('api-test')) {
  console.error('FATAL: This script must target PRODUCTION. PROD_AUTH_URL is not a production URL.');
  process.exit(2);
}

async function authenticate() {
  const apiKey = process.env.APG_API_KEY;
  if (!apiKey) throw new Error('Missing APG_API_KEY in .env.local');

  const url = `${PROD_AUTH_URL}?apiKey=${encodeURIComponent(apiKey)}`;
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

function buildProbeBody() {
  const timestamp = Date.now();
  return {
    customerPurchaseOrderNumber: `BSD-PROBE-${timestamp}`,
    note: 'BSD production endpoint probe - intentionally invalid',
    salesOrderLines: [
      {
        itemNumber: 'INVALID-NEVER-EXISTS-XYZABC123',
        quantity: 1,
      },
    ],
    shipToAddress: {
      name: 'BSD Probe',
      addressLine1: '278 E Dividend Dr',
      city: 'Rexburg',
      regionCode: 'ID',
      postalCode: '83440',
      countryCode: 'US',
      phone: '5555555555',
    },
  };
}

async function probe(token) {
  const body = buildProbeBody();

  console.log(`POST ${PROD_BASE_URL}/sales-orders/`);
  console.log(`PO number sent: ${body.customerPurchaseOrderNumber}`);
  console.log('Request body:');
  console.log(JSON.stringify(body, null, 2));
  console.log();

  const res = await fetch(`${PROD_BASE_URL}/sales-orders/`, {
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
  const outPath = path.join(outDir, 'apg-prod-probe-response.json');
  const payload = {
    captured_at: new Date().toISOString(),
    environment: 'production',
    request_url: `${PROD_BASE_URL}/sales-orders/`,
    request_po_number: result.sentPoNumber,
    response_status: result.status,
    response_ok: result.ok,
    response_json: result.json,
    response_raw: result.json ? null : result.raw,
  };
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log(`Full results written to: ${outPath}`);
}

function categorize(result) {
  const status = result.status;
  const bodyStr = (result.raw || '').toLowerCase();

  console.log('=== Categorization ===');

  if (status === 200 || status === 201) {
    console.log('  RESULT: HTTP ' + status + ' — API CREATED AN ORDER.');
    console.log('  THIS IS BAD. The probe was supposed to fail at body validation.');
    console.log('  ACTION: Investigate response body urgently. Likely need to contact');
    console.log('          APG to cancel any order that was actually accepted.');
    if (result.json) {
      const son = result.json.salesOrderNumber ?? result.json.salesOrderId ?? null;
      if (son) console.log(`  Returned salesOrderNumber: ${son}`);
    }
    return;
  }

  if (status === 400) {
    if (bodyStr.includes('customer number') && bodyStr.includes('could not be found')) {
      console.log('  RESULT: HTTP 400 — customer not found in production either.');
      console.log('  Account is NOT provisioned for production order placement.');
      console.log('  ACTION: BLOCKING. Contact APG to provision customer 770002784');
      console.log('          for production order placement.');
      return;
    }
    if (bodyStr.includes('item') && (bodyStr.includes('not found') || bodyStr.includes('invalid') || bodyStr.includes('does not exist'))) {
      console.log('  RESULT: HTTP 400 — item not found (expected outcome).');
      console.log('  Account is valid, endpoint works, order placement permitted.');
      console.log('  ACTION: Proceed to a real-SKU production test when ready.');
      return;
    }
    console.log('  RESULT: HTTP 400 with unrecognized error.');
    console.log('  ACTION: Inspect response body above and report.');
    return;
  }

  if (status === 401 || status === 403) {
    console.log(`  RESULT: HTTP ${status} — order placement NOT permitted on this API key.`);
    console.log('  ACTION: Vendor-side fix needed. Contact APG to enable sales-order');
    console.log('          POST permission on the production API key.');
    return;
  }

  console.log(`  RESULT: HTTP ${status} — unexpected status.`);
  console.log('  ACTION: Inspect response body above and report.');
}

(async () => {
  console.log('=== APG Stage 1.5: PRODUCTION endpoint probe (invalid body) ===\n');
  console.log(`Auth URL : ${PROD_AUTH_URL}`);
  console.log(`Base URL : ${PROD_BASE_URL}\n`);

  console.log('Step 1: Authenticate against PRODUCTION environment');
  let token;
  try {
    token = await authenticate();
  } catch (err) {
    console.error('AUTH FAILED:', err.message);
    process.exit(1);
  }
  console.log(`OK. Token prefix: ${token.slice(0, 20)}...\n`);

  console.log('Step 2: POST a deliberately invalid sales order');
  const result = await probe(token);

  console.log(`Response status: HTTP ${result.status}`);
  console.log('Response body:');
  if (result.json) {
    console.log(JSON.stringify(result.json, null, 2));
  } else {
    console.log(result.raw.slice(0, 4000) || '(empty body)');
  }
  console.log();

  saveResults(result);
  console.log();
  categorize(result);
})().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
