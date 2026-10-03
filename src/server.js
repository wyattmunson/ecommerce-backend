'use strict';

const { createApp } = require('./app');
const { loadConfig } = require('./config');

/**
 * Start listening and return the http.Server. Registers SIGTERM/SIGINT
 * handlers so Kubernetes can stop the pod gracefully.
 */
function start(config = loadConfig()) {
  const app = createApp({ config });
  const server = app.listen(config.port, () => {
    const { port } = server.address();
    console.log(`ecommerce-backend listening on port ${port} (${config.nodeEnv})`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(() => process.exit(0));
    // Don't hang forever on keep-alive connections.
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));

  return server;
}

/* istanbul ignore next */
if (require.main === module) start();

module.exports = { start };
