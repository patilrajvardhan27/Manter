import { Request, Response, NextFunction } from 'express';

export function requireRole(role: 'WOMAN' | 'MAN') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user.role !== role) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    next();
  };
}
