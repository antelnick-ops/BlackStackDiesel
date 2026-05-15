require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const {
  buildCustomerCancellationEmail,
  buildOperatorCancellationEmail,
} = require('../../lib/emails');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseReason() {
  const arg = process.argv.find((a) => a.startsWith('--reason='));
  if (!arg) return null;
  const val = arg.split('=')[1];
  const valid = ['supplier_unavailable', 'customer_request'];
  if (!valid.includes(val)) {
    console.error(`Invalid reason "${val}". Valid: ${valid.join(', ')}`);
    process.exit(1);
  }
  return val;
}

async function send(resend, label, email) {
  try {
    const { data, error } = await resend.emails.send(email);
    if (error) {
      console.error(
        `FAILED ${label} email to ${email.to}: ${error.name || 'Error'}: ${error.message || JSON.stringify(error)}`
      );
      return false;
    }
    console.log(`Sent ${label} email to ${email.to}: ${data?.id || '(no id returned)'}`);
    return true;
  } catch (err) {
    console.error(`FAILED ${label} email to ${email.to}: ${err.message || err}`);
    return false;
  }
}

async function main() {
  const orderId = process.argv[2];
  if (!orderId) {
    console.error(
      'Usage: node scripts/ops/send-cancellation-email.js <order_id> [--reason=supplier_unavailable|customer_request]'
    );
    process.exit(1);
  }
  if (!UUID_RE.test(orderId)) {
    console.error(`Invalid UUID: ${orderId}`);
    process.exit(1);
  }

  const reason = parseReason();

  for (const k of ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'RESEND_API_KEY']) {
    if (!process.env[k]) {
      console.error(`Missing required env: ${k}`);
      process.exit(1);
    }
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select(
      'id, order_number, customer_email, status, total, ' +
        'stripe_payment_intent_id, supplier_order_id'
    )
    .eq('id', orderId)
    .maybeSingle();

  if (orderErr) {
    console.error('Failed to fetch order:', orderErr.message);
    process.exit(1);
  }
  if (!order) {
    console.error(`Order not found: ${orderId}`);
    process.exit(1);
  }
  if (order.status !== 'cancelled') {
    console.error(
      `Order status is "${order.status}", not "cancelled". Set status to cancelled before sending cancellation email.`
    );
    process.exit(1);
  }

  const { data: items, error: itemsErr } = await supabase
    .from('order_items')
    .select('product_name, sku, quantity, line_total')
    .eq('order_id', orderId);

  if (itemsErr) {
    console.error('Failed to fetch order_items:', itemsErr.message);
    process.exit(1);
  }
  if (!items || items.length === 0) {
    console.error(`No order_items found for order ${orderId}`);
    process.exit(1);
  }

  const ref = order.order_number || `BSD-${String(order.id).substring(0, 8)}`;
  console.log(
    `Cancellation: ${ref} (${String(order.id).substring(0, 8)}...) ` +
      `${items.length} item(s), ${reason || 'no reason'}`
  );

  const operatorOk = await send(
    resend,
    'operator',
    buildOperatorCancellationEmail(order, items, reason)
  );
  const customerOk = await send(
    resend,
    'customer',
    buildCustomerCancellationEmail(order, items, reason)
  );

  if (operatorOk && customerOk) {
    console.log('Both sent ✓');
    process.exit(0);
  }
  console.log(`Operator: ${operatorOk ? '✓' : '✗'}  Customer: ${customerOk ? '✓' : '✗'}`);
  process.exit(1);
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
