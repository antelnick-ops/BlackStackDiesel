// Single source of truth for BSD shipping logic.
// Mirrors APG's May 2026 freight policy + tiered surcharge for items > 150 lbs.
// Used by both the cart drawer (via window.BSDShipping) and the
// Stripe checkout endpoint (via require). DO NOT duplicate this logic.
//
// Loaded in browser as: <script src="/shared/shipping.js"></script>
// Loaded in Node as:    require('../shared/shipping.js')

(function (global, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    global.BSDShipping = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  var SHIPPING_RULES = {
    quoteThresholdLbs: 1000,
    freeShippingMinSubtotal: 49.99,
    smallOrderFee: 4.99,
    freeGroundDisplayName: 'Free UPS Ground',
    smallOrderDisplayName: 'UPS Ground'
  };

  // Returns { amount, displayName, requiresQuote, tier }.
  // Tiers (in priority order):
  //   weight > 1000 -> requiresQuote
  //   weight > 500  -> $179 LTL Mid
  //   weight > 250  -> $89  LTL Light
  //   weight > 150  -> $29  Heavy Ground
  //   subtotal >= $49.99 -> FREE
  //   else -> $4.99
  // Inputs default to 0 if null/undefined; weight=0 is treated as normal.
  function calculateShipping(input) {
    var subtotal = Number((input && input.itemsSubtotal) || 0);
    var weight = Number((input && input.maxWeight) || 0);

    if (weight > SHIPPING_RULES.quoteThresholdLbs) {
      return { amount: 0, displayName: 'Freight Quote Required', requiresQuote: true, tier: 'quote_required' };
    }
    if (weight > 500) {
      return { amount: 179, displayName: 'LTL Freight (Mid)', requiresQuote: false, tier: 'ltl_mid' };
    }
    if (weight > 250) {
      return { amount: 89, displayName: 'LTL Freight (Light)', requiresQuote: false, tier: 'ltl_light' };
    }
    if (weight > 150) {
      return { amount: 29, displayName: 'Heavy UPS Ground', requiresQuote: false, tier: 'heavy_ground' };
    }
    if (subtotal >= SHIPPING_RULES.freeShippingMinSubtotal) {
      return { amount: 0, displayName: SHIPPING_RULES.freeGroundDisplayName, requiresQuote: false, tier: 'free_ground' };
    }
    return {
      amount: SHIPPING_RULES.smallOrderFee,
      displayName: SHIPPING_RULES.smallOrderDisplayName,
      requiresQuote: false,
      tier: 'small_order'
    };
  }

  // How much more does the cart need for free shipping?
  // Returns null when free shipping is unavailable (oversize, quote, or already free).
  function amountToFreeShipping(input) {
    var ship = calculateShipping(input);
    if (ship.tier !== 'small_order') return null;
    var subtotal = Number((input && input.itemsSubtotal) || 0);
    return Math.max(0, SHIPPING_RULES.freeShippingMinSubtotal - subtotal);
  }

  return {
    SHIPPING_RULES: SHIPPING_RULES,
    calculateShipping: calculateShipping,
    amountToFreeShipping: amountToFreeShipping
  };
});
