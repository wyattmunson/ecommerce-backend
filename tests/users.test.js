'use strict';

const { buildTestApp } = require('./helpers');

describe('users API', () => {
  let api;
  beforeEach(() => {
    ({ api } = buildTestApp());
  });

  it('creates a user with the default budget', async () => {
    const res = await api.post('/api/users').send({ name: 'Ada', email: 'Ada@Example.com' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Ada',
      email: 'ada@example.com',
      budgetCents: 500000000000,
    });
    expect(res.body.id).toEqual(expect.any(String));
  });

  it('creates a user with a custom budget', async () => {
    const res = await api
      .post('/api/users')
      .send({ name: 'Bob', email: 'bob@example.com', budgetCents: 100 });
    expect(res.body.budgetCents).toBe(100);
  });

  it('rejects duplicate emails regardless of case', async () => {
    const res = await api
      .post('/api/users')
      .send({ name: 'Imposter', email: 'DEMO@example.com' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('validates input', async () => {
    const res = await api.post('/api/users').send({ name: '', email: 'not-an-email' });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d) => d.field).sort();
    expect(fields).toEqual(['email', 'name']);
  });

  it('fetches a user by id', async () => {
    const res = await api.get('/api/users/demo-user');
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('demo@example.com');
  });

  it('404s for unknown users', async () => {
    const res = await api.get('/api/users/ghost');
    expect(res.status).toBe(404);
  });
});
