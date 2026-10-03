'use strict';

const crypto = require('crypto');
const { badRequest, notFound, conflict, paymentRequired } = require('../utils/errors');
const { calculateTotals } = require('../utils/pricing');

const ORDER_STATUSES = ['placed', 'cancelled'];

/** A little personality for the delivery estimate, based on how big the order is. */
function estimateDelivery(totalCents) {
  if (totalCents >= 1000000000000) return '6-8 business centuries';
  if (totalCents >= 10000000000) return '6-8 business years';
  if (totalCents >= 100000000) return '6-8 business months';
  return '6-8 business days';
}

function createOrderService(store, config) {
  return {
    /**
     * Turn the user's cart into an order.
     * Validates stock and the user's budget, then decrements stock,
     * charges the user, and empties the cart.
     */
    checkout(userId, { shippingAddress }) {
      const user = store.users.get(userId);
      if (!user) throw notFound(`User '${userId}' not found`);

      const cart = store.carts.get(userId);
      if (!cart || cart.size === 0) throw badRequest('Cannot check out an empty cart');

      const items = [];
      for (const [productId, quantity] of cart) {
        const product = store.products.get(productId);
        if (product.stock < quantity) {
          throw conflict(
            `Only ${product.stock} of '${product.name}' in stock, requested ${quantity}`,
            'INSUFFICIENT_STOCK',
          );
        }
        items.push({
          productId,
          name: product.name,
          unitPriceCents: product.priceCents,
          quantity,
          lineTotalCents: product.priceCents * quantity,
        });
      }

      const subtotal = items.reduce((total, i) => total + i.lineTotalCents, 0);
      const totals = calculateTotals(subtotal, config.pricing);

      if (user.budgetCents < totals.totalCents) {
        throw paymentRequired(
          `Order total of ${totals.totalCents} cents exceeds your budget of ${user.budgetCents} cents`,
        );
      }

      // All checks passed: apply the side effects.
      for (const item of items) store.products.get(item.productId).stock -= item.quantity;
      user.budgetCents -= totals.totalCents;
      cart.clear();

      const order = {
        id: crypto.randomUUID(),
        userId,
        status: 'placed',
        items,
        ...totals,
        shippingAddress,
        estimatedDelivery: estimateDelivery(totals.totalCents),
        createdAt: new Date().toISOString(),
        cancelledAt: null,
      };
      store.orders.set(order.id, order);
      return order;
    },

    list({ userId, status } = {}) {
      let orders = [...store.orders.values()];
      if (userId) orders = orders.filter((o) => o.userId === userId);
      if (status) orders = orders.filter((o) => o.status === status);
      return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    get(id) {
      const order = store.orders.get(id);
      if (!order) throw notFound(`Order '${id}' not found`);
      return order;
    },

    /** Cancel a placed order: restock the items and refund the user. */
    cancel(id) {
      const order = this.get(id);
      if (order.status === 'cancelled') {
        throw conflict(`Order '${id}' is already cancelled`, 'ALREADY_CANCELLED');
      }

      for (const item of order.items) {
        const product = store.products.get(item.productId);
        if (product) product.stock += item.quantity;
      }
      const user = store.users.get(order.userId);
      if (user) user.budgetCents += order.totalCents;

      order.status = 'cancelled';
      order.cancelledAt = new Date().toISOString();
      return order;
    },
  };
}

module.exports = { createOrderService, ORDER_STATUSES, estimateDelivery };
