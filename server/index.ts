import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeEmail } from "./email";
import { cleanupExpiredSessions } from "./auth";
import crypto from "crypto";
import path from "path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import Stripe from "stripe";
import * as aiService from "./openai";
import { billingEnv } from "../src/config/billingEnv";
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
);

async function testSupabase() {
  const { data, error } = await supabase.from("profiles").select("*");
  if (error) console.error("❌ Supabase connection failed:", error);
  else console.log("✅ Supabase connected successfully:", data);
}

testSupabase();

const app = express();
// ✅ Test Supabase connection via API route
app.get('/api/test-supabase', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('test_events')
      .insert([{ message: 'Test successful' }])
      .select();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('Supabase insert failed:', err);
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// Stripe webhooks need raw body for signature verification - apply express.raw to webhook paths
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use('/api/stripe-webhook', express.raw({ type: 'application/json' }));
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use("/api/stripe-webhook", express.raw({ type: "application/json" }));
app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }));
app.use("/api/billing/webhook", express.raw({ type: "application/json" }));

// Cookie parsing for session management
app.use(cookieParser());

// Request ID middleware for log tracing
app.use((req, _res, next) => {
  (req as any).rid = Math.random().toString(36).slice(2, 10);
  console.log(`[req ${(req as any).rid}] ${req.method} ${req.url}`);
  next();
});

// Content Security Policy headers for Stripe integration
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; " +
      "frame-src 'self' https://js.stripe.com; " +
      "connect-src 'self' https://api.stripe.com; " +
      "img-src 'self' data: https:; " +
      "style-src 'self' 'unsafe-inline';",
  );
  next();
});

// Rate limiting for key endpoints (protects against accidental hammering)
app.use("/api/stripe/webhook", rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true, legacyHeaders: false })); // Stripe retries are bursty but safe
app.use("/api/stripe-webhook", rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true, legacyHeaders: false })); // Stripe retries are bursty but safe
app.use("/api/webhooks/stripe", rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true, legacyHeaders: false })); // Same limit for webhook alias
app.use("/api/r2/upload-url", rateLimit({ windowMs: 60_000, max: 240 })); // 240/min per IP
app.use("/api/uploads/presign", rateLimit({ windowMs: 60_000, max: 240 })); // 240/min per IP
app.use("/api/credits", rateLimit({ windowMs: 60_000, max: 120 })); // 120/min per IP for all credit endpoints

// Increase JSON/body limits (put BEFORE routes) - skip webhook paths (they need raw body)
app.use((req, res, next) => {
  // Skip JSON parsing for Stripe webhook paths (they need raw body for signature verification)
  if (
    req.path === "/api/stripe-webhook" ||
    req.path === "/api/webhooks/stripe" ||
    req.path === "/api/billing/webhook"
  ) {
    return next();
  }
  express.json({ limit: "15mb" })(req, res, next);
});
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Public presign for anonymous uploads
app.post("/api/uploads/presign", async (req, res) => {
  try {
    const { filename, mime, size } = req.body || {};
    if (!filename || !mime) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing filename or mime" });
    }
    // Basic size/type guard
    const MAX = 10 * 1024 * 1024; // 10MB
    if (size && size > MAX)
      return res.status(413).json({ ok: false, error: "File too large" });
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(mime)) {
      return res
        .status(415)
        .json({ ok: false, error: "Unsupported file type" });
    }
    if (
      !process.env.CF_ACCOUNT_ID ||
      !process.env.R2_ACCESS_KEY_ID ||
      !process.env.R2_SECRET_ACCESS_KEY ||
      !process.env.R2_BUCKET
    ) {
      return res.status(503).json({ ok: false, error: "R2 not configured" });
    }
    // Key: anonymous/YYYY/MM/<uuid>-<sanitized-filename>
    const date = new Date();
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const safe = String(filename)
      .replace(/[^\w.\-]+/g, "_")
      .slice(0, 120);
    const key = `anonymous/${yyyy}/${mm}/${crypto.randomUUID()}-${safe}`;

    const putCmd = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: mime,
    });
    const url = await getSignedUrl(s3, putCmd, { expiresIn: 60 * 10 }); // 10 min
    console.log(`[presign ${(req as any).rid}] key=${key} mime=${mime}`);
    return res.json({ ok: true, url, key, mime });
  } catch (e: any) {
    console.error("presign error:", e);
    return res
      .status(500)
      .json({ ok: false, error: "Server error presigning" });
  }
});
// Test endpoint - only available in development
app.get("/test.html", (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }
  res.sendFile(path.join(process.cwd(), "public", "test.html"));
});

