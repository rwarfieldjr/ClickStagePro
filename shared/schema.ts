import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, index, uniqueIndex, serial, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User storage table - compatible with Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  replitId: varchar("replit_id").unique(), // Replit Auth user ID
  username: varchar("username"),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Session storage table for Replit Auth express-session storage
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const stagingRequests = pgTable("staging_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // User relationship
  userId: varchar("user_id").references(() => users.id),
  // Payment linking fields
  paymentIntentId: text("payment_intent_id").notNull().unique(),
  planId: text("plan_id").notNull(),
  planType: text("plan_type").notNull(), // 'onetime' | 'subscription'
  photosPurchased: text("photos_purchased").notNull(),
  // Contact information
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  // Address fields
  addressLine1: text("address_line_1").notNull(),
  addressLine2: text("address_line_2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  postalCode: text("postal_code").notNull(),
  // Property details
  propertyType: text("property_type").notNull(),
  rooms: text("rooms").notNull(),
  message: text("message"),
  propertyImages: text("property_images").array(),
  createdAt: timestamp("created_at").defaultNow(),
});


export const assets = pgTable("assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => stagingRequests.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  kind: text("kind").notNull(), // 'original' | 'staged' | 'revision_ref'
  storageKey: text("storage_key").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  width: integer("width"),
  height: integer("height"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  processingStatus: text("processing_status").notNull().default("pending"),
});

export const revisions = pgTable("revisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => stagingRequests.id),
  originalAssetId: varchar("original_asset_id").notNull().references(() => assets.id),
  stagedAssetId: varchar("staged_asset_id").references(() => assets.id),
  notes: text("notes"),
  status: text("status").notNull().default("pending"), // 'pending' | 'in_progress' | 'completed' | 'rejected'
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const extraPhotoRequests = pgTable("extra_photo_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => stagingRequests.id),
  photoCount: integer("photo_count").notNull(),
  status: text("status").notNull().default("pending"),
  paymentIntentId: text("payment_intent_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => stagingRequests.id),
  type: text("type").notNull(), // 'account_executive' | 'support'
  participantIds: text("participant_ids").array().notNull(),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  messageBody: text("message_body").notNull(),
  attachmentIds: text("attachment_ids").array(),
  createdAt: timestamp("created_at").defaultNow(),
  readAt: timestamp("read_at"),
});

export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  projectId: varchar("project_id").references(() => stagingRequests.id),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"), // 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: text("priority").notNull().default("medium"),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// Credit system tables
export const creditLedger = pgTable("credit_ledger", {
  id: bigint("id", { mode: "number" }).primaryKey().$defaultFn(() => sql`nextval('credit_ledger_id_seq')`),
  userId: varchar("user_id").notNull().references(() => users.id),
  delta: integer("delta").notNull(), // Positive for additions, negative for consumption
  reason: text("reason"), // e.g., "stripe_purchase", "photo_staged", "refund"
  sourceId: text("source_id"), // Reference to payment/order ID
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_credit_ledger_user_id").on(table.userId),
  uniqueIndex("unique_credit_source").on(table.userId, table.sourceId).where(sql`${table.sourceId} IS NOT NULL`),
]);

export const creditBalance = pgTable("credit_balance", {
  userId: varchar("user_id").primaryKey().references(() => users.id),
  balance: integer("balance").notNull().default(0),
  creditsExpiresAt: timestamp("credits_expires_at"),
  lastPackPurchased: text("last_pack_purchased"),
  autoExtendEnabled: boolean("auto_extend_enabled").default(false),
});

// Stripe customer mapping table (one stripe customer per user)
export const stripeCustomers = pgTable(
  "stripe_customers",
  {
    userId: varchar("user_id").notNull().references(() => users.id),
    customerId: text("customer_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userUnique: uniqueIndex("stripe_customers_user_unique").on(t.userId),
    customerUnique: uniqueIndex("stripe_customers_customer_unique").on(t.customerId),
  })
);

// Active subscription snapshot for the user (Stripe is source of truth)
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(), // Stripe subscription id
    userId: varchar("user_id").notNull().references(() => users.id),
    status: text("status").notNull(),
    priceId: text("price_id"),
    currentPeriodEnd: timestamp("current_period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("subscriptions_user_idx").on(t.userId),
  })
);

// Upsert user schema for Replit Auth
export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
}).extend({
  id: z.string().min(1, "User ID is required"),
  email: z.string().email("Invalid email format").max(255, "Email must be less than 255 characters").toLowerCase().nullable(),
  firstName: z.string().max(100, "First name must be less than 100 characters").nullable(),
  lastName: z.string().max(100, "Last name must be less than 100 characters").nullable(),
  profileImageUrl: z.string().url("Invalid URL").nullable(),
  stripeCustomerId: z.string().optional(),
});


