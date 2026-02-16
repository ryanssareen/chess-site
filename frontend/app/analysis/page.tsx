'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChessBoard } from '@/components/ChessBoard';
import { MoveList } from '@/components/MoveList';
import { GameState, ReviewGame } from '@/types';
import { api, fetchReviewGames, isFrontendOnlyMode } from '@/lib/api';
import { LineChart, Loader2, RefreshCcw, SkipBack, SkipForward, StepBack, StepForward } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Chess } from 'chess.js';

const FRONTEND_ONLY = isFrontendOnlyMode();
const START_FEN = new Chess().fen();

function resultBadge(result: ReviewGame['userResult']) {
  if (result === 'win') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  if (result === 'draw') return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
}

export default function AnalysisPage() {
  const { user, loading } = useAuth();
  const [games, setGames] = useState<ReviewGame[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [loadMessage, setLoadMessage] = useState('');
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [ply, setPly] = useState(0);
  const [bestLine, setBestLine] = useState('');
  const [bestLineSan, setBestLineSan] = useState('');
  const [evalScore, setEvalScore] = useState('');
  const [evaluating, setEvaluating] = useState(false);

  const loadGames = useCallback(async () => {
    setLoadingGames(true);
    setLoadMessage('');
    try {
      const payload = await fetchReviewGames(16);
      setGames(payload.games || []);
      setSelectedGameId((current) => current || payload.games?.[0]?.id || '');
    } catch (err: any) {
      setLoadMessage(err?.response?.data?.message || 'Failed to load games from Chess.com');
    } finally {
      setLoadingGames(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadGames();
  }, [loadGames, user]);

  useEffect(() => {
    setPly(0);
    setBestLine('');
    setBestLineSan('');
    setEvalScore('');
  }, [selectedGameId]);

  const selectedGame = useMemo(
    () => games.find((game) => game.id === selectedGameId) || games[0],
    [games, selectedGameId]
  );
  const totalMoves = selectedGame?.moves.length || 0;
  const currentFen = selectedGame ? (ply > 0 ? selectedGame.moves[ply - 1]?.fen || START_FEN : START_FEN) : START_FEN;
  const visibleMoves = selectedGame ? selectedGame.moves.slice(0, ply) : [];

  const boardGame: GameState = useMemo(
    () => ({
      id: selectedGame?.id || 'review-board',
      fen: currentFen,
      pgn: selectedGame?.pgn || '',
      moves: visibleMoves,
      turn: ply % 2 === 0 ? 'w' : 'b',
      players: {
        white: {
          id: selectedGame?.asColor === 'white' ? user?.id || 'training-user' : 'opponent',
          username: selectedGame?.asColor === 'white' ? user?.username || 'You' : selectedGame?.opponent || 'Opponent',
          rating: 1500
        },
        black: {
          id: selectedGame?.asColor === 'black' ? user?.id || 'training-user' : 'opponent',
          username: selectedGame?.asColor === 'black' ? user?.username || 'You' : selectedGame?.opponent || 'Opponent',
          rating: 1500
        }
      },
      clocks: { white: 0, black: 0 },
      status: 'active',
      timeControl: { label: selectedGame?.timeControl || 'Review', initial: 0, increment: 0, code: 'review' }
    }),
    [currentFen, ply, selectedGame, user?.id, user?.username, visibleMoves]
  );

  const requestEval = async () => {
    if (!selectedGame) return;
    setEvaluating(true);
    setBestLine('');
    setBestLineSan('');
    setEvalScore('');

    if (FRONTEND_ONLY) {
      setBestLine('Engine eval is unavailable in frontend-only mode. Deploy backend to enable Stockfish analysis.');
      setEvaluating(false);
      return;
    }

    try {
      const res = await api.post('/analysis/evaluate', { fen: currentFen, depth: 14 });
      setBestLine(res.data.bestLine);
      setBestLineSan(res.data.bestLineSan || '');
      setEvalScore(res.data.score);
    } catch (err: any) {
      setBestLine(err?.response?.data?.message || 'Evaluation failed for this position');
      setBestLineSan('');
      setEvalScore('');
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-slate-100">
        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
        <div className="text-lg font-semibold text-white">Sign in required</div>
        <p className="mt-2 text-sm text-slate-300">Login to open game review and analysis.</p>
        <Link
          href="/auth"
          className="mt-4 inline-flex rounded-lg bg-gradient-to-r from-primary to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-glow"
        >
          Go to login
        </Link>
      </div>
    );
  }

  if (loadingGames) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-slate-100">
        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <LineChart size={18} /> Chess.com game review
            </div>
            <button
              onClick={loadGames}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1 text-xs text-slate-200 hover:border-primary/50"
            >
              <RefreshCcw size={12} /> Refresh
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">Recent real games for username: {user?.username || 'training-user'}</p>
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
            {games.map((game) => (
              <button
                key={game.id}
                onClick={() => setSelectedGameId(game.id)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selectedGame?.id === game.id
                    ? 'border-primary/50 bg-primary/10 text-white'
                    : 'border-white/10 bg-slate-900/40 text-slate-200 hover:border-primary/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold">vs {game.opponent}</div>
                  <span className={`rounded-full border px-2 py-0.5 text-xs uppercase ${resultBadge(game.userResult)}`}>
                    {game.userResult}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {new Date(game.playedAt).toLocaleDateString()} • {game.timeClass} • {game.timeControl}
                </div>
              </button>
            ))}
            {games.length === 0 ? <div className="text-sm text-slate-400">No games were returned from Chess.com.</div> : null}
          </div>
          {loadMessage ? <div className="mt-3 text-xs text-rose-300">{loadMessage}</div> : null}
        </div>
      </div>

      <div className="space-y-4">
        {selectedGame ? (
          <>
            <ChessBoard game={boardGame} meColor={selectedGame.asColor} allowMoves={false} />
            <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setPly(0)}
                  className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-200 hover:border-primary/50"
                >
                  <SkipBack className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setPly((value) => Math.max(0, value - 1))}
                  className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-200 hover:border-primary/50"
                >
                  <StepBack className="h-3.5 w-3.5" />
                </button>
                <div className="rounded-lg border border-white/10 px-3 py-1 text-xs text-slate-300">
                  Move {ply} / {totalMoves}
                </div>
                <button
                  onClick={() => setPly((value) => Math.min(totalMoves, value + 1))}
                  className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-200 hover:border-primary/50"
                >
                  <StepForward className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setPly(totalMoves)}
                  className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-200 hover:border-primary/50"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={requestEval}
                  disabled={evaluating}
                  className="ml-auto inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-emerald-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {evaluating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Evaluate position
                </button>
              </div>
              <div className="mt-3 text-xs text-slate-400">{selectedGame.opening}</div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <MoveList moves={selectedGame.moves} />
              <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-slate-100">
                <div className="text-xs uppercase tracking-wide text-slate-400">Engine suggestion</div>
                <div className="mt-2 font-semibold text-white">{bestLineSan || bestLine || 'Run evaluation for this position'}</div>
                {evalScore ? <div className="mt-2 text-slate-300">Eval: {evalScore}</div> : null}
                <div className="mt-4 text-xs text-slate-400">Current FEN: {currentFen}</div>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-6 text-slate-300">
            No review game selected.
          </div>
        )}
      </div>
    </div>
  );
}
