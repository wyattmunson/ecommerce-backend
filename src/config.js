'use strict';

/**
 * Central place for runtime configuration. Everything is overridable via
 * environment variables so the same image works locally and in Kubernetes.
 */
function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development';

  return {
    nodeEnv,
    // PORT=0 is valid (the OS picks a free port), so don't use `||` here.
    port: env.PORT !== undefined ? parseInt(env.PORT, 10) : 3000,
    // Request logging is noisy in tests, so it is off by default there.
    logRequests: env.LOG_REQUESTS ? env.LOG_REQUESTS === 'true' : nodeEnv !== 'test',
    // Load the humorous product catalog on startup.
    seedData: env.SEED_DATA !== 'false',
    pricing: {
      // 8.25% sales tax, expressed as a fraction.
      taxRate: env.TAX_RATE !== undefined ? parseFloat(env.TAX_RATE) : 0.0825,
      // Flat "freight surcharge" added to every order: $25,000.00.
      shippingCents: env.SHIPPING_CENTS !== undefined ? parseInt(env.SHIPPING_CENTS, 10) : 2500000,
    },
    // Budget (in cents) given to new users who don't specify one: $5,000,000,000.
    defaultBudgetCents: 500000000000,
  };
}

module.exports = { loadConfig };
