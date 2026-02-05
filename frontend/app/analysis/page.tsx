'use client';

import { useEffect, useState } from 'react';
import { ChessBoard } from '@/components/ChessBoard';
import { MoveList } from '@/components/MoveList';
import { GameState } from '@/types';
import { api } from '@/lib/api';
import { Chess } from 'chess.js';
import { LineChart, Loader2 } from 'lucide-react';

const emptyGame: GameState = {
  id: 'analysis-local',
  fen: 'start',
  pgn: '',
  moves: [],
  turn: 'w',
  players: {
    white: { id: 'analysis', username: 'You', rating: 1500 },
    black: { id: 'engine', username: 'Engine', rating: 2500 }
  },
  clocks: { white: 600000, black: 600000 },
  status: 'active',
  timeControl: { label: 'Analysis', initial: 0, increment: 0, code: 'analysis' }
};

export default function AnalysisPage() {
  const [game, setGame] = useState<GameState>(emptyGame);
  const [chess] = useState(() => new Chess());
  const [bestLine, setBestLine] = useState<string>('');
  const [evalScore, setEvalScore] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const historyWithFen = () => {
    const temp = new Chess();
    const verbose = chess.history({ verbose: true });
    const moves = [] as any[];
    verbose.forEach((m: any, idx: number) => {
      temp.move({ from: m.from, to: m.to, promotion: m.promotion });
      moves.push({
        san: m.san,
        from: m.from,
        to: m.to,
        fen: temp.fen(),
        moveNumber: idx + 1,
        player: m.color === 'w' ? 'white' : 'black'
      });
    });
    return moves;
  };

  useEffect(() => {
    setGame((g) => ({ ...g, fen: chess.fen(), moves: historyWithFen() }));
  }, [chess]);

  const handleLocalMove = (fen: string) => {
    chess.load(fen);
    setGame((g) => ({ ...g, fen, moves: historyWithFen(), pgn: chess.pgn() }));
  };

  const requestEval = async () => {
    setLoading(true);
    try {
      const res = await api.post('/analysis/evaluate', { fen: chess.fen(), depth: 12 });
      setBestLine(res.data.bestLine);
      setEvalScore(res.data.score);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <LineChart size={18} /> Interactive analysis board
        </div>
        <ChessBoard game={{ ...game, fen: chess.fen() }} meColor="white" allowMoves onMove={handleLocalMove} />
        <div className="flex gap-3 text-sm">
          <button
            className="rounded-lg border border-white/10 px-3 py-2 text-slate-200 hover:border-primary/50"
            onClick={() => {
              chess.reset();
              setGame({ ...game, fen: chess.fen(), moves: [] });
              setBestLine('');
              setEvalScore('');
            }}
          >
            Reset
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-emerald-500 px-4 py-2 text-white shadow-glow"
            onClick={requestEval}
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Evaluate position
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-slate-100">
          <div className="text-xs uppercase tracking-wide text-slate-400">Engine suggestion</div>
          <div className="mt-2 text-lg font-semibold text-white">{bestLine || 'Run analysis to view best line'}</div>
          {evalScore && <div className="mt-1 text-slate-300">Eval: {evalScore}</div>}
        </div>
        <MoveList moves={game.moves} />
      </div>
    </div>
  );
}
