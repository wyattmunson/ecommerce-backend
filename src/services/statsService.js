'use strict';

function createStatsService(store) {
  return {
    /** Store-wide numbers for a dashboard. Revenue excludes cancelled orders. */
    summary() {
      const products = [...store.products.values()];
      const orders = [...store.orders.values()];
      const activeOrders = orders.filter((o) => o.status !== 'cancelled');

      const mostExpensive = products.reduce(
        (max, p) => (max === null || p.priceCents > max.priceCents ? p : max),
        null,
      );

      return {
        productCount: products.length,
        userCount: store.users.size,
        orderCount: orders.length,
        activeOrderCount: activeOrders.length,
        revenueCents: activeOrders.reduce((total, o) => total + o.totalCents, 0),
        inventoryValueCents: products.reduce((total, p) => total + p.priceCents * p.stock, 0),
        mostExpensiveProduct: mostExpensive
          ? { id: mostExpensive.id, name: mostExpensive.name, priceCents: mostExpensive.priceCents }
          : null,
      };
    },
  };
}

module.exports = { createStatsService };
