'use strict';

const express = require('express');

function statsRoutes({ stats }) {
  const router = express.Router();

  // GET /api/stats
  router.get('/', (req, res) => {
    res.json(stats.summary());
  });

  return router;
}

module.exports = { statsRoutes };
