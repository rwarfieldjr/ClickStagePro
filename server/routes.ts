import type { Express, Response, NextFunction } from "express";
import type { Request } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { 
  insertStagingRequestSchema, 
  updateStagingRequestSchema, 
  orderCompletionSchema, 
  contactQuoteSchema,
  upsertUserSchema,
  insertAssetSchema,
  insertRevisionSchema,
  insertExtraPhotoRequestSchema,
  insertSupportTicketSchema,
  insertConversationSchema,
  insertMessageSchema
} from "@shared/schema";
import { z } from "zod";
import { sendNewRequestNotification, sendClientConfirmation, sendContactFormNotification, sendContactFormConfirmation } from "./email";
import { ObjectStorageService } from "./objectStorage";
import { fileValidationService, FILE_VALIDATION_CONFIG } from "./fileValidation";
import multer, { MulterError } from "multer";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { pool } from "./db";
import { grantCreditsFromStripe, findOrCreateUserIdByEmail, addCreditsWrapper, priceToPackRule } from "./credits";
import { 
  requireAuth,
  type AuthedUser
} from "./auth";

// Simple email validation helper
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Type for authenticated requests
interface AuthenticatedRequest extends Request {
  user?: AuthedUser | null;
}
import { userKey, listDir, ensureFolder, moveObject, deleteObject, deletePrefix, renamePrefix, signPut } from "./lib/r2";
import { format } from "date-fns";
import { billingEnv } from "../src/config/billingEnv";
import { db } from "./db";
import { stripeCustomers, subscriptions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { authDebug } from "./auth-debug";

// Initialize Stripe with centralized billing config
const stripe = new Stripe(billingEnv.stripeSecretKey, { apiVersion: "2024-06-20" as any });

// Feature flag for Stripe webhook processing
const ENABLE_STRIPE_WEBHOOK = process.env.ENABLE_STRIPE_WEBHOOK === "1";

// Feature gate middleware helper
function gate(flag: string) {
  return (req: any, res: any, next: any) =>
    process.env[flag] === "1"
      ? next()
      : res.status(501).json({ error: `NEXT STEP: set ${flag}=1 to enable this endpoint` });
}

// Server-side price lookup table to prevent client price tampering
interface PricingPlan {
  name: string;
  price: number;
  photos: number;
}

interface PricingTable {
  onetime: {
    [key: string]: PricingPlan;
  };
  subscription: {
    [key: string]: PricingPlan;
  };
}

const PRICING_TABLE: PricingTable = {
  onetime: {
    single: { name: "Single Photo", price: 14.99, photos: 1 }
  },
  subscription: {
    starter: { name: "Starter Plan", price: 24.95, photos: 5 },
    pro: { name: "Pro Plan", price: 49.95, photos: 10 },
    enterprise: { name: "Enterprise", price: 0, photos: 0 } // Custom pricing handled separately
  }
};

// Helper function to securely get plan pricing
function getPlanPricing(planId: string, planType: 'onetime' | 'subscription'): PricingPlan {
  const plans = PRICING_TABLE[planType];
  if (!plans || !plans[planId]) {
    throw new Error(`Invalid plan: ${planType}/${planId}`);
  }
  return plans[planId];
}

// Extend Request type to include file property
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// Configure multer for memory storage (for validation)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: FILE_VALIDATION_CONFIG.MAX_FILE_SIZE,
    files: 1
  }
});

