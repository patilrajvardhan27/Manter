import { Server, Socket } from 'socket.io';
import { redis } from '../lib/redis';
import { AuthPayload } from '../middleware/auth.middleware';

export function registerPresenceHandlers(io: Server, socket: Socket) {
  const user = socket.data.user as AuthPayload;

  redis.set(`presence:${user.userId}`, 'online', 'EX', 60);
  socket.broadcast.emit('presence:online', { userId: user.userId });

  socket.on('typing:start', (payload: { matchId: string }) => {
    socket.to(`match:${payload.matchId}`).emit('typing:start', { userId: user.userId });
  });

  socket.on('typing:stop', (payload: { matchId: string }) => {
    socket.to(`match:${payload.matchId}`).emit('typing:stop', { userId: user.userId });
  });

  socket.on('disconnect', () => {
    redis.del(`presence:${user.userId}`);
    socket.broadcast.emit('presence:offline', { userId: user.userId });
  });
}
