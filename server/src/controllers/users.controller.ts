import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { storePushToken } from '../services/notifications.service';

const QUALITY_LABELS: Record<string, string> = {
  q1: 'Respects Her Decisions', q2: 'Protects Not Controls', q3: 'Supportive of Her Growth',
  q4: 'Trustworthy', q5: 'Genuine Connection', q6: 'Stands Up for Her',
  q7: 'Notices Small Things', q8: 'Patient & Gives Space', q9: 'Emotionally Intelligent',
  q10: 'Sense of Humor', q11: 'Respects Boundaries', q12: 'Safe Presence',
  q13: 'Confident & Self-Respecting', q14: 'Expresses Emotions Freely',
  q15: 'Respects Womanhood', q16: 'Never Mocks Women', q17: 'Ambitious & Futuristic',
  q18: 'No Anger Issues', q19: 'Shares Responsibilities', q20: 'Reliable',
  q21: 'Basic Manners', q22: 'Humble & Down-to-Earth', q23: 'No Ego',
};

const qualityWeight = z.number().int().min(1).max(5);
const WeightsSchema = z.object({
  qualityWeights: z.object({
    q1: qualityWeight, q2: qualityWeight, q3: qualityWeight, q4: qualityWeight,
    q5: qualityWeight, q6: qualityWeight, q7: qualityWeight, q8: qualityWeight,
    q9: qualityWeight, q10: qualityWeight, q11: qualityWeight, q12: qualityWeight,
    q13: qualityWeight, q14: qualityWeight, q15: qualityWeight, q16: qualityWeight,
    q17: qualityWeight, q18: qualityWeight, q19: qualityWeight, q20: qualityWeight,
    q21: qualityWeight, q22: qualityWeight, q23: qualityWeight,
  }),
});

export async function getMe(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      age: true,
      bio: true,
      photos: true,
      city: true,
      isVerified: true,
      idVerified: true,
      createdAt: true,
      manProfile: true,
      womanProfile: true,
    },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({ ...user, quizCompleted: !!user.manProfile });
}

export async function updateProfile(req: Request, res: Response) {
  const { name, bio, city, age } = req.body as {
    name?: string;
    bio?: string;
    city?: string;
    age?: number;
  };

  const user = await prisma.user.update({
    where: { id: req.user.userId },
    data: { name, bio, city, age },
    select: {
      id: true, email: true, role: true, name: true,
      age: true, bio: true, photos: true, city: true,
      isVerified: true, idVerified: true,
    },
  });

  res.json(user);
}

export async function getUserById(req: Request, res: Response) {
  const id = req.params['id'] as string;

  const user = await prisma.user.findUnique({
    where: { id, isActive: true },
    select: {
      id: true,
      name: true,
      age: true,
      bio: true,
      photos: true,
      city: true,
      isVerified: true,
      idVerified: true,
      role: true,
      manProfile: {
        select: { communityScore: true, ratingCount: true, qualityScores: true },
      },
    },
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json(user);
}

export async function saveWeights(req: Request, res: Response) {
  if (req.user.role !== 'WOMAN') {
    res.status(403).json({ error: 'Only women set quality weights' });
    return;
  }

  const parsed = WeightsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid weights', details: parsed.error.flatten() });
    return;
  }

  const weights = parsed.data.qualityWeights;

  const labeledResponses = Object.entries(weights).map(([key, weight]) => ({
    qualityKey: key,
    label: QUALITY_LABELS[key] ?? key,
    weight,
  }));

  await prisma.$transaction([
    prisma.womanProfile.upsert({
      where: { userId: req.user.userId },
      create: { userId: req.user.userId, qualityWeights: weights },
      update: { qualityWeights: weights },
    }),
    prisma.onboardingResponse.upsert({
      where: { userId: req.user.userId },
      create: { userId: req.user.userId, role: 'WOMAN', responses: labeledResponses },
      update: { responses: labeledResponses, updatedAt: new Date() },
    }),
  ]);

  res.json({ qualityWeights: weights, message: 'Priorities saved' });
}

export async function savePushToken(req: Request, res: Response) {
  const { token } = req.body as { token?: string };
  if (!token) {
    res.status(400).json({ error: 'token is required' });
    return;
  }
  await storePushToken(req.user.userId, token);
  res.json({ ok: true });
}
