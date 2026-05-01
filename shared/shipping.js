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
    smallOrderDisplayName: 'UPS Ground',
    // Default flat fee for freight-exception SKUs (APG May 2026 policy update).
    // Per-product overrides come from products.freight_exception_amount in DB.
    defaultFreightExceptionFee: 19.99,
    freightExceptionDisplayName: 'Heavy Item Surcharge'
  };

  // --------------------------------------------------------------------------
  // Internal: split cart items into exception vs normal groups.
  // Returns { exceptionItems, normalItems, normalSubtotal, normalMaxWeight, exceptionMaxWeight }.
  //
  // An item is considered a freight exception if `item.freight_exception` is
  // truthy. The override fee comes from `item.freight_exception_amount`,
  // falling back to SHIPPING_RULES.defaultFreightExceptionFee.
  //
  // We track normalSubtotal and normalMaxWeight separately so the existing
  // tier logic (free over $49.99, $4.99 small, weight tiers) runs on the
  // NON-exception portion of the cart only.
  // --------------------------------------------------------------------------
  function splitCart(items) {
    var exceptionItems = [];
    var normalItems = [];
    var normalSubtotal = 0;
    var normalMaxWeight = 0;
    var exceptionMaxWeight = 0;

    if (!items || !items.length) {
      return {
        exceptionItems: exceptionItems,
        normalItems: normalItems,
        normalSubtotal: 0,
        normalMaxWeight: 0,
        exceptionMaxWeight: 0
      };
    }

    for (var i = 0; i < items.length; i++) {
      var item = items[i] || {};
      var weight = Number(item.weight_lbs || 0);
      if (item.freight_exception) {
        exceptionItems.push(item);
        if (weight > exceptionMaxWeight) exceptionMaxWeight = weight;
      } else {
        normalItems.push(item);
        var qty = Number(item.qty || 1);
        var price = Number(item.price || 0);
        normalSubtotal += qty * price;
        if (weight > normalMaxWeight) normalMaxWeight = weight;
      }
    }

    return {
      exceptionItems: exceptionItems,
      normalItems: normalItems,
      normalSubtotal: normalSubtotal,
      normalMaxWeight: normalMaxWeight,
      exceptionMaxWeight: exceptionMaxWeight
    };
  }

  // --------------------------------------------------------------------------
  // Internal: compute the SURCHARGE for freight-exception items only.
  // Returns { amount, requiresQuote, perItemBreakdown }.
  //
  // Option B: if ANY freight-exception item weighs more than the quote
  // threshold (1000 lbs), the entire cart triggers a freight quote — not
  // just that item. This is the conservative call so we never under-quote
  // a customer when APG would charge real freight on a 1200-lb pallet.
  //
  // Otherwise: sum qty × per-unit-fee per item.
  // --------------------------------------------------------------------------
  function calculateExceptionSurcharge(exceptionItems, exceptionMaxWeight) {
    if (!exceptionItems.length) {
      return { amount: 0, requiresQuote: false, perItemBreakdown: [] };
    }

    if (exceptionMaxWeight > SHIPPING_RULES.quoteThresholdLbs) {
      return { amount: 0, requiresQuote: true, perItemBreakdown: [] };
    }

    var total = 0;
    var breakdown = [];
    for (var i = 0; i < exceptionItems.length; i++) {
      var item = exceptionItems[i];
      var qty = Number(item.qty || 1);
      var perUnit = Number(item.freight_exception_amount);
      if (!isFinite(perUnit) || perUnit < 0) {
        perUnit = SHIPPING_RULES.defaultFreightExceptionFee;
      }
      var lineTotal = qty * perUnit;
      total += lineTotal;
      breakdown.push({
        sku: item.sku || null,
        qty: qty,
        perUnit: perUnit,
        lineTotal: lineTotal
      });
    }

    return { amount: Math.round(total * 100) / 100, requiresQuote: false, perItemBreakdown: breakdown };
  }

  // --------------------------------------------------------------------------
  // Internal: compute the standard tier shipping for the NORMAL portion of
  // the cart (existing logic, unchanged in behavior).
  //
  // Tiers (in priority order):
  //   weight > 1000 -> requiresQuote
  //   weight > 500  -> $179 LTL Mid
  //   weight > 250  -> $89  LTL Light
  //   weight > 150  -> $29  Heavy Ground
  //   subtotal >= $49.99 -> FREE
  //   else -> $4.99
  // --------------------------------------------------------------------------
  function calculateStandardTier(subtotal, weight) {
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

  // --------------------------------------------------------------------------
  // Public: calculateShipping(input)
  //
  // Returns { amount, displayName, requiresQuote, tier, exceptionSurcharge }.
  //
  // Two call modes for backwards compatibility:
  //
  //   Legacy (pre-freight-exception): pass { itemsSubtotal, maxWeight }.
  //     Behaves identically to the original function. No exception logic.
  //
  //   New: pass { items: [...] } where each item has at minimum:
  //     { qty, price, weight_lbs, freight_exception, freight_exception_amount }
  //     Freight-exception items are split out, charged per-unit (or trigger
  //     a freight quote if any exceeds 1000 lbs), then the remaining items
  //     run through the standard tier logic. Final amount is the sum.
  //
  // Either mode works. If `items` is provided, it takes precedence and
  // itemsSubtotal/maxWeight are ignored.
  // --------------------------------------------------------------------------
  function calculateShipping(input) {
    input = input || {};

    // Legacy path: no items array → original behavior.
    if (!input.items || !input.items.length) {
      var subtotal = Number(input.itemsSubtotal || 0);
      var weight = Number(input.maxWeight || 0);
      var legacy = calculateStandardTier(subtotal, weight);
      legacy.exceptionSurcharge = { amount: 0, requiresQuote: false, perItemBreakdown: [] };
      return legacy;
    }

    // New path: split cart into exception vs normal groups.
    var split = splitCart(input.items);

    // Compute exception surcharge first — if it triggers a freight quote,
    // the whole cart is quote-required (Option B).
    var exceptionResult = calculateExceptionSurcharge(split.exceptionItems, split.exceptionMaxWeight);
    if (exceptionResult.requiresQuote) {
      return {
        amount: 0,
        displayName: 'Freight Quote Required',
        requiresQuote: true,
        tier: 'quote_required',
        exceptionSurcharge: exceptionResult
      };
    }

    // Compute standard shipping on the NORMAL portion.
    // Edge case: if there are no normal items (cart is all exceptions),
    // standard tier returns small_order $4.99 by default — but we don't
    // want to charge that on a cart with only exception items. Skip the
    // standard tier in that case and just use the exception surcharge.
    var standard;
    if (split.normalItems.length === 0) {
      standard = {
        amount: 0,
        displayName: SHIPPING_RULES.freightExceptionDisplayName,
        requiresQuote: false,
        tier: 'freight_exception_only'
      };
    } else {
      standard = calculateStandardTier(split.normalSubtotal, split.normalMaxWeight);
    }

    // If the standard tier itself triggers a freight quote (e.g., a
    // non-exception item weighs > 1000 lbs), the whole cart goes quote.
    if (standard.requiresQuote) {
      return {
        amount: 0,
        displayName: 'Freight Quote Required',
        requiresQuote: true,
        tier: 'quote_required',
        exceptionSurcharge: exceptionResult
      };
    }

    // Combine: standard tier amount + per-unit exception surcharges.
    // Round to cents to avoid JS float imprecision (e.g. 4.99 + 19.99 = 24.979...).
    var totalAmount = Math.round((standard.amount + exceptionResult.amount) * 100) / 100;

    // Display name reflects the dominant tier — if there's a surcharge,
    // we make it visible in the label so customers understand why
    // shipping isn't free even when subtotal exceeds $49.99.
    var displayName = standard.displayName;
    if (exceptionResult.amount > 0) {
      if (standard.tier === 'free_ground') {
        displayName = 'Free Ground + Heavy Item Surcharge';
      } else if (standard.tier === 'small_order') {
        displayName = 'UPS Ground + Heavy Item Surcharge';
      } else if (standard.tier === 'freight_exception_only') {
        displayName = SHIPPING_RULES.freightExceptionDisplayName;
      } else {
        displayName = standard.displayName + ' + Heavy Item Surcharge';
      }
    }

    return {
      amount: totalAmount,
      displayName: displayName,
      requiresQuote: false,
      tier: standard.tier,
      exceptionSurcharge: exceptionResult
    };
  }

  // --------------------------------------------------------------------------
  // Public: amountToFreeShipping(input)
  //
  // How much more does the cart need for free shipping?
  // Returns null when free shipping is unavailable (oversize, quote, already
  // free, OR when the cart contains a freight-exception item — since those
  // always carry a surcharge regardless of subtotal).
  // --------------------------------------------------------------------------
  function amountToFreeShipping(input) {
    input = input || {};

    // New path: if any item is a freight exception, free shipping isn't
    // achievable for this cart — the surcharge applies regardless.
    if (input.items && input.items.length) {
      for (var i = 0; i < input.items.length; i++) {
        if (input.items[i] && input.items[i].freight_exception) return null;
      }
      // No exceptions → fall through to standard logic on normal subtotal.
      var split = splitCart(input.items);
      var ship = calculateStandardTier(split.normalSubtotal, split.normalMaxWeight);
      if (ship.tier !== 'small_order') return null;
      return Math.max(0, SHIPPING_RULES.freeShippingMinSubtotal - split.normalSubtotal);
    }

    // Legacy path: original behavior.
    var legacyShip = calculateShipping(input);
    if (legacyShip.tier !== 'small_order') return null;
    var subtotal = Number(input.itemsSubtotal || 0);
    return Math.max(0, SHIPPING_RULES.freeShippingMinSubtotal - subtotal);
  }

  return {
    SHIPPING_RULES: SHIPPING_RULES,
    calculateShipping: calculateShipping,
    amountToFreeShipping: amountToFreeShipping
  };
});