// Serve specific static files (but not index.html which would conflict with React SPA)
app.get("/order-step-1.html", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "order-step-1.html"));
});
app.get("/order-step-2.html", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "order-step-2.html"));
});
app.get("/upload.html", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "upload.html"));
});
app.get("/thank-you.html", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "thank-you.html"));
});

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
  },
});
const R2_BUCKET = process.env.R2_BUCKET as string;

// Initialize Stripe with centralized billing config
const stripe = new Stripe(billingEnv.stripeSecretKey);
const isLiveMode = billingEnv.stripeSecretKey.startsWith("sk_live_");

[
  "CF_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
].forEach((k) => {
  if (!process.env[k]) console.warn(`⚠️ Missing env: ${k}`);
});

const mode = billingEnv.isProd ? "PRODUCTION" : "TEST";
const keyType = isLiveMode ? "LIVE" : "TEST";
console.log(`✅ Stripe configured in ${mode} mode using ${keyType} key`);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Make.com webhook endpoint
app.post("/api/submit", async (req, res) => {
  try {
    // 1. Environment variable validation
    if (!process.env.MAKE_WEBHOOK_URL) {
      return res
        .status(503)
        .json({ ok: false, error: "Service temporarily unavailable" });
    }

    const payload = req.body || {};
    if (
      !payload?.email ||
      !Array.isArray(payload?.file_urls) ||
      payload.file_urls.length === 0
    ) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing email or file_urls" });
    }

    // 2. Network timeout implementation
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const r = await fetch(process.env.MAKE_WEBHOOK_URL as string, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!r.ok) {
      // 3. Don't expose upstream error details
      console.error("Webhook upstream error:", r.status, r.statusText);
      return res
        .status(502)
        .json({ ok: false, error: "Upstream service error" });
    }
    return res.json({ ok: true });
  } catch (e: any) {
    // 4. Enhanced error handling
    if (e.name === "AbortError") {
      return res.status(504).json({ ok: false, error: "Request timeout" });
    }
    console.error("Webhook error:", e); // Log server-side only
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});
// ===== R2: Enhanced upload & download with validation =====

// Allowed MIME types and max file size
const ALLOWED_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Helper to generate UUID
function generateUUID() {
  return crypto.randomUUID();
}

// Helper to get current date path
function getDatePath() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}/${month}`;
}

// Helper to check if user is admin (basic implementation)
function isAdmin(req: any) {
  // For now, check if user exists and has admin role
  // You can expand this based on your user model
  return req.user && (req.user.isAdmin || req.user.role === "admin");
}

// Health check endpoints for Autoscale deployments
// Must respond quickly without requiring full app initialization
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, status: "healthy", service: "ClickStage Pro" });
});

// R2 health check endpoint
app.get("/api/r2/health", (_req, res) => {
  res.json({ ok: true, service: "R2 Upload Service" });
});

// Development health endpoint with full system status
app.get("/dev/health", (_req, res) => {
  const isTesting = process.env.NODE_ENV !== "production";
  const prefix = isTesting ? "TESTING_" : "";
  const stripeCount = [
    process.env[`${prefix}PRICE_SINGLE`],
    process.env[`${prefix}PRICE_5`],
    process.env[`${prefix}PRICE_10`],
    process.env[`${prefix}PRICE_20`],
    process.env[`${prefix}PRICE_50`],
    process.env[`${prefix}PRICE_100`],
  ].filter(Boolean).length;

  const info = {
    present: {
      R2_BUCKET: !!process.env.R2_BUCKET,
      R2_ACCESS_KEY_ID: !!process.env.R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY: !!process.env.R2_SECRET_ACCESS_KEY,
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
      STRIPE_PRICE_count: stripeCount,
    },
    flags: {
      ENABLE_R2: process.env.ENABLE_R2 === "1",
      ENABLE_CREDITS_API: process.env.ENABLE_CREDITS_API === "1",
      ENABLE_DEV_AUTH: process.env.ENABLE_DEV_AUTH === "1",
    },
  };

  const ok =
    info.present.R2_BUCKET &&
    info.present.R2_ACCESS_KEY_ID &&
    info.present.R2_SECRET_ACCESS_KEY;

  res.json({ ok, info });
});

// Diagnostic endpoint to confirm server sees envs and URLs
app.get("/api/diag", (req, res) => {
  const base = process.env.PUBLIC_BASE_URL || `https://${req.headers.host}`;
  res.json({
    ok: true,
    hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
    base,
    success_url: `${base}/thank-you.html`,
    cancel_url: `${base}/order-step-2.html`,
  });
});

