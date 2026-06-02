import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { computeCompatibilityScore } from '../services/scoring.service';
import { QualityScores } from '../../../shared/types';

const PAGE_SIZE = 15;

export async function getDiscoverFeed(req: Request, res: Response) {
  const { userId, role } = req.user;
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const targetRole = role === 'WOMAN' ? 'MAN' : 'WOMAN';

  // IDs already interacted with (liked/declined matches)
  const existingMatchIds = await prisma.match.findMany({
    where: {
      OR: [{ womanId: userId }, { manId: userId }],
    },
    select: { womanId: true, manId: true },
  });
  const interactedIds = new Set(
    existingMatchIds.flatMap((m) => [m.womanId, m.manId]).filter((id) => id !== userId),
  );

  // IDs passed via Redis (ephemeral, 30-day TTL)
  const passedRaw = await redis.smembers(`passed:${userId}`).catch(() => [] as string[]);
  passedRaw.forEach((id) => interactedIds.add(id));

  // IDs blocked in either direction
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  blocks.forEach((b) => {
    interactedIds.add(b.blockerId === userId ? b.blockedId : b.blockerId);
  });

  const excludeIds = [...interactedIds, userId];

  // Fetch candidates
  const candidates = await prisma.user.findMany({
    where: {
      role: targetRole,
      isActive: true,
      id: { notIn: excludeIds },
    },
    select: {
      id: true,
      name: true,
      age: true,
      bio: true,
      photos: true,
      city: true,
      isVerified: true,
      idVerified: true,
      createdAt: true,
      manProfile: {
        select: { communityScore: true, ratingCount: true, qualityScores: true },
      },
      womanProfile: { select: { qualityWeights: true } },
    },
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: PAGE_SIZE * 3, // fetch more so we can sort by score
  });

  // Get woman's weights for scoring (only relevant when role = WOMAN viewing men)
  let womanWeights: QualityScores | null = null;
  if (role === 'WOMAN') {
    const wp = await prisma.womanProfile.findUnique({ where: { userId } });
    if (wp) womanWeights = wp.qualityWeights as QualityScores;
  }

  // Compute compatibility scores and attach top qualities
  const scored = candidates.map((c) => {
    let compatibilityScore = 50; // default

    if (role === 'WOMAN' && c.manProfile) {
      const mp = c.manProfile;
      const selfScores = mp.qualityScores as QualityScores;
      const weights = womanWeights ?? defaultWeights();
      compatibilityScore = computeCompatibilityScore(
        weights,
        selfScores,
        selfScores,
        mp.ratingCount,
      );
    }

    const qualityScores = c.manProfile?.qualityScores as Partial<QualityScores> | undefined;
    const topQualities = qualityScores
      ? topThreeQualities(qualityScores)
      : [];

    return {
      id: c.id,
      name: c.name,
      age: c.age,
      bio: c.bio,
      photos: c.photos,
      city: c.city,
      isVerified: c.isVerified,
      idVerified: c.idVerified,
      compatibilityScore,
      communityScore: c.manProfile?.communityScore ?? 0,
      ratingCount: c.manProfile?.ratingCount ?? 0,
      topQualities,
    };
  });

  // Sort women's feed by compatibility score; men's by recency (already ordered)
  if (role === 'WOMAN') {
    scored.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  }

  const paginated = scored.slice(0, PAGE_SIZE);

  res.json({
    data: paginated,
    page,
    hasMore: scored.length > PAGE_SIZE,
  });
}

function defaultWeights(): QualityScores {
  const keys = Array.from({ length: 23 }, (_, i) => `q${i + 1}`);
  return Object.fromEntries(keys.map((k) => [k, 3])) as QualityScores;
}

const QUALITY_LABELS: Record<string, string> = {
  q1: 'Respects Her', q2: 'Protects Not Controls', q3: 'Supportive',
  q4: 'Trustworthy', q5: 'Genuine Connection', q6: 'Stands Up For Her',
  q7: 'Notices Small Things', q8: 'Patient & Gives Space', q9: 'Emotionally Intelligent',
  q10: 'Sense of Humor', q11: 'Respects Boundaries', q12: 'Safe Presence',
  q13: 'Confident', q14: 'Expresses Emotions', q15: 'Respects Womanhood',
  q16: 'Never Mocks Women', q17: 'Ambitious', q18: 'No Anger Issues',
  q19: 'Shares Responsibilities', q20: 'Reliable', q21: 'Basic Manners',
  q22: 'Humble', q23: 'No Ego',
};

function topThreeQualities(scores: Partial<QualityScores>): { key: string; label: string; score: number }[] {
  return Object.entries(scores)
    .map(([key, score]) => ({ key, label: QUALITY_LABELS[key] ?? key, score: score ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
