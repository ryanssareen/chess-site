import { Router } from 'express';
import { createAIGame } from '../services/gameService';
import { AuthedRequest } from '../types';
import { requireTrainingUser } from '../middleware/auth';
import { prisma } from '../db';

const router = Router();

router.post('/queue', requireTrainingUser, async (_req: AuthedRequest, res) => {
  res.status(410).json({ message: 'Online multiplayer is disabled. Use Play vs Computer for training.' });
});

router.post('/ai', requireTrainingUser, async (req: AuthedRequest, res) => {
  const { level = 4, timeControl = '5+0' } = req.body;
  if (!req.userId) return res.status(401).json({ message: 'Unauthorized' });
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { id: true, username: true, rating: true }
  });
  if (!user) return res.status(404).json({ message: 'User not found' });
  const game = await createAIGame(user, timeControl, level);
  res.json(game);
});

export default router;
