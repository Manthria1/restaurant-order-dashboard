import store from '../../lib/store';

export default async function handler(req, res) {
  const currentOrders = await store.getOrders();
  const last10 = currentOrders.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const ordersToday = currentOrders.filter(o => o.receivedAt && o.receivedAt.slice(0,10) === today);
  const totalRevenue = ordersToday.reduce((s, o) => s + Number(o.total || 0), 0);

  res.json({ orders: last10, stats: { totalOrdersToday: ordersToday.length, totalRevenue } });
}
