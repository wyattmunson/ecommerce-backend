'use strict';

const seed = require('../data/seed');

/**
 * The entire "database". Everything lives in Maps and is lost on restart.
 *
 * Services receive a store instance, so tests can create an isolated one
 * per test and a real database could later be swapped in behind the same
 * method names.
 */
class Store {
  constructor() {
    this.products = new Map(); // id -> product
    this.users = new Map(); // id -> user
    this.carts = new Map(); // userId -> Map(productId -> quantity)
    this.orders = new Map(); // id -> order
    this.reviews = new Map(); // productId -> review[]
  }

  /** Load the humorous default catalog and demo users. */
  seed() {
    const now = new Date().toISOString();
    for (const product of seed.products) {
      this.products.set(product.id, { ...product, createdAt: now, updatedAt: now });
    }
    for (const user of seed.users) {
      this.users.set(user.id, { ...user, createdAt: now });
    }
    return this;
  }

  /** Remove everything (used by tests). */
  clear() {
    this.products.clear();
    this.users.clear();
    this.carts.clear();
    this.orders.clear();
    this.reviews.clear();
    return this;
  }
}

function createStore({ seedData = true } = {}) {
  const store = new Store();
  if (seedData) store.seed();
  return store;
}

module.exports = { Store, createStore };
