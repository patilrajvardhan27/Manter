import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';

const PASS_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function likeUser(req: Request, res: Response) {
  const { userId: fromId, role } = req.user;
  const toId = req.params['userId'] as string;

  if (fromId === toId) {
    res.status(400).json({ error: 'Cannot like yourself' });
    return;
  }

  const target = await prisma.user.findUnique({
    where: { id: toId, isActive: true },
    select: { id: true, role: true },
  });
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Enforce man ↔ woman only matching
  if (role === target.role) {
    res.status(400).json({ error: 'Same-role matching not supported yet' });
    return;
  }

  const womanId = role === 'WOMAN' ? fromId : toId;
  const manId = role === 'MAN' ? fromId : toId;

  const existing = await prisma.match.findUnique({ where: { womanId_manId: { womanId, manId } } });

  if (existing?.status === 'MATCHED') {
    res.json({ matched: true, matchId: existing.id });
    return;
  }

  const womanLiked = role === 'WOMAN' ? true : existing?.womanLiked ?? false;
  const manLiked = role === 'MAN' ? true : existing?.manLiked ?? false;
  const isMatch = womanLiked && manLiked;

  const match = existing
    ? await prisma.match.update({
        where: { id: existing.id },
        data: {
          ...(role === 'WOMAN' ? { womanLiked: true } : { manLiked: true }),
          ...(isMatch ? { status: 'MATCHED' } : {}),
        },
      })
    : await prisma.match.create({
        data: {
          womanId,
          manId,
          womanLiked,
          manLiked,
          status: isMatch ? 'MATCHED' : 'PENDING',
          compatibilityScore: 0, // will be recomputed in background; 0 as placeholder
        },
      });

  res.json({ matched: isMatch, matchId: match.id });
}

export async function passUser(req: Request, res: Response) {
  const { userId } = req.user;
  const toId = req.params['userId'] as string;

  // Store in Redis set — ephemeral, doesn't pollute the DB
  await redis
    .pipeline()
    .sadd(`passed:${userId}`, toId)
    .expire(`passed:${userId}`, PASS_TTL_SECONDS)
    .exec()
    .catch(() => null);

  res.json({ success: true });
}

export async function getMatches(req: Request, res: Response) {
  const { userId, role } = req.user;

  const matches = await prisma.match.findMany({
    where: {
      status: 'MATCHED',
      OR: [{ womanId: userId }, { manId: userId }],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      woman: {
        select: { id: true, name: true, age: true, photos: true, city: true, isVerified: true },
      },
      man: {
        select: {
          id: true, name: true, age: true, photos: true, city: true, isVerified: true,
          manProfile: { select: { communityScore: true, ratingCount: true } },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { content: true, createdAt: true, senderId: true, readAt: true },
      },
    },
  });

  const result = matches.map((m) => {
    const otherUser = role === 'WOMAN' ? m.man : m.woman;
    const lastMessage = m.messages[0] ?? null;
    const unread = lastMessage && lastMessage.senderId !== userId && !lastMessage.readAt;

    return {
      matchId: m.id,
      compatibilityScore: m.compatibilityScore,
      createdAt: m.createdAt,
      otherUser,
      lastMessage,
      unread,
    };
  });

  res.json(result);
}