// Asset schemas
export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  uploadedAt: true,
}).extend({
  projectId: z.string().min(1, "Project ID is required"),
  userId: z.string().min(1, "User ID is required"),
  kind: z.enum(["original", "staged", "revision_ref"]),
  storageKey: z.string().min(1, "Storage key is required"),
  fileName: z.string().min(1, "File name is required"),
  mimeType: z.string().min(1, "MIME type is required"),
  fileSize: z.number().positive("File size must be positive"),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  processingStatus: z.string().default("pending"),
});

// Revision schemas
export const insertRevisionSchema = createInsertSchema(revisions).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
}).extend({
  projectId: z.string().min(1, "Project ID is required"),
  originalAssetId: z.string().min(1, "Original asset ID is required"),
  stagedAssetId: z.string().optional(),
  notes: z.string().max(1000, "Notes must be less than 1000 characters").optional(),
  status: z.enum(["pending", "in_progress", "completed", "rejected"]).default("pending"),
  createdBy: z.string().min(1, "Created by user ID is required"),
});

// Extra photo request schemas
export const insertExtraPhotoRequestSchema = createInsertSchema(extraPhotoRequests).omit({
  id: true,
  createdAt: true,
}).extend({
  projectId: z.string().min(1, "Project ID is required"),
  photoCount: z.number().positive("Photo count must be positive"),
  status: z.string().default("pending"),
  paymentIntentId: z.string().optional(),
});

// Conversation schemas
export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  lastMessageAt: true,
}).extend({
  projectId: z.string().nullable().optional(),
  type: z.enum(["account_executive", "support"]),
  participantIds: z.array(z.string()).min(1, "At least one participant is required"),
});

// Message schemas
export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  readAt: true,
}).extend({
  conversationId: z.string().min(1, "Conversation ID is required"),
  senderId: z.string().min(1, "Sender ID is required"),
  messageBody: z.string().min(1, "Message body is required").max(10000, "Message must be less than 10000 characters"),
  attachmentIds: z.array(z.string()).optional(),
});

