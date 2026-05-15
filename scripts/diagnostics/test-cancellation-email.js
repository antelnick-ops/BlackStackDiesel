require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const {
  buildCustomerCancellationEmail,
  buildOperatorCancellationEmail,
} = require('../../lib/emails');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_REASONS = ['supplier_unavailable', 'customer_request'];

function getArg(name) {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.split('=').slice(1).join('=') : null;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function printEmail(label, email) {
  const bar = '='.repeat(72);
  console.log(`\n${bar}\n${label.toUpperCase()} EMAIL\n${bar}`);
  console.log(`From:     ${email.from}`);
  console.log(`To:       ${email.to}`);
  if (email.replyTo) console.log(`Reply-To: ${email.replyTo}`);
  console.log(`Subject:  ${email.subject}`);
  console.log(`${'-'.repeat(72)}`);
  console.log(email.text);
  console.log(bar);
}

async function main() {
  const orderArg = process.argv[2];
  if (!orderArg) {
    console.error(
      'Usage:\n' +
        '  node scripts/diagnostics/test-cancellation-email.js <BSD-#####|uuid> \\\n' +
        '       [--reason=supplier_unavailable|customer_request] \\\n' +
        '       [--to=test@example.com]  # redirect BOTH emails to this address\n' +
        '       [--send]                 # actually send via Resend (default: dry-run print)\n\n' +
        'Examples:\n' +
        '  node scripts/diagnostics/test-cancellation-email.js BSD-00002\n' +
        '  node scripts/diagnostics/test-cancellation-email.js BSD-00002 --reason=customer_request\n' +
        '  node scripts/diagnostics/test-cancellation-email.js BSD-00002 --to=nick@black-stack-diesel.com --send'
    );
    process.exit(1);
  }

  const reason = getArg('reason');
  if (reason && !VALID_REASONS.includes(reason)) {
    console.error(`Invalid --reason "${reason}". Valid: ${VALID_REASONS.join(', ')}`);
    process.exit(1);
  }

  const redirectTo = getArg('to');
  const send = hasFlag('send');

  for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY']) {
    if (!process.env[k]) {
      console.error(`Missing required env: ${k}`);
      process.exit(1);
    }
  }
  if (send && !process.env.RESEND_API_KEY) {
    console.error('Missing RESEND_API_KEY (required with --send)');
    process.exit(1);
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const isUuid = UUID_RE.test(orderArg);
  const lookupColumn = isUuid ? 'id' : 'order_number';
  console.log(`Looking up order by ${lookupColumn}=${orderArg}`);

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('*')
    .eq(lookupColumn, orderArg)
    .maybeSingle();

  if (orderErr) {
    console.error('Failed to fetch order:', orderErr.message);
    process.exit(1);
  }
  if (!order) {
    console.error(`Order not found: ${orderArg}`);
    process.exit(1);
  }

  const { data: items, error: itemsErr } = await supabase
    .from('order_items')
    .select('product_name, sku, quantity, line_total')
    .eq('order_id', order.id);

  if (itemsErr) {
    console.error('Failed to fetch order_items:', itemsErr.message);
    process.exit(1);
  }
  if (!items || items.length === 0) {
    console.error(`No order_items found for order ${order.id}`);
    process.exit(1);
  }

  const ref = order.order_number || `BSD-${String(order.id).substring(0, 8)}`;
  console.log(
    `Order ${ref} | status=${order.status} | ${items.length} item(s) | total=$${order.total} | customer=${order.customer_email}`
  );
  if (order.status !== 'cancelled') {
    console.log(
      `NOTE: order status is "${order.status}" (not "cancelled"). Test script ignores this; prod script (scripts/ops/send-cancellation-email.js) would refuse.`
    );
  }

  const operatorEmail = buildOperatorCancellationEmail(order, items, reason);
  const customerEmail = buildCustomerCancellationEmail(order, items, reason);

  if (redirectTo) {
    console.log(`Redirecting BOTH emails to: ${redirectTo}`);
    operatorEmail.to = redirectTo;
    customerEmail.to = redirectTo;
  }

  printEmail('operator', operatorEmail);
  printEmail('customer', customerEmail);

  if (!send) {
    console.log('\nDry-run complete. Add --send to actually deliver via Resend.');
    return;
  }

  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  for (const [label, email] of [['operator', operatorEmail], ['customer', customerEmail]]) {
    const { data, error } = await resend.emails.send(email);
    if (error) {
      console.error(`FAILED ${label} -> ${email.to}: ${error.name || 'Error'}: ${error.message || JSON.stringify(error)}`);
      process.exitCode = 1;
    } else {
      console.log(`Sent ${label} -> ${email.to}: ${data?.id || '(no id)'}`);
    }
  }
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
