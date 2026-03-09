import store from '../../lib/store';

export default function handler(req, res) {
  const last10 = store.orders.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const ordersToday = store.orders.filter(o => o.receivedAt && o.receivedAt.slice(0,10) === today);
  const totalRevenue = ordersToday.reduce((s, o) => s + Number(o.total || 0), 0);

  res.json({ orders: last10, stats: { totalOrdersToday: ordersToday.length, totalRevenue } });
}
