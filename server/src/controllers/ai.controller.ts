import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { analyzeConversation, getRedFlagStatsForUser } from '../services/ai.service';

export async function analyzeMatchConversation(req: Request, res: Response) {
  const { userId, role } = req.user;
  const matchId = req.params['matchId'] as string;

  // Only women can request a full analysis (it's their safety feature)
  if (role !== 'WOMAN') {
    res.status(403).json({ error: 'Conversation analysis is available for women only' });
    return;
  }

  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      status: 'MATCHED',
      womanId: userId,
    },
    select: { id: true, manId: true },
  });

  if (!match) {
    res.status(404).json({ error: 'Match not found' });
    return;
  }

  const messages = await prisma.message.findMany({
    where: { matchId },
    orderBy: { createdAt: 'asc' },
    select: { senderId: true, content: true },
  });

  if (messages.length < 3) {
    res.status(400).json({ error: 'Not enough messages to analyze yet. Keep chatting.' });
    return;
  }

  const context = messages.map((m) => ({
    role: m.senderId === match.manId ? ('man' as const) : ('woman' as const),
    content: m.content,
  }));

  const analysis = await analyzeConversation(context);
  res.json(analysis);
}

export async function getUserRedFlagStats(req: Request, res: Response) {
  const userId = req.params['userId'] as string;

  // Confirm target is a man with an active profile
  const user = await prisma.user.findUnique({
    where: { id: userId, isActive: true, role: 'MAN' },
    select: { id: true },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const stats = await getRedFlagStatsForUser(userId);
  res.json(stats);
}
