import { 
  type User, type UpsertUser,
  type Asset, type InsertAsset,
  type Revision, type InsertRevision,
  type ExtraPhotoRequest, type InsertExtraPhotoRequest,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
  type SupportTicket, type InsertSupportTicket,
  type StagingRequest, type InsertStagingRequest, type UpdateStagingRequest,
  type CreditLedger, type InsertCreditLedger,
  type CreditBalance, type InsertCreditBalance,
  users, sessions, assets, revisions, extraPhotoRequests, conversations, messages, supportTickets, stagingRequests, creditLedger, creditBalance
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db, pool } from "./db";
import { needsAlert, markAlertSent } from "./alerts";

// Session type for express-session compatibility
interface SessionData {
  sid: string;
  sess: Record<string, any>;
  expire: Date;
}

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserBySupabaseId(supabaseId: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(data: {
    replitId?: string;
    supabaseId?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    profileImageUrl?: string;
  }): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Session operations
  createSession(session: SessionData): Promise<SessionData>;
  getSession(id: string): Promise<SessionData | undefined>;
  getSessionByToken(token: string): Promise<SessionData | undefined>;
  getUserSessions(userId: string): Promise<SessionData[]>;
  deleteSession(id: string): Promise<boolean>;
  deleteExpiredSessions(): Promise<number>;

  // Asset operations
  createAsset(asset: InsertAsset): Promise<Asset>;
  getAsset(id: string): Promise<Asset | undefined>;
  getAssetsByProject(projectId: string): Promise<Asset[]>;
  getAssetsByUser(userId: string): Promise<Asset[]>;
  updateAsset(id: string, updates: Partial<Asset>): Promise<Asset | undefined>;
  deleteAsset(id: string): Promise<boolean>;

  // Revision operations
  createRevision(revision: InsertRevision): Promise<Revision>;
  getRevision(id: string): Promise<Revision | undefined>;
  getRevisionsByProject(projectId: string): Promise<Revision[]>;
  updateRevision(id: string, updates: Partial<Revision>): Promise<Revision | undefined>;
  deleteRevision(id: string): Promise<boolean>;

  // Extra photo request operations
  createExtraPhotoRequest(request: InsertExtraPhotoRequest): Promise<ExtraPhotoRequest>;
  getExtraPhotoRequest(id: string): Promise<ExtraPhotoRequest | undefined>;
  getExtraPhotoRequestsByProject(projectId: string): Promise<ExtraPhotoRequest[]>;
  updateExtraPhotoRequest(id: string, updates: Partial<ExtraPhotoRequest>): Promise<ExtraPhotoRequest | undefined>;
  deleteExtraPhotoRequest(id: string): Promise<boolean>;

  // Conversation operations
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationsByProject(projectId: string): Promise<Conversation[]>;
  getUserConversations(userId: string): Promise<Conversation[]>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined>;
  deleteConversation(id: string): Promise<boolean>;

  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getMessage(id: string): Promise<Message | undefined>;
  getMessagesByConversation(conversationId: string): Promise<Message[]>;
  updateMessage(id: string, updates: Partial<Message>): Promise<Message | undefined>;
  deleteMessage(id: string): Promise<boolean>;

  // Support ticket operations
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  getSupportTicket(id: string): Promise<SupportTicket | undefined>;
  getSupportTicketsByUser(userId: string): Promise<SupportTicket[]>;
  getAllSupportTickets(): Promise<SupportTicket[]>;
  updateSupportTicket(id: string, updates: Partial<SupportTicket>): Promise<SupportTicket | undefined>;
  deleteSupportTicket(id: string): Promise<boolean>;
  
  // Staging requests
  createStagingRequest(request: InsertStagingRequest): Promise<StagingRequest>;
  getStagingRequest(id: string): Promise<StagingRequest | undefined>;
  getStagingRequestByPaymentIntent(paymentIntentId: string): Promise<StagingRequest | undefined>;
  getStagingRequestsByUser(userId: string): Promise<StagingRequest[]>;
  getAllStagingRequests(): Promise<StagingRequest[]>;
  updateStagingRequest(id: string, updates: UpdateStagingRequest & { propertyImages?: string[] | null }): Promise<StagingRequest | undefined>;
  updateStagingRequestImages(id: string, images: string[]): Promise<StagingRequest | undefined>;
  deleteStagingRequest(id: string): Promise<boolean>;

  // Credit system operations
  getCreditBalance(userId: string): Promise<CreditBalance | undefined>;
  createCreditBalance(balance: InsertCreditBalance): Promise<CreditBalance>;
  updateCreditBalance(userId: string, newBalance: number): Promise<CreditBalance | undefined>;
  getCreditTransactions(userId: string): Promise<CreditLedger[]>;
  createCreditTransaction(transaction: InsertCreditLedger): Promise<CreditLedger>;
  addCredits(userId: string, amount: number, reason: string, sourceId?: string): Promise<{ balance: CreditBalance; transaction: CreditLedger }>;
  deductCredits(userId: string, amount: number, reason: string, sourceId?: string): Promise<{ balance: CreditBalance; transaction: CreditLedger }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserBySupabaseId(supabaseId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.supabaseId, supabaseId)).limit(1);
    return result[0];
  }

  async createUser(insertUser: UpsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async upsertUser(data: {
    replitId?: string;
    supabaseId?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    profileImageUrl?: string;
  }): Promise<User> {
    let existing: User[] = [];

    // First try to find existing user by supabase ID if provided
    if (data.supabaseId) {
      existing = await db
        .select()
        .from(users)
        .where(eq(users.supabaseId, data.supabaseId))
        .limit(1);
    }

    // If not found and replitId provided, try finding by replit ID
    if (existing.length === 0 && data.replitId) {
      existing = await db
        .select()
        .from(users)
        .where(eq(users.replitId, data.replitId))
        .limit(1);
    }

    if (existing.length > 0) {
      // Update existing user
      const result = await db
        .update(users)
        .set({
          supabaseId: data.supabaseId || existing[0].supabaseId,
          replitId: data.replitId || existing[0].replitId,
          username: data.username || existing[0].username,
          firstName: data.firstName || existing[0].firstName,
          lastName: data.lastName || existing[0].lastName,
          email: data.email,
          profileImageUrl: data.profileImageUrl || existing[0].profileImageUrl,
        })
        .where(eq(users.id, existing[0].id))
        .returning();
      return result[0];
    } else {
      // Create new user
      const result = await db
        .insert(users)
        .values({
          supabaseId: data.supabaseId || null,
          replitId: data.replitId || null,
          username: data.username || null,
          firstName: data.firstName || null,
          lastName: data.lastName || null,
          email: data.email,
          profileImageUrl: data.profileImageUrl || null,
        })
        .returning();
      return result[0];
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }

  // Session operations (for express-session compatibility)
  async createSession(session: SessionData): Promise<SessionData> {
    await db.insert(sessions).values({
      sid: session.sid,
      sess: session.sess,
      expire: session.expire,
    });
    return session;
  }

  async getSession(sid: string): Promise<SessionData | undefined> {
    const result = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sid, sid))
      .limit(1);
    
    if (result.length === 0) return undefined;
    
    return {
      sid: result[0].sid,
      sess: result[0].sess as Record<string, any>,
      expire: result[0].expire,
    };
  }

  async getSessionByToken(token: string): Promise<SessionData | undefined> {
    // This method is for custom token-based sessions, not express-session
    // For express-session, we use sid-based lookup
    return undefined;
  }

  async getUserSessions(userId: string): Promise<SessionData[]> {
    // For express-session, user sessions are tracked in sess.userId
    const allSessions = await db.select().from(sessions);
    return allSessions
      .filter(session => {
        const sess = session.sess as any;
        return sess?.userId === userId;
      })
      .map(session => ({
        sid: session.sid,
        sess: session.sess as Record<string, any>,
        expire: session.expire,
      }));
  }

  async deleteSession(sid: string): Promise<boolean> {
    const result = await db.delete(sessions).where(eq(sessions.sid, sid));
    return result.rowCount > 0;
  }

  async deleteExpiredSessions(): Promise<number> {
    const result = await db
      .delete(sessions)
      .where(sql`${sessions.expire} < NOW()`);
    return result.rowCount;
  }

  // Asset operations
  async createAsset(insertAsset: InsertAsset): Promise<Asset> {
    const result = await db.insert(assets).values(insertAsset).returning();
    return result[0];
  }

  async getAsset(id: string): Promise<Asset | undefined> {
    const result = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
    return result[0];
  }

  async getAssetsByProject(projectId: string): Promise<Asset[]> {
    return db.select().from(assets).where(eq(assets.projectId, projectId));
  }

  async getAssetsByUser(userId: string): Promise<Asset[]> {
    return db.select().from(assets).where(eq(assets.userId, userId));
  }

  async updateAsset(id: string, updates: Partial<Asset>): Promise<Asset | undefined> {
    const result = await db
      .update(assets)
      .set(updates)
      .where(eq(assets.id, id))
      .returning();
    return result[0];
  }

  async deleteAsset(id: string): Promise<boolean> {
    const result = await db.delete(assets).where(eq(assets.id, id));
    return result.rowCount > 0;
  }

  // Revision operations
  async createRevision(insertRevision: InsertRevision): Promise<Revision> {
    const result = await db.insert(revisions).values(insertRevision).returning();
    return result[0];
  }

  async getRevision(id: string): Promise<Revision | undefined> {
    const result = await db.select().from(revisions).where(eq(revisions.id, id)).limit(1);
    return result[0];
  }

  async getRevisionsByProject(projectId: string): Promise<Revision[]> {
    return db.select().from(revisions).where(eq(revisions.projectId, projectId));
  }

  async updateRevision(id: string, updates: Partial<Revision>): Promise<Revision | undefined> {
    const result = await db
      .update(revisions)
      .set(updates)
      .where(eq(revisions.id, id))
      .returning();
    return result[0];
  }

  async deleteRevision(id: string): Promise<boolean> {
    const result = await db.delete(revisions).where(eq(revisions.id, id));
    return result.rowCount > 0;
  }

  // Extra photo request operations
  async createExtraPhotoRequest(insertRequest: InsertExtraPhotoRequest): Promise<ExtraPhotoRequest> {
    const result = await db.insert(extraPhotoRequests).values(insertRequest).returning();
    return result[0];
  }

  async getExtraPhotoRequest(id: string): Promise<ExtraPhotoRequest | undefined> {
    const result = await db.select().from(extraPhotoRequests).where(eq(extraPhotoRequests.id, id)).limit(1);
    return result[0];
  }

  async getExtraPhotoRequestsByProject(projectId: string): Promise<ExtraPhotoRequest[]> {
    return db.select().from(extraPhotoRequests).where(eq(extraPhotoRequests.projectId, projectId));
  }

  async updateExtraPhotoRequest(id: string, updates: Partial<ExtraPhotoRequest>): Promise<ExtraPhotoRequest | undefined> {
    const result = await db
      .update(extraPhotoRequests)
      .set(updates)
      .where(eq(extraPhotoRequests.id, id))
      .returning();
    return result[0];
  }

  async deleteExtraPhotoRequest(id: string): Promise<boolean> {
    const result = await db.delete(extraPhotoRequests).where(eq(extraPhotoRequests.id, id));
    return result.rowCount > 0;
  }

  // Conversation operations
  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const result = await db.insert(conversations).values(insertConversation).returning();
    return result[0];
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const result = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    return result[0];
  }

  async getConversationsByProject(projectId: string): Promise<Conversation[]> {
    return db.select().from(conversations).where(eq(conversations.projectId, projectId));
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    return db.select().from(conversations).where(sql`${userId} = ANY(${conversations.participantIds})`);
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    const result = await db
      .update(conversations)
      .set(updates)
      .where(eq(conversations.id, id))
      .returning();
    return result[0];
  }

  async deleteConversation(id: string): Promise<boolean> {
    const result = await db.delete(conversations).where(eq(conversations.id, id));
    return result.rowCount > 0;
  }

  // Message operations
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(insertMessage).returning();
    
    // Update conversation's lastMessageAt
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, insertMessage.conversationId));
    
    return result[0];
  }

  async getMessage(id: string): Promise<Message | undefined> {
    const result = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
    return result[0];
  }

  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async updateMessage(id: string, updates: Partial<Message>): Promise<Message | undefined> {
    const result = await db
      .update(messages)
      .set(updates)
      .where(eq(messages.id, id))
      .returning();
    return result[0];
  }

  async deleteMessage(id: string): Promise<boolean> {
    const result = await db.delete(messages).where(eq(messages.id, id));
    return result.rowCount > 0;
  }

  // Support ticket operations
  async createSupportTicket(insertTicket: InsertSupportTicket): Promise<SupportTicket> {
    const result = await db.insert(supportTickets).values(insertTicket).returning();
    return result[0];
  }

  async getSupportTicket(id: string): Promise<SupportTicket | undefined> {
    const result = await db.select().from(supportTickets).where(eq(supportTickets.id, id)).limit(1);
    return result[0];
  }

  async getSupportTicketsByUser(userId: string): Promise<SupportTicket[]> {
    return db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(sql`${supportTickets.createdAt} DESC`);
  }

  async getAllSupportTickets(): Promise<SupportTicket[]> {
    return db
      .select()
      .from(supportTickets)
      .orderBy(sql`${supportTickets.createdAt} DESC`);
  }

  async updateSupportTicket(id: string, updates: Partial<SupportTicket>): Promise<SupportTicket | undefined> {
    const result = await db
      .update(supportTickets)
      .set(updates)
      .where(eq(supportTickets.id, id))
      .returning();
    return result[0];
  }

  async deleteSupportTicket(id: string): Promise<boolean> {
    const result = await db.delete(supportTickets).where(eq(supportTickets.id, id));
    return result.rowCount > 0;
  }

  // Staging request methods
  async createStagingRequest(insertRequest: InsertStagingRequest): Promise<StagingRequest> {
    const result = await db.insert(stagingRequests).values(insertRequest).returning();
    return result[0];
  }

  async getStagingRequest(id: string): Promise<StagingRequest | undefined> {
    const result = await db.select().from(stagingRequests).where(eq(stagingRequests.id, id)).limit(1);
    return result[0];
  }

  async getStagingRequestByPaymentIntent(paymentIntentId: string): Promise<StagingRequest | undefined> {
    const result = await db
      .select()
      .from(stagingRequests)
      .where(eq(stagingRequests.paymentIntentId, paymentIntentId))
      .limit(1);
    return result[0];
  }

  async getStagingRequestsByUser(userId: string): Promise<StagingRequest[]> {
    return db
      .select()
      .from(stagingRequests)
      .where(eq(stagingRequests.userId, userId))
      .orderBy(sql`${stagingRequests.createdAt} DESC`);
  }

  async getAllStagingRequests(): Promise<StagingRequest[]> {
    return db
      .select()
      .from(stagingRequests)
      .orderBy(sql`${stagingRequests.createdAt} DESC`);
  }

  async updateStagingRequest(
    id: string,
    updates: UpdateStagingRequest & { propertyImages?: string[] | null }
  ): Promise<StagingRequest | undefined> {
    const result = await db
      .update(stagingRequests)
      .set(updates)
      .where(eq(stagingRequests.id, id))
      .returning();
    return result[0];
  }

  async updateStagingRequestImages(id: string, images: string[]): Promise<StagingRequest | undefined> {
    const result = await db
      .update(stagingRequests)
      .set({ propertyImages: images })
      .where(eq(stagingRequests.id, id))
      .returning();
    return result[0];
  }

  async deleteStagingRequest(id: string): Promise<boolean> {
    const result = await db.delete(stagingRequests).where(eq(stagingRequests.id, id));
    return result.rowCount > 0;
  }

  // Credit system operations using raw SQL
  async getCreditBalance(userId: string): Promise<CreditBalance | undefined> {
    const { rows } = await pool.query(
      "SELECT user_id, balance FROM credit_balance WHERE user_id=$1",
      [userId]
    );
    if (rows.length === 0) return undefined;
    return {
      userId: rows[0].user_id,
      balance: rows[0].balance
    } as CreditBalance;
  }

  async createCreditBalance(insertBalance: InsertCreditBalance): Promise<CreditBalance> {
    const { rows } = await pool.query(
      "INSERT INTO credit_balance (user_id, balance) VALUES ($1, $2) RETURNING user_id, balance",
      [insertBalance.userId, insertBalance.balance]
    );
    return {
      userId: rows[0].user_id,
      balance: rows[0].balance
    } as CreditBalance;
  }

  async updateCreditBalance(userId: string, newBalance: number): Promise<CreditBalance | undefined> {
    const { rows } = await pool.query(
      "UPDATE credit_balance SET balance = $1 WHERE user_id = $2 RETURNING user_id, balance",
      [newBalance, userId]
    );
    if (rows.length === 0) return undefined;
    return {
      userId: rows[0].user_id,
      balance: rows[0].balance
    } as CreditBalance;
  }

  async getCreditTransactions(userId: string): Promise<CreditLedger[]> {
    const { rows } = await pool.query(
      "SELECT id, user_id, delta, reason, source_id, created_at FROM credit_ledger WHERE user_id=$1 ORDER BY id DESC LIMIT 50",
      [userId]
    );
    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      delta: row.delta,
      reason: row.reason,
      sourceId: row.source_id,
      createdAt: row.created_at
    })) as CreditLedger[];
  }

  async createCreditTransaction(insertTransaction: InsertCreditLedger): Promise<CreditLedger> {
    const { rows } = await pool.query(
      "INSERT INTO credit_ledger (user_id, delta, reason, source_id) VALUES ($1, $2, $3, $4) RETURNING id, user_id, delta, reason, source_id, created_at",
      [insertTransaction.userId, insertTransaction.delta, insertTransaction.reason, insertTransaction.sourceId ?? null]
    );
    return {
      id: rows[0].id,
      userId: rows[0].user_id,
      delta: rows[0].delta,
      reason: rows[0].reason,
      sourceId: rows[0].source_id,
      createdAt: rows[0].created_at
    } as CreditLedger;
  }

  async addCredits(
    userId: string, 
    amount: number, 
    reason: string, 
    sourceId?: string,
    packInfo?: { expiresAt?: Date; packKey?: string; autoExtend?: boolean }
  ): Promise<{ balance: CreditBalance; transaction: CreditLedger }> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      // Insert ledger entry
      const { rows: ledgerRows } = await client.query(
        "INSERT INTO credit_ledger (user_id, delta, reason, source_id) VALUES ($1,$2,$3,$4) RETURNING id, user_id, delta, reason, source_id, created_at",
        [userId, amount, reason, sourceId ?? null]
      );
      
      // Upsert balance with expiry and pack info if provided
      if (packInfo?.expiresAt) {
        await client.query(
          `INSERT INTO credit_balance (user_id, balance, credits_expires_at, last_pack_purchased, auto_extend_enabled) 
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id) DO UPDATE SET 
             balance = credit_balance.balance + EXCLUDED.balance,
             credits_expires_at = EXCLUDED.credits_expires_at,
             last_pack_purchased = EXCLUDED.last_pack_purchased,
             auto_extend_enabled = EXCLUDED.auto_extend_enabled`,
          [userId, amount, packInfo.expiresAt, packInfo.packKey ?? null, packInfo.autoExtend ?? false]
        );
      } else {
        await client.query(
          `INSERT INTO credit_balance (user_id, balance) VALUES ($1, $2)
           ON CONFLICT (user_id) DO UPDATE SET balance = credit_balance.balance + EXCLUDED.balance`,
          [userId, amount]
        );
      }
      
      // Get updated balance
      const { rows: balanceRows } = await client.query(
        "SELECT user_id, balance, credits_expires_at, last_pack_purchased, auto_extend_enabled FROM credit_balance WHERE user_id=$1",
        [userId]
      );
      
      await client.query("COMMIT");
      
      return {
        transaction: {
          id: ledgerRows[0].id,
          userId: ledgerRows[0].user_id,
          delta: ledgerRows[0].delta,
          reason: ledgerRows[0].reason,
          sourceId: ledgerRows[0].source_id,
          createdAt: ledgerRows[0].created_at
        } as CreditLedger,
        balance: {
          userId: balanceRows[0].user_id,
          balance: balanceRows[0].balance,
          creditsExpiresAt: balanceRows[0].credits_expires_at,
          lastPackPurchased: balanceRows[0].last_pack_purchased,
          autoExtendEnabled: balanceRows[0].auto_extend_enabled
        } as CreditBalance
      };
    } catch (e: any) {
      await client.query("ROLLBACK");
      
      // Handle duplicate sourceId (PostgreSQL error code 23505)
      if (e.code === '23505' && sourceId) {
        console.log(`Credits already granted for sourceId: ${sourceId}, skipping duplicate`);
        // Fetch existing transaction and current balance
        const { rows: existingLedger } = await client.query(
          "SELECT id, user_id, delta, reason, source_id, created_at FROM credit_ledger WHERE user_id=$1 AND source_id=$2 LIMIT 1",
          [userId, sourceId]
        );
        const { rows: balanceRows } = await client.query(
          "SELECT user_id, balance, credits_expires_at, last_pack_purchased, auto_extend_enabled FROM credit_balance WHERE user_id=$1",
          [userId]
        );
        
        return {
          transaction: {
            id: existingLedger[0].id,
            userId: existingLedger[0].user_id,
            delta: existingLedger[0].delta,
            reason: existingLedger[0].reason,
            sourceId: existingLedger[0].source_id,
            createdAt: existingLedger[0].created_at
          } as CreditLedger,
          balance: {
            userId: balanceRows[0].user_id,
            balance: balanceRows[0].balance,
            creditsExpiresAt: balanceRows[0].credits_expires_at,
            lastPackPurchased: balanceRows[0].last_pack_purchased,
            autoExtendEnabled: balanceRows[0].auto_extend_enabled
          } as CreditBalance
        };
      }
      
      throw e;
    } finally {
      client.release();
    }
  }

  async expireCredits(): Promise<number> {
    const { rows } = await pool.query(
      `UPDATE credit_balance 
       SET balance = 0 
       WHERE credits_expires_at IS NOT NULL 
       AND credits_expires_at < NOW() 
       AND balance > 0
       RETURNING user_id`
    );
    return rows.length;
  }

  async deductCredits(
    userId: string, 
    amount: number, 
    reason: string, 
    sourceId?: string
  ): Promise<{ balance: CreditBalance; transaction: CreditLedger; thresholdCrossed?: number }> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      
      // Ensure balance row exists before locking
      await client.query(
        "INSERT INTO credit_balance (user_id, balance) VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING",
        [userId]
      );
      
      // Lock and check balance (get all fields including auto-extend info)
      const { rows: lockRows } = await client.query(
        "SELECT balance, credits_expires_at, last_pack_purchased, auto_extend_enabled FROM credit_balance WHERE user_id=$1 FOR UPDATE",
        [userId]
      );
      
      const before = lockRows[0]?.balance ?? 0;
      const autoExtendEnabled = lockRows[0]?.auto_extend_enabled ?? false;
      
      if (before < amount) {
        throw new Error("Insufficient credits");
      }
      
      // Try insert the job consumption row with optional sourceId
      let ledgerRows;
      try {
        const { rows } = await client.query(
          "INSERT INTO credit_ledger (user_id, delta, reason, source_id) VALUES ($1,$2,$3,$4) RETURNING id, user_id, delta, reason, source_id, created_at",
          [userId, -amount, reason, sourceId ?? null]
        );
        ledgerRows = rows;
      } catch (e: any) {
        if (e?.code === "23505") {
          // duplicate job consumption → already deducted earlier; just return current balance
          const { rows: balanceRows } = await client.query(
            "SELECT user_id, balance, credits_expires_at, last_pack_purchased, auto_extend_enabled FROM credit_balance WHERE user_id=$1",
            [userId]
          );
          const { rows: existingLedger } = await client.query(
            "SELECT id, user_id, delta, reason, source_id, created_at FROM credit_ledger WHERE user_id=$1 AND source_id=$2 AND reason=$3",
            [userId, sourceId, reason]
          );
          
          await client.query("COMMIT");
          
          return {
            transaction: {
              id: existingLedger[0].id,
              userId: existingLedger[0].user_id,
              delta: existingLedger[0].delta,
              reason: existingLedger[0].reason,
              sourceId: existingLedger[0].source_id,
              createdAt: existingLedger[0].created_at
            } as CreditLedger,
            balance: {
              userId: balanceRows[0].user_id,
              balance: balanceRows[0].balance,
              creditsExpiresAt: balanceRows[0].credits_expires_at,
              lastPackPurchased: balanceRows[0].last_pack_purchased,
              autoExtendEnabled: balanceRows[0].auto_extend_enabled
            } as CreditBalance
          };
        }
        throw e;
      }
      
      // Update balance and auto-extend expiry if enabled
      let balanceRows;
      if (autoExtendEnabled) {
        const newExpiry = new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000); // +6 months
        const { rows } = await client.query(
          "UPDATE credit_balance SET balance = balance - $1, credits_expires_at = $3 WHERE user_id=$2 RETURNING user_id, balance, credits_expires_at, last_pack_purchased, auto_extend_enabled",
          [amount, userId, newExpiry]
        );
        balanceRows = rows;
      } else {
        const { rows } = await client.query(
          "UPDATE credit_balance SET balance = balance - $1 WHERE user_id=$2 RETURNING user_id, balance, credits_expires_at, last_pack_purchased, auto_extend_enabled",
          [amount, userId]
        );
        balanceRows = rows;
      }
      
      const after = balanceRows[0].balance as number;
      
      // Detect threshold crossing for low balance alerts
      const thresholds = [10, 5, 0];
      const thresholdCrossed = thresholds.find(t => before > t && after <= t);
      
      if (thresholdCrossed !== undefined) {
        // Ask once per threshold
        if (await needsAlert(client, userId, thresholdCrossed)) {
          // TODO: call your mailer / notification here
          // await sendLowBalanceEmail(userEmail, thresholdCrossed);

          await markAlertSent(client, userId, thresholdCrossed);
        }
      }
      
      await client.query("COMMIT");
      
      return {
        transaction: {
          id: ledgerRows[0].id,
          userId: ledgerRows[0].user_id,
          delta: ledgerRows[0].delta,
          reason: ledgerRows[0].reason,
          sourceId: ledgerRows[0].source_id,
          createdAt: ledgerRows[0].created_at
        } as CreditLedger,
        balance: {
          userId: balanceRows[0].user_id,
          balance: balanceRows[0].balance,
          creditsExpiresAt: balanceRows[0].credits_expires_at,
          lastPackPurchased: balanceRows[0].last_pack_purchased,
          autoExtendEnabled: balanceRows[0].auto_extend_enabled
        } as CreditBalance,
        thresholdCrossed
      };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
}

export const storage = new DatabaseStorage();