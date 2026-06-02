import rateLimit from 'express-rate-limit';

const json429 = (_req: any, res: any) =>
  res.status(429).json({ error: 'Too many requests. Please slow down.' });

// Global fallback — 100 req per 15 min
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json429,
});

// Auth endpoints — 10 attempts per 15 min (brute-force protection)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json429,
  skipSuccessfulRequests: true, // don't count successful logins
});

// AI analysis — 20 per hour (Claude API cost protection)
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json429,
});

// Photo upload — 20 per hour
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json429,
});

// Like/pass — 200 per hour (swiping)
export const swipeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json429,
});

// Ratings submit — 30 per day
export const ratingsLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: json429,
});
