# ClickStagePro Production Deployment Guide

## 🚨 CRITICAL FIX APPLIED

**Production Blocker Fixed:** The credit granting system now correctly uses `APP_ENV` (not `NODE_ENV`) to determine production vs test mode. This ensures live Stripe price IDs are properly mapped to credit amounts.

**What Changed:**
- `server/credits.ts` now checks `APP_ENV === "production"` to select live `PRICE_*` variables
- Previously used `NODE_ENV !== "production"` which would fail in production (NODE_ENV stays "development" on Replit)
- **Result:** Credits will now be granted correctly for live purchases

---

## 📋 Production Environment Variables

### Required for Production

```bash
# ===== PRODUCTION MODE =====
APP_ENV=production              # CRITICAL: Enables live Stripe mode
ENABLE_DEV_AUTH=0              # CRITICAL: Disables auto-login dev bypass
ENABLE_CREDITS_API=1           # Enables credit system

# ===== LIVE STRIPE CREDENTIALS =====
STRIPE_SECRET_KEY=sk_live_...
VITE_STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET_LIVE=whsec_...

# ===== LIVE STRIPE PRICE IDs (6 Bundles) =====
PRICE_SINGLE=price_...         # 1 credit / $10 / 6 months
PRICE_5=price_...              # 5 credits / $45 / 12 months
PRICE_10=price_...             # 10 credits / $85 / 12 months + auto-extend
PRICE_20=price_...             # 20 credits / $160 / 12 months + auto-extend
PRICE_50=price_...             # 50 credits / $375 / 24 months + auto-extend
PRICE_100=price_...            # 100 credits / $700 / 24 months + auto-extend

# ===== CLOUDFLARE R2 STORAGE =====
ENABLE_R2=1
CF_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret
R2_BUCKET=clickstagepro-assets
R2_PUBLIC_URL=https://assets.clickstagepro.com  # Optional CDN URL

# ===== EMAIL CONFIGURATION (Resend or SMTP) =====
SMTP_HOST=smtp.resend.com      # Or your SMTP provider
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=resend               # Resend uses 'resend' as username
SMTP_PASS=re_...               # Your Resend API key
SMTP_FROM=noreply@clickstagepro.com

# ===== REPLIT AUTH =====
REPLIT_OIDC_CLIENT_ID=your_client_id
REPLIT_OIDC_CLIENT_SECRET=your_secret
ISSUER_URL=https://replit.com
```

### Optional Test Mode Variables (Keep for staging)

```bash
# Only needed for test/staging environments
TESTING_STRIPE_SECRET_KEY=sk_test_...
TESTING_VITE_STRIPE_PUBLIC_KEY=pk_test_...
TESTING_PRICE_SINGLE=price_test_...
TESTING_PRICE_5=price_test_...
TESTING_PRICE_10=price_test_...
TESTING_PRICE_20=price_test_...
TESTING_PRICE_50=price_test_...
TESTING_PRICE_100=price_test_...
```

---

## 🎯 Stripe Webhook Configuration

### Webhook Endpoints (All 3 Routes Supported)

Configure **ONE** of these endpoints in your Stripe Dashboard:

```
https://clickstagepro.com/api/billing/webhook
https://clickstagepro.com/api/stripe-webhook  
https://clickstagepro.com/api/webhooks/stripe
```

**Recommended:** Use `/api/billing/webhook` for consistency with your billing system.

### Required Webhook Events

Select these events in Stripe Dashboard:

- ✅ `checkout.session.completed` - Grants credits after successful checkout
- ✅ `payment_intent.succeeded` - Confirms payment success
- ✅ `payment_intent.payment_failed` - Handles payment failures
- ℹ️ `customer.updated` - Logs customer changes (optional)

### Testing Webhook Locally

```bash
# Install Stripe CLI
stripe listen --forward-to localhost:5000/api/billing/webhook

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger payment_intent.succeeded
```

---

## ✅ Pre-Deployment Checklist

### 1. Environment Variables
- [ ] Set `APP_ENV=production` (enables live Stripe)
- [ ] Set `ENABLE_DEV_AUTH=0` (disables auto-login)
- [ ] Set `ENABLE_CREDITS_API=1` (enables credit system)
- [ ] Add all 6 live `PRICE_*` environment variables
- [ ] Add live Stripe keys (secret, public, webhook secret)
- [ ] Add R2 credentials (account ID, keys, bucket name)
- [ ] Add SMTP credentials (host, user, pass, from)
- [ ] Add Replit Auth credentials (client ID, secret)

