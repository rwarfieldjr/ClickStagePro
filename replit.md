# ClickStage Pro Virtual Staging

## Overview

ClickStage Pro is a modern virtual staging platform that transforms empty properties into buyer's dreams using AI-powered technology. The application allows real estate professionals to upload property images and receive professionally staged versions that help sell homes faster. Built as a full-stack web application with a React frontend and Express backend, it features secure file uploads, email notifications, and an admin dashboard for managing staging requests.

## Recent Changes

### Production Deployment Preparation (October 2025)
- ✅ **CRITICAL FIX**: Changed credit system to use `APP_ENV` instead of `NODE_ENV` for production detection
  - Previously: Used `NODE_ENV !== 'production'` which would fail in production (NODE_ENV stays "development" on Replit)
  - Now: Uses `APP_ENV === 'production'` to correctly select live `PRICE_*` environment variables
  - Impact: Credits now grant correctly for live purchases
- ✅ Added `/api/billing/webhook` endpoint (alongside existing `/api/stripe-webhook` and `/api/webhooks/stripe`)
- ✅ Verified webhook handler processes: checkout.session.completed, payment_intent.succeeded, payment_intent.payment_failed
- ✅ Verified R2 storage configuration with presigned URLs (TTL: 900s upload, 3600s download)
- ✅ Verified email service configuration (nodemailer with SMTP/Resend support)
- ✅ Created comprehensive production deployment guide (PRODUCTION_DEPLOYMENT.md)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development practices
- **Build Tool**: Vite for fast development and optimized production builds
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with a custom design system inspired by leading property tech platforms
- **Component Library**: Radix UI primitives with shadcn/ui for consistent, accessible UI components
- **State Management**: TanStack Query for server state management and caching
- **Form Handling**: React Hook Form with Zod validation for robust form management
- **File Uploads**: Uppy.js dashboard for professional file upload experience

### Backend Architecture
- **Runtime**: Node.js with Express.js framework for REST API endpoints
- **Language**: TypeScript with ES modules for modern JavaScript features
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **File Storage**: Google Cloud Storage for scalable image storage with custom ACL policies
- **Validation**: Comprehensive file validation including MIME type verification and security checks
- **Email**: Nodemailer with SMTP support for client notifications and admin alerts
- **Monitoring**: Request ID middleware for distributed tracing and health check endpoint for system monitoring
- **Rate Limiting**: Express rate limiter protecting key endpoints from accidental hammering (240/min for uploads, 300/min for webhooks, 120/min for credits)
- **Payment Processing**: Stripe integration with bundles-only credit system (no subscriptions/memberships)
- **Environment Management**: Centralized `billingEnv` configuration for automatic TEST/PRODUCTION mode switching

### Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon for staging requests and user data
- **File Storage**: Google Cloud Storage buckets for property images with custom access control
- **Schema Management**: Drizzle Kit for database migrations and schema versioning
- **Data Validation**: Zod schemas shared between frontend and backend for consistent validation

### Authentication and Authorization
- **Admin Access**: API key-based authentication for admin endpoints with secure header validation
- **File Upload Security**: Token-based upload authorization with time-limited access
- **Object Access Control**: Custom ACL system for fine-grained file access permissions
- **Environment-based Security**: Configurable API keys and secrets via environment variables

## External Dependencies

### Core Infrastructure
- **Database**: Neon PostgreSQL serverless database for scalable data storage
- **Cloud Storage**: Google Cloud Storage for image hosting and delivery
- **Email Service**: SMTP provider for transactional emails (with Ethereal fallback for development)

### Development and Build Tools
- **Package Manager**: npm with lockfile for reproducible builds
- **TypeScript**: Full-stack type safety with shared schemas
- **ESBuild**: Production bundling for optimized server deployment
- **PostCSS**: CSS processing with Tailwind CSS compilation

### UI and Styling
- **Fonts**: Google Fonts (Inter and Poppins) for professional typography
- **Icons**: Lucide React for consistent iconography
- **Theme System**: CSS custom properties with light/dark mode support

