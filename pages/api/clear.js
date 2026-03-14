import store from '../../lib/store';
export default async function handler(req, res) {
  await store.setOrders([]);
  res.json({ ok: true, message: 'Orders cleared' });
}
