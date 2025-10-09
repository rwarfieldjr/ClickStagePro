import { Router, type Request, type Response, type NextFunction } from 'express';

// Lightweight router that ensures non-POST methods on /api/webhooks/stripe
// return 405 Method Not Allowed. The actual POST handler is already registered
// earlier in the app lifecycle (in server/routes.ts), which processes valid
// Stripe webhooks with express.raw() body.
const router = Router();

router.all('/stripe', (req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }
  // Allow POST to continue to any earlier registered handlers (which should
  // have already handled it). If none handled it, fall through to 404.
  return next();
});

export default router;
