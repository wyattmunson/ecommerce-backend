'use strict';

const express = require('express');
const { validate } = require('../utils/validate');

const addItemSchema = {
  productId: { type: 'string', required: true },
  quantity: { type: 'integer', min: 1, max: 1000 },
};

const quantitySchema = {
  quantity: { type: 'integer', required: true, min: 1, max: 1000 },
};

function cartRoutes({ carts }) {
  const router = express.Router();

  // GET /api/carts/:userId
  router.get('/:userId', (req, res) => {
    res.json(carts.get(req.params.userId));
  });

  // POST /api/carts/:userId/items   { productId, quantity? }
  router.post('/:userId/items', (req, res) => {
    const { productId, quantity = 1 } = validate(req.body, addItemSchema);
    res.status(201).json(carts.addItem(req.params.userId, productId, quantity));
  });

  // PUT /api/carts/:userId/items/:productId   { quantity }
  router.put('/:userId/items/:productId', (req, res) => {
    const { quantity } = validate(req.body, quantitySchema);
    res.json(carts.setQuantity(req.params.userId, req.params.productId, quantity));
  });

  // DELETE /api/carts/:userId/items/:productId
  router.delete('/:userId/items/:productId', (req, res) => {
    res.json(carts.removeItem(req.params.userId, req.params.productId));
  });

  // DELETE /api/carts/:userId   (empty the whole cart)
  router.delete('/:userId', (req, res) => {
    carts.clear(req.params.userId);
    res.status(204).end();
  });

  return router;
}

module.exports = { cartRoutes };