### 2. Stripe Dashboard Configuration
- [ ] Create 6 products with correct prices ($10, $45, $85, $160, $375, $700)
- [ ] Copy price IDs to `PRICE_*` environment variables
- [ ] Configure webhook endpoint (use live webhook secret)
- [ ] Enable required webhook events
- [ ] Test webhook delivery (use Stripe CLI or dashboard)

### 3. R2 Storage Configuration
- [ ] Create R2 bucket: `clickstagepro-assets`
- [ ] Generate R2 access credentials
- [ ] Configure CORS policy for uploads
- [ ] (Optional) Configure custom domain with CDN

### 4. Email Configuration
- [ ] Set up Resend account (or SMTP provider)
- [ ] Add domain verification records
- [ ] Generate API key
- [ ] Configure SMTP credentials
- [ ] Test email delivery

### 5. Domain & SSL
- [ ] Point `clickstagepro.com` to Replit deployment
- [ ] Verify SSL certificate is active
- [ ] Test HTTPS access

---

## 🧪 Production Testing Steps

### 1. Test Authentication Flow
```bash
# Visit homepage
https://clickstagepro.com

# Click "Client Portal" → Should redirect to Replit Auth
# After login → Should redirect back to /portal

# Verify dev auth is DISABLED (no auto-login as dev@example.com)
```

### 2. Test Credit Purchase Flow
```bash
# Visit pricing page
https://clickstagepro.com/pricing

# Select a bundle (e.g., 5 credits / $45)
# Complete checkout with test card: 4242 4242 4242 4242

# Verify:
# - Stripe checkout uses LIVE price IDs
# - Webhook receives checkout.session.completed
# - Credits are granted to user account
# - Email notification sent (if configured)
```

### 3. Test File Upload with R2
```bash
# Login to portal
# Navigate to "New Project" or upload area
# Upload test image

# Verify:
# - File uploads to R2 bucket
# - Presigned URL generated
# - Image displays in portal
# - Download URL works
```

### 4. Monitor Webhook Logs
```bash
# Check server logs for webhook events
# Should see:
# - "Stripe webhook received: checkout.session.completed"
# - "Granting credits to user: [userId]"
# - "Credits granted successfully"

# Check Stripe Dashboard → Webhooks
# - All events should show "Succeeded" status
# - No retry attempts
```

---

## 🔍 Credit Granting Logic

### How It Works

1. **User Purchases Bundle**
   - User completes Stripe checkout
   - Stripe sends `checkout.session.completed` webhook

2. **Webhook Handler**
   - Verifies webhook signature
   - Extracts price ID from session
   - Maps price ID to credit amount using `priceToPackRule()`

3. **Credit Mapping (server/credits.ts)**
   ```typescript
   // When APP_ENV=production:
   - Loads PRICE_SINGLE → 1 credit / 6 months
   - Loads PRICE_5 → 5 credits / 12 months
   - Loads PRICE_10 → 10 credits / 12 months + auto-extend
   - Loads PRICE_20 → 20 credits / 12 months + auto-extend
   - Loads PRICE_50 → 50 credits / 24 months + auto-extend
   - Loads PRICE_100 → 100 credits / 24 months + auto-extend
   ```

4. **Credit Granting**
   - Creates credit record with expiry date
   - Enables auto-extend for 10+ packs
   - Sends confirmation email (if configured)

### Auto-Extend Feature

Packs with 10+ credits automatically extend their expiry by 6 months when used:
- 10-pack: 12 months → +6 months on use
- 20-pack: 12 months → +6 months on use
- 50-pack: 24 months → +6 months on use
- 100-pack: 24 months → +6 months on use

---

## 🚀 Deployment Commands

```bash
# 1. Verify environment variables are set
echo $APP_ENV              # Should show: production
echo $ENABLE_DEV_AUTH      # Should show: 0
echo $STRIPE_SECRET_KEY    # Should start with: sk_live_

# 2. Push database schema (if needed)
npm run db:push

# 3. Restart application
# (Replit auto-restarts on deploy)

# 4. Verify server is running
curl https://clickstagepro.com/api/health
# Should return: { "status": "ok" }
```

---

## 📊 Monitoring Production

### Key Metrics to Watch

1. **Webhook Delivery**
   - Check Stripe Dashboard → Webhooks
   - Look for failed deliveries
   - Verify response time < 5 seconds

2. **Credit Granting**
   - Monitor database: `SELECT * FROM credit_packs ORDER BY created_at DESC LIMIT 10`
   - Check expiry dates are correct
   - Verify auto-extend flag for 10+ packs

