'use strict';

const express = require('express');

function categoryRoutes({ products }) {
  const router = express.Router();

  // GET /api/categories
  router.get('/', (req, res) => {
    res.json(products.categories());
  });

  return router;
}

module.exports = { categoryRoutes };