// Upload diagnostics endpoint (temporary)
app.get("/api/uploads/diag", (_req, res) => {
  res.json({
    ok: true,
    bucket: process.env.R2_BUCKET ? true : false,
    account: process.env.CF_ACCOUNT_ID ? true : false,
  });
});

// Extract existing upload-proxy handler into a function
async function uploadProxyHandler(req: Request, res: Response) {
  try {
    const { filename, mime, size, fileData } = req.body || {};
    console.log(
      `[upload ${(req as any).rid}] filename=${filename} mime=${mime} size=${size}`,
    );
    if (!filename || !mime || !fileData) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing filename, mime, or fileData" });
    }

    const MAX = 10 * 1024 * 1024; // 10MB
    if (size && size > MAX)
      return res.status(413).json({ ok: false, error: "File too large" });
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(mime)) {
      return res
        .status(415)
        .json({ ok: false, error: "Unsupported file type" });
    }

    if (
      !process.env.CF_ACCOUNT_ID ||
      !process.env.R2_ACCESS_KEY_ID ||
      !process.env.R2_SECRET_ACCESS_KEY ||
      !process.env.R2_BUCKET
    ) {
      return res.status(503).json({ ok: false, error: "R2 not configured" });
    }

    // Generate key
    const date = new Date();
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const safe = String(filename)
      .replace(/[^\w.\-]+/g, "_")
      .slice(0, 120);
    const key = `anonymous/${yyyy}/${mm}/${crypto.randomUUID()}-${safe}`;

    // Convert base64 to buffer
    const buffer = Buffer.from(fileData, "base64");

    // Upload directly to R2
    const putCmd = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mime,
    });

    await s3.send(putCmd);

    return res.json({ ok: true, key });
  } catch (e: any) {
    console.error("direct upload error:", e);
    return res.status(500).json({ ok: false, error: "Server error uploading" });
  }
}

// Use same handler for both endpoints
app.post("/api/upload-proxy", uploadProxyHandler);
app.post("/api/uploads/direct", uploadProxyHandler); // back-compat shim

// Enhanced presigned upload URL with validation
app.post("/api/r2/upload-url", async (req, res) => {
  const startTime = Date.now();
  try {
    // Auth check (skip if DISABLE_AUTH is true or in development)
    if (
      process.env.DISABLE_AUTH !== "true" &&
      process.env.NODE_ENV === "production"
    ) {
      if (!req.user) {
        console.log(`R2 upload denied: No authentication`);
        return res.status(401).json({ error: "Authentication required" });
      }
    }

    const { filename, mime, fileSize, projectId } = req.body || {};

    // Validation
    if (!filename || !mime) {
      return res.status(400).json({ error: "filename and mime are required" });
    }

    // MIME type validation
    if (!ALLOWED_MIMES.includes(mime.toLowerCase())) {
      return res.status(400).json({
        error: "Invalid file type. Only JPG, PNG, WebP, and GIF are allowed.",
      });
    }

    // Size validation
    if (fileSize && fileSize > MAX_FILE_SIZE) {
      return res.status(400).json({
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
      });
    }

    // Generate secure key with user ID and date structure
    const userId = (req as any).user?.id || "anonymous";
    const datePath = getDatePath();
    const uuid = generateUUID();
    const safeFilename = String(filename).replace(/[^\w.\-]+/g, "_");
    const key = `${userId}/${datePath}/${uuid}-${safeFilename}`;

    const cmd = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: mime,
      Metadata: {
        "orig-filename": filename,
        "uploaded-by": userId,
        "project-id": projectId || "",
        "upload-date": new Date().toISOString(),
      },
    });

    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 900 }); // 15 min

    // Log success (without exposing the URL)
    const duration = Date.now() - startTime;
    console.log(
      `R2 upload URL generated for user ${userId}, file: ${filename}, key: ${key} (${duration}ms)`,
    );

    res.json({ uploadUrl, key, expiresIn: 900 });
  } catch (e: any) {
    const duration = Date.now() - startTime;
    console.error(`R2 upload URL error (${duration}ms):`, e.message);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

// Enhanced download URL with validation
app.post("/api/r2/download-url", async (req, res) => {
  const startTime = Date.now();
  try {
    const { key, asFilename } = req.body || {};
    if (!key) return res.status(400).json({ error: "key required" });

    const cmd = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ResponseContentDisposition: asFilename
        ? `attachment; filename="${asFilename}"`
        : undefined,
    });

    const downloadUrl = await getSignedUrl(s3, cmd, { expiresIn: 900 }); // 15 min

    const duration = Date.now() - startTime;
    console.log(`R2 download URL generated for key: ${key} (${duration}ms)`);

    res.json({ url: downloadUrl, expiresIn: 900 });
  } catch (e: any) {
    const duration = Date.now() - startTime;
    console.error(`R2 download URL error (${duration}ms):`, e.message);
    res.status(500).json({ error: "Failed to generate download URL" });
  }
});

