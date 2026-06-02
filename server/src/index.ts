import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { initSocket } from './socket';
import { authMiddleware } from './middleware/auth.middleware';

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

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true }));

// Public routes
app.use('/auth', authRoutes);

// Protected routes
app.use('/users', authMiddleware, usersRoutes);
app.use('/quiz', authMiddleware, quizRoutes);
app.use('/discover', authMiddleware, discoverRoutes);
app.use('/matches', authMiddleware, matchesRoutes);
app.use('/chat', authMiddleware, chatRoutes);
app.use('/ratings', authMiddleware, ratingsRoutes);
app.use('/safety', authMiddleware, safetyRoutes);
app.use('/ai', authMiddleware, aiRoutes);
app.use('/upload', authMiddleware, uploadRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

initSocket(io);

const PORT = process.env.PORT ?? 3000;
httpServer.listen(PORT, () => console.log(`Server running on :${PORT}`));
