import { NextFunction, Response } from 'express';
import { config } from '../config';
import { AuthedRequest } from '../types';
import { verifyAuthToken } from '../services/jwt';
import { prisma } from '../db';

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'Missing auth header' });
  const token = header.replace('Bearer ', '');
  try {
    const payload = verifyAuthToken(token);
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

export async function requireTrainingUser(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'Missing auth header' });
  const token = header.replace('Bearer ', '');

  try {
    const payload = verifyAuthToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        rating: true,
        email: true,
        provider: true,
        createdAt: true
      }
    });

    if (!user) return res.status(401).json({ message: 'User not found' });
    if (user.username.trim().toLowerCase() !== config.trainingUsername) {
      return res.status(403).json({ message: 'This platform is restricted to one training account' });
    }

    req.userId = user.id;
    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
