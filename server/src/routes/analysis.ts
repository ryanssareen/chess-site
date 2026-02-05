import { Router } from 'express';
import { engine } from '../services/chessEngine';

const router = Router();

router.post('/evaluate', async (req, res) => {
  const { fen, depth = 12 } = req.body;
  if (!fen) return res.status(400).json({ message: 'fen required' });
  const result = await engine.bestMove(fen, depth);
  res.json(result);
});

export default router;
