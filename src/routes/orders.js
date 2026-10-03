'use strict';

const express = require('express');
const { validate } = require('../utils/validate');
const { ORDER_STATUSES } = require('../services/orderService');

function orderRoutes({ orders }) {
  const router = express.Router();

  // POST /api/orders   { userId, shippingAddress }  -> checks out the user's cart
  router.post('/', (req, res) => {
    const { userId, shippingAddress } = validate(req.body, {
      userId: { type: 'string', required: true },
      shippingAddress: { type: 'string', required: true, minLength: 5, maxLength: 300 },
    });
    res.status(201).json(orders.checkout(userId, { shippingAddress }));
  });

  // GET /api/orders?userId=&status=
  router.get('/', (req, res) => {
    const filters = validate(
      req.query,
      {
        userId: { type: 'string' },
        status: { type: 'string', enum: ORDER_STATUSES },
      },
      { coerce: true },
    );
    res.json(orders.list(filters));
  });

  // GET /api/orders/:id
  router.get('/:id', (req, res) => {
    res.json(orders.get(req.params.id));
  });

  // POST /api/orders/:id/cancel
  router.post('/:id/cancel', (req, res) => {
    res.json(orders.cancel(req.params.id));
  });

  return router;
}

module.exports = { orderRoutes };
