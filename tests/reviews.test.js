'use strict';

const { buildTestApp } = require('./helpers');

describe('reviews API', () => {
  let api;
  beforeEach(() => {
    ({ api } = buildTestApp());
  });

  it('starts with no reviews', async () => {
    const res = await api.get('/api/products/oil-rig/reviews');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('adds a review and reflects it in the product rating', async () => {
    const created = await api
      .post('/api/products/oil-rig/reviews')
      .send({ author: 'Captain Haddock', rating: 5, comment: 'Floats beautifully.' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ productId: 'oil-rig', author: 'Captain Haddock', rating: 5 });

    await api.post('/api/products/oil-rig/reviews').send({ author: 'Grumpy', rating: 2 });

    const reviews = await api.get('/api/products/oil-rig/reviews');
    expect(reviews.body).toHaveLength(2);

    const product = await api.get('/api/products/oil-rig');
    expect(product.body.rating).toEqual({ average: 3.5, count: 2 });
  });

  it('validates the rating range and author', async () => {
    const res = await api.post('/api/products/oil-rig/reviews').send({ rating: 9 });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d) => d.field).sort();
    expect(fields).toEqual(['author', 'rating']);
  });

  it('404s for unknown products', async () => {
    expect((await api.get('/api/products/nope/reviews')).status).toBe(404);
    const res = await api.post('/api/products/nope/reviews').send({ author: 'A', rating: 3 });
    expect(res.status).toBe(404);
  });

  it('removes reviews when the product is deleted', async () => {
    await api.post('/api/products/cloud/reviews').send({ author: 'A', rating: 4 });
    await api.delete('/api/products/cloud');
    expect((await api.get('/api/products/cloud/reviews')).status).toBe(404);
  });
});
