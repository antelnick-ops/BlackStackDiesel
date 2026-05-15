const FROM = 'BlackStackDiesel <noreply@black-stack-diesel.com>';
const CUSTOMER_REPLY_TO = 'help@black-stack-diesel.com';
const OPERATOR_FALLBACK = 'nick@black-stack-diesel.com';

function formatMoney(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatItem(item) {
  const sku = item.sku || '(no sku)';
  const name = item.product_name || 'Product';
  return `- ${item.quantity}x ${sku} | ${name} — ${formatMoney(item.line_total)}`;
}

function shipBlock(order) {
  const csz = `${order.ship_city || '?'}, ${order.ship_state || '?'} ${order.ship_zip || '?'}`;
  return [
    `  ${order.ship_name || '(no name)'}`,
    `  ${order.ship_address || '(no street address)'}`,
    `  ${csz}`,
  ].join('\n');
}

function buildOperatorEmail(order, items) {
  const itemSummary = items.map(formatItem).join('\n');
  const text = [
    'New order received on BlackStackDiesel.',
    '',
    `Order ID: ${order.id}`,
    `Order #: ${order.order_number || '(none)'}`,
    `Total: ${formatMoney(order.total)}`,
    `Customer email: ${order.customer_email}`,
    '',
    'Shipping to:',
    shipBlock(order),
    '',
    'Items:',
    itemSummary,
    '',
    "Payment captured. Order is queued in Supabase with supplier_status='queued'.",
    '',
    'ACTION REQUIRED: log into APG and place this order for drop-ship to the shipping address above.',
    '',
    `Stripe payment intent: ${order.stripe_payment_intent_id || '(none)'}`,
  ].join('\n');

  return {
    from: FROM,
    to: process.env.BSD_OPERATOR_EMAIL || OPERATOR_FALLBACK,
    subject: `New BSD order #${String(order.id).substring(0, 8)} - ${formatMoney(order.total)}`,
    text,
  };
}

function buildCustomerEmail(order, items) {
  const itemSummary = items.map(formatItem).join('\n');
  const ref = order.order_number || `BSD-${String(order.id).substring(0, 8)}`;
  const text = [
    "Order's locked in. Thanks for rolling with BlackStackDiesel.",
    '',
    `Order #: ${ref}`,
    '',
    'Items:',
    itemSummary,
    '',
    `Subtotal:  ${formatMoney(order.subtotal)}`,
    `Shipping:  ${formatMoney(order.shipping_total)}`,
    `Tax:       ${formatMoney(order.tax)}`,
    `Total:     ${formatMoney(order.total)}`,
    '',
    'Ship to:',
    shipBlock(order),
    '',
    "What's next:",
    'Your parts ship from our supplier within 1-3 business days. Soon as',
    "they're on the truck, we'll send you tracking.",
    '',
    'Questions or need to change something? Reply to this email or hit us',
    "at help@black-stack-diesel.com — we'll get back to you fast.",
    '',
    'Thanks for trusting BSD with your build.',
    '',
    '🖤💨',
    '— BlackStackDiesel',
  ].join('\n');

  return {
    from: FROM,
    to: order.customer_email,
    replyTo: CUSTOMER_REPLY_TO,
    subject: `Order ${ref} confirmed`,
    text,
  };
}

// ---------------------------------------------------------------------------
// CANCELLATION EMAILS
// ---------------------------------------------------------------------------

function reasonText(reason) {
  if (reason === 'supplier_unavailable')
    return 'the supplier flagged this item as no longer available';
  if (reason === 'customer_request')
    return 'you asked us to cancel';
  return 'this order has been cancelled';
}

function buildCustomerCancellationEmail(order, items, reason) {
  const ref = order.order_number || `BSD-${String(order.id).substring(0, 8)}`;
  const itemSummary = items.map(formatItem).join('\n');
  const text = [
    `Heads up — ${reasonText(reason)}.`,
    '',
    `Order #: ${ref}`,
    '',
    'Cancelled item(s):',
    itemSummary,
    '',
    `Refund amount: ${formatMoney(order.total)}`,
    '',
    "We're issuing a full refund to the card on file. Depending on your",
    'bank, expect it back within 5-10 business days.',
    '',
    "If you want us to find an alternative part that'll work for your",
    'truck, just reply to this email or hit us at help@black-stack-diesel.com',
    "— we're on it.",
    '',
    'Sorry about the hassle.',
    '',
    '🖤💨',
    '— BlackStackDiesel',
  ].join('\n');

  return {
    from: FROM,
    to: order.customer_email,
    replyTo: CUSTOMER_REPLY_TO,
    subject: `Order ${ref} cancelled`,
    text,
  };
}

function buildOperatorCancellationEmail(order, items, reason) {
  const ref = order.order_number || `BSD-${String(order.id).substring(0, 8)}`;
  const itemSummary = items.map(formatItem).join('\n');
  const text = [
    `Order ${ref} has been cancelled.`,
    '',
    `Order ID:  ${order.id}`,
    `Order #:   ${ref}`,
    `Customer:  ${order.customer_email}`,
    `Total:     ${formatMoney(order.total)}`,
    `Reason:    ${reason || 'not specified'}`,
    order.supplier_order_id ? `APG order: ${order.supplier_order_id}` : '',
    '',
    'Items:',
    itemSummary,
    '',
    `ACTION REQUIRED: Issue Stripe refund of ${formatMoney(order.total)}.`,
    `Stripe payment intent: ${order.stripe_payment_intent_id || '(none)'}`,
  ].filter(Boolean).join('\n');

  return {
    from: FROM,
    to: process.env.BSD_OPERATOR_EMAIL || OPERATOR_FALLBACK,
    subject: `Order ${ref} cancelled - ACTION: refund ${formatMoney(order.total)}`,
    text,
  };
}

module.exports = {
  formatMoney,
  buildOperatorEmail,
  buildCustomerEmail,
  buildCustomerCancellationEmail,
  buildOperatorCancellationEmail,
};
