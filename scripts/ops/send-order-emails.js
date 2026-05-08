require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const { buildOperatorEmail, buildCustomerEmail } = require('../../lib/emails');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    console.error('Usage: node scripts/ops/send-order-emails.js <order_id>');
    process.exit(1);
  }
  if (!UUID_RE.test(orderId)) {
    console.error(`Invalid UUID: ${orderId}`);
    process.exit(1);
  }

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
      'id, order_number, customer_email, ship_name, ship_address, ' +
        'ship_city, ship_state, ship_zip, subtotal, shipping_total, ' +
        'tax, total, stripe_payment_intent_id'
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

  const shortId = String(order.id).substring(0, 8);
  const ref = order.order_number || `BSD-${shortId}`;
  console.log(`Found order ${ref} (id: ${shortId}...) with ${items.length} item(s)`);

  const operatorOk = await send(resend, 'operator', buildOperatorEmail(order, items));
  const customerOk = await send(resend, 'customer', buildCustomerEmail(order, items));

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
