import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../db';
import { AuthedRequest } from '../types';

const router = Router();

router.get('/', requireAuth, async (req: AuthedRequest, res) => {
  const limit = parseInt((req.query.limit as string) || '20', 10);
  const games = await prisma.game.findMany({
    where: { OR: [{ whiteId: req.userId }, { blackId: req.userId }] },
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      white: { select: { username: true, rating: true, id: true } },
      black: { select: { username: true, rating: true, id: true } }
    }
  });

  res.json({
    games: games.map((g) => ({
      id: g.id,
      white: g.white,
      black: g.black,
      result: g.result,
      timeControl: g.timeControl,
      playedAt: g.createdAt
    }))
  });
});

export default router;
