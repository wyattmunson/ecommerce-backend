'use strict';

const express = require('express');
const { loadConfig } = require('./config');
const { createStore } = require('./store');
const { createServices } = require('./services');
const { requestLogger } = require('./middleware/requestLogger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { healthRoutes } = require('./routes/health');
const { productRoutes } = require('./routes/products');
const { categoryRoutes } = require('./routes/categories');
const { userRoutes } = require('./routes/users');
const { cartRoutes } = require('./routes/carts');
const { orderRoutes } = require('./routes/orders');
const { statsRoutes } = require('./routes/stats');

/**
 * Build the Express app. Config and store can be injected so tests get an
 * isolated, predictable instance.
 */
function createApp({ config = loadConfig(), store = createStore({ seedData: config.seedData }) } = {}) {
  const app = express();
  const services = createServices(store, config);

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  if (config.logRequests) app.use(requestLogger);

  app.use(healthRoutes({ store }));

  app.use('/api/products', productRoutes(services));
  app.use('/api/categories', categoryRoutes(services));
  app.use('/api/users', userRoutes(services));
  app.use('/api/carts', cartRoutes(services));
  app.use('/api/orders', orderRoutes(services));
  app.use('/api/stats', statsRoutes(services));

  app.use(notFoundHandler);
  app.use(errorHandler);

  // Exposed for tests and tooling.
  app.locals.store = store;
  app.locals.services = services;
  return app;
}

module.exports = { createApp };
