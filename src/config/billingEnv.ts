// Membership-free: bundles only.

function need(name: string, val?: string) {
  if (!val) throw new Error(`Missing env: ${name}`);
  return val;
}

function envFirst(keys: string[]): string | undefined {
  for (const k of keys) {
    const v = (process.env as any)[k];
    if (v && String(v).length > 0) return v as string;
  }
  return undefined;
}

const isProd = (process.env.APP_ENV || "").toLowerCase() === "production";

export const billingEnv = {
  isProd,

  // Server-side keys: Use TEST keys in dev/test mode, LIVE keys in production
  stripeSecretKey: need(
    "STRIPE_SECRET_KEY",
    isProd 
      ? envFirst(["STRIPE_SECRET_KEY"]) 
      : envFirst(["TESTING_STRIPE_SECRET_KEY", "STRIPE_SECRET_KEY"])
  ),

  webhookSecret: isProd
    ? need("STRIPE_WEBHOOK_SECRET", envFirst(["STRIPE_WEBHOOK_SECRET_LIVE", "STRIPE_WEBHOOK_SECRET"]))
    : process.env.STRIPE_WEBHOOK_SECRET || "", // Optional in test mode

  // Client-side publishable key: Use TEST key in dev/test mode, LIVE key in production
  stripePublishableKey: need(
    "STRIPE_PUBLISHABLE_KEY",
    isProd
      ? envFirst(["VITE_STRIPE_PUBLIC_KEY", "STRIPE_PUBLISHABLE_KEY"])
      : envFirst(["TESTING_VITE_STRIPE_PUBLIC_KEY", "VITE_STRIPE_PUBLIC_KEY", "STRIPE_PUBLISHABLE_KEY"])
  ),

  // Price IDs (live/test)
  // In test mode, all bundles use the same TEST_PRICE_1 for simplified e2e testing
  prices: {
    SINGLE:  isProd ? need("PRICE_SINGLE", process.env.PRICE_SINGLE) 
                    : need("TEST_PRICE_1", process.env.TEST_PRICE_1),
    P5:      isProd ? need("PRICE_5", process.env.PRICE_5) 
                    : need("TEST_PRICE_1", process.env.TEST_PRICE_1),
    P10:     isProd ? need("PRICE_10", process.env.PRICE_10) 
                    : need("TEST_PRICE_1", process.env.TEST_PRICE_1),
    P20:     isProd ? need("PRICE_20", process.env.PRICE_20) 
                    : need("TEST_PRICE_1", process.env.TEST_PRICE_1),
    P50:     isProd ? need("PRICE_50", process.env.PRICE_50) 
                    : need("TEST_PRICE_1", process.env.TEST_PRICE_1),
    P100:    isProd ? need("PRICE_100", process.env.PRICE_100) 
                    : need("TEST_PRICE_1", process.env.TEST_PRICE_1),
  },
} as const;
