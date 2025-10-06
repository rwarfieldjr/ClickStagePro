import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

async function priceFor(productId: string): Promise<string> {
  const product = await stripe.products.retrieve(productId, { expand: ['default_price'] });
  if (product.default_price && typeof product.default_price !== 'string') {
    return product.default_price.id;
  }
  const list = await stripe.prices.list({ product: productId, active: true, limit: 1 });
  if (!list.data.length) throw new Error(`No active price found for ${productId}`);
  return list.data[0].id;
}

(async () => {
  console.log('🔍 Fetching LIVE price IDs from Stripe...\n');
  
  const productMap: Record<string, string> = {
    'STRIPE_PRICE_1':   'prod_T9Rfls5oteKUTy',
    'STRIPE_PRICE_5':   'prod_T9RgVwENfeZhNL',
    'STRIPE_PRICE_10':  'prod_T9RgxDXt385hrD',
    'STRIPE_PRICE_20':  'prod_T9RgI2NU08WsLa',
    'STRIPE_PRICE_50':  'prod_T9Rg7JtfWeNBuf',
    'STRIPE_PRICE_100': 'prod_T9RgXyM7Qzwcyb',
  };

  const priceMap: Record<string, string> = {};
  
  for (const [secretKey, productId] of Object.entries(productMap)) {
    try {
      const priceId = await priceFor(productId);
      priceMap[secretKey] = priceId;
      console.log(`✅ ${secretKey} → ${priceId}`);
    } catch (error: any) {
      console.error(`❌ Failed to fetch ${secretKey}:`, error.message);
      process.exit(1);
    }
  }

  console.log('\n📋 Copy these values to Replit Secrets:\n');
  for (const [key, value] of Object.entries(priceMap)) {
    console.log(`${key}=${value}`);
  }
  
  console.log('\n✨ Done! Set these secrets in Replit and restart the server.');
})();
