'use strict';

const { notFound, conflict } = require('../utils/errors');

function createCartService(store) {
  function requireUser(userId) {
    if (!store.users.has(userId)) throw notFound(`User '${userId}' not found`);
  }

  function requireProduct(productId) {
    const product = store.products.get(productId);
    if (!product) throw notFound(`Product '${productId}' not found`);
    return product;
  }

  function getItems(userId) {
    let items = store.carts.get(userId);
    if (!items) {
      items = new Map();
      store.carts.set(userId, items);
    }
    return items;
  }

  function assertStock(product, quantity) {
    if (quantity > product.stock) {
      throw conflict(
        `Only ${product.stock} of '${product.name}' in stock, requested ${quantity}`,
        'INSUFFICIENT_STOCK',
      );
    }
  }

  /** Build the API representation of a cart with line totals. */
  function view(userId) {
    const lines = [];
    for (const [productId, quantity] of getItems(userId)) {
      const product = store.products.get(productId);
      lines.push({
        productId,
        name: product.name,
        unitPriceCents: product.priceCents,
        quantity,
        lineTotalCents: product.priceCents * quantity,
      });
    }
    return {
      userId,
      items: lines,
      itemCount: lines.reduce((total, l) => total + l.quantity, 0),
      subtotalCents: lines.reduce((total, l) => total + l.lineTotalCents, 0),
    };
  }

  return {
    get(userId) {
      requireUser(userId);
      return view(userId);
    },

    /** Add to an existing line or create a new one. */
    addItem(userId, productId, quantity) {
      requireUser(userId);
      const product = requireProduct(productId);
      const items = getItems(userId);
      assertStock(product, (items.get(productId) || 0) + quantity);
      items.set(productId, (items.get(productId) || 0) + quantity);
      return view(userId);
    },

    /** Set an existing line to an exact quantity. */
    setQuantity(userId, productId, quantity) {
      requireUser(userId);
      const product = requireProduct(productId);
      const items = getItems(userId);
      if (!items.has(productId)) throw notFound(`Product '${productId}' is not in the cart`);
      assertStock(product, quantity);
      items.set(productId, quantity);
      return view(userId);
    },

    removeItem(userId, productId) {
      requireUser(userId);
      const items = getItems(userId);
      if (!items.delete(productId)) throw notFound(`Product '${productId}' is not in the cart`);
      return view(userId);
    },

    clear(userId) {
      requireUser(userId);
      getItems(userId).clear();
    },
  };
}

module.exports = { createCartService };
