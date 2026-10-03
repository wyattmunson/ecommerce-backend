'use strict';

const request = require('supertest');
const { createApp } = require('../src/app');
const { loadConfig } = require('../src/config');
const { createStore } = require('../src/store');

/** Fresh app + seeded store, isolated from every other test. */
function buildTestApp(envOverrides = {}) {
  const config = loadConfig({ NODE_ENV: 'test', ...envOverrides });
  const store = createStore({ seedData: config.seedData });
  const app = createApp({ config, store });
  return { app, store, config, api: request(app) };
}

/** Add `quantity` of a product to a user's cart through the API. */
async function addToCart(api, userId, productId, quantity = 1) {
  return api.post(`/api/carts/${userId}/items`).send({ productId, quantity });
}

module.exports = { buildTestApp, addToCart };
