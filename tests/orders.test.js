'use strict';

const { buildTestApp, addToCart } = require('./helpers');
const { estimateDelivery } = require('../src/services/orderService');

const ADDRESS = '1 Hangar Way, Suite 9';

describe('orders API', () => {
  let api;
  let store;
  beforeEach(() => {
    ({ api, store } = buildTestApp());
  });

  const checkout = (userId = 'demo-user') =>
    api.post('/api/orders').send({ userId, shippingAddress: ADDRESS });

  describe('POST /api/orders (checkout)', () => {
    it('creates an order, applies tax and shipping, and updates stock, budget, and cart', async () => {
      await addToCart(api, 'demo-user', 'jet-engine', 2);
      const budgetBefore = store.users.get('demo-user').budgetCents;

      const res = await checkout();
      expect(res.status).toBe(201);

      const subtotal = 2 * 1400000000;
      const tax = Math.round(subtotal * 0.0825);
      expect(res.body).toMatchObject({
        userId: 'demo-user',
        status: 'placed',
        subtotalCents: subtotal,
        taxCents: tax,
        shippingCents: 2500000,
        totalCents: subtotal + tax + 2500000,
        shippingAddress: ADDRESS,
        estimatedDelivery: '6-8 business months',
      });
      expect(res.body.items).toEqual([
        expect.objectContaining({ productId: 'jet-engine', quantity: 2, lineTotalCents: subtotal }),
      ]);

      expect(store.products.get('jet-engine').stock).toBe(4);
      expect(store.users.get('demo-user').budgetCents).toBe(budgetBefore - res.body.totalCents);
      expect((await api.get('/api/carts/demo-user')).body.items).toEqual([]);
    });

    it('rejects an empty cart', async () => {
      const res = await checkout();
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('returns 402 when the user cannot afford the order', async () => {
      await addToCart(api, 'broke-user', 'oil-rig');
      const res = await checkout('broke-user');
      expect(res.status).toBe(402);
      expect(res.body.error.code).toBe('INSUFFICIENT_FUNDS');
      // Nothing should have changed.
      expect(store.products.get('oil-rig').stock).toBe(2);
      expect(store.orders.size).toBe(0);
    });

    it('returns 409 if stock dropped after items were added to the cart', async () => {
      await addToCart(api, 'demo-user', 'oil-rig', 2);
      await api.put('/api/products/oil-rig').send({ stock: 1 });
      const res = await checkout();
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    });

    it('404s for unknown users', async () => {
      const res = await checkout('ghost');
      expect(res.status).toBe(404);
    });

    it('validates the body', async () => {
      const res = await api.post('/api/orders').send({ userId: 'demo-user', shippingAddress: 'x' });
      expect(res.status).toBe(400);
      expect(res.body.error.details[0].field).toBe('shippingAddress');
    });
  });

  describe('GET /api/orders', () => {
    beforeEach(async () => {
      await addToCart(api, 'demo-user', 'cloud');
      await checkout('demo-user');
      // $89,999 + tax + freight fits within the "merely wealthy" $250k budget.
      await addToCart(api, 'broke-user', 'premium-air');
      await checkout('broke-user');
    });

    it('lists all orders', async () => {
      const res = await api.get('/api/orders');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it('filters by user and status', async () => {
      const byUser = await api.get('/api/orders?userId=broke-user');
      expect(byUser.body).toHaveLength(1);

      const cancelledNone = await api.get('/api/orders?status=cancelled');
      expect(cancelledNone.body).toEqual([]);

      const placed = await api.get('/api/orders?status=placed');
      expect(placed.body).toHaveLength(2);
    });

    it('rejects unknown statuses', async () => {
      const res = await api.get('/api/orders?status=teleported');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/orders/:id', () => {
    it('fetches an order', async () => {
      await addToCart(api, 'demo-user', 'cloud');
      const created = await checkout();
      const res = await api.get(`/api/orders/${created.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
    });

    it('404s for unknown orders', async () => {
      expect((await api.get('/api/orders/nope')).status).toBe(404);
    });
  });

  describe('POST /api/orders/:id/cancel', () => {
    it('cancels an order, restocks, and refunds', async () => {
      const budgetBefore = store.users.get('demo-user').budgetCents;
      await addToCart(api, 'demo-user', 'jet-engine');
      const created = await checkout();

      const res = await api.post(`/api/orders/${created.body.id}/cancel`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');
      expect(res.body.cancelledAt).toEqual(expect.any(String));
      expect(store.products.get('jet-engine').stock).toBe(6);
      expect(store.users.get('demo-user').budgetCents).toBe(budgetBefore);
    });

    it('cannot cancel twice', async () => {
      await addToCart(api, 'demo-user', 'cloud');
      const created = await checkout();
      await api.post(`/api/orders/${created.body.id}/cancel`);
      const res = await api.post(`/api/orders/${created.body.id}/cancel`);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_CANCELLED');
    });

    it('still cancels if the product or user has since been deleted', async () => {
      await addToCart(api, 'demo-user', 'cloud');
      const created = await checkout();
      await api.delete('/api/products/cloud');
      store.users.delete('demo-user');
      const res = await api.post(`/api/orders/${created.body.id}/cancel`);
      expect(res.status).toBe(200);
    });

    it('404s for unknown orders', async () => {
      expect((await api.post('/api/orders/nope/cancel')).status).toBe(404);
    });
  });
});

describe('estimateDelivery', () => {
  it.each([
    [50000, '6-8 business days'],
    [100000000, '6-8 business months'],
    [10000000000, '6-8 business years'],
    [1000000000000, '6-8 business centuries'],
  ])('%i cents -> %s', (cents, expected) => {
    expect(estimateDelivery(cents)).toBe(expected);
  });
});