// List uploads (admin only)
app.get("/api/r2/list", async (req, res) => {
  try {
    // Admin check
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // For now, return a placeholder
    // In production, you'd implement S3 ListObjects or keep a database of uploads
    res.json({
      message: "List endpoint - TODO: Implement S3 ListObjects",
      uploads: [],
    });
  } catch (e: any) {
    console.error("R2 list error:", e.message);
    res.status(500).json({ error: "Failed to list uploads" });
  }
});

// Batch ZIP download (admin only, stubbed)
app.post("/api/r2/batch-zip", async (req, res) => {
  try {
    // Admin check
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { keys } = req.body || {};
    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: "keys array required" });
    }

    // TODO: Implement ZIP streaming
    console.log(`R2 batch ZIP requested for ${keys.length} files`);
    res.status(501).json({
      error: "Batch ZIP download not implemented yet",
      message: "This feature will stream a ZIP file of selected uploads",
    });
  } catch (e: any) {
    console.error("R2 batch ZIP error:", e.message);
    res.status(500).json({ error: "Failed to create ZIP" });
  }
});

// OpenAI-powered features
// AI Property Description Generator
app.post("/api/ai/property-description", async (req, res) => {
  try {
    if (!aiService.isConfigured()) {
      return res.status(503).json({ error: "AI service not configured" });
    }

    const { image } = req.body;
    if (!image || typeof image !== "string") {
      return res.status(400).json({ error: "Valid image data required" });
    }

    // Validate image format and size
    const dataUrlMatch = image.match(
      /^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/,
    );
    if (!dataUrlMatch) {
      return res.status(400).json({
        error: "Invalid image format. Must be PNG, JPEG, WebP, or GIF",
      });
    }

    const base64Image = dataUrlMatch[2];

    // Check base64 size (approximate - real size will be ~75% of base64)
    const estimatedSize = base64Image.length * 0.75;
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (estimatedSize > MAX_SIZE) {
      return res.status(413).json({ error: "Image too large. Maximum 10MB" });
    }

    const result = await aiService.generatePropertyDescription(base64Image);
    res.json(result);
  } catch (error: any) {
    console.error("AI property description error:", error.message);
    res.status(500).json({ error: "Failed to generate description" });
  }
});

// Smart Staging Recommendations
app.post("/api/ai/staging-recommendations", async (req, res) => {
  try {
    if (!aiService.isConfigured()) {
      return res.status(503).json({ error: "AI service not configured" });
    }

    const { image } = req.body;
    if (!image || typeof image !== "string") {
      return res.status(400).json({ error: "Valid image data required" });
    }

    // Validate image format and size
    const dataUrlMatch = image.match(
      /^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/,
    );
    if (!dataUrlMatch) {
      return res.status(400).json({
        error: "Invalid image format. Must be PNG, JPEG, WebP, or GIF",
      });
    }

    const base64Image = dataUrlMatch[2];

    // Check base64 size (approximate - real size will be ~75% of base64)
    const estimatedSize = base64Image.length * 0.75;
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (estimatedSize > MAX_SIZE) {
      return res.status(413).json({ error: "Image too large. Maximum 10MB" });
    }

    const result = await aiService.recommendStagingStyle(base64Image);
    res.json(result);
  } catch (error: any) {
    console.error("AI staging recommendations error:", error.message);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
});

// Customer Support Chatbot
app.post("/api/ai/chat", async (req, res) => {
  try {
    if (!aiService.isConfigured()) {
      return res.status(503).json({ error: "AI service not configured" });
    }

    const { message, history } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Valid message required" });
    }

    // Sanitize conversation history - only allow user/assistant roles
    const conversationHistory = Array.isArray(history)
      ? history
          .filter(
            (msg: any) =>
              msg &&
              typeof msg === "object" &&
              typeof msg.content === "string" &&
              (msg.role === "user" || msg.role === "assistant"),
          )
          .slice(-10) // Limit to last 10 messages to prevent abuse
          .map((msg: any) => ({
            role: msg.role,
            content: String(msg.content).slice(0, 2000), // Limit message length
          }))
      : [];

    const response = await aiService.chatWithSupport(
      message.slice(0, 2000),
      conversationHistory,
    );

    res.json({ response });
  } catch (error: any) {
    console.error("AI chat error:", error.message);
    res.status(500).json({ error: "Failed to process chat message" });
  }
});

