import type { Request, Response, NextFunction } from "express";

export type AuthedUser = {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
};

// Try common header/cookie spots; then refine to EXACT ones from /debug/auth
export function extractUser(req: Request): AuthedUser | null {
  const h = req.headers;

  // Try likely headers first (update these 3 lines to the exact keys you saw)
  const id    = (h["x-user-id"] || h["x-replit-user-id"] || h["x-userid"]) as string | undefined;
  const email = (h["x-user-email"] || h["x-replit-user-email"]) as string | undefined;
  const name  = (h["x-user-name"] || h["x-replit-user-name"]) as string | undefined;
  const pic   = (h["x-user-picture"] || h["x-replit-user-picture"]) as string | undefined;

  if (!id) return null;
  return { id, email, name, picture: pic };
}

declare global {
  namespace Express {
    interface Request { user?: AuthedUser | null }
  }
}

export function attachUser(req: Request, _res: Response, next: NextFunction) {
  req.user = extractUser(req);
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    // Not signed in → send 401; frontend can redirect to /login
    return res.status(401).json({ error: "Not signed in" });
  }
  next();
}

// Keep for compatibility with existing code
export async function cleanupExpiredSessions(): Promise<void> {
  // No-op for header-based auth (no sessions to clean up)
}
