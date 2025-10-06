import Stripe from "stripe";
import { pool } from "./db";
import { storage } from "./storage";

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" as any })
  : null;

// ---------- Pack Rules for Credit Bundles ----------
export type PackRule = {
  credits: number;
  months: number;
  graceDays?: number;
  autoExtend?: boolean;
  priceId?: string;
  label: string;
};

export const PACK_RULES: Record<string, PackRule> = {
  "SINGLE": { credits: 1, months: 6, label: "Single Credit" },
  "5": { credits: 5, months: 12, graceDays: 30, label: "5 Credits" },
  "10": { credits: 10, months: 12, autoExtend: true, label: "10 Credits" },
  "20": { credits: 20, months: 12, autoExtend: true, label: "20 Credits" },
  "50": { credits: 50, months: 24, autoExtend: true, label: "50 Credits" },
  "100": { credits: 100, months: 24, autoExtend: true, label: "100 Credits" },
};

// ---------- Public: bundles mapping ----------
type Bundle = { priceId: string; label: string; credits: number; months: number; autoExtend?: boolean; graceDays?: number };

export function listBundles(): Bundle[] {
  // Use APP_ENV to determine production vs test mode (not NODE_ENV)
  const isProduction = process.env.APP_ENV === 'production';
  const prefix = isProduction ? '' : 'TESTING_';
  
  const map = [
    { envKey: `${prefix}PRICE_SINGLE`, packKey: "SINGLE" },
    { envKey: `${prefix}PRICE_5`, packKey: "5" },
    { envKey: `${prefix}PRICE_10`, packKey: "10" },
    { envKey: `${prefix}PRICE_20`, packKey: "20" },
    { envKey: `${prefix}PRICE_50`, packKey: "50" },
    { envKey: `${prefix}PRICE_100`, packKey: "100" },
  ] as const;
  const out: Bundle[] = [];
  for (const m of map) {
    const priceId = process.env[m.envKey];
    const pack = PACK_RULES[m.packKey];
    if (priceId && pack) {
      out.push({ 
        priceId, 
        label: pack.label, 
        credits: pack.credits,
        months: pack.months,
        autoExtend: pack.autoExtend,
        graceDays: pack.graceDays
      });
    }
  }
  return out;
}

export function priceToCredits(priceId: string) {
  return listBundles().find(b => b.priceId === priceId)?.credits ?? null;
}

export function priceToPackRule(priceId: string): PackRule | null {
  const bundle = listBundles().find(b => b.priceId === priceId);
  if (!bundle) return null;
  return {
    credits: bundle.credits,
    months: bundle.months,
    autoExtend: bundle.autoExtend,
    graceDays: bundle.graceDays,
    label: bundle.label,
    priceId: bundle.priceId
  };
}

// ---------- Dependency injection types ----------
/**
 * Dependencies for credit granting system
 */
export type StripeGrantDeps = {
  resolveUserIdByEmail?: (email: string) => Promise<string>;
  addCredits?: (userId: string, credits: number, reason?: string, sourceId?: string, packInfo?: { expiresAt?: Date; packKey?: string; autoExtend?: boolean }) => Promise<void>;
  stripeClient?: Stripe;
};

// ---------- Helper functions ----------
export async function findOrCreateUserIdByEmail(email: string): Promise<string> {
  const { rows } = await pool.query("SELECT id FROM users WHERE lower(email)=lower($1) LIMIT 1", [email]);
  if (rows[0]) return rows[0].id;
  const { rows: inserted } = await pool.query("INSERT INTO users (email) VALUES ($1) RETURNING id", [email]);
  return inserted[0].id;
}

export async function addCreditsWrapper(
  userId: string, 
  credits: number, 
  reason?: string, 
  sourceId?: string,
  packInfo?: { expiresAt?: Date; packKey?: string; autoExtend?: boolean }
): Promise<void> {
  await storage.addCredits(userId, credits, reason || "stripe_purchase", sourceId, packInfo);
}

// ---------- Main credit granting function with dependency injection ----------
/**
 * Grant credits from Stripe events with full idempotency.
 * Uses payment_intent ID as sourceId to prevent duplicate credits.
 * If dependencies are not provided, uses internal defaults.
 */
export async function grantCreditsFromStripe(
  deps: StripeGrantDeps,
  obj: any
): Promise<number> {
  // Use provided deps or fall back to internal implementations
  const s = deps.stripeClient ?? stripe;
  const resolveUserId = deps.resolveUserIdByEmail ?? findOrCreateUserIdByEmail;
  const addCreds = deps.addCredits ?? addCreditsWrapper;

  // If no Stripe client is available, cannot process
  if (!s) {
    console.warn("Stripe client not available, cannot grant credits");
    return 0;
  }

  const isCheckout = obj?.object === "checkout.session";
  const isInvoice  = obj?.object === "invoice";

  let email = "";
  let lineItems: any[] = [];
  let paymentIntentId = "";

  if (isCheckout) {
    email = obj.customer_details?.email || obj.customer_email || "";
    paymentIntentId = obj.payment_intent || obj.id; // Use payment_intent as sourceId for idempotency
    const li = await s.checkout.sessions.listLineItems(obj.id, { expand: ["data.price", "data.price.product"] });
    lineItems = li.data;
  } else if (isInvoice) {
    const invoice = await s.invoices.retrieve(obj.id, { expand: ["lines.data.price.product", "customer"] });
    email = invoice.customer_email || (invoice.customer && (invoice.customer as any).email) || "";
    paymentIntentId = (invoice as any).payment_intent || obj.id; // Use payment_intent as sourceId for idempotency
    lineItems = invoice.lines.data.map(l => ({ quantity: l.quantity || 1, price: (l as any).price }));
  } else {
    // Unhandled event type → nothing to grant
    return 0;
  }

  if (!email) return 0;

  // Compute total credits from line items and determine pack rule
  let credits = 0;
  let packRule: PackRule | null = null;
  let packKey = "";
  
  for (const it of lineItems) {
    const qty = it.quantity || 1;
    const priceId = it.price?.id || it.price;
    const rule = priceToPackRule(priceId);
    
    if (rule) { 
      credits += rule.credits * qty; 
      packRule = rule;
      packKey = Object.keys(PACK_RULES).find(k => PACK_RULES[k] === rule) || "";
      continue; 
    }

    // Fallback to metadata if you set credits_per_unit on price/product
    let perUnit = 0;
    if (it.price?.metadata?.credits_per_unit) perUnit = Number(it.price.metadata.credits_per_unit);
    else if (it.price?.product?.metadata?.credits_per_unit) perUnit = Number(it.price.product.metadata.credits_per_unit);
    credits += perUnit * qty;
  }

  if (credits <= 0) return 0;

  // Calculate expiry date based on pack rule
  const packInfo = packRule ? {
    expiresAt: new Date(Date.now() + packRule.months * 30 * 24 * 60 * 60 * 1000),
    packKey,
    autoExtend: packRule.autoExtend || false
  } : undefined;

  // Use payment_intent as sourceId for idempotency
  const userId = await resolveUserId(email);
  
  try {
    await addCreds(userId, credits, "stripe_purchase", paymentIntentId, packInfo);
  } catch (e: any) {
    // Postgres unique_violation - already applied from a previous webhook retry
    if (e?.code === "23505") {
      console.log(`Credits already granted for payment ${paymentIntentId}, treating as success`);
      return credits;
    }
    throw e;
  }
  
  return credits;
}
