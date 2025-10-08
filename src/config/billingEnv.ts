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
  webhookSecret: isProd 
    ? (process.env.STRIPE_WEBHOOK_SECRET_LIVE || "") 
    : (process.env.STRIPE_WEBHOOK_SECRET || ""),

  // Client-side publishable key
  stripePublishableKey: need(
    isProd ? "VITE_STRIPE_PUBLIC_KEY" : "TESTING_VITE_STRIPE_PUBLIC_KEY",
    isProd ? process.env.VITE_STRIPE_PUBLIC_KEY : process.env.TESTING_VITE_STRIPE_PUBLIC_KEY
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
