import { Server, Socket } from 'socket.io';
import { prisma } from '../lib/prisma';
import { scanForRedFlags } from '../services/ai.service';
import { AuthPayload } from '../middleware/auth.middleware';

export function registerChatHandlers(io: Server, socket: Socket) {
  const sender = socket.data.user as AuthPayload;

  socket.on('message:send', async (payload: { matchId: string; content: string }) => {
    const { matchId, content } = payload;
    if (!content?.trim()) return;

    // Verify sender is part of this match
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        status: 'MATCHED',
        OR: [{ womanId: sender.userId }, { manId: sender.userId }],
      },
    });
    if (!match) return;

    // Save message
    const message = await prisma.message.create({
      data: { matchId, senderId: sender.userId, content },
    });

    const recipientId = match.womanId === sender.userId ? match.manId : match.womanId;

    // Emit to both participants immediately
    io.to(`user:${sender.userId}`).to(`user:${recipientId}`).emit('message:new', message);

    // Run red flag scan async (only scan messages from men)
    if (sender.role === 'MAN') {
      runRedFlagScan(io, matchId, message.id, recipientId).catch(() => null);
    }
  });

  socket.on('message:read', async (payload: { matchId: string; messageId: string }) => {
    await prisma.message.updateMany({
      where: {
        matchId: payload.matchId,
        senderId: { not: sender.userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    socket.to(`match:${payload.matchId}`).emit('message:read', {
      matchId: payload.matchId,
      readBy: sender.userId,
    });
  });
}

async function runRedFlagScan(
  io: Server,
  matchId: string,
  messageId: string,
  recipientId: string,
) {
  const recent = await prisma.message.findMany({
    where: { matchId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { match: { select: { manId: true } } },
  });

  const context = recent.reverse().map((m) => ({
    role: m.senderId === m.match.manId ? ('man' as const) : ('woman' as const),
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
        matchId,
        messageId,
        ...result,
      });
    }
  }
}
