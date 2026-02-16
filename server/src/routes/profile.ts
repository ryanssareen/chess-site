import { Router } from 'express';
import { requireTrainingUser } from '../middleware/auth';
import { AuthedRequest } from '../types';

const router = Router();

router.get('/me', requireTrainingUser, async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  res.json({
    id: req.user.id,
    username: req.user.username,
    rating: req.user.rating,
    email: req.user.email || null,
    provider: req.user.provider || 'local',
    createdAt: req.user.createdAt ? req.user.createdAt.toISOString() : null
  });
});

export default router;
