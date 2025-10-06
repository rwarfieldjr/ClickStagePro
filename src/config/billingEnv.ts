// Membership-free: bundles only.

function need(name: string, val?: string) {
  if (!val) throw new Error(`Missing env: ${name}`);
  return val;
}

const isProd = (process.env.APP_ENV || "").toLowerCase() === "production";

export const billingEnv = {
  isProd,

  // Server-side keys
  stripeSecretKey: need(
    isProd ? "STRIPE_SECRET_KEY" : "TESTING_STRIPE_SECRET_KEY",
    isProd ? process.env.STRIPE_SECRET_KEY : process.env.TESTING_STRIPE_SECRET_KEY
  ),
  webhookSecret: need(
    isProd ? "STRIPE_WEBHOOK_SECRET_LIVE" : "STRIPE_WEBHOOK_SECRET",
    isProd ? process.env.STRIPE_WEBHOOK_SECRET_LIVE : process.env.STRIPE_WEBHOOK_SECRET
  ),

  // Client-side publishable key
  stripePublishableKey: need(
    isProd ? "VITE_STRIPE_PUBLIC_KEY" : "TESTING_VITE_STRIPE_PUBLIC_KEY",
    isProd ? process.env.VITE_STRIPE_PUBLIC_KEY : process.env.TESTING_VITE_STRIPE_PUBLIC_KEY
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