### File Processing
- **Image Validation**: Sharp for image metadata extraction and processing
- **File Type Detection**: file-type library for secure MIME type verification
- **Upload Interface**: Uppy ecosystem for drag-and-drop file management

### API and Communication
- **HTTP Client**: Fetch API with custom query client for API communication
- **Form Validation**: Hookform resolvers with Zod for client-side validation
- **Toast Notifications**: Custom toast system for user feedback

## Payment System Architecture

### Bundles-Only Credit System
- **NO Subscriptions/Memberships** - All subscription code removed or NOOP'd
- **6 One-Time Credit Packs**:
  - SINGLE: 1 credit / $10 / 6 months expiry
  - 5-pack: 5 credits / $45 / 12 months expiry
  - 10-pack: 10 credits / $85 / 12 months expiry + auto-extend on use
  - 20-pack: 20 credits / $160 / 12 months expiry + auto-extend on use
  - 50-pack: 50 credits / $375 / 24 months expiry + auto-extend on use
  - 100-pack: 100 credits / $700 / 24 months expiry + auto-extend on use

### Stripe Integration
- **Centralized Configuration**: `src/config/billingEnv.ts` manages all Stripe environment variables
- **Environment Switching**: Automatic TEST/PRODUCTION mode via `APP_ENV` environment variable
  - **TEST Mode** (APP_ENV != "production"): Uses `TESTING_STRIPE_SECRET_KEY`, `TESTING_VITE_STRIPE_PUBLIC_KEY`, `TESTING_PRICE_*`
  - **PRODUCTION Mode** (APP_ENV = "production"): Uses `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLIC_KEY`, `PRICE_*`, `STRIPE_WEBHOOK_SECRET_LIVE`
- **Payment Flow**: Pricing page → Checkout with bundleKey → `/api/billing/create-intent` → Stripe Payment Element
- **Webhook Endpoints**: Both `/api/stripe-webhook` and `/api/webhooks/stripe` supported with signature verification
- **Security**: CSP headers configured for Stripe domains (js.stripe.com, api.stripe.com)

### Credit Management
- **Auto-Extend Feature**: Packs 10+ automatically extend expiry by 6 months when credits are used
- **Nightly Cleanup**: Automated job removes expired credits
- **Pack-Specific Expiry**: Different expiry periods based on pack size (6/12/24 months)

## UI/UX Features

### Styles Modal System
- **Navigation Integration**: "Styles" button in main navigation opens modal pop-up instead of navigating to separate page
- **Implementation**: StylesModal component using Shadcn Dialog primitives with bulletproof image loading
- **Button Type Safety**: Proper Button component with `type="button"` to prevent form submission interference
- **Image Loading Architecture** (Static Imports - ZERO 404s):
  - **Centralized Catalog**: `client/src/lib/styleCatalog.ts` exports `STYLES` array with slug/title/description for all 8 styles
  - **Static Import Map**: `client/src/lib/styleImages.ts` uses ES6 static imports for each image (NO glob patterns, NO runtime path resolution)
  - **Image Storage**: Style images stored in `client/src/assets/styles/` as .png files (Vite-processed at build time)
  - **Resolver Function**: `resolveStyleImage(slug)` returns pre-imported image paths from STYLE_IMAGES record
  - **Fallback Strategy**: Automatic placeholder.png fallback if slug not found
  - **Build-Time Safety**: Import errors caught at build time, ensuring zero 404s in production
- **8 Staging Styles**: Modern Farmhouse, Coastal, Scandinavian, Contemporary, Mid-Century Modern, Mountain Rustic, Transitional, Japandi
- **Zoom Feature**: Click any style image to view full-size in secondary dialog
- **Dual Access**: Modal accessible from navigation button AND dedicated /styles page route
- **Dev/Production Compatibility**: Works seamlessly in both environments - Vite generates hashed /assets/... URLs for optimal caching

### Hero Section
- **Call-to-Action Buttons**: Three primary actions with consistent styling
  - Place Staging Order (primary button)
  - View Portfolio (outline with blur effect)
  - Client Portal (outline with blur effect)
- **Visual Consistency**: Blurred transparent buttons over hero image background