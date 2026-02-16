import { Router } from 'express';
import { requireTrainingUser } from '../middleware/auth';
import { prisma } from '../db';
import { AuthedRequest } from '../types';

const router = Router();

router.get('/', requireTrainingUser, async (req: AuthedRequest, res) => {
  if (!req.userId) return res.status(401).json({ message: 'Unauthorized' });

  const limit = Math.max(1, Math.min(100, parseInt(String(req.query.limit || 20), 10) || 20));
  const games = await prisma.game.findMany({
    where: {
      OR: [{ whiteId: req.userId }, { blackId: req.userId }]
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      white: { select: { id: true, username: true, rating: true } },
      black: { select: { id: true, username: true, rating: true } },
      moves: { orderBy: { ply: 'asc' } }
    }
  });

  const mapped = games.map((game) => ({
    id: game.id,
    result: game.result,
    rated: game.rated,
    timeControl: game.timeControl,
    createdAt: game.createdAt.toISOString(),
    pgn: game.pgn,
    perspective: game.whiteId === req.userId ? 'white' : 'black',
    players: {
      white: game.white,
      black: game.black
    },
    moves: game.moves.map((move) => ({
      san: move.san,
      from: move.from,
      to: move.to,
      fen: move.fen,
      moveNumber: move.ply,
      player: move.ply % 2 === 1 ? 'white' : 'black'
    }))
  }));

  res.json({ games: mapped });
});

export default router;
