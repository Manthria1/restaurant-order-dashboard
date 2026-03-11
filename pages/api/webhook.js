import store from '../../lib/store';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');
  
  const payload = req.body || {};
  console.log('FULL PAYLOAD:', JSON.stringify(payload, null, 2));

  try {
    // Retell structure
    const call = payload.call || payload;
    const analysis = call.call_analysis || {};
    const custom = analysis.custom_analysis_data || {};

    const order = {
      id: Date.now().toString(),
      receivedAt: new Date().toISOString(),
      status: 'new',
      customerName: custom.customer_name || 'Guest',
      phone: custom.customer_phone || call.from_number || 'unknown',
      items: parseItems(custom.order_items),
      total: Number(custom.total_price || 0),
      pickupTime: custom.pickup_time || 'ASAP',
      raw: payload
    };

    await store.addOrder(order);
    console.log('Order saved:', order.customerName, order.total);
    res.status(200).json({ ok: true, order });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}

function parseItems(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch (e) { return [{ item_name: value }]; }
  }
  return [];
}
