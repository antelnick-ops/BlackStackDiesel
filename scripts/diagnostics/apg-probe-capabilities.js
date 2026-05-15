// Systematically probes APG's REST API to learn what endpoints exist and what
// our current credentials can do. Read-only sniffing plus one harmless POST to
// /orders with a zero-quantity dummy item to detect whether the order-creation
// endpoint exists at all.
//
// Output: human-readable progress to stdout + full structured results saved
// to tmp/apg-probe-results.json for archival/diff.

require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');

const PATHS_TO_GET = [
  '/orders',
  '/order',
  '/orders/list',
  '/purchase-orders',
  '/dropship',
  '/dropship/orders',
  '/shipping/quote',
  '/freight',
  '/freight/quote',
  '/quote',
  '/capabilities',
  '/me',
  '/endpoints',
  '/docs',
  '/',
];

const POST_BODY = {
  test: true,
  items: [{ sku: 'TEST', qty: 0 }],
};

const SNIPPET_LEN = 500;

async function getAuthResponse() {
  const apiKey = process.env.APG_API_KEY;
  const authUrl = process.env.APG_AUTH_URL;
  if (!apiKey || !authUrl) {
    throw new Error('Missing APG_API_KEY or APG_AUTH_URL in .env.local');
  }
  const url = `${authUrl}?apiKey=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); }
  catch { body = text; }
  if (!res.ok) {
    throw new Error(`Auth failed: ${res.status} ${text.slice(0, 200)}`);
  }
  return body;
}

async function probe(method, urlPath, token, baseUrl, jsonBody = null) {
  const url = `${baseUrl.replace(/\/$/, '')}/${urlPath.replace(/^\//, '')}`;
  const startedAt = Date.now();

  const init = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  };
  if (jsonBody) init.body = JSON.stringify(jsonBody);

  let status = null;
  let responseText = null;
  let responseBody = null;
  let error = null;

  try {
    const res = await fetch(url, init);
    status = res.status;
    responseText = await res.text();
    try { responseBody = JSON.parse(responseText); }
    catch { responseBody = null; }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return {
    method,
    path: urlPath,
    url,
    status,
    error,
    snippet: responseText ? responseText.slice(0, SNIPPET_LEN) : null,
    body: responseBody,
    raw_text_length: responseText ? responseText.length : 0,
    duration_ms: Date.now() - startedAt,
  };
}

function categorize(probes) {
  const buckets = { ok: [], unauthorized: [], notFound: [], serverError: [], otherClient: [], networkError: [] };
  for (const p of probes) {
    if (p.error) buckets.networkError.push(p);
    else if (p.status >= 200 && p.status < 300) buckets.ok.push(p);
    else if (p.status === 401 || p.status === 403) buckets.unauthorized.push(p);
    else if (p.status === 404) buckets.notFound.push(p);
    else if (p.status >= 500) buckets.serverError.push(p);
    else buckets.otherClient.push(p);
  }
  return buckets;
}

(async () => {
  const baseUrl = process.env.APG_API_BASE_URL;
  if (!baseUrl) throw new Error('Missing APG_API_BASE_URL in .env.local');

  console.log('=== APG capability probe ===\n');

  console.log('Step 1/3: Authenticate');
  const authBody = await getAuthResponse();
  console.log('Full auth response body:');
  console.log(JSON.stringify(authBody, null, 2));
  console.log();

  const token = typeof authBody === 'object' && authBody ? authBody.sessionToken : null;
  if (!token) {
    console.error('No sessionToken in auth body — aborting probe');
    process.exit(1);
  }

  const results = {
    auth_response: authBody,
    base_url: baseUrl,
    probed_at: new Date().toISOString(),
    probes: [],
  };

  console.log(`Step 2/3: GET probes (${PATHS_TO_GET.length} endpoints)`);
  for (const p of PATHS_TO_GET) {
    const r = await probe('GET', p, token, baseUrl);
    results.probes.push(r);
    const tag = r.error ? `ERR ${r.error}` : `${r.status}`;
    console.log(`  GET ${p.padEnd(20)} → ${String(tag).padEnd(8)} (${r.duration_ms}ms)`);
  }
  console.log();

  console.log('Step 3/3: POST /orders with dummy test body (qty:0, test:true)');
  console.log(`  Body: ${JSON.stringify(POST_BODY)}`);
  const postResult = await probe('POST', '/orders', token, baseUrl, POST_BODY);
  results.probes.push(postResult);
  console.log(`  POST /orders → ${postResult.error ?? postResult.status} (${postResult.duration_ms}ms)`);
  if (postResult.snippet) {
    console.log(`  Body snippet: ${postResult.snippet.replace(/\s+/g, ' ').slice(0, 280)}`);
  }
  console.log();

  const buckets = categorize(results.probes);
  results.summary = {
    likely_supported_2xx: buckets.ok.map((p) => `${p.method} ${p.path}`),
    exists_no_perms_4x1_4x3: buckets.unauthorized.map((p) => `${p.method} ${p.path}`),
    not_found_404: buckets.notFound.map((p) => `${p.method} ${p.path}`),
    server_error_5xx: buckets.serverError.map((p) => `${p.method} ${p.path}`),
    other_4xx: buckets.otherClient.map((p) => ({ probe: `${p.method} ${p.path}`, status: p.status })),
    network_errors: buckets.networkError.map((p) => ({ probe: `${p.method} ${p.path}`, error: p.error })),
  };

  console.log('=== Summary ===');
  const fmt = (label, items) => `  ${label.padEnd(34)}: ${items.length.toString().padStart(2)} → ${items.join(', ') || '(none)'}`;
  console.log(fmt('200/2xx (likely supported)', results.summary.likely_supported_2xx));
  console.log(fmt('401/403 (exists, no perms)', results.summary.exists_no_perms_4x1_4x3));
  console.log(fmt('404 (does not exist)', results.summary.not_found_404));
  console.log(fmt('5xx (exists, erroring)', results.summary.server_error_5xx));
  console.log(`  Other 4xx                          : ${results.summary.other_4xx.length}`);
  if (results.summary.other_4xx.length) {
    for (const o of results.summary.other_4xx) console.log(`     ${o.probe} → ${o.status}`);
  }
  console.log(`  Network errors                     : ${results.summary.network_errors.length}`);
  console.log();

  const outDir = path.join(process.cwd(), 'tmp');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'apg-probe-results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`Full results written to: ${outPath}`);
})().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
