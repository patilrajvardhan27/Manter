import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { evaluateQuizWithAI } from '../services/quiz.service';

const AnswerSchema = z.object({
  questionId: z.string(),
  scenario: z.string(),
  question: z.string(),
  answer: z.string().min(1, 'Answer cannot be empty'),
});

const SubmitQuizSchema = z.object({
  answers: z.array(AnswerSchema).min(1),
});

export async function submitQuiz(req: Request, res: Response) {
  if (req.user.role !== 'MAN') {
    res.status(403).json({ error: 'Only men take the quiz' });
    return;
  }

  const parsed = SubmitQuizSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid answers', details: parsed.error.flatten() });
    return;
  }

  const { answers } = parsed.data;
  const qualityScores = await evaluateQuizWithAI(answers);

  await prisma.$transaction([
    prisma.manProfile.upsert({
      where: { userId: req.user.userId },
      create: { userId: req.user.userId, qualityScores, quizAnswers: answers },
      update: { qualityScores, quizAnswers: answers },
    }),
    prisma.onboardingResponse.upsert({
      where: { userId: req.user.userId },
      create: { userId: req.user.userId, role: 'MAN', responses: answers },
      update: { responses: answers, updatedAt: new Date() },
    }),
  ]);

  res.json({ qualityScores, message: 'Quiz evaluated and submitted' });
}

export async function getQuizStatus(req: Request, res: Response) {
  const profile = await prisma.manProfile.findUnique({
    where: { userId: req.user.userId },
    select: { qualityScores: true },
  });
  res.json({ completed: !!profile, qualityScores: profile?.qualityScores ?? null });
}
