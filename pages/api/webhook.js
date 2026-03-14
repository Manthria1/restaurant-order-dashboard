import store from '../../lib/store';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');
  
  const payload = req.body || {};
  console.log('FULL PAYLOAD:', JSON.stringify(payload).slice(0, 500));

  try {
    const call = payload.call || {};
    const analysis = call.call_analysis || {};
    const custom = analysis.custom_analysis_data || {};

    // Parse items (comes as JSON string from Retell)
    let items = [];
    if (custom.order_items) {
      try {
        items = typeof custom.order_items === 'string' 
          ? JSON.parse(custom.order_items) 
          : custom.order_items;
      } catch(e) { items = []; }
    }

    // Parse total (comes as "$11.95" string)
    const totalRaw = custom.total_price || '0';
    const total = parseFloat(String(totalRaw).replace(/[^0-9.]/g, '')) || 0;

    const order = {
      id: Date.now().toString(),
      receivedAt: new Date().toISOString(),
      status: 'new',
      customerName: custom.customer_name || 'Guest',
      phone: custom.customer_phone || call.from_number || 'unknown',
      items,
      total,
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
