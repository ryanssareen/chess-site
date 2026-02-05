import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../db';
import { AuthedRequest } from '../types';

const router = Router();

router.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ id: user.id, username: user.username, rating: user.rating, createdAt: user.createdAt });
});

export default router;
