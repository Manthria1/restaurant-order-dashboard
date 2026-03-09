import store from '../../lib/store';

function safeParseItems(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch (e) {
      // try to parse simple string format
      return [{ item: value }];
    }
  }
  return [];
}

function buildOrderFromRetell(payload) {
  const order = {
    id: Date.now().toString(),
    receivedAt: new Date().toISOString(),
    customerName: 'Guest',
    phone: 'unknown',
    items: [],
    total: 0,
    pickupTime: null,
    raw: payload
  };

  // Retell sends a "call" object for call_analyzed events
  const call = payload?.call;
  if (call) {
    const analysis = call.call_analysis || {};
    const custom = analysis.custom_analysis_data || {};

    order.customerName = custom.customer_name || custom.customer || custom.customerName || order.customerName;
    order.phone = custom.customer_phone || payload.from_number || call.from_number || call.from || order.phone;

    // order items may be a JSON string in custom_analysis_data.order_items
    order.items = safeParseItems(custom.order_items || custom.order_items_raw || custom.order_items_string || payload.items || payload.order_items);

    // total and pickup
    order.total = Number(custom.total_price || custom.total || analysis.total_price || payload.total || 0) || 0;
    order.pickupTime = custom.pickup_time || custom.pickupTime || custom.pickup || analysis.pickup_time || null;
  }

  return order;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  // optional simple secret check
  const secret = process.env.WEBHOOK_SECRET;
  if (secret) {
    const q = req.query?.secret || req.headers['x-webhook-secret'];
    if (q !== secret) return res.status(401).json({ error: 'invalid secret' });
  }

  const payload = req.body || {};
  console.log('[webhook] received', { path: req.url, headers: req.headers && typeof req.headers === 'object' ? { 'content-type': req.headers['content-type'], 'x-webhook-secret': req.headers['x-webhook-secret'] } : req.headers });
  console.log('[webhook] body preview:', JSON.stringify(payload).slice(0, 2000));

  // optional agent/flow id check
  const AGENT_ID = process.env.AGENT_ID;
  const agentIdInPayload = payload?.call?.agent_id || payload?.agent_id || null;
  if (AGENT_ID && agentIdInPayload && agentIdInPayload !== AGENT_ID) {
    return res.status(400).json({ error: 'agent_id mismatch' });
  }

  const order = buildOrderFromRetell(payload);
  console.log('[webhook] parsed order:', { id: order.id, customerName: order.customerName, phone: order.phone, total: order.total, itemsCount: (order.items||[]).length });

  // normalize items: ensure array of {name, qty, price}
  order.items = Array.isArray(order.items) ? order.items : [];
  // compute total if missing
  if (!order.total) {
    order.total = order.items.reduce((s, it) => s + (Number(it.price || 0) * (Number(it.qty) || 1)), 0);
  }

  // push into store (keep recent 50)
  store.orders.unshift(order);
  if (store.orders.length > 50) store.orders.length = 50;

  // notify SSE clients
  const msg = { type: 'order', order };
  const data = `data: ${JSON.stringify(msg)}\n\n`;
  let sent = 0;
  for (const client of store.clients.slice()) {
    try {
      client.write(data);
      sent += 1;
    } catch (e) {
      // ignore broken clients
    }
  }
  console.log(`[webhook] broadcast to ${sent} SSE clients; store now has ${store.orders.length} orders`);

  // return parsed order for easier debugging in tests
  res.status(200).json({ ok: true, orderId: order.id, order });
}