// Support ticket schemas
export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
}).extend({
  userId: z.string().min(1, "User ID is required"),
  projectId: z.string().optional(),
  subject: z.string().min(1, "Subject is required").max(200, "Subject must be less than 200 characters"),
  description: z.string().min(1, "Description is required").max(5000, "Description must be less than 5000 characters"),
  status: z.enum(["open", "in_progress", "resolved", "closed"]).default("open"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
});

// Payment-linked staging request schema for post-purchase order completion
export const insertStagingRequestSchema = createInsertSchema(stagingRequests).omit({
  id: true,
  createdAt: true,
}).extend({
  // User relationship (optional for guest orders)
  userId: z.string().optional(),
  // Payment validation
  paymentIntentId: z.string().min(1, "Payment intent ID is required"),
  planId: z.string().min(1, "Plan ID is required"),
  planType: z.enum(["onetime", "subscription"], {
    errorMap: () => ({ message: "Plan type must be 'onetime' or 'subscription'" })
  }),
  photosPurchased: z.string().min(1, "Photos purchased count is required"),
  // Contact information
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters").trim(),
  email: z.string().email("Invalid email format").max(255, "Email must be less than 255 characters").toLowerCase(),
  phone: z.string().max(20, "Phone must be less than 20 characters").optional().or(z.literal("")),
  // Address validation
  addressLine1: z.string().min(1, "Address is required").max(200, "Address must be less than 200 characters").trim(),
  addressLine2: z.string().max(200, "Address line 2 must be less than 200 characters").optional().or(z.literal("")),
  city: z.string().min(1, "City is required").max(100, "City must be less than 100 characters").trim(),
  state: z.string().min(2, "State is required").max(50, "State must be less than 50 characters").trim(),
  postalCode: z.string().min(1, "Postal code is required").max(20, "Postal code must be less than 20 characters").trim(),
  // Property details
  propertyType: z.enum(["residential", "commercial", "vacation_rental", "condo", "townhouse", "single_family"], {
    errorMap: () => ({ message: "Property type must be one of: residential, commercial, vacation_rental, condo, townhouse, single_family" })
  }),
  rooms: z.enum(["1", "2", "3", "4", "5", "6+"], {
    errorMap: () => ({ message: "Rooms must be one of: 1, 2, 3, 4, 5, 6+" })
  }),
  message: z.string().max(1000, "Message must be less than 1000 characters").optional().or(z.literal("")),
  propertyImages: z.array(z.string()).optional()
});

// Secure update schema that prevents tampering with protected fields
export const updateStagingRequestSchema = z.object({
  // Contact information can be updated
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters").trim().optional(),
  email: z.string().email("Invalid email format").max(255, "Email must be less than 255 characters").toLowerCase().optional(),
  phone: z.string().max(20, "Phone must be less than 20 characters").optional().or(z.literal("")),
  // Address fields can be updated
  addressLine1: z.string().min(1, "Address is required").max(200, "Address must be less than 200 characters").trim().optional(),
  addressLine2: z.string().max(200, "Address line 2 must be less than 200 characters").optional().or(z.literal("")),
  city: z.string().min(1, "City is required").max(100, "City must be less than 100 characters").trim().optional(),
  state: z.string().min(2, "State is required").max(50, "State must be less than 50 characters").trim().optional(),
  postalCode: z.string().min(1, "Postal code is required").max(20, "Postal code must be less than 20 characters").trim().optional(),
  // Property details can be updated
  propertyType: z.enum(["residential", "commercial", "vacation_rental", "condo", "townhouse", "single_family"], {
    errorMap: () => ({ message: "Property type must be one of: residential, commercial, vacation_rental, condo, townhouse, single_family" })
  }).optional(),
  rooms: z.enum(["1", "2", "3", "4", "5", "6+"], {
    errorMap: () => ({ message: "Rooms must be one of: 1, 2, 3, 4, 5, 6+" })
  }).optional(),
  message: z.string().max(1000, "Message must be less than 1000 characters").optional().or(z.literal(""))
}).strict(); // Payment fields CANNOT be updated via this schema to prevent tampering

// Order completion form schema (for frontend form - subset of full insert schema)
export const orderCompletionSchema = z.object({
  // Payment info will be extracted from URL
  paymentIntentId: z.string().min(1, "Payment intent ID is required"),
  // Contact information
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters").trim(),
  email: z.string().email("Invalid email format").max(255, "Email must be less than 255 characters").toLowerCase(),
  phone: z.string().max(20, "Phone must be less than 20 characters").optional().or(z.literal("")),
  // Address validation
  addressLine1: z.string().min(1, "Address is required").max(200, "Address must be less than 200 characters").trim(),
  addressLine2: z.string().max(200, "Address line 2 must be less than 200 characters").optional().or(z.literal("")),
  city: z.string().min(1, "City is required").max(100, "City must be less than 100 characters").trim(),
  state: z.string().min(2, "State is required").max(50, "State must be less than 50 characters").trim(),
  postalCode: z.string().min(1, "Postal code is required").max(20, "Postal code must be less than 20 characters").trim(),
  // Property details
  propertyType: z.enum(["residential", "commercial", "vacation_rental", "condo", "townhouse", "single_family"], {
    errorMap: () => ({ message: "Property type must be one of: residential, commercial, vacation_rental, condo, townhouse, single_family" })
  }),
  rooms: z.enum(["1", "2", "3", "4", "5", "6+"], {
    errorMap: () => ({ message: "Rooms must be one of: 1, 2, 3, 4, 5, 6+" })
  }),
  message: z.string().max(1000, "Message must be less than 1000 characters").optional().or(z.literal(""))
});

// Contact quote form schema (for contact form quote requests - simplified)
export const contactQuoteSchema = z.object({
  // Contact information
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters").trim(),
  email: z.string().email("Please enter a valid email address").max(255, "Email must be less than 255 characters").toLowerCase(),
  phone: z.string().max(20, "Phone must be less than 20 characters").optional().or(z.literal("")),
  // Property details
  propertyType: z.string().min(1, "Please select a property type"),
  rooms: z.string().min(1, "Please select number of rooms"),
  message: z.string().max(1000, "Message must be less than 1000 characters").optional().or(z.literal(""))
});

// Credit ledger schemas
export const insertCreditLedgerSchema = createInsertSchema(creditLedger).omit({
  id: true,
  createdAt: true,
}).extend({
  userId: z.string().min(1, "User ID is required"),
  delta: z.number().int("Delta must be an integer"),
  reason: z.string().max(200, "Reason must be less than 200 characters").optional(),
  sourceId: z.string().max(100, "Source ID must be less than 100 characters").optional(),
});

// Credit balance schemas
export const insertCreditBalanceSchema = createInsertSchema(creditBalance).extend({
  userId: z.string().min(1, "User ID is required"),
  balance: z.number().int("Balance must be an integer").min(0, "Balance cannot be negative").default(0),
  creditsExpiresAt: z.date().optional(),
  lastPackPurchased: z.string().optional(),
  autoExtendEnabled: z.boolean().default(false),
});

// User types for Replit Auth
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;

// Asset types
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assets.$inferSelect;

// Revision types
export type InsertRevision = z.infer<typeof insertRevisionSchema>;
export type Revision = typeof revisions.$inferSelect;

// Extra photo request types
export type InsertExtraPhotoRequest = z.infer<typeof insertExtraPhotoRequestSchema>;
export type ExtraPhotoRequest = typeof extraPhotoRequests.$inferSelect;

// Conversation types
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// Message types
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Support ticket types
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;

// Staging request types
export type InsertStagingRequest = z.infer<typeof insertStagingRequestSchema>;
export type UpdateStagingRequest = z.infer<typeof updateStagingRequestSchema>;
export type OrderCompletion = z.infer<typeof orderCompletionSchema>;
export type ContactQuote = z.infer<typeof contactQuoteSchema>;
export type StagingRequest = typeof stagingRequests.$inferSelect;

// Credit system types
export type InsertCreditLedger = z.infer<typeof insertCreditLedgerSchema>;
export type CreditLedger = typeof creditLedger.$inferSelect;
export type InsertCreditBalance = z.infer<typeof insertCreditBalanceSchema>;
export type CreditBalance = typeof creditBalance.$inferSelect;
