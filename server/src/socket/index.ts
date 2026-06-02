import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { AuthPayload } from '../middleware/auth.middleware';
import { registerChatHandlers } from './chat.handler';
import { registerPresenceHandlers } from './presence.handler';

export function initSocket(io: Server) {
  // JWT auth for WebSocket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Missing token'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as AuthPayload;
    socket.join(`user:${user.userId}`);

    registerChatHandlers(io, socket);
    registerPresenceHandlers(io, socket);

    socket.on('disconnect', () => {
      socket.leave(`user:${user.userId}`);
    });
  });
}
