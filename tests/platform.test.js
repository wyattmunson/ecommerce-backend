'use strict';

const request = require('supertest');
const { buildTestApp, addToCart } = require('./helpers');
const { createApp } = require('../src/app');
const { loadConfig } = require('../src/config');
const { createStore } = require('../src/store');
const { start } = require('../src/server');
const { requestLogger } = require('../src/middleware/requestLogger');
const { errorHandler } = require('../src/middleware/errorHandler');
const { validate } = require('../src/utils/validate');
const { calculateTotals } = require('../src/utils/pricing');

describe('health and readiness', () => {
  it('GET /health', async () => {
    const { api } = buildTestApp();
    const res = await api.get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /ready is 200 when the catalog is loaded', async () => {
    const { api } = buildTestApp();
    const res = await api.get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
  });

  it('GET /ready is 503 with an empty catalog', async () => {
    const { api } = buildTestApp({ SEED_DATA: 'false' });
    const res = await api.get('/ready');
    expect(res.status).toBe(503);
  });
});

describe('GET /api/stats', () => {
  it('summarizes the store', async () => {
    const { api } = buildTestApp();
    const res = await api.get('/api/stats');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      productCount: 14,
      userCount: 2,
      orderCount: 0,
      activeOrderCount: 0,
      revenueCents: 0,
      mostExpensiveProduct: { id: 'aircraft-carrier' },
    });
    expect(res.body.inventoryValueCents).toBeGreaterThan(0);
  });

  it('counts revenue only for non-cancelled orders', async () => {
    const { api } = buildTestApp();
    await addToCart(api, 'demo-user', 'cloud');
    const kept = await api
      .post('/api/orders')
      .send({ userId: 'demo-user', shippingAddress: '1 Cloud St' });
    await addToCart(api, 'demo-user', 'pet-rock');
    const cancelled = await api
      .post('/api/orders')
      .send({ userId: 'demo-user', shippingAddress: '1 Cloud St' });
    await api.post(`/api/orders/${cancelled.body.id}/cancel`);

    const res = await api.get('/api/stats');
    expect(res.body.orderCount).toBe(2);
    expect(res.body.activeOrderCount).toBe(1);
    expect(res.body.revenueCents).toBe(kept.body.totalCents);
  });

  it('handles an empty catalog', async () => {
    const { api } = buildTestApp({ SEED_DATA: 'false' });
    const res = await api.get('/api/stats');
    expect(res.body.mostExpensiveProduct).toBeNull();
  });
});

describe('error handling', () => {
  it('returns a JSON 404 for unknown routes', async () => {
    const { api } = buildTestApp();
    const res = await api.get('/api/unicorns');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('hides unexpected errors behind a 500', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    errorHandler(new Error('kaboom'), {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our end' },
    });
    spy.mockRestore();
  });

  it('does not advertise Express', async () => {
    const { api } = buildTestApp();
    const res = await api.get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('validate()', () => {
  it('treats non-object input as empty', () => {
    expect(validate(undefined, { a: { type: 'string' } })).toEqual({});
  });

  it('trims strings and drops unknown fields', () => {
    const out = validate({ a: '  hi  ', b: 'x' }, { a: { type: 'string' } });
    expect(out).toEqual({ a: 'hi' });
  });

  it('enforces string length, enum, and email format', () => {
    const schema = {
      short: { type: 'string', minLength: 3 },
      long: { type: 'string', maxLength: 2 },
      pick: { type: 'string', enum: ['a', 'b'] },
      email: { type: 'string', format: 'email' },
      num: { type: 'string' },
    };
    expect(() =>
      validate({ short: 'a', long: 'abc', pick: 'z', email: 'nope', num: 5 }, schema),
    ).toThrow('Request validation failed');
  });

  it('enforces integer bounds and booleans', () => {
    const schema = { n: { type: 'integer', min: 1, max: 3 }, flag: { type: 'boolean' } };
    expect(() => validate({ n: 0 }, schema)).toThrow();
    expect(() => validate({ n: 4 }, schema)).toThrow();
    expect(() => validate({ n: 1.5 }, schema)).toThrow();
    expect(() => validate({ flag: 'yes' }, schema)).toThrow();
    expect(validate({ n: 2, flag: false }, schema)).toEqual({ n: 2, flag: false });
  });

  it('coerces query-string values only when asked', () => {
    const schema = { n: { type: 'integer' }, flag: { type: 'boolean' }, s: { type: 'string' } };
    expect(validate({ n: '5', flag: 'true', s: 'x' }, schema, { coerce: true })).toEqual({
      n: 5,
      flag: true,
      s: 'x',
    });
    expect(validate({ flag: 'false' }, schema, { coerce: true })).toEqual({ flag: false });
    expect(() => validate({ n: '5' }, schema)).toThrow();
    expect(() => validate({ n: '5.5' }, schema, { coerce: true })).toThrow();
  });
});

describe('calculateTotals()', () => {
  it('adds rounded tax and shipping to the subtotal', () => {
    expect(calculateTotals(1001, { taxRate: 0.1, shippingCents: 50 })).toEqual({
      subtotalCents: 1001,
      taxCents: 100,
      shippingCents: 50,
      totalCents: 1151,
    });
  });
});

describe('loadConfig()', () => {
  it('has sensible defaults', () => {
    const config = loadConfig({});
    expect(config).toMatchObject({
      nodeEnv: 'development',
      port: 3000,
      logRequests: true,
      seedData: true,
      pricing: { taxRate: 0.0825, shippingCents: 2500000 },
    });
  });

  it('reads overrides from the environment', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      PORT: '8080',
      LOG_REQUESTS: 'false',
      SEED_DATA: 'false',
      TAX_RATE: '0',
      SHIPPING_CENTS: '0',
    });
    expect(config).toMatchObject({
      port: 8080,
      logRequests: false,
      seedData: false,
      pricing: { taxRate: 0, shippingCents: 0 },
    });
  });

  it('silences request logs in test unless asked', () => {
    expect(loadConfig({ NODE_ENV: 'test' }).logRequests).toBe(false);
    expect(loadConfig({ NODE_ENV: 'test', LOG_REQUESTS: 'true' }).logRequests).toBe(true);
  });
});

describe('createApp() defaults', () => {
  it('builds its own config and store when none are provided', async () => {
    const res = await request(createApp()).get('/api/products/jet-engine');
    expect(res.status).toBe(200);
  });

  it('shares an injected store', () => {
    const store = createStore({ seedData: false });
    const app = createApp({ config: loadConfig({ NODE_ENV: 'test' }), store });
    expect(app.locals.store).toBe(store);
  });

  it('clears the store', () => {
    const store = createStore();
    expect(store.products.size).toBeGreaterThan(0);
    store.clear();
    expect(store.products.size).toBe(0);
  });
});

describe('request logging', () => {
  it('logs one JSON line per request when enabled', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const { api } = buildTestApp({ LOG_REQUESTS: 'true' });
    await api.get('/health');
    expect(log).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(log.mock.calls[0][0]);
    expect(entry).toMatchObject({ method: 'GET', path: '/health', status: 200 });
    log.mockRestore();
  });

  it('exports the middleware', () => {
    expect(typeof requestLogger).toBe('function');
  });
});

describe('server start()', () => {
  it('listens and serves requests', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const server = start(loadConfig({ NODE_ENV: 'test', PORT: '0' }));
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();

    const res = await fetch(`http://127.0.0.1:${port}/health`);
    expect(res.status).toBe(200);

    await new Promise((resolve) => server.close(resolve));
    log.mockRestore();
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
  });
});
