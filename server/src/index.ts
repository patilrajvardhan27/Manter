import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';

import { validateEnv } from './lib/env';
import { initSocket } from './socket';
import { authMiddleware } from './middleware/auth.middleware';
import { globalLimiter, authLimiter, aiLimiter, uploadLimiter, swipeLimiter, ratingsLimiter } from './middleware/rateLimit.middleware';
import { errorHandler, notFound } from './middleware/errorHandler.middleware';
import { startCheckinProcessor } from './services/safety.service';

import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import quizRoutes from './routes/quiz.routes';
import discoverRoutes from './routes/discover.routes';
import matchesRoutes from './routes/matches.routes';
import chatRoutes from './routes/chat.routes';
import ratingsRoutes from './routes/ratings.routes';
import safetyRoutes from './routes/safety.routes';
import aiRoutes from './routes/ai.routes';
import uploadRoutes from './routes/upload.routes';

validateEnv();

const app = express();
const httpServer = createServer(app);

// Allowed origins — lock down in production
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') ?? ['*'];
const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'] },
});

// ─── Global middleware ────────────────────────────────────────────────────────

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow R2 image loads
}));
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json({ limit: '1mb' }));
app.use(globalLimiter);

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${req.method}] ${req.path}`);
    next();
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Public — stricter auth limiter on login/register
app.use('/auth', authLimiter, authRoutes);

// Protected
app.use('/users',    authMiddleware, usersRoutes);
app.use('/quiz',     authMiddleware, quizRoutes);
app.use('/discover', authMiddleware, discoverRoutes);
app.use('/matches',  authMiddleware, swipeLimiter, matchesRoutes);
app.use('/chat',     authMiddleware, chatRoutes);
app.use('/ratings',  authMiddleware, ratingsLimiter, ratingsRoutes);
app.use('/safety',   authMiddleware, safetyRoutes);
app.use('/ai',       authMiddleware, aiLimiter, aiRoutes);
app.use('/upload',   authMiddleware, uploadLimiter, uploadRoutes);

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', uptime: process.uptime(), env: process.env.NODE_ENV }),
);

// 404 + global error handler (must be last)
app.use(notFound);
app.use(errorHandler);

// ─── Real-time + background jobs ──────────────────────────────────────────────

initSocket(io);
startCheckinProcessor();

// ─── Graceful shutdown ────────────────────────────────────────────────────────

const PORT = process.env.PORT ?? 3000;
const server = httpServer.listen(PORT, () =>
  console.log(`[Server] Running on :${PORT} (${process.env.NODE_ENV ?? 'development'})`),
);

function shutdown(signal: string) {
  console.log(`[Server] ${signal} received — shutting down gracefully`);
  server.close(() => {
    console.log('[Server] HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000); // force exit after 10s
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
