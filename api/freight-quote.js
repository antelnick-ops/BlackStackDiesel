const { createClient } = require('@supabase/supabase-js');

// Receives freight quote requests for items > 1000 lbs.
// Stores as a feedback row (type='freight_quote', priority='critical').
// Reviewed via SQL daily; replied to within 48 business hours.

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE env vars');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  try {
    const { name, email, phone, notes, productSku, productName } = req.body || {};

    if (!name || !email || !productSku) {
      return res.status(400).json({ error: 'Missing required fields: name, email, productSku' });
    }

    const message = [
      'FREIGHT QUOTE REQUEST',
      '',
      'Name: ' + name,
      'Email: ' + email,
      'Phone: ' + (phone || '(not provided)'),
      '',
      'Product: ' + (productName || '(unknown)'),
      'SKU: ' + productSku,
      '',
      'Customer notes:',
      notes || '(none)'
    ].join('\n');

    const payload = {
      type: 'freight_quote',
      priority: 'critical',
      status: 'new',
      message: message,
      product_sku: productSku,
      user_email: email,
      screen_url: req.headers['referer'] || null,
      user_agent: req.headers['user-agent'] || null
    };

    const { data, error } = await supabase.from('feedback').insert(payload).select().single();

    if (error) {
      console.error('Freight quote insert failed:', error);
      return res.status(500).json({ error: 'Could not save quote request' });
    }

    const reference = 'BSD-Q-' + String(data.id).slice(0, 8).toUpperCase();

    return res.status(200).json({
      success: true,
      reference: reference,
      message: "We'll be in touch within 48 business hours."
    });
  } catch (err) {
    console.error('Freight quote error:', err);
    return res.status(500).json({ error: err.message });
  }
};