3. **R2 Storage**
   - Monitor upload success rate
   - Check presigned URL generation
   - Verify file accessibility

4. **Email Delivery**
   - Check SMTP logs
   - Verify admin notifications sent
   - Test client confirmation emails

### Server Logs to Monitor

```bash
# Webhook events
"Stripe webhook received: checkout.session.completed"
"Granting credits to user: [userId]"

# Credit operations
"Credits granted successfully"
"Auto-extend enabled for pack"

# R2 operations
"Generated presigned upload URL"
"File uploaded successfully"

# Email operations
"Email sent to: support@clickstagepro.com"
```

---

## 🐛 Troubleshooting

### Credits Not Granted After Purchase

**Symptom:** User completes checkout, but credits don't appear in account.

**Diagnosis:**
1. Check Stripe webhook logs for delivery failures
2. Verify `APP_ENV=production` is set
3. Confirm live `PRICE_*` variables match Stripe dashboard
4. Check server logs for webhook processing errors

**Fix:**
```bash
# Verify environment
echo $APP_ENV  # Must be: production

# Check price mapping
curl https://clickstagepro.com/api/billing/bundles
# Should return live price IDs (not test IDs)

# Retry webhook manually from Stripe Dashboard
```

### Webhook Signature Verification Failed

**Symptom:** Server returns 400 error for webhook events.

**Diagnosis:**
1. Check `STRIPE_WEBHOOK_SECRET_LIVE` environment variable
2. Verify webhook endpoint URL matches Stripe dashboard
3. Check for middleware interfering with raw body

**Fix:**
```bash
# Update webhook secret
STRIPE_WEBHOOK_SECRET_LIVE=whsec_...  # Copy from Stripe Dashboard

# Verify endpoint in Stripe Dashboard
https://clickstagepro.com/api/billing/webhook
```

### R2 Upload Failures

**Symptom:** File uploads fail or presigned URLs expire.

**Diagnosis:**
1. Check R2 credentials are correct
2. Verify CORS policy allows uploads
3. Check presigned URL TTL (default: 15 minutes)

**Fix:**
```bash
# Verify R2 credentials
echo $CF_ACCOUNT_ID
echo $R2_BUCKET

# Test presigned URL generation
curl https://clickstagepro.com/api/manager/sign-upload
```

### Email Not Sending

**Symptom:** Admin notifications not received after staging requests.

**Diagnosis:**
1. Check SMTP credentials
2. Verify email service initialized
3. Check spam/junk folders

**Fix:**
```bash
# Verify SMTP config
echo $SMTP_HOST  # Should be: smtp.resend.com
echo $SMTP_USER  # Should be: resend

# Test email service
# (Check server logs for "Email service initialized successfully")
```

---

## 📞 Support & Maintenance

### Admin Email Recipients

All staging requests send notifications to:
- support@clickstagepro.com
- RobWarfield@kw.com
- RiaSiangioKW@gmail.com

### Nightly Maintenance Jobs

- **Credit Cleanup:** Removes expired credits (runs automatically)
- **Storage Cleanup:** Archives old projects (manual trigger)

### Database Backups

Neon PostgreSQL provides automatic daily backups:
- Retention: 30 days
- Point-in-time recovery available
- Access via Neon Dashboard

---

## ✅ Go-Live Checklist

Final verification before going live:

- [ ] All environment variables configured
- [ ] Webhook endpoint tested with live events
- [ ] Test purchase completed successfully
- [ ] Credits granted correctly
- [ ] Email notifications working
- [ ] R2 uploads functional
- [ ] SSL certificate active
- [ ] Domain pointing to deployment
- [ ] Dev auth disabled (ENABLE_DEV_AUTH=0)
- [ ] Monitoring dashboards configured
- [ ] Support team notified
- [ ] Backup strategy verified

---

## 🎉 Production Status

**Application:** ClickStagePro Virtual Staging  
**Domain:** https://clickstagepro.com  
**Status:** ✅ READY FOR DEPLOYMENT

**Critical Systems:**
- ✅ Authentication (Replit Auth)
- ✅ Credit System (Stripe + Bundles)
- ✅ File Storage (Cloudflare R2)
- ✅ Email Notifications (SMTP/Resend)
- ✅ Webhook Processing (3 endpoints)
- ✅ Database (Neon PostgreSQL)

**Next Steps:**
1. Set production environment variables
2. Configure Stripe webhook endpoint
3. Test end-to-end purchase flow
4. Deploy to https://clickstagepro.com
5. Monitor initial production traffic

---

**Last Updated:** Production deployment preparation complete  
**Version:** 1.0.0 - Production Ready
