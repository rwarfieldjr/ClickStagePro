import type { Express, RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";
import { storage } from "./storage";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required");
}

// Create Supabase client
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Extend Express User type for Supabase
declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      firstName?: string | null;
      lastName?: string | null;
      profileImageUrl?: string | null;
    }
  }
}

export async function setupAuth(app: Express) {
  console.log("✅ Supabase Auth configured");

  // Login endpoint - handles email/password and magic link
  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    try {
      // If password provided, use email/password auth
      if (password) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Upsert user in our database
        if (data.user) {
          await storage.upsertUser({
            supabaseId: data.user.id,
            email: data.user.email || email,
            firstName: data.user.user_metadata?.firstName || null,
            lastName: data.user.user_metadata?.lastName || null,
            profileImageUrl: data.user.user_metadata?.profileImageUrl || null,
          });
        }

        return res.json({
          success: true,
          user: data.user,
          session: data.session,
        });
      }

      // Otherwise, send magic link
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${req.protocol}://${req.hostname}/`,
        },
      });

      if (error) throw error;

      return res.json({
        success: true,
        message: "Check your email for the login link",
      });
    } catch (error: any) {
      console.error("Login error:", error);
      return res.status(401).json({ error: error.message || "Authentication failed" });
    }
  });

  // Signup endpoint
  app.post("/api/signup", async (req, res) => {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            firstName,
            lastName,
          },
        },
      });

      if (error) throw error;

      // Upsert user in our database
      if (data.user) {
        await storage.upsertUser({
          supabaseId: data.user.id,
          email: data.user.email || email,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          profileImageUrl: undefined,
        });
      }

      return res.json({
        success: true,
        user: data.user,
        session: data.session,
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      return res.status(400).json({ error: error.message || "Signup failed" });
    }
  });

  // Logout endpoint
  app.post("/api/logout", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.json({ success: true });
    }

    try {
      await supabase.auth.signOut();
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Logout error:", error);
      return res.status(500).json({ error: error.message || "Logout failed" });
    }
  });

  // Get current user endpoint
  app.get("/api/auth/me", async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1] || 
                 req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    try {
      const { data, error } = await supabase.auth.getUser(token);

      if (error || !data.user) {
        return res.status(401).json({ error: "Invalid token" });
      }

      // Get user from our database
      const dbUser = await storage.getUserBySupabaseId(data.user.id);

      if (!dbUser) {
        // Create user if doesn't exist
        await storage.upsertUser({
          supabaseId: data.user.id,
          email: data.user.email || "",
          firstName: data.user.user_metadata?.firstName || undefined,
          lastName: data.user.user_metadata?.lastName || undefined,
          profileImageUrl: data.user.user_metadata?.profileImageUrl || undefined,
        });

        const newUser = await storage.getUserBySupabaseId(data.user.id);
        return res.json({ success: true, user: newUser });
      }

      return res.json({ success: true, user: dbUser });
    } catch (error: any) {
      console.error("Get user error:", error);
      return res.status(401).json({ error: error.message || "Unauthorized" });
    }
  });
}

// Middleware to protect routes
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // Check for dev auth first - this takes priority
  const ENABLE_DEV_AUTH = process.env.ENABLE_DEV_AUTH === "1";
  if (ENABLE_DEV_AUTH) {
    (req as any).user = {
      id: process.env.DEV_USER_ID || "dev-1",
      email: process.env.DEV_USER_EMAIL || "dev@example.com",
      firstName: "Dev",
      lastName: "User",
    };
    return next();
  }

  const token = req.headers.authorization?.split(" ")[1] ||
               req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Get user from our database
    const dbUser = await storage.getUserBySupabaseId(data.user.id);

    if (!dbUser) {
      return res.status(401).json({ error: "User not found in database" });
    }

    // Attach user to request
    (req as any).user = dbUser;
    next();
  } catch (error: any) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({ error: "Unauthorized" });
  }
};
