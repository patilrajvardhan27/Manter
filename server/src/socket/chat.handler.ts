import { Server, Socket } from 'socket.io';
import { prisma } from '../lib/prisma';
import { scanForRedFlags } from '../services/ai.service';
import { notifyNewMessage, notifyRedFlagAlert } from '../services/notifications.service';
import { AuthPayload } from '../middleware/auth.middleware';

export function registerChatHandlers(io: Server, socket: Socket) {
  const sender = socket.data.user as AuthPayload;

  // Client joins a match room when they open a chat screen
  socket.on('chat:join', async (matchId: string) => {
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        status: 'MATCHED',
        OR: [{ womanId: sender.userId }, { manId: sender.userId }],
      },
    });
    if (!match) return;
    socket.join(`match:${matchId}`);
  });

  socket.on('chat:leave', (matchId: string) => {
    socket.leave(`match:${matchId}`);
  });

  socket.on('message:send', async (payload: { matchId: string; content: string }) => {
    const { matchId, content } = payload;
    if (!content?.trim()) return;

    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        status: 'MATCHED',
        OR: [{ womanId: sender.userId }, { manId: sender.userId }],
      },
    });
    if (!match) return;

    const message = await prisma.message.create({
      data: { matchId, senderId: sender.userId, content: content.trim() },
    });

    const recipientId = match.womanId === sender.userId ? match.manId : match.womanId;

    // Emit to match room (both users if both are in it) + recipient's user room (fallback)
    io.to(`match:${matchId}`).to(`user:${recipientId}`).emit('message:new', message);

    // Push notification if recipient is not in the match room (app in background)
    const recipientInRoom = io.sockets.adapter.rooms.get(`match:${matchId}`)?.size ?? 0;
    if (recipientInRoom === 0) {
      const senderUser = await prisma.user.findUnique({
        where: { id: sender.userId },
        select: { name: true },
      });
      notifyNewMessage(recipientId, senderUser?.name ?? 'Someone', content.trim(), matchId)
        .catch(() => null);
    }

    // AI scan async — only scan messages from men, emit alert to woman only
    if (sender.role === 'MAN') {
      runRedFlagScan(io, match, message.id, recipientId).catch(() => null);
    }
  });

  socket.on('message:read', async (payload: { matchId: string }) => {
    const { matchId } = payload;

    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        OR: [{ womanId: sender.userId }, { manId: sender.userId }],
      },
      select: { womanId: true, manId: true },
    });
    if (!match) return;

    const updated = await prisma.message.updateMany({
      where: {
        matchId,
        senderId: { not: sender.userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    if (updated.count > 0) {
      const senderId = match.womanId === sender.userId ? match.manId : match.womanId;
      // Tell the other user their messages were read
      io.to(`user:${senderId}`).to(`match:${matchId}`).emit('message:read', {
        matchId,
        readBy: sender.userId,
      });
    }
  });
}

async function runRedFlagScan(
  io: Server,
  match: { id: string; manId: string },
  messageId: string,
  recipientId: string,
) {
  const recent = await prisma.message.findMany({
    where: { matchId: match.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const context = recent.reverse().map((m) => ({
    role: m.senderId === match.manId ? ('man' as const) : ('woman' as const),
    content: m.content,
  }));

  const result = await scanForRedFlags(context);

  if (result.score > 0) {
    await prisma.message.update({
      where: { id: messageId },
      data: { redFlagScore: result.score, redFlagsFound: result.flags },
    });

    if (result.score >= 0.7) {
      io.to(`user:${recipientId}`).emit('red_flag:alert', {
        matchId: match.id,
        messageId,
        score: result.score,
        flags: result.flags,
        explanation: result.explanation,
      });
      // Push notification if app is backgrounded
      notifyRedFlagAlert(recipientId, match.id).catch(() => null);
    }
  }
}
