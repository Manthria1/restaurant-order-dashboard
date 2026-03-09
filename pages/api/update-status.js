import store from '../../lib/store';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { id, status } = req.body;
  if (!id || !status) return res.status(400).json({ error: 'id and status required' });

  const updated = await store.updateOrderStatus(id, status);
  if (!updated) return res.status(404).json({ error: 'order not found' });

  // broadcast update
  const currentOrders = await store.getOrders();
  const order = currentOrders.find(o => o.id === id);
  if (order) {
    const msg = { type: 'update', order };
    const data = `data: ${JSON.stringify(msg)}\n\n`;
    for (const client of store.clients.slice()) {
      try {
        client.write(data);
      } catch (e) {}
    }
  }

  res.status(200).json({ ok: true });
}