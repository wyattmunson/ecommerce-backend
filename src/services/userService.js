'use strict';

const crypto = require('crypto');
const { notFound, conflict } = require('../utils/errors');

function createUserService(store, config) {
  return {
    create({ name, email, budgetCents }) {
      const normalizedEmail = email.toLowerCase();
      for (const user of store.users.values()) {
        if (user.email.toLowerCase() === normalizedEmail) {
          throw conflict(`A user with email '${email}' already exists`, 'EMAIL_TAKEN');
        }
      }

      const user = {
        id: crypto.randomUUID(),
        name,
        email: normalizedEmail,
        budgetCents: budgetCents === undefined ? config.defaultBudgetCents : budgetCents,
        createdAt: new Date().toISOString(),
      };
      store.users.set(user.id, user);
      return user;
    },

    get(id) {
      const user = store.users.get(id);
      if (!user) throw notFound(`User '${id}' not found`);
      return user;
    },
  };
}

module.exports = { createUserService };