// Price mapping using billingEnv for correct TEST/PRODUCTION switching via APP_ENV
const PRICE_MAP: Record<number, string | undefined> = {
  1: billingEnv.prices.SINGLE,
  5: billingEnv.prices.P5,
  10: billingEnv.prices.P10,
  20: billingEnv.prices.P20,
  50: billingEnv.prices.P50,
  100: billingEnv.prices.P100,
};

app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const body = req.body || {};
    const bundle = Number(body.bundle || body.package || body.pkg || 0);
    const { style, customer, files } = body;

    if (!billingEnv.stripeSecretKey) {
      console.error("[CHECKOUT] Missing Stripe secret key");
      return res
        .status(503)
        .json({ ok: false, message: "Stripe not configured" });
    }

    // Runtime guard: refuse test keys in production (unless in development/testing environment)
    const isTestKey = billingEnv.stripeSecretKey.startsWith("sk_test_");
    const isDevEnvironment =
      process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
    if (isTestKey && !isDevEnvironment) {
      console.error(
        "[CHECKOUT] Refusing to create live checkout with TEST key",
      );
      return res.status(400).json({
        ok: false,
        message:
          "Server misconfigured: test key detected. Please contact support.",
      });
    }

    const priceId = PRICE_MAP[bundle];
    if (!priceId || !priceId.startsWith("price_")) {
      console.error("[CHECKOUT] Missing/invalid priceId", {
        bundle,
        priceId,
        PRICE_MAP,
      });
      return res.status(400).json({
        ok: false,
        message: `No Stripe price configured for ${bundle} photo package`,
        hint: "Contact support",
      });
    }

    console.log("[CHECKOUT] Creating session:", {
      bundle,
      priceId: priceId.substring(0, 20) + "...",
      mode: billingEnv.isProd ? "live" : "test",
      fileCount: files?.length || 0,
    });

    const base = process.env.PUBLIC_BASE_URL || `https://${req.headers.host}`;
    const successUrl = process.env.SUCCESS_URL || `${base}/success`;
    const cancelUrl = process.env.CANCEL_URL || `${base}/cancel`;

    // Serialize file keys as JSON (Stripe metadata limit: 500 chars per value)
    const fileKeys = files?.map((f: any) => f.key || '').filter(Boolean) || [];
    const filesJson = JSON.stringify(fileKeys);

    const session = await stripe!.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: customer?.email,
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        style: style || "",
        bundle: String(bundle),
        firstName: customer?.firstName || "",
        lastName: customer?.lastName || "",
        phone: customer?.phone || "",
        fileKeys: filesJson, // JSON array of storage keys
      },
    });

    console.log("[CHECKOUT] Session created successfully:", session.id);
    return res.json({ ok: true, url: session.url });
  } catch (e: any) {
    console.error("[CHECKOUT] Error:", {
      type: e?.type,
      code: e?.code,
      statusCode: e?.statusCode,
      message: e?.message,
    });
    return res.status(e?.statusCode || 500).json({
      ok: false,
      message: e?.message || "Stripe error creating checkout session",
      type: e?.type,
      code: e?.code,
    });
  }
});

// Debug endpoint to verify Stripe configuration
app.get("/api/debug/stripe", (req, res) => {
  const isLive = billingEnv.stripeSecretKey?.startsWith("sk_live_");
  const prices = Object.fromEntries(
    Object.entries(PRICE_MAP).map(([k, v]) => [
      k,
      Boolean(v && v.startsWith("price_")),
    ]),
  );
  res.json({
    ok: true,
    mode: isLive ? "live" : "test",
    hasSecret: !!billingEnv.stripeSecretKey,
    prices,
    isProd: billingEnv.isProd,
  });
});

// Diagnostic endpoint
app.get("/api/diag", (req, res) => {
  const base = process.env.PUBLIC_BASE_URL || `https://${req.headers.host}`;
  res.json({
    ok: true,
    hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
    base,
  });
});

