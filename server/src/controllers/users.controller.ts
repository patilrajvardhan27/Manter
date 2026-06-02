import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

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

  res.json(user);
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
