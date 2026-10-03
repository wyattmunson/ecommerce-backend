'use strict';

const { buildTestApp, addToCart } = require('./helpers');

describe('carts API', () => {
  let api;
  beforeEach(() => {
    ({ api } = buildTestApp());
  });

  it('starts empty', async () => {
    const res = await api.get('/api/carts/demo-user');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userId: 'demo-user', items: [], itemCount: 0, subtotalCents: 0 });
  });

  it('adds items with a default quantity of 1 and computes totals', async () => {
    const res = await addToCart(api, 'demo-user', 'jet-engine', 2);
    expect(res.status).toBe(201);
    await addToCart(api, 'demo-user', 'pet-rock');
    const cart = (await api.get('/api/carts/demo-user')).body;

    expect(cart.itemCount).toBe(3);
    expect(cart.items).toHaveLength(2);
    expect(cart.items[0]).toMatchObject({
      productId: 'jet-engine',
      quantity: 2,
      unitPriceCents: 1400000000,
      lineTotalCents: 2800000000,
    });
    expect(cart.subtotalCents).toBe(2800000000 + 150000000);
  });

  it('merges quantities when adding the same product twice', async () => {
    await addToCart(api, 'demo-user', 'cloud', 2);
    const res = await addToCart(api, 'demo-user', 'cloud', 3);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].quantity).toBe(5);
  });

  it('refuses to exceed available stock, including what is already in the cart', async () => {
    await addToCart(api, 'demo-user', 'oil-rig', 2);
    const res = await addToCart(api, 'demo-user', 'oil-rig', 1);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('validates the add-item body', async () => {
    const res = await api.post('/api/carts/demo-user/items').send({ quantity: 0 });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d) => d.field).sort();
    expect(fields).toEqual(['productId', 'quantity']);
  });

  it('404s for unknown users and products', async () => {
    expect((await addToCart(api, 'ghost', 'cloud')).status).toBe(404);
    expect((await addToCart(api, 'demo-user', 'nope')).status).toBe(404);
    expect((await api.get('/api/carts/ghost')).status).toBe(404);
  });

  describe('PUT /api/carts/:userId/items/:productId', () => {
    it('sets an exact quantity', async () => {
      await addToCart(api, 'demo-user', 'cloud', 2);
      const res = await api.put('/api/carts/demo-user/items/cloud').send({ quantity: 7 });
      expect(res.status).toBe(200);
      expect(res.body.items[0].quantity).toBe(7);
    });

    it('checks stock', async () => {
      await addToCart(api, 'demo-user', 'oil-rig');
      const res = await api.put('/api/carts/demo-user/items/oil-rig').send({ quantity: 3 });
      expect(res.status).toBe(409);
    });

    it('404s when the product is not in the cart', async () => {
      const res = await api.put('/api/carts/demo-user/items/cloud').send({ quantity: 1 });
      expect(res.status).toBe(404);
    });

    it('requires a quantity', async () => {
      await addToCart(api, 'demo-user', 'cloud');
      const res = await api.put('/api/carts/demo-user/items/cloud').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE endpoints', () => {
    it('removes a single item', async () => {
      await addToCart(api, 'demo-user', 'cloud');
      await addToCart(api, 'demo-user', 'pet-rock');
      const res = await api.delete('/api/carts/demo-user/items/cloud');
      expect(res.status).toBe(200);
      expect(res.body.items.map((i) => i.productId)).toEqual(['pet-rock']);
    });

    it('404s when removing an item that is not in the cart', async () => {
      const res = await api.delete('/api/carts/demo-user/items/cloud');
      expect(res.status).toBe(404);
    });

    it('empties the whole cart', async () => {
      await addToCart(api, 'demo-user', 'cloud');
      const res = await api.delete('/api/carts/demo-user');
      expect(res.status).toBe(204);
      expect((await api.get('/api/carts/demo-user')).body.items).toEqual([]);
    });

    it('404s when clearing the cart of an unknown user', async () => {
      expect((await api.delete('/api/carts/ghost')).status).toBe(404);
    });
  });
});
