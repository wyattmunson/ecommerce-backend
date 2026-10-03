# Ecommerce Backend

A fake e-commerce API that sells jet engines, off-shore oil rigs, and other
perfectly reasonable purchases at astronomical prices. Built with Node.js and
Express. **All data lives in memory** and resets on restart.

## Quick start

```bash
npm install
npm start            # http://localhost:3000
npm run dev          # restart on file changes
npm test             # run the tests
npm run test:coverage
```

Two users are seeded: `demo-user` (a $100B budget) and `broke-user` (a measly
$250K, good for testing `402 Payment Required`).

```bash
curl "localhost:3000/api/products?sort=price_desc&limit=3"
curl -X POST localhost:3000/api/carts/demo-user/items \
  -H 'content-type: application/json' -d '{"productId":"oil-rig"}'
curl -X POST localhost:3000/api/orders \
  -H 'content-type: application/json' \
  -d '{"userId":"demo-user","shippingAddress":"1 Rig Lane, Houston"}'
```

All prices are **integer cents** (`priceCents`).

## Routes

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Liveness probe |
| GET | `/ready` | Readiness probe (503 if the catalog is empty) |
| GET | `/api/products` | List; filters `category`, `q`, `minPrice`, `maxPrice`, `inStock`; `sort` (`name`, `price_asc`, `price_desc`, `newest`); `page`, `limit` |
| GET | `/api/products/:id` | Product details with average rating |
| POST | `/api/products` | Create a product |
| PUT | `/api/products/:id` | Partially update a product |
| DELETE | `/api/products/:id` | Delete (also removes it from carts and drops its reviews) |
| GET | `/api/products/:id/reviews` | List reviews |
| POST | `/api/products/:id/reviews` | Add a review (`author`, `rating` 1-5, `comment`) |
| GET | `/api/categories` | Categories with product counts |
| POST | `/api/users` | Create a user (`name`, `email`, optional `budgetCents`) |
| GET | `/api/users/:id` | Get a user |
| GET | `/api/carts/:userId` | View cart with totals |
| POST | `/api/carts/:userId/items` | Add an item (`productId`, `quantity`) |
| PUT | `/api/carts/:userId/items/:productId` | Set an item's quantity |
| DELETE | `/api/carts/:userId/items/:productId` | Remove an item |
| DELETE | `/api/carts/:userId` | Empty the cart |
| POST | `/api/orders` | Check out the cart (`userId`, `shippingAddress`) |
| GET | `/api/orders` | List; filters `userId`, `status` |
| GET | `/api/orders/:id` | Get an order |
| POST | `/api/orders/:id/cancel` | Cancel; restocks items and refunds the user |
| GET | `/api/stats` | Store-wide totals |

Errors are always JSON: `{ "error": { "code", "message", "details" } }`.
Notable statuses: `400` validation, `402` can't afford it, `404`, `409`
(insufficient stock, duplicate email, already cancelled).

## Code layout

```
src/
  server.js            process entrypoint (listen + graceful shutdown)
  app.js               createApp({ config, store }) - wires middleware and routes
  config.js            env-driven configuration
  routes/              thin HTTP layer: parse/validate input, call a service
  services/            business logic (products, carts, orders, reviews, users, stats)
  store/               the in-memory "database" (Maps)
  data/seed.js         the humorous product catalog and demo users
  middleware/          error handling, request logging
  utils/               validate (schema validator), errors, pricing
tests/                 Jest + Supertest; helpers.js builds an isolated app per test
```

Where to make common changes:

- **New product or demo user:** `src/data/seed.js` (some tests assert on catalog counts).
- **New endpoint:** add a service method, then a handler in `src/routes/*.js`
  (register new router files in `src/app.js`), then tests.
- **Pricing rules (tax, shipping):** `src/utils/pricing.js` and `src/config.js`.
- **Validation:** schemas live next to each route; rules are in `src/utils/validate.js`.
- **Swap the storage layer:** services only touch `store.*` Maps.

Jest enforces an 80% coverage threshold (currently about 98%).

## Docker

```bash
docker build -t ecommerce-backend:latest .
docker run --rm -p 3000:3000 ecommerce-backend:latest
```

## Kubernetes

Manifests are in `k8s/` (namespace, configmap, deployment, service, ingress),
tied together with Kustomize.

```bash
# local cluster example (kind): make the image available first
kind load docker-image ecommerce-backend:latest

kubectl apply -k k8s
kubectl -n ecommerce port-forward svc/ecommerce-backend 8080:80
curl localhost:8080/api/products
```

Configuration is in `k8s/configmap.yaml` (`PORT`, `SEED_DATA`, `TAX_RATE`,
`SHIPPING_CENTS`).

> **Keep `replicas: 1`.** Data is stored in each pod's memory, so multiple
> replicas would each hold a different, inconsistent copy. A restart or
> rollout also resets all data back to the seed catalog.