// Simple API key middleware for admin endpoints
function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  const expectedApiKey = process.env.ADMIN_API_KEY;
  
  // Require ADMIN_API_KEY to be set - no default fallback for security
  if (!expectedApiKey) {
    console.error('ADMIN_API_KEY environment variable is not set - admin endpoints are disabled');
    return res.status(500).json({
      success: false,
      message: "Admin functionality is not configured. Contact system administrator."
    });
  }
  
  if (!apiKey || apiKey !== expectedApiKey) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Valid API key required for admin operations"
    });
  }
  
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth middleware and routes
  await setupAuth(app);

  // TEMP: visit this while logged in to see what Replit provides
  app.get("/api/debug/auth", authDebug);

  // Health check endpoint
  app.get("/healthz", async (_req, res) => {
    const started = Date.now();
    try {
      await pool.query("SELECT 1");
      res.status(200).json({ ok: true, db_ms: Date.now() - started });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Lightweight Supabase connectivity/insertion test
  // Works in both Replit.dev and Replit.app since it relies on path routing only
  async function supabaseInsertTest(req: Request, res: Response) {
    try {
      const SUPABASE_URL = process.env.SUPABASE_URL;
      const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

      if (!SUPABASE_URL || !SERVICE_KEY) {
        return res.status(503).json({ ok: false, error: "Supabase not configured", missing: { SUPABASE_URL: !SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: !SERVICE_KEY } });
      }

      const rid = (req as any).rid || Math.random().toString(36).slice(2, 10);
      const payload = [{
        source: "clickstagepro",
        request_id: rid,
        env: process.env.APP_ENV || process.env.NODE_ENV || "development",
        host: req.headers.host,
        path: req.originalUrl,
        method: req.method,
        user_agent: req.headers["user-agent"]
      }];

      const endpoint = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/test_events`;
      const r = await fetch(endpoint, {
        method: "POST",
        headers: {
          "apikey": SERVICE_KEY,
          "Authorization": `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify(payload)
      });

      const text = await r.text();
      if (!r.ok) {
        return res.status(r.status).json({ ok: false, status: r.status, body: text });
      }

      let data: any = undefined;
      try { data = JSON.parse(text); } catch {}
      return res.json({ ok: true, inserted: Array.isArray(data) ? data.length : 1, data });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  app.get("/api/test-supabase", supabaseInsertTest);
  app.post("/api/test-supabase", supabaseInsertTest);

  // Metrics endpoint - Very light auth: gate behind env flag
  const ENABLE_METRICS = process.env.ENABLE_METRICS === "1";

  app.get("/metrics", async (req, res) => {
    if (!ENABLE_METRICS) return res.status(404).send("Not enabled");

    try {
      const [{ rows: totals }, { rows: last }] = await Promise.all([
        pool.query("SELECT * FROM v_credit_totals"),
        pool.query("SELECT * FROM v_consumption_last_24h"),
      ]);

      // Top 10 consumers in 24h (optional)
      const top = await pool.query(
        `SELECT user_id, SUM(-delta) AS consumed
           FROM credit_ledger
          WHERE reason='photo_staged'
            AND created_at >= now() - interval '24 hours'
          GROUP BY user_id
          ORDER BY consumed DESC
          LIMIT 10`
      );

      res.json({
        uptime_s: Math.floor(process.uptime()),
        totals: totals[0] || { users_with_balance: 0, total_credits: 0 },
        consumed_24h: last[0] || { events: 0, credits_consumed: 0 },
        top_consumers_24h: top.rows,
        now: new Date().toISOString(),
      });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Auth routes - Get current user
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Unified current-user endpoint
  app.get("/api/auth/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const email = req.user.email;
      
      let user = await storage.getUser(userId);
      
      // Auto-create user if they don't exist (for dev auth or first-time Replit auth users)
      if (!user && email) {
        console.log(`Creating new user: ${userId} (${email})`);
        user = await storage.createUser({
          id: userId,
          email: email,
          firstName: email.split('@')[0],
          lastName: '',
          profileImageUrl: null
        });
      }
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Return normalized user info
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          createdAt: user.createdAt,
          stripeCustomerId: user.stripeCustomerId ?? null,
        }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching user information"
      });
    }
  });

  // Remove old auth endpoints - they're handled by Replit Auth now
  /*
  // Old User registration endpoint - replaced by Replit Auth
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name } = req.body;
      
      // Input validation
      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          message: "Email, password, and name are required"
        });
      }
      
      // Validate email format
      if (!isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format"
        });
      }
      
      // Validate password strength
      const passwordValidation = isValidPassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          success: false,
          message: passwordValidation.message
        });
      }
      
      // Validate name length
      if (name.trim().length === 0 || name.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Name must be between 1 and 100 characters"
        });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email.toLowerCase());
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "An account with this email already exists"
        });
      }
      
      // Hash password
      // const passwordHash = await hashPassword(password);
      
      // Create Stripe customer
      let stripeCustomerId: string | undefined;
      try {
        const customer = await stripe.customers.create({
          email: email.toLowerCase(),
          name: name.trim(),
          metadata: {
            source: 'web_registration'
          }
        });
        stripeCustomerId = customer.id;
      } catch (stripeError) {
        console.error('Failed to create Stripe customer:', stripeError);
        // Continue without Stripe customer - can be created later
      }
      
      // Create user - this is replaced by Replit Auth
      // const newUser = await storage.createUser({
      //   email: email.toLowerCase(),
      //   passwordHash,
      //   name: name.trim(),
      //   stripeCustomerId
      // });
      
      res.status(400).json({
        success: false,
        message: "Registration is handled by Replit Auth. Please use /api/login to authenticate."
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred during registration"
      });
    }
  });
  */
  
  /*
  // Old User login - replaced by Replit Auth
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Input validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required"
        });
      }
      
      res.status(400).json({
        success: false,
        message: "Login is handled by Replit Auth. Please use /api/login to authenticate."
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred during login"
      });
    }
  });
  */
  
  /*
  // Old Get current user session - replaced by new implementation above
  app.get("/api/auth/me", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Return user info (without sensitive data)
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching user information"
      });
    }
  });
  */
  
  /*
  // Old User logout - replaced by Replit Auth /api/logout
  app.post("/api/auth/logout", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.session) {
        // Delete session from storage
        await storage.deleteSession(req.session.id);
      }
      
      // Clear session cookie with same options as when it was set
      res.clearCookie('session', {
        path: SESSION_COOKIE_CONFIG.path,
        httpOnly: SESSION_COOKIE_CONFIG.httpOnly,
        secure: SESSION_COOKIE_CONFIG.secure,
        sameSite: SESSION_COOKIE_CONFIG.sameSite
      });
      
      res.json({
        success: true,
        message: "Logged out successfully"
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred during logout"
      });
    }
  });
  
  // Get current user
  app.get("/api/auth/me", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }
      
      res.json({
        success: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          avatarUrl: req.user.avatarUrl,
          createdAt: req.user.createdAt
        }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching user data"
      });
    }
  });
  */

  // Stripe payment endpoints
  
  // Create payment intent for one-time purchases with server-side price validation
  app.post("/api/create-payment-intent", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { planId, planType } = req.body;
      
      // Validate required parameters
      if (!planId || !planType) {
        return res.status(400).json({ 
          success: false, 
          message: "Plan ID and plan type are required" 
        });
      }
      
      if (planType !== 'onetime') {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid plan type for payment intent" 
        });
      }
      
      // Securely get pricing from server-side table
      let planPricing;
      try {
        planPricing = getPlanPricing(planId, planType);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: (error as Error).message
        });
      }
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(planPricing.price * 100), // Convert to cents, using server-side price
        currency: "usd",
        metadata: {
          planId,
          planType,
          planName: planPricing.name,
          photos: planPricing.photos.toString()
        },
      });
      
      res.json({ 
        success: true,
        clientSecret: paymentIntent.client_secret,
        plan: {
          id: planId,
          type: planType,
          name: planPricing.name,
          price: planPricing.price,
          photos: planPricing.photos
        }
      });
    } catch (error) {
      console.error('Stripe payment intent error:', error);
      res.status(500).json({ 
        success: false,
        message: "Error creating payment intent: " + (error as Error).message 
      });
    }
  });

  // Create subscription for recurring plans with server-side price validation
  app.post("/api/create-subscription", async (req, res) => {
    try {
      const { planId, planType } = req.body;
      
      // Validate required parameters
      if (!planId || !planType) {
        return res.status(400).json({ 
          success: false, 
          message: "Plan ID and plan type are required" 
        });
      }
      
      if (planType !== 'subscription') {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid plan type for subscription" 
        });
      }
      
      // Securely get pricing from server-side table
      let planPricing;
      try {
        planPricing = getPlanPricing(planId, planType);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: (error as Error).message
        });
      }
      
      // For now, treat subscriptions as one-time payments
      // In a full implementation, you'd create a customer and subscription
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(planPricing.price * 100), // Convert to cents, using server-side price
        currency: "usd",
        metadata: {
          planId,
          planType: 'subscription',
          planName: planPricing.name,
          photos: planPricing.photos.toString()
        },
      });
      
      res.json({ 
        success: true,
        clientSecret: paymentIntent.client_secret,
        plan: {
          id: planId,
          type: planType,
          name: planPricing.name,
          price: planPricing.price,
          photos: planPricing.photos
        }
      });
    } catch (error) {
      console.error('Stripe subscription error:', error);
      res.status(500).json({ 
        success: false,
        message: "Error creating subscription: " + (error as Error).message 
      });
    }
  });

  // Stripe webhook handler function
  const stripeWebhookHandler = async (req: any, res: any) => {
    if (!ENABLE_STRIPE_WEBHOOK) {
      console.warn("[webhook] NEXT STEP: set ENABLE_STRIPE_WEBHOOK=1 to process events");
      return res.json({ received: true, skipped: true });
    }

    const sig = req.headers['stripe-signature'];

    let event;

    try {
      // Verify webhook signature to ensure it came from Stripe
      event = stripe.webhooks.constructEvent(
        req.body, 
        sig!, 
        billingEnv.webhookSecret
      );
    } catch (err) {
      const error = err as Error;
      console.error('Webhook signature verification failed:', error.message);
      return res.status(400).json({ 
        error: "Webhook signature verification failed" 
      });
    }

    console.log(`[webhook ${(req as any).rid}] type=${event.type} id=${event.id}`);

    // Handle the event
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const customerId = session.customer as string | null;
          if (customerId) {
            const mapping = await db.query.stripeCustomers.findFirst({
              where: eq(stripeCustomers.customerId, customerId)
            });
            if (mapping && session.subscription) {
              const sub = await stripe.subscriptions.retrieve(String(session.subscription));
              await db
                .insert(subscriptions)
                .values({
                  id: sub.id,
                  userId: mapping.userId,
                  status: sub.status,
                  priceId: sub.items.data[0]?.price?.id || null,
                  currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
                  cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                })
                .onConflictDoUpdate({
                  target: subscriptions.id,
                  set: {
                    status: sub.status,
                    priceId: sub.items.data[0]?.price?.id || null,
                    currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
                    cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
                    updatedAt: new Date(),
                  }
                });
            }
          }
          break;
        }
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
        case 'customer.subscription.created': {
          const sub = event.data.object as Stripe.Subscription;
          const customerId = sub.customer as string | null;
          if (customerId) {
            const mapping = await db.query.stripeCustomers.findFirst({
              where: eq(stripeCustomers.customerId, customerId)
            });
            if (mapping) {
              await db
                .insert(subscriptions)
                .values({
                  id: sub.id,
                  userId: mapping.userId,
                  status: sub.status,
                  priceId: sub.items.data[0]?.price?.id || null,
                  currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
                  cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                })
                .onConflictDoUpdate({
                  target: subscriptions.id,
                  set: {
                    status: sub.status,
                    priceId: sub.items.data[0]?.price?.id || null,
                    currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
                    cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
                    updatedAt: new Date(),
                  }
                });
            }
          }
          break;
        }
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object as any;
          console.log('PaymentIntent succeeded:', paymentIntent.id);
          
          try {
            const { userId, priceId } = paymentIntent.metadata || {};
            
            if (userId && priceId) {
              // Grant credits using PACK_RULES for the bundle
              const packRule = priceToPackRule(priceId);
              if (packRule) {
                console.log(`Granting ${packRule.credits} credits for payment_intent ${paymentIntent.id}`);
                
                // Calculate expiry date
                const expiresAt = new Date();
                expiresAt.setMonth(expiresAt.getMonth() + packRule.months);
                if (packRule.graceDays) {
                  expiresAt.setDate(expiresAt.getDate() + packRule.graceDays);
                }
                
                await storage.addCredits(
                  userId,
                  packRule.credits,
                  `Bundle purchase: ${packRule.label}`,
                  paymentIntent.id,
                  {
                    expiresAt,
                    packKey: packRule.label,
                    autoExtend: packRule.autoExtend
                  }
                );
                
                console.log(`✅ Granted ${packRule.credits} credits to user ${userId}, expires ${expiresAt.toISOString()}`);
              } else {
                console.warn(`Unknown priceId in payment_intent metadata: ${priceId}`);
              }
            } else {
              console.warn('PaymentIntent missing userId or priceId in metadata:', paymentIntent.metadata);
            }
          } catch (error) {
            console.error('Error granting credits from payment_intent:', error);
          }
          
          break;
        
        case 'payment_intent.payment_failed':
          const failedPayment = event.data.object;
          console.log('PaymentIntent failed:', failedPayment.id);
          
          // Log failed payment
          console.log('Failed payment details:', {
            paymentIntentId: failedPayment.id,
            planId: failedPayment.metadata.planId,
            planType: failedPayment.metadata.planType,
            lastPaymentError: failedPayment.last_payment_error
          });
          
          break;

        case 'setup_intent.succeeded':
          const setupIntent = event.data.object;
          console.log('SetupIntent succeeded:', setupIntent.id);
          
          // Log successful payment method setup
          console.log('Setup intent details:', {
            setupIntentId: setupIntent.id,
            customerId: setupIntent.customer,
            paymentMethodId: setupIntent.payment_method,
            usage: setupIntent.usage,
            metadata: setupIntent.metadata
          });
          
          // Here you could:
          // - Send confirmation email about new payment method
          // - Log the event for analytics
          // - Update user preferences or notifications
          
          break;

        case 'setup_intent.setup_failed':
          const failedSetup = event.data.object;
          console.log('SetupIntent failed:', failedSetup.id);
          
          // Log failed setup
          console.log('Failed setup details:', {
            setupIntentId: failedSetup.id,
            customerId: failedSetup.customer,
            lastSetupError: failedSetup.last_setup_error
          });
          
          break;

        case 'payment_method.attached':
          const attachedMethod = event.data.object;
          console.log('Payment method attached:', attachedMethod.id);
          
          // Log payment method attachment
          console.log('Payment method attachment details:', {
            paymentMethodId: attachedMethod.id,
            customerId: attachedMethod.customer,
            type: attachedMethod.type,
            card: attachedMethod.card ? {
              brand: attachedMethod.card.brand,
              last4: attachedMethod.card.last4,
              exp_month: attachedMethod.card.exp_month,
              exp_year: attachedMethod.card.exp_year
            } : null
          });
          
          break;

        case 'payment_method.detached':
          const detachedMethod = event.data.object;
          console.log('Payment method detached:', detachedMethod.id);
          
          // Log payment method detachment
          console.log('Payment method detachment details:', {
            paymentMethodId: detachedMethod.id,
            type: detachedMethod.type,
            card: detachedMethod.card ? {
              brand: detachedMethod.card.brand,
              last4: detachedMethod.card.last4
            } : null
          });
          
          break;

        case 'checkout.session.completed':
          const checkoutSession = event.data.object;
          console.log('Checkout session completed:', checkoutSession.id);
          
          try {
            const credits = await grantCreditsFromStripe(
              {
                resolveUserIdByEmail: findOrCreateUserIdByEmail,
                addCredits: addCreditsWrapper
              },
              checkoutSession
            );
            console.log(`Granted ${credits} credits for checkout session ${checkoutSession.id}`);
          } catch (error) {
            console.error('Error granting credits from checkout:', error);
          }
          
          break;

        case 'invoice.payment_succeeded':
          const successfulInvoice = event.data.object as any;
          console.log('Invoice payment succeeded:', successfulInvoice.id);
          
          try {
            const credits = await grantCreditsFromStripe(
              {
                resolveUserIdByEmail: findOrCreateUserIdByEmail,
                addCredits: addCreditsWrapper
              },
              successfulInvoice
            );
            console.log(`Granted ${credits} credits for invoice ${successfulInvoice.id}`);
          } catch (error) {
            console.error('Error granting credits from invoice:', error);
          }
          
          break;

        case 'invoice.payment_failed':
          const failedInvoice = event.data.object as any;
          console.log('Invoice payment failed:', failedInvoice.id);
          
          // Log failed invoice payment
          console.log('Failed invoice details:', {
            invoiceId: failedInvoice.id,
            customerId: failedInvoice.customer,
            amount: failedInvoice.amount_due,
            currency: failedInvoice.currency,
            subscriptionId: failedInvoice.subscription,
            attempt_count: failedInvoice.attempt_count
          });
          
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          // NOOP: Membership/subscriptions removed - bundles only
          console.log(`[NOOP] Subscription event ${event.type} - memberships not supported`);
          break;

        case 'customer.updated':
          const updatedCustomer = event.data.object;
          console.log('Customer updated:', updatedCustomer.id);
          
          // Log customer update (e.g., default payment method change)
          console.log('Customer update details:', {
            customerId: updatedCustomer.id,
            email: updatedCustomer.email,
            defaultPaymentMethod: updatedCustomer.invoice_settings?.default_payment_method
          });
          
          break;
        
        default:
          console.log(`Unhandled event type ${event.type}`);
      }
      
      res.json({ received: true });
    } catch (error) {
      console.error('Error processing webhook:', error);
      res.status(500).json({ 
        error: "Error processing webhook" 
      });
    }
  };

  // Register webhook handler on multiple paths for compatibility
  app.post("/api/stripe-webhook", stripeWebhookHandler);
  app.post("/api/webhooks/stripe", stripeWebhookHandler);
  app.post("/api/billing/webhook", stripeWebhookHandler);

  // ======= PAYMENT METHOD MANAGEMENT APIS =======
  
  // Map Stripe price IDs to amounts (in cents) - using billingEnv price IDs
  const PRICE_TO_AMOUNT: Record<string, number> = {
    [billingEnv.prices.SINGLE]: 1000,    // $10.00
    [billingEnv.prices.P5]: 4500,        // $45.00
    [billingEnv.prices.P10]: 8500,       // $85.00
    [billingEnv.prices.P20]: 16000,      // $160.00
    [billingEnv.prices.P50]: 37500,      // $375.00
    [billingEnv.prices.P100]: 70000,     // $700.00
  };

  // Create PaymentIntent for bundle purchase
  app.post("/api/billing/create-intent", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { bundleKey } = req.body;
      
      if (!bundleKey || typeof bundleKey !== 'string') {
        return res.status(400).json({
          success: false,
          message: "Valid bundleKey required (e.g., PRICE_SINGLE, PRICE_5)"
        });
      }

      // Map bundle key to actual Stripe price ID
      const priceIdMap: Record<string, string> = {
        'PRICE_SINGLE': billingEnv.prices.SINGLE,
        'PRICE_5': billingEnv.prices.P5,
        'PRICE_10': billingEnv.prices.P10,
        'PRICE_20': billingEnv.prices.P20,
        'PRICE_50': billingEnv.prices.P50,
        'PRICE_100': billingEnv.prices.P100,
      };

      const priceId = priceIdMap[bundleKey];
      if (!priceId) {
        return res.status(400).json({
          success: false,
          message: `Unknown bundle key: ${bundleKey}`
        });
      }

      const amount = PRICE_TO_AMOUNT[priceId];
      if (!amount) {
        return res.status(500).json({
          success: false,
          message: "Price amount not configured"
        });
      }

      const userId = req.user!.id;
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        metadata: { userId, priceId },
      });

      res.json({
        success: true,
        clientSecret: paymentIntent.client_secret
      });
    } catch (error) {
      console.error('Create payment intent error:', error);
      res.status(500).json({
        success: false,
        message: "Error creating payment intent: " + (error as Error).message
      });
    }
  });

  // Get Stripe publishable key (environment-aware)
  app.get("/api/billing/public-key", (_req, res) => {
    res.json({ publishableKey: billingEnv.stripePublishableKey });
  });

  // Create a Checkout Session for subscriptions or one-time payments
  // Back-compat and alias per spec: POST /api/checkout/session
  app.post("/api/checkout/session", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id as string;
      const email = req.user.email as string | undefined;
      const { priceId, quantity, customerEmail, metadata, mode } = (req.body || {}) as { priceId?: string; quantity?: number; customerEmail?: string; metadata?: Record<string,string>; mode?: 'subscription' | 'payment' };

      if (!priceId) return res.status(400).json({ message: "priceId required" });

      // Ensure a Stripe customer exists and persist mapping
      let customerId: string | undefined;
      const existing = await db.query.stripeCustomers.findFirst({ where: eq(stripeCustomers.userId, userId) });
      if (existing) {
        customerId = existing.customerId;
      } else {
        const customer = await stripe.customers.create({ email });
        customerId = customer.id;
        await db.insert(stripeCustomers).values({ userId, customerId });
      }

      const baseUrl = process.env.APP_URL || (req.protocol + '://' + req.get('host'));
      const session = await stripe.checkout.sessions.create({
        mode: mode || 'subscription',
        success_url: `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/payment-cancel`,
        customer: customerId,
        line_items: [{ price: priceId, quantity: quantity && quantity > 0 ? quantity : 1 }],
        allow_promotion_codes: true,
        client_reference_id: userId,
        customer_email: customerEmail,
        metadata,
      }, {
        idempotencyKey: `checkout:${userId}:${priceId}:${new Date().toISOString().slice(0,10)}`,
      });

      return res.json({ url: session.url });
    } catch (err: any) {
      console.error("[billing] checkout session error", { message: err.message, code: err.code });
      return res.status(500).json({ message: "Internal error" });
    }
  });

  // Create a Checkout Session: keep original path for existing client
  app.post("/api/billing/create-checkout-session", isAuthenticated, async (req: any, res) => {
    req.url = "/api/checkout/session"; // delegate to handler above
    return (app as any)._router.handle(req, res);
  });

  // Create a Billing Portal Session (GET per spec)
  app.get("/api/billing/portal", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id as string;
      const baseUrl = process.env.APP_URL || (req.protocol + '://' + req.get('host'));

      const mapping = await db.query.stripeCustomers.findFirst({ where: eq(stripeCustomers.userId, userId) });
      if (!mapping) return res.status(400).json({ message: "No Stripe customer found" });

      const portal = await stripe.billingPortal.sessions.create({
        customer: mapping.customerId,
        return_url: `${baseUrl}/account/billing`,
      });
      return res.json({ url: portal.url });
    } catch (err: any) {
      console.error("[billing] portal session error", { message: err.message, code: err.code });
      return res.status(500).json({ message: "Internal error" });
    }
  });
  
  // Create SetupIntent for adding new payment methods
  app.post("/api/billing/setup-intent", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Ensure user has a Stripe customer ID
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        try {
          const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'User';
          const customer = await stripe.customers.create({
            email: user.email || undefined,
            name: userName,
            metadata: {
              userId: user.id,
              source: 'payment_method_setup'
            }
          });
          customerId = customer.id;
          
          // Update user with new customer ID
          await storage.updateUser(user.id, { stripeCustomerId: customerId });
        } catch (error) {
          console.error('Failed to create Stripe customer:', error);
          return res.status(500).json({
            success: false,
            message: "Failed to set up payment method storage"
          });
        }
      }

      // Create SetupIntent for future payments
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
        metadata: {
          userId: user.id
        }
      });

      res.json({
        success: true,
        client_secret: setupIntent.client_secret,
        setup_intent_id: setupIntent.id
      });
    } catch (error) {
      console.error('Setup intent creation error:', error);
      res.status(500).json({
        success: false,
        message: "Failed to create setup intent"
      });
    }
  });

  // List user's saved payment methods
  app.get("/api/billing/payment-methods", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || !user.stripeCustomerId) {
        return res.json({
          success: true,
          payment_methods: []
        });
      }

      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card',
      });

      // Get customer to find default payment method
      const customer = await stripe.customers.retrieve(user.stripeCustomerId) as Stripe.Customer;

      const formattedMethods = paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        card: pm.card ? {
          brand: pm.card.brand,
          last4: pm.card.last4,
          exp_month: pm.card.exp_month,
          exp_year: pm.card.exp_year,
          funding: pm.card.funding
        } : null,
        is_default: customer.invoice_settings?.default_payment_method === pm.id,
        created: pm.created
      }));

      res.json({
        success: true,
        payment_methods: formattedMethods
      });
    } catch (error) {
      console.error('Error retrieving payment methods:', error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve payment methods"
      });
    }
  });

  // Attach payment method from successful SetupIntent
  app.post("/api/billing/attach-payment-method", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { setup_intent_id } = req.body;
      
      if (!setup_intent_id) {
        return res.status(400).json({
          success: false,
          message: "SetupIntent ID is required"
        });
      }

      const user = await storage.getUser(req.user!.id);
      if (!user || !user.stripeCustomerId) {
        return res.status(404).json({
          success: false,
          message: "User not found or no Stripe customer"
        });
      }

      // Retrieve the SetupIntent to get the payment method
      const setupIntent = await stripe.setupIntents.retrieve(setup_intent_id);
      
      if (setupIntent.status !== 'succeeded') {
        return res.status(400).json({
          success: false,
          message: "SetupIntent has not succeeded yet"
        });
      }

      if (!setupIntent.payment_method || typeof setupIntent.payment_method === 'string') {
        return res.status(400).json({
          success: false,
          message: "No payment method found in SetupIntent"
        });
      }

      // Verify the payment method belongs to the user's customer
      if (setupIntent.customer !== user.stripeCustomerId) {
        return res.status(403).json({
          success: false,
          message: "Payment method does not belong to this user"
        });
      }

      const paymentMethod = setupIntent.payment_method as Stripe.PaymentMethod;

      res.json({
        success: true,
        payment_method: {
          id: paymentMethod.id,
          type: paymentMethod.type,
          card: paymentMethod.card ? {
            brand: paymentMethod.card.brand,
            last4: paymentMethod.card.last4,
            exp_month: paymentMethod.card.exp_month,
            exp_year: paymentMethod.card.exp_year,
            funding: paymentMethod.card.funding
          } : null,
          is_default: false
        },
        message: "Payment method attached successfully"
      });
    } catch (error) {
      console.error('Error attaching payment method:', error);
      res.status(500).json({
        success: false,
        message: "Failed to attach payment method"
      });
    }
  });

  // Remove saved payment method
  app.delete("/api/billing/payment-methods/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      
      const user = await storage.getUser(req.user!.id);
      if (!user || !user.stripeCustomerId) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Verify the payment method belongs to the user
      let paymentMethod;
      try {
        paymentMethod = await stripe.paymentMethods.retrieve(id);
        if (paymentMethod.customer !== user.stripeCustomerId) {
          return res.status(403).json({
            success: false,
            message: "Payment method does not belong to this user"
          });
        }
      } catch (error) {
        return res.status(404).json({
          success: false,
          message: "Payment method not found"
        });
      }

      // Check for active subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: 'active',
      });

      if (subscriptions.data.length > 0) {
        // Get all payment methods for this customer
        const customerPaymentMethods = await stripe.paymentMethods.list({
          customer: user.stripeCustomerId,
          type: 'card',
        });

        // If this is the only payment method and there are active subscriptions, prevent deletion
        if (customerPaymentMethods.data.length <= 1) {
          return res.status(400).json({
            success: false,
            message: "Cannot delete the only payment method while you have active subscriptions. Please add another payment method first."
          });
        }

        // If deleting the default payment method with active subscriptions, check if there's another to set as default
        const customer = await stripe.customers.retrieve(user.stripeCustomerId);
        if (customer && !customer.deleted && customer.invoice_settings.default_payment_method === id) {
          // Find the next available payment method to set as default
          const otherPaymentMethod = customerPaymentMethods.data.find(pm => pm.id !== id);
          if (otherPaymentMethod) {
            await stripe.customers.update(user.stripeCustomerId, {
              invoice_settings: {
                default_payment_method: otherPaymentMethod.id,
              },
            });
          }
        }
      }

      // Detach the payment method
      await stripe.paymentMethods.detach(id);

      res.json({
        success: true,
        message: "Payment method removed successfully"
      });
    } catch (error) {
      console.error('Error removing payment method:', error);
      res.status(500).json({
        success: false,
        message: "Failed to remove payment method"
      });
    }
  });

  // Set default payment method
  app.patch("/api/billing/default-payment-method", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { payment_method_id } = req.body;
      
      if (!payment_method_id) {
        return res.status(400).json({
          success: false,
          message: "Payment method ID is required"
        });
      }

      const user = await storage.getUser(req.user!.id);
      if (!user || !user.stripeCustomerId) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Verify the payment method belongs to the user
      try {
        const paymentMethod = await stripe.paymentMethods.retrieve(payment_method_id);
        if (paymentMethod.customer !== user.stripeCustomerId) {
          return res.status(403).json({
            success: false,
            message: "Payment method does not belong to this user"
          });
        }
      } catch (error) {
        return res.status(404).json({
          success: false,
          message: "Payment method not found"
        });
      }

      // Update customer's default payment method
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: payment_method_id
        }
      });

      res.json({
        success: true,
        message: "Default payment method updated successfully"
      });
    } catch (error) {
      console.error('Error setting default payment method:', error);
      res.status(500).json({
        success: false,
        message: "Failed to set default payment method"
      });
    }
  });

  // Get user's invoice history
  app.get("/api/billing/invoices", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || !user.stripeCustomerId) {
        return res.json({
          success: true,
          invoices: []
        });
      }

      const invoices = await stripe.invoices.list({
        customer: user.stripeCustomerId,
        limit: 20
      });

      const formattedInvoices = invoices.data.map(invoice => ({
        id: invoice.id,
        number: invoice.number,
        amount_paid: invoice.amount_paid,
        amount_due: invoice.amount_due,
        currency: invoice.currency,
        status: invoice.status,
        created: invoice.created,
        due_date: invoice.due_date,
        hosted_invoice_url: invoice.hosted_invoice_url,
        invoice_pdf: invoice.invoice_pdf,
        description: invoice.description,
        period_start: invoice.period_start,
        period_end: invoice.period_end
      }));

      res.json({
        success: true,
        invoices: formattedInvoices
      });
    } catch (error) {
      console.error('Error retrieving invoices:', error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve invoices"
      });
    }
  });

  // Get active subscriptions
  app.get("/api/billing/subscriptions", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user || !user.stripeCustomerId) {
        return res.json({
          success: true,
          subscriptions: []
        });
      }

      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: 'active'
      });

      const formattedSubscriptions = subscriptions.data.map((sub: any) => ({
        id: sub.id,
        status: sub.status,
        current_period_start: sub.current_period_start,
        current_period_end: sub.current_period_end,
        plan: sub.items.data[0]?.price ? {
          amount: sub.items.data[0].price.unit_amount,
          currency: sub.items.data[0].price.currency,
          interval: sub.items.data[0].price.recurring?.interval,
          product: sub.items.data[0].price.product
        } : null,
        created: sub.created,
        cancel_at_period_end: sub.cancel_at_period_end
      }));

      res.json({
        success: true,
        subscriptions: formattedSubscriptions
      });
    } catch (error) {
      console.error('Error retrieving subscriptions:', error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve subscriptions"
      });
    }
  });

  // Update customer billing information
  app.post("/api/billing/update-customer", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { name, email, address, phone } = req.body;
      
      const user = await storage.getUser(req.user!.id);
      if (!user || !user.stripeCustomerId) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      const updateData: Stripe.CustomerUpdateParams = {};
      
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (phone) updateData.phone = phone;
      if (address) updateData.address = address;

      await stripe.customers.update(user.stripeCustomerId, updateData);

      res.json({
        success: true,
        message: "Customer information updated successfully"
      });
    } catch (error) {
      console.error('Error updating customer:', error);
      res.status(500).json({
        success: false,
        message: "Failed to update customer information"
      });
    }
  });

  // Credit system routes
  // Get user's credit balance
  app.get('/api/credits/balance', gate("ENABLE_CREDITS_API"), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      let balance = await storage.getCreditBalance(userId);
      
      // If no balance exists, return 0
      if (!balance) {
        balance = { 
          userId, 
          balance: 0,
          creditsExpiresAt: null,
          lastPackPurchased: null,
          autoExtendEnabled: null
        };
      }
      
      res.json({
        success: true,
        balance: balance.balance
      });
    } catch (error) {
      console.error('Error fetching credit balance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch credit balance'
      });
    }
  });

  // Alias for older/newer client code that calls /api/credits/me
  app.get("/api/credits/me", gate("ENABLE_CREDITS_API"), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const email = req.user.email;
      
      let balance = await storage.getCreditBalance(userId);
      const bal = balance?.balance ?? 0;
      
      res.json({ 
        email, 
        balance: bal 
      });
    } catch (error) {
      console.error('Error fetching credits/me:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch credit information'
      });
    }
  });

  // Get user's credit transaction history
  app.get('/api/credits/transactions', gate("ENABLE_CREDITS_API"), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const transactions = await storage.getCreditTransactions(userId);
      
      res.json({
        success: true,
        transactions
      });
    } catch (error) {
      console.error('Error fetching credit transactions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch credit transactions'
      });
    }
  });

  // Safe enqueue guard - check credits before enqueueing job
  app.post('/api/credits/check-and-enqueue', gate("ENABLE_CREDITS_API"), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const count = Math.max(1, Number(req.body?.count || 1));
      
      const balance = await storage.getCreditBalance(userId);
      const bal = balance?.balance ?? 0;
      
      if (bal < count) {
        return res.status(402).json({ 
          ok: false, 
          error: "Not enough credits" 
        });
      }
      
      // TODO: Enqueue job to your queue system
      // const jobId = await queue.add({ userId, photoUrl: req.body.photoUrl, ... });
      const jobId = "to-fill"; // Placeholder until queue system is implemented
      
      res.json({ 
        ok: true, 
        jobId, 
        balance: bal 
      });
    } catch (error) {
      console.error('Error checking credits for enqueue:', error);
      res.status(500).json({
        ok: false,
        error: 'Failed to check credits'
      });
    }
  });

  // CSV export of credits ledger for accounting
  app.get("/api/credits/ledger.csv", gate("ENABLE_CREDITS_API"), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { from, to } = req.query as { from?: string; to?: string };
      
      const result = await pool.query(
        `SELECT created_at, delta, reason, source_id
           FROM credit_ledger
          WHERE user_id = $1
            AND ($2::timestamptz IS NULL OR created_at >= $2::timestamptz)
            AND ($3::timestamptz IS NULL OR created_at <  $3::timestamptz)
          ORDER BY created_at DESC
          LIMIT 5000`,
        [userId, from || null, to || null]
      );

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="credits_ledger.csv"`);

      // header
      res.write("date,delta,reason,source_id\n");
      for (const r of result.rows) {
        const d = format(new Date(r.created_at), "yyyy-MM-dd HH:mm:ss");
        const delta = Number(r.delta);
        const reason = (r.reason || "").replace(/"/g, '""');
        const src = (r.source_id || "").replace(/"/g, '""');
        res.write(`${d},${delta},"${reason}","${src}"\n`);
      }
      res.end();
    } catch (error) {
      console.error('Error exporting credits ledger:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export credits ledger'
      });
    }
  });

  // R2 File Manager Routes
  // List one level under a folder
  app.get("/api/manager/list", gate("ENABLE_R2"), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { kind, path = "" } = req.query as { kind?: string; path?: string };
      if (!["originals", "staged"].includes(kind || "")) {
        return res.status(400).json({ error: "invalid kind" });
      }
      const base = userKey(userId, `${kind}/${path}`.replace(/\/+$/, "") + "/");
      const data = await listDir(base);
      res.json({ base, ...data });
    } catch (error) {
      console.error('Error listing directory:', error);
      res.status(500).json({ error: 'Failed to list directory' });
    }
  });

  // Create folder
  app.post("/api/manager/folder", gate("ENABLE_R2"), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { kind, path } = req.body || {};
      if (!kind || typeof path !== "string") {
        return res.status(400).json({ error: "kind & path required" });
      }
      const key = userKey(userId, `${kind}/${path}`.replace(/\/+$/, "") + "/");
      await ensureFolder(key);
      res.json({ ok: true });
    } catch (error) {
      console.error('Error creating folder:', error);
      res.status(500).json({ error: 'Failed to create folder' });
    }
  });

  // Move a single file
  app.post("/api/manager/move", gate("ENABLE_R2"), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { fromKey, toKey } = req.body || {};
      const userPrefix = `${userId}/`;
      if (!fromKey || !toKey || !fromKey.startsWith(userPrefix) || !toKey.startsWith(userPrefix)) {
        return res.status(400).json({ error: "bad keys" });
      }
      await moveObject(fromKey, toKey);
      res.json({ ok: true });
    } catch (error) {
      console.error('Error moving file:', error);
      res.status(500).json({ error: 'Failed to move file' });
    }
  });

  // Delete file or folder
  app.post("/api/manager/delete", gate("ENABLE_R2"), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { key, isFolder } = req.body || {};
      const userPrefix = `${userId}/`;
      if (!key || !key.startsWith(userPrefix)) {
        return res.status(400).json({ error: "bad key" });
      }
      if (isFolder) {
        await deletePrefix(key.endsWith("/") ? key : key + "/");
      } else {
        await deleteObject(key);
      }
      res.json({ ok: true });
    } catch (error) {
      console.error('Error deleting:', error);
      res.status(500).json({ error: 'Failed to delete' });
    }
  });

  // Rename folder (deep)
  app.post("/api/manager/rename-folder", gate("ENABLE_R2"), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { oldKey, newKey } = req.body || {};
      const userPrefix = `${userId}/`;
      if (!oldKey || !newKey || !oldKey.startsWith(userPrefix) || !newKey.startsWith(userPrefix)) {
        return res.status(400).json({ error: "bad keys" });
      }
      await renamePrefix(oldKey, newKey);
      res.json({ ok: true });
    } catch (error) {
      console.error('Error renaming folder:', error);
      res.status(500).json({ error: 'Failed to rename folder' });
    }
  });

  // Signed upload into a folder
  app.post("/api/manager/sign-upload", gate("ENABLE_R2"), isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { kind, path, filename } = req.body || {};
      if (!["originals", "staged"].includes(kind) || !filename) {
        return res.status(400).json({ error: "invalid input" });
      }
      const key = userKey(userId, `${kind}/${(path || "").replace(/\/+$/, "")}/${filename}`.replace(/\/+/g, "/"));
      const url = await signPut(key, req.headers["x-upload-content-type"] as string);
      res.json({ key, url });
    } catch (error) {
      console.error('Error signing upload:', error);
      res.status(500).json({ error: 'Failed to sign upload' });
    }
  });

  // Enhanced order flow to support saved payment methods
  app.post("/api/create-payment-intent-with-saved-method", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { planId, planType, payment_method_id, use_default } = req.body;
      
      // Validate required parameters
      if (!planId || !planType) {
        return res.status(400).json({ 
          success: false, 
          message: "Plan ID and plan type are required" 
        });
      }
      
      if (!payment_method_id && !use_default) {
        return res.status(400).json({
          success: false,
          message: "Either payment_method_id or use_default must be specified"
        });
      }

      const user = await storage.getUser(req.user!.id);
      if (!user || !user.stripeCustomerId) {
        return res.status(404).json({
          success: false,
          message: "User not found or no payment methods available"
        });
      }

      // Securely get pricing from server-side table
      let planPricing;
      try {
        planPricing = getPlanPricing(planId, planType);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: (error as Error).message
        });
      }

      let paymentMethodToUse = payment_method_id;
      
      // If use_default is specified, get the customer's default payment method
      if (use_default && !payment_method_id) {
        const customer = await stripe.customers.retrieve(user.stripeCustomerId) as Stripe.Customer;
        paymentMethodToUse = customer.invoice_settings?.default_payment_method as string;
        
        if (!paymentMethodToUse) {
          return res.status(400).json({
            success: false,
            message: "No default payment method set"
          });
        }
      }

      // Verify the payment method belongs to the user
      if (paymentMethodToUse) {
        try {
          const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodToUse);
          if (paymentMethod.customer !== user.stripeCustomerId) {
            return res.status(403).json({
              success: false,
              message: "Payment method does not belong to this user"
            });
          }
        } catch (error) {
          return res.status(404).json({
            success: false,
            message: "Payment method not found"
          });
        }
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(planPricing.price * 100), // Convert to cents
        currency: "usd",
        customer: user.stripeCustomerId,
        payment_method: paymentMethodToUse,
        confirmation_method: 'manual',
        confirm: true,
        off_session: true, // Indicates this is for a saved payment method
        metadata: {
          planId,
          planType,
          planName: planPricing.name,
          photos: planPricing.photos.toString(),
          userId: user.id
        },
      });

      if (paymentIntent.status === 'requires_action') {
        // 3D Secure or other authentication required
        res.json({
          success: true,
          requires_action: true,
          client_secret: paymentIntent.client_secret,
          payment_intent: {
            id: paymentIntent.id,
            status: paymentIntent.status
          }
        });
      } else if (paymentIntent.status === 'succeeded') {
        // Payment completed successfully
        res.json({
          success: true,
          payment_intent: {
            id: paymentIntent.id,
            status: paymentIntent.status
          },
          plan: {
            id: planId,
            type: planType,
            name: planPricing.name,
            price: planPricing.price,
            photos: planPricing.photos
          }
        });
      } else {
        // Payment failed
        res.status(400).json({
          success: false,
          message: "Payment failed",
          payment_intent: {
            id: paymentIntent.id,
            status: paymentIntent.status
          }
        });
      }
    } catch (error: any) {
      console.error('Stripe payment with saved method error:', error);
      
      if (error.type === 'StripeCardError') {
        // Card was declined
        res.status(400).json({
          success: false,
          message: "Your card was declined",
          decline_code: error.decline_code
        });
      } else {
        res.status(500).json({ 
          success: false,
          message: "Error processing payment: " + error.message 
        });
      }
    }
  });

  // Staging request endpoints
  
  // Create a payment-verified staging request (post-purchase order completion)
  app.post("/api/order-completion", async (req, res) => {
    try {
      // Validate request body
      const validatedData = orderCompletionSchema.parse(req.body);
      
      // Verify payment with Stripe
      let paymentIntent;
      try {
        paymentIntent = await stripe.paymentIntents.retrieve(validatedData.paymentIntentId);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment intent ID"
        });
      }
      
      // Verify payment was successful
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({
          success: false,
          message: "Payment has not been completed successfully"
        });
      }
      
      // Check if staging request already exists for this payment (idempotency)
      const existingRequest = await storage.getStagingRequestByPaymentIntent(validatedData.paymentIntentId);
      if (existingRequest) {
        // Return existing request with 200 status for idempotency
        return res.status(200).json({
          success: true,
          message: "Order was already completed for this payment",
          data: existingRequest
        });
      }
      
      // Extract plan information from payment metadata
      const planId = paymentIntent.metadata.planId;
      const planType = paymentIntent.metadata.planType as 'onetime' | 'subscription';
      const photosPurchased = paymentIntent.metadata.photos;
      
      if (!planId || !planType || !photosPurchased) {
        return res.status(400).json({
          success: false,
          message: "Payment is missing required plan information"
        });
      }
      
      // Create the full staging request data
      const stagingRequestData = {
        ...validatedData,
        planId,
        planType,
        photosPurchased,
        propertyImages: [] // Will be updated via separate endpoint
      };
      
      // Create staging request
      const stagingRequest = await storage.createStagingRequest(stagingRequestData);
      
      // Send email notifications (async, don't wait)
      Promise.all([
        sendNewRequestNotification(stagingRequest),
        sendClientConfirmation(stagingRequest)
      ]).catch(error => {
        console.error('Failed to send email notifications:', error);
        // Don't fail the request if emails fail
      });
      
      res.status(201).json({
        success: true,
        data: stagingRequest,
        message: "Order completed successfully"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors
        });
      }
      
      console.error("Error completing order:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  });
  
  // Create a quote request from contact form (simplified schema)
  app.post("/api/contact-quote", async (req, res) => {
    try {
      // Validate request body using simplified contact schema
      const validatedData = contactQuoteSchema.parse(req.body);
      
      // Create a simplified quote request in memory storage
      // We'll store it with placeholder values for required fields
      const quoteData = {
        // Required fields for storage (with placeholder values)
        paymentIntentId: `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        planId: "quote",
        planType: "onetime" as const,
        photosPurchased: "0",
        addressLine1: "TBD",
        city: "TBD", 
        state: "TBD",
        postalCode: "TBD",
        // Actual form data
        ...validatedData
      };
      
      // Create staging request with quote data  
      const stagingRequest = await storage.createStagingRequest({
        ...quoteData,
        propertyType: validatedData.propertyType as "single_family" | "condo" | "townhouse" | "residential" | "commercial" | "vacation_rental",
        rooms: validatedData.rooms as "1" | "2" | "3" | "4" | "5" | "6+"
      });
      
      // Send email notifications (async, don't wait)
      Promise.all([
        sendNewRequestNotification(stagingRequest),
        sendClientConfirmation(stagingRequest)
      ]).catch(error => {
        console.error("Error sending email notifications:", error);
        // Don't fail the request if email fails
      });
      
      res.status(201).json({
        success: true,
        message: "Quote request submitted successfully",
        data: {
          id: stagingRequest.id
        }
      });
    } catch (error) {
      console.error("Error creating quote request:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Invalid request data",
          errors: error.errors
        });
      }
      
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  });
  
  // Create a new staging request (legacy - for contact form)
  app.post("/api/staging-requests", async (req, res) => {
    try {
      // Validate request body
      const validatedData = insertStagingRequestSchema.parse(req.body);
      
      // Create staging request
      const stagingRequest = await storage.createStagingRequest(validatedData);
      
      // Send email notifications (async, don't wait)
      Promise.all([
        sendNewRequestNotification(stagingRequest),
        sendClientConfirmation(stagingRequest)
      ]).catch(error => {
        console.error('Failed to send email notifications:', error);
        // Don't fail the request if emails fail
      });
      
      res.status(201).json({
        success: true,
        data: stagingRequest,
        message: "Staging request submitted successfully"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors
        });
      }
      
      console.error("Error creating staging request:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  });

  // Get all staging requests (for admin)
  app.get("/api/staging-requests", requireAdminAuth, async (req, res) => {
    try {
      const requests = await storage.getAllStagingRequests();
      res.json({
        success: true,
        data: requests
      });
    } catch (error) {
      console.error("Error fetching staging requests:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  });

  // Get specific staging request
  app.get("/api/staging-requests/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate ID parameter
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid request ID"
        });
      }
      
      const request = await storage.getStagingRequest(id.trim());
      
      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Staging request not found"
        });
      }
      
      res.json({
        success: true,
        data: request
      });
    } catch (error) {
      console.error("Error fetching staging request:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  });

  // Update staging request (for admin)
  app.put("/api/staging-requests/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate ID parameter
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid request ID"
        });
      }
      
      // Validate request body with secure update schema
      const validatedUpdates = updateStagingRequestSchema.parse(req.body);
      
      const updated = await storage.updateStagingRequest(id.trim(), validatedUpdates);
      
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Staging request not found"
        });
      }
      
      res.json({
        success: true,
        data: updated,
        message: "Staging request updated successfully"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors
        });
      }
      
      console.error("Error updating staging request:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  });

  // Delete staging request (for admin)
  app.delete("/api/staging-requests/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate ID parameter
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid request ID"
        });
      }
      
      const deleted = await storage.deleteStagingRequest(id.trim());
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Staging request not found"
        });
      }
      
      res.json({
        success: true,
        message: "Staging request deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting staging request:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  });

  // Object storage endpoints for file uploads
  
  // Get secure upload URL for property images with cryptographic binding
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const { stagingRequestId, fileName, fileSize, fileType, uploadToken } = req.body;
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.connection.remoteAddress;
      
      // Basic validation for upload URL generation (uploadToken not required at this stage)
      const validation = fileValidationService.validateUploadRequest({
        stagingRequestId,
        fileName,
        fileSize,
        fileType,
        // Don't pass uploadToken for initial validation - it will be generated server-side
        uploadToken: undefined
      });

      if (!validation.isValid) {
        // Log security violation for monitoring
        fileValidationService.logSecurityViolation({
          type: 'INVALID_TOKEN',
          details: {
            errors: validation.errors,
            stagingRequestId,
            fileName,
            fileSize,
            fileType
          },
          userAgent,
          ipAddress
        });

        return res.status(400).json({
          success: false,
          error: "Upload request validation failed",
          details: validation.errors
        });
      }

      // Verify the staging request exists and user has access
      const stagingRequest = await storage.getStagingRequest(stagingRequestId.trim());
      if (!stagingRequest) {
        fileValidationService.logSecurityViolation({
          type: 'UNAUTHORIZED_ACCESS',
          details: {
            reason: 'staging_request_not_found',
            stagingRequestId: stagingRequestId.trim()
          },
          userAgent,
          ipAddress
        });

        return res.status(404).json({
          success: false,
          error: "Staging request not found"
        });
      }

      // Generate cryptographically secure upload token
      const secureToken = fileValidationService.generateUploadToken(
        stagingRequest.id,
        FILE_VALIDATION_CONFIG.ALLOWED_MIME_TYPES,
        FILE_VALIDATION_CONFIG.MAX_FILE_SIZE
      );

      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      
      res.json({ 
        method: "PUT",
        url: uploadURL,
        stagingRequestId: stagingRequest.id,
        uploadToken: secureToken,
        allowedFileTypes: FILE_VALIDATION_CONFIG.ALLOWED_MIME_TYPES,
        maxFileSize: FILE_VALIDATION_CONFIG.MAX_FILE_SIZE,
        tokenExpiresIn: FILE_VALIDATION_CONFIG.UPLOAD_TOKEN_EXPIRY / 1000 // seconds
      });
    } catch (error) {
      console.error("Error generating secure upload URL:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to generate upload URL" 
      });
    }
  });

  // Serve uploaded objects with ACL authorization checks
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      
      // Get user ID from session or authentication (currently no auth system)
      // For now, we'll allow access only to public objects or objects without ACL
      const userId = undefined; // TODO: Add proper authentication system
      
      // Check if user can access this object based on ACL policy
      const canAccess = await objectStorageService.canAccessObjectEntity({
        userId,
        objectFile,
        requestedPermission: undefined // Defaults to READ permission
      });
      
      if (!canAccess) {
        return res.status(403).json({ 
          error: "Access denied",
          message: "You do not have permission to access this file"
        });
      }
      
      objectStorageService.downloadObject(objectFile, res);
    } catch (err) {
      const error = err as Error;
      console.error("Error serving object:", error);
      if (error.message === "Object not found") {
        res.status(404).json({ error: "File not found" });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // Server-side file validation endpoint (called after file upload to GCS)
  app.post("/api/objects/validate", upload.single('file'), async (req: MulterRequest, res) => {
    try {
      const { uploadToken, stagingRequestId } = req.body;
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.connection.remoteAddress;

      // Validate upload token
      const token = fileValidationService.validateUploadToken(uploadToken);
      if (!token) {
        fileValidationService.logSecurityViolation({
          type: 'INVALID_TOKEN',
          details: {
            reason: 'invalid_or_expired_token',
            uploadToken
          },
          userAgent,
          ipAddress
        });

        return res.status(401).json({
          success: false,
          error: "Invalid or expired upload token"
        });
      }

      // Verify token matches staging request
      if (token.stagingRequestId !== stagingRequestId) {
        fileValidationService.logSecurityViolation({
          type: 'INVALID_TOKEN',
          details: {
            reason: 'token_staging_request_mismatch',
            tokenStagingRequestId: token.stagingRequestId,
            providedStagingRequestId: stagingRequestId
          },
          userAgent,
          ipAddress
        });

        return res.status(400).json({
          success: false,
          error: "Upload token does not match staging request"
        });
      }

      // Validate uploaded file if provided
      if (req.file) {
        const validationResult = await fileValidationService.validateFileContent(req.file.buffer, token);
        
        if (!validationResult.isValid) {
          fileValidationService.logSecurityViolation({
            type: 'FILE_TYPE_MISMATCH',
            details: {
              reason: 'server_side_validation_failed',
              errors: validationResult.errors,
              detectedMimeType: validationResult.mimeType,
              fileSize: validationResult.size,
              stagingRequestId
            },
            userAgent,
            ipAddress
          });

          return res.status(400).json({
            success: false,
            error: "File validation failed",
            details: validationResult.errors
          });
        }

        res.json({
          success: true,
          message: "File validation passed",
          fileInfo: {
            mimeType: validationResult.mimeType,
            extension: validationResult.extension,
            size: validationResult.size,
            metadata: validationResult.metadata
          }
        });
      } else {
        res.json({
          success: true,
          message: "Token validation passed"
        });
      }
    } catch (error) {
      console.error("Error validating file:", error);
      res.status(500).json({
        success: false,
        error: "File validation failed"
      });
    }
  });

  // Update staging request with uploaded images (enhanced security)
  app.put("/api/staging-requests/:id/images", async (req, res) => {
    try {
      const { id } = req.params;
      const { propertyImages } = req.body;
      
      // Validate ID parameter
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid request ID"
        });
      }
      
      if (!propertyImages || !Array.isArray(propertyImages)) {
        return res.status(400).json({
          success: false,
          message: "Property images array is required"
        });
      }
      
      // Validate maximum number of images (max 10 images)
      if (propertyImages.length > 10) {
        return res.status(400).json({
          success: false,
          message: "Maximum of 10 images allowed per staging request"
        });
      }

      // Verify the staging request exists first
      const existingRequest = await storage.getStagingRequest(id.trim());
      if (!existingRequest) {
        return res.status(404).json({
          success: false,
          message: "Staging request not found"
        });
      }

      // Enhanced validation and ACL policy setting with server-side file verification
      const objectStorageService = new ObjectStorageService();
      const normalizedImages = [];
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.connection.remoteAddress;
      
      for (const imageUrl of propertyImages) {
        if (!imageUrl || typeof imageUrl !== 'string') {
          return res.status(400).json({
            success: false,
            message: "All image URLs must be valid strings"
          });
        }
        
        try {
          // Normalize the path first
          const normalizedPath = objectStorageService.normalizeObjectEntityPath(imageUrl);
          
          // Verify the file exists and validate its content server-side
          let isValidFile = false;
          try {
            const objectFile = await objectStorageService.getObjectEntityFile(normalizedPath);
            
            // Download and validate file content to prevent bypassing client-side restrictions
            const fileStream = objectFile.createReadStream();
            const chunks: Buffer[] = [];
            
            for await (const chunk of fileStream) {
              chunks.push(chunk);
            }
            
            const fileBuffer = Buffer.concat(chunks);
            
            // Validate file content using server-side validation
            const validationResult = await fileValidationService.validateFileContent(fileBuffer);
            
            if (!validationResult.isValid) {
              // Log security violation - file failed server-side validation
              fileValidationService.logSecurityViolation({
                type: 'FILE_TYPE_MISMATCH',
                details: {
                  reason: 'uploaded_file_failed_validation',
                  errors: validationResult.errors,
                  imageUrl,
                  normalizedPath,
                  stagingRequestId: id.trim(),
                  detectedMimeType: validationResult.mimeType,
                  fileSize: validationResult.size
                },
                userAgent,
                ipAddress
              });

              return res.status(400).json({
                success: false,
                message: `File validation failed for ${imageUrl}: ${validationResult.errors.join(', ')}`
              });
            }
            
            isValidFile = true;
            console.log(`File validation passed for ${imageUrl}:`, {
              mimeType: validationResult.mimeType,
              size: validationResult.size,
              dimensions: validationResult.metadata
            });
            
          } catch (fileErr) {
            const fileError = fileErr as Error;
            console.error("Error validating uploaded file:", imageUrl, fileError);
            
            fileValidationService.logSecurityViolation({
              type: 'UNAUTHORIZED_ACCESS',
              details: {
                reason: 'file_not_found_or_inaccessible',
                imageUrl,
                normalizedPath,
                stagingRequestId: id.trim(),
                error: fileError.message
              },
              userAgent,
              ipAddress
            });

            return res.status(400).json({
              success: false,
              message: `Unable to access or validate file: ${imageUrl}`
            });
          }

          // Only set ACL policy if file validation passed
          if (isValidFile) {
            const normalizedPathWithAcl = await objectStorageService.trySetObjectEntityAclPolicy(
              imageUrl,
              {
                owner: "public", // For staging requests, images should be public
                visibility: "public"
              }
            );
            normalizedImages.push(normalizedPathWithAcl);
          }
          
        } catch (err) {
          const error = err as Error;
          console.error("Error processing image:", imageUrl, error);
          
          fileValidationService.logSecurityViolation({
            type: 'UNAUTHORIZED_ACCESS',
            details: {
              reason: 'image_processing_failed',
              imageUrl,
              stagingRequestId: id.trim(),
              error: error.message
            },
            userAgent,
            ipAddress
          });

          return res.status(500).json({
            success: false,
            message: `Failed to process image: ${imageUrl}`
          });
        }
      }

      // Update the staging request with normalized image paths
      const updatedRequest = await storage.updateStagingRequest(id.trim(), {
        propertyImages: normalizedImages
      });
      
      if (!updatedRequest) {
        return res.status(404).json({
          success: false,
          message: "Staging request not found"
        });
      }

      res.json({
        success: true,
        data: updatedRequest,
        message: "Property images updated successfully"
      });

    } catch (error) {
      console.error("Error updating property images:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update property images"
      });
    }
  });

  // ===== CORE ACCOUNT APIS =====

  // Projects API (linking to existing stagingRequests)

  // List user's projects with pagination
  app.get("/api/projects", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }

      const projects = await storage.getStagingRequestsByUser(req.user.id);
      
      res.json({
        success: true,
        data: projects.map(project => ({
          id: project.id,
          paymentIntentId: project.paymentIntentId,
          planId: project.planId,
          planType: project.planType,
          photosPurchased: project.photosPurchased,
          name: project.name,
          email: project.email,
          phone: project.phone,
          addressLine1: project.addressLine1,
          addressLine2: project.addressLine2,
          city: project.city,
          state: project.state,
          postalCode: project.postalCode,
          propertyType: project.propertyType,
          rooms: project.rooms,
          message: project.message,
          propertyImages: project.propertyImages,
          createdAt: project.createdAt
        }))
      });
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching projects"
      });
    }
  });

  // Get specific project with all details
  app.get("/api/projects/:id", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }

      const { id } = req.params;
      
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid project ID"
        });
      }

      const project = await storage.getStagingRequest(id.trim());
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      // Check ownership
      if (project.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }

      // Get related data
      const [assets, revisions, extraPhotoRequests] = await Promise.all([
        storage.getAssetsByProject(project.id),
        storage.getRevisionsByProject(project.id),
        storage.getExtraPhotoRequestsByProject(project.id)
      ]);

      res.json({
        success: true,
        data: {
          ...project,
          assets,
          revisions,
          extraPhotoRequests
        }
      });
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching project"
      });
    }
  });

  // Update project contact info/address only
  app.patch("/api/projects/:id", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }

      const { id } = req.params;
      
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid project ID"
        });
      }

      const project = await storage.getStagingRequest(id.trim());
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      // Check ownership
      if (project.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }

      // Only allow updates to contact info and address fields
      const allowedFields = [
        'name', 'email', 'phone', 'addressLine1', 'addressLine2', 
        'city', 'state', 'postalCode', 'propertyType', 'rooms', 'message'
      ];
      
      const updates: any = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid fields to update"
        });
      }

      const updatedProject = await storage.updateStagingRequest(id.trim(), updates);
      
      if (!updatedProject) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      res.json({
        success: true,
        data: updatedProject,
        message: "Project updated successfully"
      });
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while updating project"
      });
    }
  });

  // Assets API (photo management)

  // Generate presigned upload URLs for photos
  app.post("/api/assets/presign-upload", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }

      const { projectId, kind, fileName, fileSize, mimeType } = req.body;
      
      // Validate required fields
      if (!projectId || !kind || !fileName || !fileSize || !mimeType) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: projectId, kind, fileName, fileSize, mimeType"
        });
      }

      // Validate kind
      if (!['original', 'staged', 'revision_ref'].includes(kind)) {
        return res.status(400).json({
          success: false,
          message: "Invalid asset kind. Must be 'original', 'staged', or 'revision_ref'"
        });
      }

      // Enhanced file validation using existing service
      const validation = fileValidationService.validateUploadRequest({
        stagingRequestId: projectId,
        fileName,
        fileSize,
        fileType: mimeType
      });

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: "Upload validation failed",
          errors: validation.errors
        });
      }

      // Check project ownership
      const project = await storage.getStagingRequest(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      if (project.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }

      // Generate secure upload token
      const uploadToken = fileValidationService.generateUploadToken(
        projectId,
        FILE_VALIDATION_CONFIG.ALLOWED_MIME_TYPES,
        FILE_VALIDATION_CONFIG.MAX_FILE_SIZE
      );

      // Use enhanced ObjectStorageService with user-specific paths
      const objectStorageService = new ObjectStorageService();
      const uploadDetails = await objectStorageService.generateAssetPresignedUploadUrl(
        req.user.id,
        projectId,
        kind,
        fileName
      );
      
      res.json({
        success: true,
        data: {
          method: "PUT",
          url: uploadDetails.uploadUrl,
          storageKey: uploadDetails.storageKey,
          uploadToken,
          projectId,
          kind,
          allowedFileTypes: FILE_VALIDATION_CONFIG.ALLOWED_MIME_TYPES,
          maxFileSize: FILE_VALIDATION_CONFIG.MAX_FILE_SIZE,
          tokenExpiresIn: FILE_VALIDATION_CONFIG.UPLOAD_TOKEN_EXPIRY / 1000,
          // Additional context for client
          fullPath: uploadDetails.fullPath,
          userId: req.user.id
        }
      });
    } catch (error) {
      console.error('Error generating presigned upload URL:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while generating upload URL"
      });
    }
  });

  // Confirm successful upload and create asset record
  app.post("/api/assets/confirm-upload", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }

      const { uploadToken, ...assetData } = req.body;

      // Optional upload token validation for additional security
      if (uploadToken) {
        const token = fileValidationService.validateUploadToken(uploadToken);
        if (!token) {
          return res.status(400).json({
            success: false,
            message: "Invalid or expired upload token"
          });
        }

        // Verify token matches the project ID
        if (token.stagingRequestId !== assetData.projectId) {
          return res.status(400).json({
            success: false,
            message: "Upload token does not match project"
          });
        }
      }

      const validatedData = insertAssetSchema.parse({
        ...assetData,
        userId: req.user.id
      });

      // Check project ownership
      const project = await storage.getStagingRequest(validatedData.projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      if (project.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }

      // Verify the asset actually exists in storage before creating DB record
      const objectStorageService = new ObjectStorageService();
      const assetExists = await objectStorageService.assetExists(validatedData.storageKey);
      
      if (!assetExists) {
        console.error('Upload confirmation failed: Asset not found in storage', {
          storageKey: validatedData.storageKey,
          userId: req.user.id,
          projectId: validatedData.projectId
        });
        
        return res.status(400).json({
          success: false,
          message: "Upload verification failed - asset not found in storage"
        });
      }

      // Get storage metadata to validate/enrich asset data
      const metadata = await objectStorageService.getAssetMetadata(validatedData.storageKey);
      
      // Create the asset record with enriched metadata
      const enrichedAssetData = {
        ...validatedData,
        // Update file size from actual storage if available
        ...(metadata?.size && { fileSize: metadata.size }),
        // Update content type from storage if available
        ...(metadata?.contentType && { mimeType: metadata.contentType }),
        processingStatus: 'completed' // Mark as completed since verification passed
      };

      const asset = await storage.createAsset(enrichedAssetData);
      
      res.status(201).json({
        success: true,
        data: asset,
        message: "Asset created and verified successfully",
        metadata: {
          verifiedInStorage: true,
          ...(metadata && {
            storageMetadata: {
              actualSize: metadata.size,
              contentType: metadata.contentType,
              lastModified: metadata.updated
            }
          })
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors
        });
      }
      
      console.error('Error confirming upload:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while confirming upload"
      });
    }
  });

  // Generate signed download URL for photos
  app.get("/api/assets/:id/download", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }

      const { id } = req.params;
      const { ttl } = req.query; // Optional TTL override in seconds
      
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid asset ID"
        });
      }

      const asset = await storage.getAsset(id.trim());
      
      if (!asset) {
        return res.status(404).json({
          success: false,
          message: "Asset not found"
        });
      }

      // Check ownership through project
      const project = await storage.getStagingRequest(asset.projectId);
      if (!project || project.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }

      // Parse TTL with sensible defaults and limits
      let ttlSec = 3600; // Default 1 hour
      if (ttl && typeof ttl === 'string') {
        const parsedTtl = parseInt(ttl, 10);
        if (!isNaN(parsedTtl)) {
          // Limit TTL between 5 minutes and 24 hours
          ttlSec = Math.max(300, Math.min(86400, parsedTtl));
        }
      }

      // Generate signed download URL using enhanced ObjectStorageService
      const objectStorageService = new ObjectStorageService();
      
      // Helper to derive thumbnail storage key: {userId}/staged/file.jpg → {userId}/staged/.thumbs/file.jpg
      const getThumbnailKey = (key: string) => {
        const parts = key.split('/');
        const fileName = parts.pop() || '';
        return [...parts, '.thumbs', fileName].join('/');
      };
      
      // Check if thumbnail exists for this asset
      let storageKeyToUse = asset.storageKey;
      const thumbnailKey = getThumbnailKey(asset.storageKey);
      const thumbnailExists = await objectStorageService.assetExists(thumbnailKey);
      
      if (thumbnailExists) {
        // Use thumbnail if available
        storageKeyToUse = thumbnailKey;
      } else {
        // Verify original asset exists in storage
        const assetExists = await objectStorageService.assetExists(asset.storageKey);
        if (!assetExists) {
          return res.status(404).json({
            success: false,
            message: "Asset file not found in storage"
          });
        }
      }
      
      // Get additional metadata
      const metadata = await objectStorageService.getAssetMetadata(storageKeyToUse);
      
      // Generate the signed download URL (for thumbnail if available, otherwise original)
      const signedUrl = await objectStorageService.generateAssetPresignedDownloadUrl(
        storageKeyToUse,
        ttlSec
      );
      
      res.json({
        success: true,
        data: {
          downloadUrl: signedUrl,
          fileName: asset.fileName,
          mimeType: asset.mimeType,
          fileSize: asset.fileSize,
          kind: asset.kind,
          uploadedAt: asset.uploadedAt,
          expiresAt: new Date(Date.now() + ttlSec * 1000).toISOString(),
          ttlSeconds: ttlSec,
          // Include storage metadata if available
          ...(metadata && {
            storageMetadata: {
              actualSize: metadata.size,
              contentType: metadata.contentType,
              lastModified: metadata.updated
            }
          })
        }
      });
    } catch (error) {
      console.error('Error generating signed download URL:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while generating download URL"
      });
    }
  });

  // List all assets for a project
  app.get("/api/projects/:id/assets", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }

      const { id } = req.params;
      
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid project ID"
        });
      }

      const project = await storage.getStagingRequest(id.trim());
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      if (project.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }

      const assets = await storage.getAssetsByProject(id.trim());
      
      res.json({
        success: true,
        data: assets
      });
    } catch (error) {
      console.error('Error fetching project assets:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching assets"
      });
    }
  });

  // Revisions API

  // Request revision
  app.post("/api/projects/:id/revisions", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }

      const { id } = req.params;
      
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid project ID"
        });
      }

      const project = await storage.getStagingRequest(id.trim());
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      if (project.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }

      const validatedData = insertRevisionSchema.parse({
        ...req.body,
        projectId: id.trim(),
        createdBy: req.user.id
      });

      // Verify the original asset exists and belongs to this project
      const originalAsset = await storage.getAsset(validatedData.originalAssetId);
      if (!originalAsset || originalAsset.projectId !== id.trim()) {
        return res.status(400).json({
          success: false,
          message: "Invalid original asset ID"
        });
      }

      const revision = await storage.createRevision(validatedData);
      
      res.status(201).json({
        success: true,
        data: revision,
        message: "Revision request created successfully"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors
        });
      }
      
      console.error('Error creating revision:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while creating revision request"
      });
    }
  });

  // List revisions for project
  app.get("/api/projects/:id/revisions", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }

      const { id } = req.params;
      
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid project ID"
        });
      }

      const project = await storage.getStagingRequest(id.trim());
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      if (project.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }

      const revisions = await storage.getRevisionsByProject(id.trim());
      
      res.json({
        success: true,
        data: revisions
      });
    } catch (error) {
      console.error('Error fetching revisions:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching revisions"
      });
    }
  });

  // Update revision status (admin only)
  app.patch("/api/revisions/:id", requireAdminAuth, async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid revision ID"
        });
      }

      const { status, stagedAssetId, resolvedAt } = req.body;
      
      if (!status) {
        return res.status(400).json({
          success: false,
          message: "Status is required"
        });
      }

      if (!['pending', 'in_progress', 'completed', 'rejected'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status"
        });
      }

      const updates: any = { status };
      if (stagedAssetId) updates.stagedAssetId = stagedAssetId;
      if (resolvedAt) updates.resolvedAt = new Date(resolvedAt);

      const updatedRevision = await storage.updateRevision(id.trim(), updates);
      
      if (!updatedRevision) {
        return res.status(404).json({
          success: false,
          message: "Revision not found"
        });
      }

      res.json({
        success: true,
        data: updatedRevision,
        message: "Revision updated successfully"
      });
    } catch (error) {
      console.error('Error updating revision:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while updating revision"
      });
    }
  });

  // Extra Photos API

  // Request additional photos with Stripe PaymentIntent
  app.post("/api/projects/:id/extras", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }

      const { id } = req.params;
      
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid project ID"
        });
      }

      const project = await storage.getStagingRequest(id.trim());
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      if (project.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }

      const { photoCount } = req.body;
      
      if (!photoCount || typeof photoCount !== 'number' || photoCount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid photo count is required"
        });
      }

      // Calculate pricing (example: $12 per additional photo)
      const pricePerPhoto = 12.00;
      const totalAmount = photoCount * pricePerPhoto;

      // Create Stripe PaymentIntent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          projectId: id.trim(),
          userId: req.user.id,
          extraPhotos: photoCount.toString(),
          pricePerPhoto: pricePerPhoto.toString()
        },
      });

      const validatedData = insertExtraPhotoRequestSchema.parse({
        projectId: id.trim(),
        photoCount,
        paymentIntentId: paymentIntent.id
      });

      const extraPhotoRequest = await storage.createExtraPhotoRequest(validatedData);
      
      res.status(201).json({
        success: true,
        data: {
          ...extraPhotoRequest,
          clientSecret: paymentIntent.client_secret,
          totalAmount,
          pricePerPhoto
        },
        message: "Extra photo request created successfully"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors
        });
      }
      
      console.error('Error creating extra photo request:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while creating extra photo request"
      });
    }
  });

  // List extra photo requests
  app.get("/api/projects/:id/extras", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }

      const { id } = req.params;
      
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid project ID"
        });
      }

      const project = await storage.getStagingRequest(id.trim());
      
      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      if (project.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }

      const extraRequests = await storage.getExtraPhotoRequestsByProject(id.trim());
      
      res.json({
        success: true,
        data: extraRequests
      });
    } catch (error) {
      console.error('Error fetching extra photo requests:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching extra photo requests"
      });
    }
  });

  // Support Tickets API

  // Create support ticket
  app.post("/api/support", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }

      const validatedData = insertSupportTicketSchema.parse({
        ...req.body,
        userId: req.user.id
      });

      // If projectId is provided, verify ownership
      if (validatedData.projectId) {
        const project = await storage.getStagingRequest(validatedData.projectId);
        if (!project || project.userId !== req.user.id) {
          return res.status(400).json({
            success: false,
            message: "Invalid project ID"
          });
        }
      }

      const ticket = await storage.createSupportTicket(validatedData);
      
      res.status(201).json({
        success: true,
        data: ticket,
        message: "Support ticket created successfully"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors
        });
      }
      
      console.error('Error creating support ticket:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while creating support ticket"
      });
    }
  });

  // List user's support tickets
  app.get("/api/support", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }

      const tickets = await storage.getSupportTicketsByUser(req.user.id);
      
      res.json({
        success: true,
        data: tickets
      });
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching support tickets"
      });
    }
  });

  // Update support ticket (user can only update status to 'closed')
  app.patch("/api/support/:id", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }

      const { id } = req.params;
      
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid ticket ID"
        });
      }

      const ticket = await storage.getSupportTicket(id.trim());
      
      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Support ticket not found"
        });
      }

      if (ticket.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }

      const { status } = req.body;
      
      // Users can only close their tickets
      if (status && status !== 'closed') {
        return res.status(400).json({
          success: false,
          message: "Users can only update status to 'closed'"
        });
      }

      const updates: any = {};
      if (status === 'closed') {
        updates.status = 'closed';
        updates.resolvedAt = new Date();
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid updates provided"
        });
      }

      const updatedTicket = await storage.updateSupportTicket(id.trim(), updates);
      
      if (!updatedTicket) {
        return res.status(404).json({
          success: false,
          message: "Support ticket not found"
        });
      }

      res.json({
        success: true,
        data: updatedTicket,
        message: "Support ticket updated successfully"
      });
    } catch (error) {
      console.error('Error updating support ticket:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while updating support ticket"
      });
    }
  });

  // Conversations/Messaging API

  // List user's conversations with enriched data
  app.get("/api/conversations", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }

      const conversations = await storage.getUserConversations(req.user.id);
      
      // Enrich conversations with messages and additional data
      const enrichedConversations = await Promise.all(
        conversations.map(async (conversation) => {
          // Get messages for this conversation
          const messages = await storage.getMessagesByConversation(conversation.id);
          
          // Add sender names to messages
          const enrichedMessages = await Promise.all(
            messages.map(async (message) => {
              const sender = await storage.getUser(message.senderId);
              const senderName = sender 
                ? [sender.firstName, sender.lastName].filter(Boolean).join(' ') || sender.email || sender.username || 'Unknown User'
                : 'Unknown User';
              return {
                ...message,
                senderName
              };
            })
          );
          
          // Get project name if projectId exists
          let projectName = undefined;
          if (conversation.projectId) {
            const project = await storage.getStagingRequest(conversation.projectId);
            if (project) {
              projectName = `${project.addressLine1}, ${project.city}`;
            }
          }
          
          // Calculate unread count (simplified - assumes all messages are read for now)
          const unreadCount = 0;
          
          // Get last message info
          const lastMessage = enrichedMessages.length > 0 ? enrichedMessages[enrichedMessages.length - 1] : null;
          
          return {
            ...conversation,
            messages: enrichedMessages,
            projectName,
            unreadCount,
            lastMessage: lastMessage?.messageBody,
            lastMessageAt: lastMessage?.createdAt
          };
        })
      );
      
      res.json({
        success: true,
        data: enrichedConversations
      });
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching conversations"
      });
    }
  });

  // Create new conversation
  app.post("/api/conversations", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }

      const { type, projectId } = req.body;
      
      if (!type || !['account_executive', 'support'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Valid conversation type is required ('account_executive' or 'support')"
        });
      }

      // If projectId is provided, verify ownership
      if (projectId) {
        const project = await storage.getStagingRequest(projectId);
        if (!project || project.userId !== req.user.id) {
          return res.status(400).json({
            success: false,
            message: "Invalid project ID"
          });
        }
      }

      const conversationData: any = {
        type,
        participantIds: [req.user.id] // User is always a participant
      };
      
      // Only include projectId if it's provided
      if (projectId) {
        conversationData.projectId = projectId;
      }
      
      const validatedData = insertConversationSchema.parse(conversationData);

      const conversation = await storage.createConversation(validatedData);
      
      res.status(201).json({
        success: true,
        data: conversation,
        message: "Conversation created successfully"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors
        });
      }
      
      console.error('Error creating conversation:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while creating conversation"
      });
    }
  });

  // Get messages in conversation
  app.get("/api/conversations/:id/messages", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }

      const { id } = req.params;
      
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid conversation ID"
        });
      }

      const conversation = await storage.getConversation(id.trim());
      
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found"
        });
      }

      // Check if user is a participant
      if (!conversation.participantIds.includes(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }

      const messages = await storage.getMessagesByConversation(id.trim());
      
      res.json({
        success: true,
        data: messages
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching messages"
      });
    }
  });

  // Send message
  app.post("/api/conversations/:id/messages", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }

      const { id } = req.params;
      
      if (!id || typeof id !== 'string' || id.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid conversation ID"
        });
      }

      const conversation = await storage.getConversation(id.trim());
      
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found"
        });
      }

      // Check if user is a participant
      if (!conversation.participantIds.includes(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }

      const validatedData = insertMessageSchema.parse({
        ...req.body,
        conversationId: id.trim(),
        senderId: req.user.id
      });

      const message = await storage.createMessage(validatedData);

      // Update conversation's lastMessageAt
      await storage.updateConversation(id.trim(), {
        lastMessageAt: new Date()
      });
      
      res.status(201).json({
        success: true,
        data: message,
        message: "Message sent successfully"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors
        });
      }
      
      console.error('Error sending message:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while sending message"
      });
    }
  });

  // Dashboard statistics endpoint
  app.get("/api/dashboard/stats", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }

      // Get user's projects
      const projects = await storage.getStagingRequestsByUser(req.user.id);
      const completedProjects = 0; // Would need proper status tracking in schema
      
      // Get user's photos
      const userAssets = await storage.getAssetsByUser(req.user.id);
      const totalPhotos = userAssets.length;
      
      // Get unread message count (placeholder - would need message read tracking)
      const unreadMessages = 0; // Placeholder
      
      // Generate recent activity (placeholder implementation)
      const recentActivity = projects.slice(0, 5).map(project => ({
        id: `activity-${project.id}`,
        type: 'project_created',
        title: `Project Created: ${project.name}`,
        description: `New project at ${project.addressLine1}, ${project.city}`,
        timestamp: project.createdAt
      }));

      const stats = {
        totalProjects: projects.length,
        completedProjects,
        totalPhotos,
        unreadMessages,
        recentActivity
      };

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching dashboard statistics"
      });
    }
  });

  // Get user's projects (for dashboard)
  app.get("/api/projects", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }

      const projects = await storage.getStagingRequestsByUser(req.user.id);
      const assets = await storage.getAssetsByUser(req.user.id);
      
      // Create asset counts by project
      const assetCountsByProject = assets.reduce((acc, asset) => {
        if (!acc[asset.projectId]) {
          acc[asset.projectId] = {
            original: 0,
            staged: 0,
            total: 0
          };
        }
        acc[asset.projectId].total++;
        if (asset.kind === 'original') {
          acc[asset.projectId].original++;
        } else if (asset.kind === 'staged') {
          acc[asset.projectId].staged++;
        }
        return acc;
      }, {} as Record<string, { original: number; staged: number; total: number }>);
      
      // Transform projects for dashboard display with actual counts and status
      const formattedProjects = projects.map(project => {
        const counts = assetCountsByProject[project.id] || { original: 0, staged: 0, total: 0 };
        const photosPurchased = parseInt(project.photosPurchased) || 0;
        
        // Determine status based on staging progress
        let status: 'pending' | 'in_progress' | 'completed';
        if (counts.staged >= photosPurchased && photosPurchased > 0) {
          status = 'completed';
        } else if (counts.staged > 0) {
          status = 'in_progress';
        } else {
          status = 'pending';
        }
        
        return {
          id: project.id,
          name: project.name,
          email: project.email,
          propertyType: project.propertyType,
          addressLine1: project.addressLine1,
          city: project.city,
          state: project.state,
          rooms: project.rooms,
          photosPurchased,
          originalPhotos: counts.original,
          stagedPhotos: counts.staged,
          totalPhotos: counts.total,
          status,
          createdAt: project.createdAt,
          planType: project.planType,
          planName: project.planId
        };
      });

      res.json({
        success: true,
        data: formattedProjects
      });
    } catch (error) {
      console.error('Error fetching user projects:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching projects"
      });
    }
  });

  // Get user's photos across all projects
  app.get("/api/photos", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }

      const assets = await storage.getAssetsByUser(req.user.id);
      const projects = await storage.getStagingRequestsByUser(req.user.id);
      
      // Create project lookup map
      const projectMap = new Map(projects.map(p => [p.id, p]));
      
      // Transform assets for photos gallery
      const formattedPhotos = assets.map(asset => {
        const project = projectMap.get(asset.projectId);
        return {
          id: asset.id,
          projectId: asset.projectId,
          projectName: project?.name || 'Unknown Project',
          projectAddress: project ? `${project.addressLine1}, ${project.city}, ${project.state}` : 'Unknown Address',
          fileName: asset.fileName,
          kind: asset.kind,
          storageKey: asset.storageKey,
          mimeType: asset.mimeType,
          fileSize: asset.fileSize,
          width: asset.width,
          height: asset.height,
          uploadedAt: asset.uploadedAt,
          processingStatus: asset.processingStatus
        };
      });

      res.json({
        success: true,
        data: formattedPhotos
      });
    } catch (error) {
      console.error('Error fetching user photos:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching photos"
      });
    }
  });

  // Update user profile
  app.patch("/api/auth/profile", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }

      const { name, email } = req.body;
      
      if (!name && !email) {
        return res.status(400).json({
          success: false,
          message: "At least one field (name or email) is required"
        });
      }

      const updates: any = {};
      if (name) {
        if (name.trim().length === 0 || name.length > 100) {
          return res.status(400).json({
            success: false,
            message: "Name must be between 1 and 100 characters"
          });
        }
        updates.name = name.trim();
      }
      
      if (email) {
        if (!isValidEmail(email)) {
          return res.status(400).json({
            success: false,
            message: "Invalid email format"
          });
        }
        
        // Check if email is already taken by another user
        const existingUser = await storage.getUserByEmail(email.toLowerCase());
        if (existingUser && existingUser.id !== req.user.id) {
          return res.status(409).json({
            success: false,
            message: "Email is already taken"
          });
        }
        
        updates.email = email.toLowerCase();
      }

      const updatedUser = await storage.updateUser(req.user.id, updates);
      
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      res.json({
        success: true,
        user: {
          id: updatedUser.id,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          profileImageUrl: updatedUser.profileImageUrl,
          createdAt: updatedUser.createdAt
        },
        message: "Profile updated successfully"
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while updating profile"
      });
    }
  });

  // Change password - disabled for Replit Auth
  app.post("/api/auth/change-password", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    return res.status(400).json({
      success: false,
      message: "Password management is handled by Replit Auth. Please use your Replit account settings."
    });
  });

  // Upload avatar (placeholder - would need file upload handling)
  app.post("/api/auth/avatar", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }

      // Placeholder implementation - in a real app would handle file upload
      res.json({
        success: false,
        message: "Avatar upload not yet implemented"
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while uploading avatar"
      });
    }
  });

  // Alias for support tickets (dashboard expects /api/support/tickets)
  app.get("/api/support/tickets", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }

      const tickets = await storage.getSupportTicketsByUser(req.user.id);
      
      res.json({
        success: true,
        tickets: tickets
      });
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching support tickets"
      });
    }
  });

  // Create support ticket (dashboard expects /api/support/tickets)
  app.post("/api/support/tickets", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }

      const validatedData = insertSupportTicketSchema.parse({
        ...req.body,
        userId: req.user.id
      });

      // If projectId is provided, verify ownership
      if (validatedData.projectId) {
        const project = await storage.getStagingRequest(validatedData.projectId);
        if (!project || project.userId !== req.user.id) {
          return res.status(400).json({
            success: false,
            message: "Invalid project ID"
          });
        }
      }

      const ticket = await storage.createSupportTicket(validatedData);
      
      res.status(201).json({
        success: true,
        data: ticket,
        message: "Support ticket created successfully"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors
        });
      }
      
      console.error('Error creating support ticket:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while creating support ticket"
      });
    }
  });

  // Get simple project list for forms (like support ticket project selection)
  app.get("/api/projects/simple", requireAuth as any, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }

      const projects = await storage.getStagingRequestsByUser(req.user.id);
      
      const simpleProjects = projects.map(project => ({
        id: project.id,
        name: project.name,
        addressLine1: project.addressLine1,
        city: project.city,
        state: project.state
      }));

      res.json({
        success: true,
        projects: simpleProjects
      });
    } catch (error) {
      console.error('Error fetching simple projects:', error);
      res.status(500).json({
        success: false,
        message: "An error occurred while fetching projects"
      });
    }
  });

  // Contact form submission endpoint
  app.post("/api/contact", async (req, res) => {
    try {
      const { firstName, lastName, email, message } = req.body;
      
      // Validate required fields
      if (!firstName || !lastName || !email || !message) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required'
        });
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email address'
        });
      }
      
      // Send notification to admins
      await sendContactFormNotification({
        firstName,
        lastName,
        email,
        message
      });
      
      // Send confirmation to user
      await sendContactFormConfirmation({
        firstName,
        lastName,
        email
      });
      
      res.json({
        success: true,
        message: 'Thank you for your message. We will respond within 24 hours.'
      });
    } catch (error) {
      console.error('Contact form error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while sending your message. Please try again.'
      });
    }
  });

  // Go High Level webhook endpoint for contact form integration
  // NOTE: This endpoint is temporarily disabled due to schema changes
  // Contact forms should use the legacy /api/staging-requests endpoint
  app.post("/api/ghl-webhook", async (req, res) => {
    try {
      res.json({
        success: false,
        message: 'GHL webhook temporarily disabled. Please use contact form instead.',
      });
    } catch (error) {
      console.error('GHL webhook error:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing webhook: ' + (error as Error).message
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
