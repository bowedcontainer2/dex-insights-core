import { Request, Response, NextFunction } from 'express';

export function authGuard(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.sessionId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  next();
}
