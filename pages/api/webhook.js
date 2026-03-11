import store from '../../lib/store';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');
  
  const payload = req.body || {};
  
  // Log EVERYTHING
  console.log('FULL PAYLOAD:', JSON.stringify(payload, null, 2));
  
  res.status(200).json({ ok: true });
}
