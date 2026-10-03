'use strict';

const express = require('express');
const { validate } = require('../utils/validate');

function userRoutes({ users }) {
  const router = express.Router();

  // POST /api/users
  router.post('/', (req, res) => {
    const data = validate(req.body, {
      name: { type: 'string', required: true, minLength: 1, maxLength: 80 },
      email: { type: 'string', required: true, format: 'email', maxLength: 200 },
      budgetCents: { type: 'integer', min: 0 },
    });
    res.status(201).json(users.create(data));
  });

  // GET /api/users/:id
  router.get('/:id', (req, res) => {
    res.json(users.get(req.params.id));
  });

  return router;
}

module.exports = { userRoutes };
