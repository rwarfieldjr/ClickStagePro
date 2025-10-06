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

  // Server-side keys (prefer unified names; fallback to legacy TESTING_* names)
  stripeSecretKey: need(
    "STRIPE_SECRET_KEY",
    envFirst(["STRIPE_SECRET_KEY", "TESTING_STRIPE_SECRET_KEY"]) 
  ),
  webhookSecret: need(
    "STRIPE_WEBHOOK_SECRET",
    envFirst(["STRIPE_WEBHOOK_SECRET", "STRIPE_WEBHOOK_SECRET_LIVE"]) 
  ),

  // Client-side publishable key (support both STRIPE_PUBLISHABLE_KEY and VITE_* variants)
  stripePublishableKey: need(
    "STRIPE_PUBLISHABLE_KEY",
    envFirst(["STRIPE_PUBLISHABLE_KEY", "VITE_STRIPE_PUBLIC_KEY", "TESTING_VITE_STRIPE_PUBLIC_KEY"]) 
  ),

  // Price IDs (live/test)
  prices: {
    SINGLE:  need(isProd ? "PRICE_SINGLE"  : "TESTING_PRICE_SINGLE",
                  isProd ? process.env.PRICE_SINGLE  : process.env.TESTING_PRICE_SINGLE),
    P5:      need(isProd ? "PRICE_5"       : "TESTING_PRICE_5",
                  isProd ? process.env.PRICE_5       : process.env.TESTING_PRICE_5),
    P10:     need(isProd ? "PRICE_10"      : "TESTING_PRICE_10",
                  isProd ? process.env.PRICE_10      : process.env.TESTING_PRICE_10),
    P20:     need(isProd ? "PRICE_20"      : "TESTING_PRICE_20",
                  isProd ? process.env.PRICE_20      : process.env.TESTING_PRICE_20),
    P50:     need(isProd ? "PRICE_50"      : "TESTING_PRICE_50",
                  isProd ? process.env.PRICE_50      : process.env.TESTING_PRICE_50),
    P100:    need(isProd ? "PRICE_100"     : "TESTING_PRICE_100",
                  isProd ? process.env.PRICE_100     : process.env.TESTING_PRICE_100),
  },
} as const;
