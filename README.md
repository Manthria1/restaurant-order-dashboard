# Retell.ai Order Demo

Simple demo app to show restaurant owners how orders from an AI phone system (Retell.ai) would appear.

Features
- Live updates via Server-Sent Events (SSE)
- Shows customer name, phone, items, total, pickup time
- Mobile-friendly UI, simple stats and recent history

Quick start (local)
1. Install dependencies:

```bash
npm install
```

2. (Optional but recommended) set environment variables:

```bash
export WEBHOOK_SECRET=key_879b64409a1a68ab9c2cbf58b07f
export AGENT_ID=agent_45d353756350c58f1ebd8494f2
export NEXT_PUBLIC_CURRENCY_SYMBOL="$"
export NEXT_PUBLIC_TIMEZONE="America/Chicago"
```

3. Run the app:

```bash
npm run dev
```

Open http://localhost:3000

Connecting Retell.ai
1. Run ngrok (or use a deployed URL) and point Retell's webhook to:

```
https://YOUR_NGROK_SUBDOMAIN.ngrok.io/api/webhook?secret=key_879b64409a1a68ab9c2cbf58b07f
```

2. In Retell, set the agent/flow to `agent_45d353756350c58f1ebd8494f2` so the payload's `call.agent_id` will match (we also accept requests without agent validation if `AGENT_ID` isn't set).

3. Retell will POST JSON to that endpoint when the AI finishes an order. Example Retell payload (use this to test locally):

```json
{ "event":"call_analyzed", "call": { "call_id":"call_fbb7...", "agent_id":"agent_45d353756350c58f1ebd8494f2", "call_analysis": { "custom_analysis_data": { "customer_name":"John","customer_phone":"469-882-8239","order_items":"[{\"item_name\":\"Sesame Chicken\",\"quantity\":1,\"price\":\"12.95\"}]","special_instructions":"Extra spicy, no peanuts","pickup_time":"about 20 minutes from call time","total_price":"12.95" } } } }
```

Test webhook with curl (example):

```bash
curl -X POST 'http://localhost:3000/api/webhook?secret=key_879b64409a1a68ab9c2cbf58b07f' \
  -H "Content-Type: application/json" \
  -d '{"event":"call_analyzed","call":{"agent_id":"agent_45d353756350c58f1ebd8494f2","call_analysis":{"custom_analysis_data":{"customer_name":"John","customer_phone":"469-882-8239","order_items":"[{\"item_name\":\"Sesame Chicken\",\"quantity\":1,\"price\":\"12.95\"}]","total_price":"12.95","pickup_time":"about 20 minutes"}}}}'
```

Deployment notes
- This app uses in-memory storage and SSE. For simple demos run locally (recommended).
- Vercel/Netlify serverless functions may not support long-lived SSE connections; for hosted demos use a small server (Render, Railway, Fly) or adapt to polling/webhooks-to-push service for production.

Extending for production
- Persist orders to a database
- Use WebSockets (socket.io) or a managed real-time service
- Verify Retell signatures if provided
