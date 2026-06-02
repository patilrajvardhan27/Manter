import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error('[Error]', err.message, err.stack);

  // Don't expose internals in production
  const message =
    process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message;

  res.status(500).json({ error: message });
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Route not found' });
}
