# ClickStagePro - Local Development

Quick start

1) Environment variables

Copy `.env.example` to `.env.local` (or set vars in your environment):

- APP_URL=http://localhost:5000
- DATABASE_URL=postgres://user:pass@host:5432/db
- SESSION_SECRET=your-dev-session-secret
- STRIPE_SECRET_KEY=sk_test_xxx
- STRIPE_WEBHOOK_SECRET=whsec_xxx
- VITE_STRIPE_PUBLIC_KEY=pk_test_xxx
- ENABLE_DEV_AUTH=1 (optional for local)

2) Install and migrate

```bash
npm ci
npm run db:generate
npm run db:migrate
```

3) Run

```bash
npm run dev
# visit http://localhost:5000
# health checks: /api/health and /dev/health
```

4) Stripe webhooks (local)

```bash
stripe listen --forward-to localhost:5000/api/stripe/webhook
```

Notes
- Do not commit secrets; keep keys in env only.
- Stripe secret key is server-only; never ship it to the client.
