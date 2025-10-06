-- Enable fast uuid generation (works on most Postgres incl. Neon/Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- users table already exists in shared/schema.ts; ensure minimal columns exist
-- (No-op if columns already present)

-- Stripe customer mapping table
CREATE TABLE IF NOT EXISTS "stripe_customers" (
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "customer_id" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "stripe_customers_user_unique" UNIQUE ("user_id"),
  CONSTRAINT "stripe_customers_customer_unique" UNIQUE ("customer_id")
);

-- Subscriptions snapshot table
CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" text PRIMARY KEY,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "status" text NOT NULL,
  "price_id" text,
  "current_period_end" timestamptz,
  "cancel_at_period_end" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "subscriptions_user_idx" ON "subscriptions" ("user_id");
