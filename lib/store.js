import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.REDIS_URL || process.env.KV_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.REDIS_TOKEN || process.env.KV_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Fallback to in-memory store for local development
let memoryStore = { orders: [], clients: [] };

const isVercel = process.env.VERCEL === '1';

async function getStore() {
  if (!isVercel) {
    return memoryStore;
  }

  try {
    const orders = await redis.get('orders') || [];
    return { orders, clients: [] }; // clients don't persist
  } catch (e) {
    console.warn('Redis error, using memory store:', e);
    return memoryStore;
  }
}

async function setStore(store) {
  if (!isVercel) {
    memoryStore = store;
    return;
  }

  try {
    await redis.set('orders', store.orders);
  } catch (e) {
    console.warn('Redis set error:', e);
  }
}

export default {
  async getOrders() {
    const store = await getStore();
    return store.orders;
  },

  async setOrders(value) {
    const store = await getStore();
    store.orders = value;
    await setStore(store);
  },

  get clients() {
    return memoryStore.clients; // clients are always in-memory
  },

  set clients(value) {
    memoryStore.clients = value;
  },

  async addOrder(order) {
    const store = await getStore();
    store.orders.unshift(order);
    if (store.orders.length > 50) store.orders.length = 50;
    await setStore(store);
    return store;
  },

  async updateOrderStatus(id, status) {
    const store = await getStore();
    const order = store.orders.find(o => o.id === id);
    if (order) {
      order.status = status;
      await setStore(store);
      return true;
    }
    return false;
  }
};
