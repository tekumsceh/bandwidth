import { Request, Response, NextFunction } from 'express';
import { canConfigureApp } from '../services/authzService';

export async function requireAppConfigAccess(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const allowed = await canConfigureApp(user);
  if (!allowed) return res.status(403).json({ error: 'App admin access required' });
  return next();
}