// Development-only endpoint to get admin API key for testing
app.get("/api/dev/admin-key", (req, res) => {
  // Only expose in development/test mode for testing purposes
  if (process.env.NODE_ENV === "production" && billingEnv.isProd) {
    return res.status(403).json({ error: "Not available in production" });
  }
  
  res.json({
    adminApiKey: process.env.ADMIN_API_KEY || "",
    isDevelopment: true
  });
});

// Validate Stripe session for thank you page
app.get("/api/validate-session/:sessionId", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe not configured" });
    }

    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID required" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      res.json({
        valid: true,
        customer: {
          firstName: session.metadata?.customerFirstName,
          lastName: session.metadata?.customerLastName,
          email: session.customer_email || session.customer_details?.email,
        },
        order: {
          style: session.metadata?.style,
          bundle: parseInt(session.metadata?.bundle || "0"),
          price: parseInt(session.metadata?.serverPrice || "0"),
          fileCount: parseInt(session.metadata?.fileCount || "0"),
        },
        amount_total: session.amount_total ? session.amount_total / 100 : 0,
        payment_status: session.payment_status,
      });
    } else {
      res.json({
        valid: false,
        payment_status: session.payment_status,
      });
    }
  } catch (error: any) {
    console.error("Session validation error:", error.message);
    res.status(500).json({ error: "Failed to validate session" });
  }
});

// --- DEV AUTH shim & probe ---
const ENABLE_DEV_AUTH = process.env.ENABLE_DEV_AUTH === "1";

// Loud startup log (runs once at boot)
console.log(
  ENABLE_DEV_AUTH
    ? `[DEV AUTH] ENABLED as ${process.env.DEV_USER_EMAIL || "dev@example.com"} (id=${
        process.env.DEV_USER_ID || "dev-1"
      })`
    : "[DEV AUTH] disabled",
);

// Auto-create dev user in database if dev auth is enabled
if (ENABLE_DEV_AUTH) {
  import("./storage").then(async ({ storage }) => {
    const devUserId = process.env.DEV_USER_ID || "dev-1";
    const devUserEmail = process.env.DEV_USER_EMAIL || "dev@example.com";

    try {
      const existingUser = await storage.getUser(devUserId);
      if (!existingUser) {
        await storage.createUser({
          id: devUserId,
          email: devUserEmail,
          firstName: devUserEmail.split("@")[0],
          lastName: "Dev",
          profileImageUrl: null,
        });
        console.log(`[DEV AUTH] Created dev user in database: ${devUserId}`);
      } else {
        console.log(
          `[DEV AUTH] Dev user already exists in database: ${devUserId}`,
        );
      }
    } catch (error) {
      console.error(`[DEV AUTH] Failed to create dev user:`, error);
    }
  });
}

(async () => {
  const server = await registerRoutes(app);

  // Quick probe to confirm server sees a user
  app.get("/dev/whoami", (req: any, res) => {
    res.json({ devAuth: ENABLE_DEV_AUTH, user: req.user || null });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);

      // Initialize email service AFTER server is listening (lazy initialization)
      initializeEmail().catch((err) => {
        console.error("Email initialization error:", err);
      });

      // Clean up expired sessions in background (lazy initialization)
      cleanupExpiredSessions().catch((err) => {
        console.error("Session cleanup error:", err);
      });

      // Schedule periodic session cleanup (every hour)
      setInterval(
        () => {
          cleanupExpiredSessions().catch((err) => {
            console.error("Periodic session cleanup error:", err);
          });
        },
        60 * 60 * 1000,
      );

      // Schedule nightly credit expiration cleanup (every 24 hours at 2 AM)
      const scheduleNightlyCleanup = () => {
        const now = new Date();
        const next2AM = new Date(now);
        next2AM.setHours(2, 0, 0, 0);
        if (next2AM <= now) {
          next2AM.setDate(next2AM.getDate() + 1);
        }
        const msUntil2AM = next2AM.getTime() - now.getTime();

        setTimeout(async () => {
          try {
            const { storage } = await import("./storage");
            const expiredCount = await storage.expireCredits();
            console.log(
              `[nightly cleanup] Expired ${expiredCount} credit balances`,
            );
          } catch (err) {
            console.error("Credit expiration cleanup error:", err);
          }
          // Schedule next run
          scheduleNightlyCleanup();
        }, msUntil2AM);
      };
      scheduleNightlyCleanup();
    },
  );
})();
