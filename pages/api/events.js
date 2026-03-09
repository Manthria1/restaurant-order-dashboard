import store from '../../lib/store';

export default async function handler(req, res) {
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // send a comment to keep connection alive initially
  res.write(': connected\n\n');

  // send current last-10 orders snapshot immediately
  const currentOrders = await store.getOrders();
  const snapshot = { type: 'snapshot', orders: currentOrders.slice().reverse() };
  res.write(`data: ${JSON.stringify(snapshot)}\n\n`);

  // register client
  const client = res;
  store.clients.push(client);
  console.log('[events] client connected, total clients=', store.clients.length);

  req.on('close', () => {
    const idx = store.clients.indexOf(client);
    if (idx !== -1) store.clients.splice(idx, 1);
    console.log('[events] client disconnected, total clients=', store.clients.length);
  });
}
