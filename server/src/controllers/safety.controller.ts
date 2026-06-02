import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

// ─── Report ───────────────────────────────────────────────────────────────────

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

// ─── Block ────────────────────────────────────────────────────────────────────

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

// ─── Date check-in ────────────────────────────────────────────────────────────

const CheckinSchema = z.object({
  scheduledAt: z.string().datetime(),
  dateWithUserId: z.string().optional(),
});

export async function createCheckin(req: Request, res: Response) {
  const parsed = CheckinSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid check-in', details: parsed.error.flatten() });
    return;
  }

  const { scheduledAt, dateWithUserId } = parsed.data;
  const scheduled = new Date(scheduledAt);

  if (scheduled <= new Date()) {
    res.status(400).json({ error: 'Scheduled time must be in the future' });
    return;
  }

  // Cancel any existing active check-in first
  await prisma.safetyCheckin.updateMany({
    where: { userId: req.user.userId, confirmedAt: null, alertSent: false },
    data: { alertSent: true }, // mark as handled so processor ignores it
  });

  const checkin = await prisma.safetyCheckin.create({
    data: {
      userId: req.user.userId,
      scheduledAt: scheduled,
      dateWithUserId,
    },
  });

  res.status(201).json(checkin);
}

export async function confirmCheckin(req: Request, res: Response) {
  const id = req.params['id'] as string;

  const checkin = await prisma.safetyCheckin.findFirst({
    where: { id, userId: req.user.userId, confirmedAt: null },
  });

  if (!checkin) {
    res.status(404).json({ error: 'Active check-in not found' });
    return;
  }

  const updated = await prisma.safetyCheckin.update({
    where: { id },
    data: { confirmedAt: new Date() },
  });

  res.json({ message: "You're marked safe.", checkin: updated });
}

export async function cancelCheckin(req: Request, res: Response) {
  const id = req.params['id'] as string;

  const deleted = await prisma.safetyCheckin.deleteMany({
    where: { id, userId: req.user.userId, confirmedAt: null, alertSent: false },
  });

  if (deleted.count === 0) {
    res.status(404).json({ error: 'Active check-in not found' });
    return;
  }

  res.json({ message: 'Check-in cancelled.' });
}

export async function getActiveCheckin(req: Request, res: Response) {
  const checkin = await prisma.safetyCheckin.findFirst({
    where: { userId: req.user.userId, confirmedAt: null, alertSent: false },
    orderBy: { createdAt: 'desc' },
  });

  res.json(checkin ?? null);
}

// ─── Emergency contacts ───────────────────────────────────────────────────────

const ContactSchema = z.object({
  name: z.string().min(1).max(80),
  phone: z.string().min(7).max(20),
  relation: z.string().min(1).max(40),
});

export async function getContacts(req: Request, res: Response) {
  const contacts = await prisma.emergencyContact.findMany({
    where: { userId: req.user.userId },
    orderBy: { id: 'asc' },
  });
  res.json(contacts);
}

export async function createContact(req: Request, res: Response) {
  const existing = await prisma.emergencyContact.count({
    where: { userId: req.user.userId },
  });

  if (existing >= 3) {
    res.status(400).json({ error: 'Maximum of 3 emergency contacts allowed' });
    return;
  }

  const parsed = ContactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid contact', details: parsed.error.flatten() });
    return;
  }

  const contact = await prisma.emergencyContact.create({
    data: { userId: req.user.userId, ...parsed.data },
  });

  res.status(201).json(contact);
}

export async function updateContact(req: Request, res: Response) {
  const id = req.params['id'] as string;

  const parsed = ContactSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid update', details: parsed.error.flatten() });
    return;
  }

  const contact = await prisma.emergencyContact.updateMany({
    where: { id, userId: req.user.userId },
    data: parsed.data,
  });

  if (contact.count === 0) {
    res.status(404).json({ error: 'Contact not found' });
    return;
  }

  const updated = await prisma.emergencyContact.findUnique({ where: { id } });
  res.json(updated);
}

export async function deleteContact(req: Request, res: Response) {
  const id = req.params['id'] as string;

  const deleted = await prisma.emergencyContact.deleteMany({
    where: { id, userId: req.user.userId },
  });

  if (deleted.count === 0) {
    res.status(404).json({ error: 'Contact not found' });
    return;
  }

  res.json({ message: 'Contact removed.' });
}
