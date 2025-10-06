import type { Request, Response } from "express";

export function authDebug(req: Request, res: Response) {
  res.setHeader("Content-Type", "application/json");
  res.status(200).send(JSON.stringify({
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    cookies: (req as any).cookies ?? {},
  }, null, 2));
}
