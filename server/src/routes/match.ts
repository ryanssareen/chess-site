import { Router } from 'express';
import { nanoid } from 'nanoid';
import { createAIGame, queuePlayer } from '../services/gameService';
import { AuthedRequest } from '../types';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/queue', async (req: AuthedRequest, res) => {
  const user = req.userId
    ? { id: req.userId, username: req.body.username || 'You', rating: 1500 }
    : { id: 'guest-' + nanoid(4), username: 'Guest', rating: 1500 };
  const { timeControl = '3+2', rated = true } = req.body;
  const { matched, game } = await queuePlayer(user, timeControl, rated);
  if (matched && game) {
    res.json({ gameId: game.id });
  } else {
    res.json({ gameId: null, queued: true });
  }
});

router.post('/ai', async (req: AuthedRequest, res) => {
  const { level = 4, timeControl = '5+0' } = req.body;
  const user = req.userId
    ? { id: req.userId, username: req.body.username || 'You', rating: 1500 }
    : { id: 'guest-' + nanoid(4), username: 'Guest', rating: 1500 };
  const game = await createAIGame(user, timeControl, level);
  res.json(game);
});

export default router;
