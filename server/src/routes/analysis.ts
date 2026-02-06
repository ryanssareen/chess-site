import { Router } from 'express';
import { engine } from '../services/chessEngine';
import { Chess } from 'chess.js';

const router = Router();

router.post('/evaluate', async (req, res) => {
  const { fen, depth = 12 } = req.body;
  if (!fen) return res.status(400).json({ message: 'fen required' });
  const result = await engine.bestMove(fen, depth);

  // Translate UCI line to SAN for easier display
  const toSanLine = (startFen: string, uciLine: string) => {
    const tmp = new Chess(startFen);
    const parts = uciLine.split(' ').filter(Boolean);
    const sans: string[] = [];
    parts.forEach((uci) => {
      const move = tmp.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || 'q' });
      if (move) sans.push(move.san);
    });
    return sans.join(' ');
  };

  res.json({ ...result, bestLineSan: toSanLine(fen, result.bestLine) });
});

export default router;
