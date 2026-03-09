export default function handler(req, res) {
  res.json({
    currencySymbol: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$',
    timezone: process.env.NEXT_PUBLIC_TIMEZONE || 'UTC',
    agentId: process.env.AGENT_ID || null
  });
}
