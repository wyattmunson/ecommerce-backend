'use strict';

const { buildTestApp } = require('./helpers');

describe('products API', () => {
  let api;
  beforeEach(() => {
    ({ api } = buildTestApp());
  });

  describe('GET /api/products', () => {
    it('returns a paginated list sorted by name', async () => {
      const res = await api.get('/api/products');
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(10);
      expect(res.body.total).toBe(14);
      expect(res.body.totalPages).toBe(2);
      const names = res.body.items.map((p) => p.name);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    });

    it('supports page and limit', async () => {
      const res = await api.get('/api/products?page=2&limit=10');
      expect(res.body.items).toHaveLength(4);
      expect(res.body.page).toBe(2);
    });

    it('filters by category', async () => {
      const res = await api.get('/api/products?category=maritime');
      expect(res.body.total).toBe(3);
      expect(res.body.items.every((p) => p.category === 'maritime')).toBe(true);
    });

    it('searches name and description case-insensitively', async () => {
      const byName = await api.get('/api/products?q=OIL RIG');
      expect(byName.body.items.map((p) => p.id)).toEqual(['oil-rig']);

      const byDescription = await api.get('/api/products?q=neighbor');
      expect(byDescription.body.items.map((p) => p.id)).toEqual(['tunnel-boring-machine']);
    });

    it('filters by price range in cents', async () => {
      const res = await api.get('/api/products?minPrice=100000000000&maxPrice=500000000000');
      const ids = res.body.items.map((p) => p.id).sort();
      // $1B <= price <= $5B
      expect(ids).toEqual(['collider-kit', 'space-elevator']);
    });

    it('sorts by price descending and ascending', async () => {
      const desc = await api.get('/api/products?sort=price_desc&limit=1');
      expect(desc.body.items[0].id).toBe('aircraft-carrier');

      const asc = await api.get('/api/products?sort=price_asc&limit=1');
      expect(asc.body.items[0].id).toBe('premium-air');
    });

    it('sorts by newest', async () => {
      const res = await api.get('/api/products?sort=newest');
      expect(res.status).toBe(200);
    });

    it('hides out-of-stock products when inStock=true', async () => {
      await api.put('/api/products/cloud').send({ stock: 0 });
      const res = await api.get('/api/products?inStock=true&limit=100');
      expect(res.body.items.find((p) => p.id === 'cloud')).toBeUndefined();
      expect(res.body.total).toBe(13);
    });

    it('rejects invalid query params', async () => {
      const res = await api.get('/api/products?sort=sparkliness&limit=500&page=abc');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      const fields = res.body.error.details.map((d) => d.field).sort();
      expect(fields).toEqual(['limit', 'page', 'sort']);
    });
  });

  describe('GET /api/products/:id', () => {
    it('returns a product with an empty rating', async () => {
      const res = await api.get('/api/products/jet-engine');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: 'jet-engine',
        category: 'aerospace',
        priceCents: 1400000000,
        rating: { average: null, count: 0 },
      });
    });

    it('returns 404 for an unknown product', async () => {
      const res = await api.get('/api/products/nope');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/products', () => {
    const valid = { name: 'Moon Lease', category: 'novelty', priceCents: 99900, stock: 3 };

    it('creates a product', async () => {
      const res = await api.post('/api/products').send(valid);
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ ...valid, description: '' });
      expect(res.body.id).toEqual(expect.any(String));

      const fetched = await api.get(`/api/products/${res.body.id}`);
      expect(fetched.status).toBe(200);
    });

    it('defaults stock to 0 and ignores unknown fields', async () => {
      const res = await api.post('/api/products').send({
        name: 'Moon Deed',
        category: 'novelty',
        priceCents: 1,
        id: 'hacker',
      });
      expect(res.body.stock).toBe(0);
      expect(res.body.id).not.toBe('hacker');
    });

    it('validates required fields and types', async () => {
      const res = await api.post('/api/products').send({ name: '', priceCents: -5, stock: 1.5 });
      expect(res.status).toBe(400);
      const fields = res.body.error.details.map((d) => d.field).sort();
      expect(fields).toEqual(['category', 'name', 'priceCents', 'stock']);
    });

    it('rejects malformed JSON', async () => {
      const res = await api
        .post('/api/products')
        .set('Content-Type', 'application/json')
        .send('{"name": ');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_JSON');
    });
  });

  describe('PUT /api/products/:id', () => {
    it('updates only the provided fields', async () => {
      const res = await api.put('/api/products/pet-rock').send({ priceCents: 1 });
      expect(res.status).toBe(200);
      expect(res.body.priceCents).toBe(1);
      expect(res.body.name).toBe('Certified Authentic Pet Rock');
      expect(res.body.id).toBe('pet-rock');
    });

    it('404s for unknown products', async () => {
      const res = await api.put('/api/products/nope').send({ priceCents: 1 });
      expect(res.status).toBe(404);
    });

    it('validates input', async () => {
      const res = await api.put('/api/products/pet-rock').send({ priceCents: 'free' });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('deletes a product and removes it from carts', async () => {
      await api.post('/api/carts/demo-user/items').send({ productId: 'cloud' });

      const res = await api.delete('/api/products/cloud');
      expect(res.status).toBe(204);

      expect((await api.get('/api/products/cloud')).status).toBe(404);
      const cart = await api.get('/api/carts/demo-user');
      expect(cart.body.items).toEqual([]);
    });

    it('404s for unknown products', async () => {
      const res = await api.delete('/api/products/nope');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/categories', () => {
    it('lists categories with counts', async () => {
      const res = await api.get('/api/categories');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([
        { name: 'aerospace', productCount: 3 },
        { name: 'energy', productCount: 1 },
        { name: 'heavy-machinery', productCount: 2 },
        { name: 'maritime', productCount: 3 },
        { name: 'novelty', productCount: 4 },
        { name: 'science', productCount: 1 },
      ]);
    });
  });
});
