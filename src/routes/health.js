'use strict';

const express = require('express');

/** Liveness and readiness endpoints used by Kubernetes probes. */
function healthRoutes({ store }) {
  const router = express.Router();

  // Liveness: the process is up.
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
  });

  // Readiness: the in-memory catalog is loaded and we can serve traffic.
  router.get('/ready', (req, res) => {
    const ready = store.products.size > 0;
    res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready' });
  });

  return router;
}

module.exports = { healthRoutes };
