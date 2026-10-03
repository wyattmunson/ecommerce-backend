'use strict';

const usd = (dollars) => dollars * 100;

/**
 * The product catalog. Prices are in cents.
 * Add new items here; ids must be unique and URL-safe.
 */
const products = [
  {
    id: 'jet-engine',
    name: 'Turbofan Jet Engine (Lightly Used)',
    description: 'Only flown by a retired pilot on Sundays. Some bird residue. Thrust sold separately.',
    category: 'aerospace',
    priceCents: usd(14000000),
    stock: 6,
  },
  {
    id: 'oil-rig',
    name: 'Off-Shore Oil Rig (Gently Pre-Owned)',
    description: 'Comes with a stunning ocean view in every direction. Oil not included, but we looked.',
    category: 'energy',
    priceCents: usd(650000000),
    stock: 2,
  },
  {
    id: 'aircraft-carrier',
    name: 'Aircraft Carrier (Some Assembly Required)',
    description: 'Ideal for the homeowner who finds a driveway insufficient for their ambitions.',
    category: 'maritime',
    priceCents: usd(13000000000),
    stock: 1,
  },
  {
    id: 'space-elevator',
    name: 'Personal Space Elevator',
    description: 'Going up! Going way, way up. Please hold the handrail. Floors: 2 (ground and orbit).',
    category: 'aerospace',
    priceCents: usd(2500000000),
    stock: 1,
  },
  {
    id: 'artisanal-satellite',
    name: 'Hand-Crafted Artisanal Satellite',
    description: 'Small-batch, locally sourced orbit. Each unit is slightly different and also in space.',
    category: 'aerospace',
    priceCents: usd(120000000),
    stock: 12,
  },
  {
    id: 'cargo-ship',
    name: 'Mid-Size Container Ship',
    description: 'Perfect for the discerning shopper who just needs "a few things" delivered.',
    category: 'maritime',
    priceCents: usd(75000000),
    stock: 4,
  },
  {
    id: 'tunnel-boring-machine',
    name: 'Tunnel Boring Machine',
    description: 'Finally, a shortcut to your neighbor\'s house. Neighbor not included.',
    category: 'heavy-machinery',
    priceCents: usd(8000000),
    stock: 9,
  },
  {
    id: 'submarine',
    name: 'Used Submarine (One Careful Owner)',
    description: 'Only submerged on weekends. Minor leak, but it\'s more of a "feature".',
    category: 'maritime',
    priceCents: usd(300000000),
    stock: 3,
  },
  {
    id: 'mining-excavator',
    name: 'Bucket-Wheel Excavator',
    description: 'Taller than a cathedral and nearly as quiet. Great for small garden projects.',
    category: 'heavy-machinery',
    priceCents: usd(100000000),
    stock: 5,
  },
  {
    id: 'collider-kit',
    name: 'Particle Collider Starter Kit',
    description: 'Smash tiny things together at home. Ring circumference: only 27 km. Some assembly.',
    category: 'science',
    priceCents: usd(4750000000),
    stock: 2,
  },
  {
    id: 'golden-paperclip',
    name: 'Solid Gold Paperclip',
    description: 'Holds up to two (2) sheets of paper and an alarming amount of ego.',
    category: 'novelty',
    priceCents: usd(4999999) + 99,
    stock: 250,
  },
  {
    id: 'cloud',
    name: 'One (1) Cumulus Cloud',
    description: 'Fluffy, fair-weather, and fully transferable. Delivery depends on the wind.',
    category: 'novelty',
    priceCents: usd(1200000),
    stock: 40,
  },
  {
    id: 'premium-air',
    name: 'Premium Air (1 Liter, Mountain Fresh)',
    description: 'Harvested at dawn from an undisclosed summit. Notes of pine and unearned smugness.',
    category: 'novelty',
    priceCents: usd(89999),
    stock: 1000,
  },
  {
    id: 'pet-rock',
    name: 'Certified Authentic Pet Rock',
    description: 'Requires no food, no walks, and no veterinarian. Premium pricing for premium inertia.',
    category: 'novelty',
    priceCents: usd(1500000),
    stock: 75,
  },
];

const users = [
  {
    id: 'demo-user',
    name: 'Demo Billionaire',
    email: 'demo@example.com',
    budgetCents: usd(100000000000),
  },
  {
    id: 'broke-user',
    name: 'Merely Wealthy',
    email: 'broke@example.com',
    budgetCents: usd(250000),
  },
];

module.exports = { products, users };
