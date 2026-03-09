import store from '../../lib/store';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { id, status } = req.body;
  if (!id || !status) return res.status(400).json({ error: 'id and status required' });

  const order = store.orders.find(o => o.id === id);
  if (!order) return res.status(404).json({ error: 'order not found' });

  order.status = status;

  // broadcast update
  const msg = { type: 'update', order };
  const data = `data: ${JSON.stringify(msg)}\n\n`;
  for (const client of store.clients.slice()) {
    try {
      client.write(data);
    } catch (e) {}
  }

  res.status(200).json({ ok: true });
}