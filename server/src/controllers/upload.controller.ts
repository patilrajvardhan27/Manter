import { Request, Response } from 'express';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { r2, R2_BUCKET, R2_PUBLIC_URL } from '../lib/r2';
import { prisma } from '../lib/prisma';

export async function uploadPhoto(req: Request, res: Response) {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  // Resize to 800x800 square, webp for compression
  const processed = await sharp(file.buffer)
    .resize(800, 800, { fit: 'cover', position: 'face' })
    .webp({ quality: 82 })
    .toBuffer();

  const key = `photos/${req.user.userId}/${Date.now()}.webp`;

  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: processed,
      ContentType: 'image/webp',
    }),
  );

  const url = `${R2_PUBLIC_URL}/${key}`;

  // Add to user's photos array (max 6)
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { photos: true },
  });

  const photos = [...(user?.photos ?? []), url].slice(0, 6);

  await prisma.user.update({
    where: { id: req.user.userId },
    data: { photos },
  });

  res.json({ url, photos });
}
