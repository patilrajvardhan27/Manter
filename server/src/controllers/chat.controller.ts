import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const PAGE_SIZE = 30;

export async function getChatHistory(req: Request, res: Response) {
  const { userId } = req.user;
  const matchId = req.params['matchId'] as string;
  const cursor = req.query['cursor'] as string | undefined; // last message ID for older-page pagination

  // Verify requester is in this match
  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      status: 'MATCHED',
      OR: [{ womanId: userId }, { manId: userId }],
    },
    include: {
      woman: { select: { id: true, name: true, photos: true, isVerified: true } },
      man: {
        select: {
          id: true, name: true, photos: true, isVerified: true,
          manProfile: { select: { communityScore: true, ratingCount: true } },
        },
      },
    },
  });

  if (!match) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }

  const otherUser = match.womanId === userId ? match.man : match.woman;

  // Fetch messages page — newest first, then reverse for chronological display
  const messages = await prisma.message.findMany({
    where: {
      matchId,
      ...(cursor ? { createdAt: { lt: (await prisma.message.findUnique({ where: { id: cursor } }))?.createdAt } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: PAGE_SIZE + 1, // fetch one extra to check hasMore
    select: {
      id: true,
      senderId: true,
      content: true,
      redFlagScore: true,
      redFlagsFound: true,
      readAt: true,
      createdAt: true,
    },
  });

  const hasMore = messages.length > PAGE_SIZE;
  const page = messages.slice(0, PAGE_SIZE).reverse(); // oldest-first for the FlatList

  res.json({ messages: page, hasMore, otherUser, matchId });
}
