'use strict';

/**
 * Compute the order totals for a given subtotal (all values in cents).
 * Tax is rounded to the nearest cent.
 */
function calculateTotals(subtotalCents, { taxRate, shippingCents }) {
  const taxCents = Math.round(subtotalCents * taxRate);
  const totalCents = subtotalCents + taxCents + shippingCents;
  return { subtotalCents, taxCents, shippingCents, totalCents };
}

module.exports = { calculateTotals };
