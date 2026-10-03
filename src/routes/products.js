'use strict';

const express = require('express');
const { validate } = require('../utils/validate');
const { SORT_OPTIONS } = require('../services/productService');

const listQuerySchema = {
  category: { type: 'string' },
  q: { type: 'string' },
  minPrice: { type: 'integer', min: 0 },
  maxPrice: { type: 'integer', min: 0 },
  inStock: { type: 'boolean' },
  sort: { type: 'string', enum: SORT_OPTIONS },
  page: { type: 'integer', min: 1 },
  limit: { type: 'integer', min: 1, max: 100 },
};

const createSchema = {
  name: { type: 'string', required: true, minLength: 1, maxLength: 120 },
  description: { type: 'string', maxLength: 1000 },
  category: { type: 'string', required: true, minLength: 1, maxLength: 50 },
  priceCents: { type: 'integer', required: true, min: 0 },
  stock: { type: 'integer', min: 0 },
};

// Same fields as create, but nothing is required on update.
const updateSchema = Object.fromEntries(
  Object.entries(createSchema).map(([field, rules]) => [field, { ...rules, required: false }]),
);

function productRoutes({ products, reviews }) {
  const router = express.Router();

  // GET /api/products?category=&q=&minPrice=&maxPrice=&inStock=&sort=&page=&limit=
  router.get('/', (req, res) => {
    const filters = validate(req.query, listQuerySchema, { coerce: true });
    res.json(products.list(filters));
  });

  // GET /api/products/:id
  router.get('/:id', (req, res) => {
    res.json(products.get(req.params.id));
  });

  // POST /api/products
  router.post('/', (req, res) => {
    const data = validate(req.body, createSchema);
    res.status(201).json(products.create(data));
  });

  // PUT /api/products/:id
  router.put('/:id', (req, res) => {
    const changes = validate(req.body, updateSchema);
    res.json(products.update(req.params.id, changes));
  });

  // DELETE /api/products/:id
  router.delete('/:id', (req, res) => {
    products.remove(req.params.id);
    res.status(204).end();
  });

  // GET /api/products/:id/reviews
  router.get('/:id/reviews', (req, res) => {
    res.json(reviews.list(req.params.id));
  });

  // POST /api/products/:id/reviews
  router.post('/:id/reviews', (req, res) => {
    const data = validate(req.body, {
      author: { type: 'string', required: true, minLength: 1, maxLength: 80 },
      rating: { type: 'integer', required: true, min: 1, max: 5 },
      comment: { type: 'string', maxLength: 1000 },
    });
    res.status(201).json(reviews.add(req.params.id, data));
  });

  return router;
}

module.exports = { productRoutes };
