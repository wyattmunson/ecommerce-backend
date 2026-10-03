'use strict';

const crypto = require('crypto');
const { notFound } = require('../utils/errors');

function createReviewService(store) {
  function requireProduct(productId) {
    if (!store.products.has(productId)) throw notFound(`Product '${productId}' not found`);
  }

  return {
    list(productId) {
      requireProduct(productId);
      return [...(store.reviews.get(productId) || [])].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      );
    },

    add(productId, { author, rating, comment }) {
      requireProduct(productId);
      const review = {
        id: crypto.randomUUID(),
        productId,
        author,
        rating,
        comment: comment || '',
        createdAt: new Date().toISOString(),
      };
      const reviews = store.reviews.get(productId) || [];
      reviews.push(review);
      store.reviews.set(productId, reviews);
      return review;
    },
  };
}

module.exports = { createReviewService };
