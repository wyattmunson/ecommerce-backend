'use strict';

const crypto = require('crypto');
const { notFound } = require('../utils/errors');

const SORTERS = {
  name: (a, b) => a.name.localeCompare(b.name),
  price_asc: (a, b) => a.priceCents - b.priceCents,
  price_desc: (a, b) => b.priceCents - a.priceCents,
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
};

function createProductService(store) {
  function ratingFor(productId) {
    const reviews = store.reviews.get(productId) || [];
    if (reviews.length === 0) return { average: null, count: 0 };
    const sum = reviews.reduce((total, r) => total + r.rating, 0);
    return { average: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
  }

  const withRating = (product) => ({ ...product, rating: ratingFor(product.id) });

  function getRaw(id) {
    const product = store.products.get(id);
    if (!product) throw notFound(`Product '${id}' not found`);
    return product;
  }

  return {
    /**
     * List products with optional filtering, sorting, and pagination.
     * Filters: category, q (name/description search), minPrice, maxPrice (cents), inStock.
     */
    list({ category, q, minPrice, maxPrice, inStock, sort = 'name', page = 1, limit = 10 } = {}) {
      let items = [...store.products.values()];

      if (category) items = items.filter((p) => p.category === category);
      if (q) {
        const needle = q.toLowerCase();
        items = items.filter(
          (p) =>
            p.name.toLowerCase().includes(needle) || p.description.toLowerCase().includes(needle),
        );
      }
      if (minPrice !== undefined) items = items.filter((p) => p.priceCents >= minPrice);
      if (maxPrice !== undefined) items = items.filter((p) => p.priceCents <= maxPrice);
      if (inStock) items = items.filter((p) => p.stock > 0);

      items.sort(SORTERS[sort]);

      const total = items.length;
      const start = (page - 1) * limit;
      return {
        items: items.slice(start, start + limit).map(withRating),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      };
    },

    get(id) {
      return withRating(getRaw(id));
    },

    create(data) {
      const now = new Date().toISOString();
      const product = {
        id: crypto.randomUUID(),
        name: data.name,
        description: data.description || '',
        category: data.category,
        priceCents: data.priceCents,
        stock: data.stock === undefined ? 0 : data.stock,
        createdAt: now,
        updatedAt: now,
      };
      store.products.set(product.id, product);
      return withRating(product);
    },

    update(id, changes) {
      const product = getRaw(id);
      const updated = { ...product, ...changes, id: product.id, updatedAt: new Date().toISOString() };
      store.products.set(id, updated);
      return withRating(updated);
    },

    /** Delete a product, and clean up carts and reviews that reference it. */
    remove(id) {
      getRaw(id);
      store.products.delete(id);
      store.reviews.delete(id);
      for (const cart of store.carts.values()) cart.delete(id);
    },

    /** Distinct categories with product counts, alphabetically. */
    categories() {
      const counts = new Map();
      for (const p of store.products.values()) {
        counts.set(p.category, (counts.get(p.category) || 0) + 1);
      }
      return [...counts.entries()]
        .map(([name, productCount]) => ({ name, productCount }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  };
}

module.exports = { createProductService, SORT_OPTIONS: Object.keys(SORTERS) };
