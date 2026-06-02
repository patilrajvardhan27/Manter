import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { aggregateCommunityScores } from '../services/scoring.service';
import { QualityScores } from '../../../shared/types';

// 5-point UX scale → 1-10 DB scale
const SCORE_MULTIPLIER = 2;

const qualityUiScore = z.number().int().min(1).max(5);

const SubmitRatingSchema = z.object({
  qualityScores: z.object({
    q1: qualityUiScore, q2: qualityUiScore, q3: qualityUiScore, q4: qualityUiScore,
    q5: qualityUiScore, q6: qualityUiScore, q7: qualityUiScore, q8: qualityUiScore,
    q9: qualityUiScore, q10: qualityUiScore, q11: qualityUiScore, q12: qualityUiScore,
    q13: qualityUiScore, q14: qualityUiScore, q15: qualityUiScore, q16: qualityUiScore,
    q17: qualityUiScore, q18: qualityUiScore, q19: qualityUiScore, q20: qualityUiScore,
    q21: qualityUiScore, q22: qualityUiScore, q23: qualityUiScore,
  }),
  reviewText: z.string().max(500).optional(),
  isAnonymous: z.boolean().default(true),
});

export async function submitRating(req: Request, res: Response) {
  if (req.user.role !== 'WOMAN') {
    res.status(403).json({ error: 'Only women can submit ratings' });
    return;
  }

  const parsed = SubmitRatingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid rating', details: parsed.error.flatten() });
    return;
  }

  const ratedId = req.params['userId'] as string;
  const raterId = req.user.userId;

  if (ratedId === raterId) {
    res.status(400).json({ error: 'Cannot rate yourself' });
    return;
  }

  const ratedUser = await prisma.user.findUnique({
    where: { id: ratedId, isActive: true, role: 'MAN' },
    select: { id: true },
  });
  if (!ratedUser) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Scale UX scores (1-5) to DB scores (2-10)
  const rawScores = parsed.data.qualityScores;
  const dbScores = Object.fromEntries(
    Object.entries(rawScores).map(([k, v]) => [k, v * SCORE_MULTIPLIER]),
  ) as QualityScores;

  const overallScore =
    Object.values(dbScores).reduce((a, b) => a + b, 0) / Object.keys(dbScores).length;

  const rating = await prisma.rating.upsert({
    where: { raterId_ratedId: { raterId, ratedId } },
    create: {
      raterId,
      ratedId,
      qualityScores: dbScores,
      overallScore,
      reviewText: parsed.data.reviewText,
      isAnonymous: parsed.data.isAnonymous,
    },
    update: {
      qualityScores: dbScores,
      overallScore,
      reviewText: parsed.data.reviewText,
      isAnonymous: parsed.data.isAnonymous,
    },
  });

  // Recompute community aggregate for the rated man
  await recomputeCommunityScore(ratedId);

  res.status(201).json({ message: 'Rating submitted', ratingId: rating.id });
}

export async function getRatings(req: Request, res: Response) {
  const userId = req.params['userId'] as string;

  const user = await prisma.user.findUnique({
    where: { id: userId, isActive: true },
    select: { id: true, role: true },
  });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const ratings = await prisma.rating.findMany({
    where: { ratedId: userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      qualityScores: true,
      overallScore: true,
      reviewText: true,
      isAnonymous: true,
      createdAt: true,
      rater: {
        select: { id: true, name: true, photos: true },
      },
    },
  });

  const sanitised = ratings.map((r) => ({
    id: r.id,
    qualityScores: r.qualityScores,
    overallScore: r.overallScore,
    reviewText: r.reviewText,
    createdAt: r.createdAt,
    // Hide rater identity if anonymous
    rater: r.isAnonymous ? null : r.rater,
  }));

  res.json(sanitised);
}

export async function getCommunityFeed(req: Request, res: Response) {
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1);
  const limit = 20;
  const offset = (page - 1) * limit;

  // Top-rated men (community score >= 5, at least 2 ratings)
  const topRated = await prisma.manProfile.findMany({
    where: { ratingCount: { gte: 2 }, communityScore: { gte: 5 } },
    orderBy: { communityScore: 'desc' },
    take: 10,
    include: {
      user: {
        select: {
          id: true, name: true, age: true, photos: true, city: true, isVerified: true,
        },
      },
    },
  });

  // Recent ratings activity (last 7 days, deduplicated per man)
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentRatings = await prisma.rating.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    distinct: ['ratedId'],
    take: limit,
    skip: offset,
    select: {
      id: true,
      overallScore: true,
      createdAt: true,
      rated: {
        select: {
          id: true, name: true, age: true, photos: true, city: true, isVerified: true,
          manProfile: { select: { communityScore: true, ratingCount: true } },
        },
      },
    },
  });

  res.json({
    topRated: topRated.map((mp) => ({
      ...mp.user,
      communityScore: mp.communityScore,
      ratingCount: mp.ratingCount,
    })),
    recentActivity: recentRatings.map((r) => ({
      ratedUser: r.rated,
      overallScore: r.overallScore,
      createdAt: r.createdAt,
    })),
    page,
    hasMore: recentRatings.length === limit,
  });
}

async function recomputeCommunityScore(manId: string) {
  const allRatings = await prisma.rating.findMany({
    where: { ratedId: manId },
    select: { qualityScores: true },
  });

  const { scores, overallScore } = aggregateCommunityScores(
    allRatings.map((r) => ({ qualityScores: r.qualityScores as QualityScores })),
  );

  await prisma.manProfile.update({
    where: { userId: manId },
    data: {
      qualityScores: scores,
      communityScore: overallScore,
      ratingCount: allRatings.length,
    },
  });
}
