import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const ReportSchema = z.object({
  reportedId: z.string(),
  reason: z.enum(['HARASSMENT', 'FAKE_PROFILE', 'INAPPROPRIATE_CONTENT', 'THREATENING', 'CATFISH', 'OTHER']),
  details: z.string().max(500).optional(),
});

export async function reportUser(req: Request, res: Response) {
  const parsed = ReportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid report', details: parsed.error.flatten() });
    return;
  }
  const { reportedId, reason, details } = parsed.data;

  if (reportedId === req.user.userId) {
    res.status(400).json({ error: 'Cannot report yourself' });
    return;
  }

  await prisma.report.create({
    data: { reporterId: req.user.userId, reportedId, reason, details },
  });

  res.json({ message: 'Report submitted. Thank you.' });
}

export async function blockUser(req: Request, res: Response) {
  const blockedId = req.params['userId'] as string;

  if (blockedId === req.user.userId) {
    res.status(400).json({ error: 'Cannot block yourself' });
    return;
  }

  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: req.user.userId, blockedId } },
    create: { blockerId: req.user.userId, blockedId },
    update: {},
  });

  // Decline any pending match between them
  const womanId = req.user.role === 'WOMAN' ? req.user.userId : blockedId;
  const manId = req.user.role === 'MAN' ? req.user.userId : blockedId;
  await prisma.match.updateMany({
    where: { womanId, manId, status: { not: 'DECLINED' } },
    data: { status: 'DECLINED' },
  });

  res.json({ message: 'User blocked.' });
}

export async function unblockUser(req: Request, res: Response) {
  const blockedId = req.params['userId'] as string;

  await prisma.block.deleteMany({
    where: { blockerId: req.user.userId, blockedId },
  });

  res.json({ message: 'User unblocked.' });
}
