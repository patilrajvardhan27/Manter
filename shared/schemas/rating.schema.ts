import { z } from 'zod';

const qualityScore = z.number().int().min(1).max(10);

export const RatingSchema = z.object({
  ratedId: z.string(),
  qualityScores: z.object({
    q1: qualityScore, q2: qualityScore, q3: qualityScore, q4: qualityScore,
    q5: qualityScore, q6: qualityScore, q7: qualityScore, q8: qualityScore,
    q9: qualityScore, q10: qualityScore, q11: qualityScore, q12: qualityScore,
    q13: qualityScore, q14: qualityScore, q15: qualityScore, q16: qualityScore,
    q17: qualityScore, q18: qualityScore, q19: qualityScore, q20: qualityScore,
    q21: qualityScore, q22: qualityScore, q23: qualityScore,
  }),
  reviewText: z.string().max(500).optional(),
  isAnonymous: z.boolean().default(true),
});

export type RatingInput = z.infer<typeof RatingSchema>;
