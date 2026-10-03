'use strict';

const { createProductService } = require('./productService');
const { createUserService } = require('./userService');
const { createCartService } = require('./cartService');
const { createOrderService } = require('./orderService');
const { createReviewService } = require('./reviewService');
const { createStatsService } = require('./statsService');

/** Wire every service to the same store. */
function createServices(store, config) {
  return {
    products: createProductService(store),
    users: createUserService(store, config),
    carts: createCartService(store),
    orders: createOrderService(store, config),
    reviews: createReviewService(store),
    stats: createStatsService(store),
  };
}

module.exports = { createServices };
