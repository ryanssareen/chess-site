'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChessBoard } from '@/components/ChessBoard';
import { MoveList } from '@/components/MoveList';
import { EvalBar } from '@/components/EvalBar';
import { GameState, ReviewGame } from '@/types';
import { api, fetchReviewGames, isFrontendOnlyMode } from '@/lib/api';
import { LineChart, Loader2, RefreshCcw, SkipBack, SkipForward, StepBack, StepForward } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Chess } from 'chess.js';
import { StockfishClient } from '@/lib/stockfish';

const FRONTEND_ONLY = isFrontendOnlyMode();
const START_FEN = new Chess().fen();

function resultBadge(result: ReviewGame['userResult']) {
  if (result === 'win') return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  if (result === 'draw') return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
}

function uciLineToSanLine(startFen: string, line: string) {
  if (!line) return '';

  const board = new Chess(startFen);
  const sanMoves: string[] = [];

  for (const rawMove of line.split(/\s+/).filter(Boolean)) {
    const match = rawMove.match(/^([a-h][1-8])([a-h][1-8])([qrbn])?$/);
    if (!match) break;

    try {
      const move = board.move({
        from: match[1],
        to: match[2],
        promotion: (match[3] as 'q' | 'r' | 'b' | 'n' | undefined) || 'q'
      });
      if (!move) break;
      sanMoves.push(move.san);
    } catch (_err) {
      break;
    }
  }

  return sanMoves.join(' ');
}

function invertScore(score: string) {
  const trimmed = (score || '').trim();
  if (!trimmed) return '0.00';

  if (trimmed.includes('M')) {
    const sign = trimmed.startsWith('-') ? -1 : 1;
    const abs = trimmed.replace(/^[+-]/, '');
    return `${sign > 0 ? '-' : ''}${abs}`;
  }

  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return '0.00';
  return (-numeric).toFixed(2);
}

function scoreToWhitePerspective(score: string, sideToMove: 'w' | 'b') {
  return sideToMove === 'w' ? score : invertScore(score);
}

function scoreToCp(score: string) {
  const trimmed = (score || '').trim();
  if (!trimmed) return 0;

  if (trimmed.includes('M')) {
    const sign = trimmed.startsWith('-') ? -1 : 1;
    return sign * 10000;
  }

  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100);
}

function formatPawnDelta(cp: number) {
  return Math.abs(cp / 100).toFixed(2);
}

function normalizeUci(from: string, to: string, san: string) {
  const promotionMatch = san.match(/=([QRBN])/i);
  const promo = promotionMatch?.[1]?.toLowerCase() || '';
  return `${from}${to}${promo}`;
}

export default function AnalysisPage() {
  const { user, loading } = useAuth();
  const [games, setGames] = useState<ReviewGame[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [loadMessage, setLoadMessage] = useState('');
  const [reviewUsername, setReviewUsername] = useState('');
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [ply, setPly] = useState(0);
  const [bestLine, setBestLine] = useState('');
  const [bestLineSan, setBestLineSan] = useState('');
  const [evalScore, setEvalScore] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [coachAdvice, setCoachAdvice] = useState('Select a game and move to get coach advice.');
  const [coachLoading, setCoachLoading] = useState(false);
  const [engineReady, setEngineReady] = useState(!FRONTEND_ONLY);
  const [engineError, setEngineError] = useState('');
  const [engineSource, setEngineSource] = useState('');

  const engineRef = useRef<StockfishClient | null>(null);

  useEffect(() => {
    if (!FRONTEND_ONLY) return;

    const engine = new StockfishClient();
    engineRef.current = engine;
    let active = true;

    engine
      .readyState()
      .then(() => {
        if (!active) return;
        setEngineReady(true);
        setEngineSource(engine.getWorkerUrl());
      })
      .catch((err: unknown) => {
        if (!active) return;
        setEngineError(err instanceof Error ? err.message : 'Failed to initialize Stockfish');
      });

    return () => {
      active = false;
      engine.destroy();
      if (engineRef.current === engine) {
        engineRef.current = null;
      }
    };
  }, []);

  const loadGames = useCallback(async () => {
    setLoadingGames(true);
    setLoadMessage('');
    try {
      const payload = await fetchReviewGames(16);
      setReviewUsername(payload.username || '');
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
    setCoachAdvice('Step through the game to get coach advice for each position.');
    setCoachLoading(false);
  }, [selectedGameId]);

  const selectedGame = useMemo(
    () => games.find((game) => game.id === selectedGameId) || games[0],
    [games, selectedGameId]
  );
  const totalMoves = selectedGame?.moves.length || 0;
  const currentFen = selectedGame ? (ply > 0 ? selectedGame.moves[ply - 1]?.fen || START_FEN : START_FEN) : START_FEN;
  const visibleMoves = useMemo(() => (selectedGame ? selectedGame.moves.slice(0, ply) : []), [selectedGame, ply]);

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

  useEffect(() => {
    if (!selectedGame) return;

    const upcomingMove = selectedGame.moves[ply];
    if (!upcomingMove) {
      setCoachLoading(false);
      setCoachAdvice('End of game reached. Step back one move to get advice for a played move.');
      return;
    }

    if (!FRONTEND_ONLY) {
      setCoachLoading(false);
      setCoachAdvice('Click "Evaluate position" to fetch coach advice from engine analysis.');
      return;
    }

    if (!engineReady || !engineRef.current) {
      setCoachLoading(false);
      setCoachAdvice(engineError || 'Loading Stockfish for coach advice...');
      return;
    }

    let active = true;
    setCoachLoading(true);

    const mover = boardGame.turn;
    const nextTurn = mover === 'w' ? 'b' : 'w';
    const playedUci = normalizeUci(upcomingMove.from, upcomingMove.to, upcomingMove.san);

    (async () => {
      try {
        const currentEval = await engineRef.current!.evaluatePosition(currentFen, 14);
        if (!active) return;

        const rawCurrentScore = currentEval.score || '0.00';
        const currentWhiteScore = scoreToWhitePerspective(rawCurrentScore, mover);
        const bestUci = (currentEval.bestLineUci || '').split(/\s+/).filter(Boolean)[0] || currentEval.bestMove?.uci || '';
        const bestLineSanText = uciLineToSanLine(currentFen, currentEval.bestLineUci || '');

        setEvalScore(currentWhiteScore);
        setBestLine(currentEval.bestLineUci || bestUci || '');
        setBestLineSan(bestLineSanText);

        const afterEval = await engineRef.current!.evaluatePosition(upcomingMove.fen, 12);
        if (!active) return;

        const afterWhiteScore = scoreToWhitePerspective(afterEval.score || '0.00', nextTurn);
        const whiteDeltaCp = scoreToCp(afterWhiteScore) - scoreToCp(currentWhiteScore);
        const moverDeltaCp = mover === 'w' ? whiteDeltaCp : -whiteDeltaCp;
        const matchedTopMove = Boolean(bestUci) && bestUci.startsWith(playedUci);
        const bestHint = bestLineSanText || bestUci || 'the top Stockfish move';

        if (matchedTopMove) {
          setCoachAdvice(`Coach: Great move. ${upcomingMove.san} matches Stockfish's top line (${bestHint}).`);
          return;
        }

        if (moverDeltaCp <= -200) {
          setCoachAdvice(
            `Coach: ${upcomingMove.san} is a major mistake (about ${formatPawnDelta(moverDeltaCp)} pawns lost). Stockfish preferred ${bestHint}.`
          );
          return;
        }

        if (moverDeltaCp <= -80) {
          setCoachAdvice(
            `Coach: ${upcomingMove.san} is an inaccuracy (about ${formatPawnDelta(moverDeltaCp)} pawns lost). Stronger was ${bestHint}.`
          );
          return;
        }

        if (moverDeltaCp >= 80) {
          setCoachAdvice(`Coach: Nice practical move ${upcomingMove.san}. It improved your position by about ${formatPawnDelta(moverDeltaCp)} pawns.`);
          return;
        }

        setCoachAdvice(`Coach: ${upcomingMove.san} is playable. Stockfish still prefers ${bestHint}.`);
      } catch (err: any) {
        if (!active) return;
        setCoachAdvice(err?.message || 'Coach advice unavailable for this position.');
      } finally {
        if (!active) return;
        setCoachLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [boardGame.turn, currentFen, engineError, engineReady, ply, selectedGame]);

  const requestEval = async () => {
    if (!selectedGame) return;
    setEvaluating(true);
    setBestLine('');
    setBestLineSan('');
    setEvalScore('');

    if (FRONTEND_ONLY) {
      if (!engineReady || !engineRef.current) {
        setBestLine(engineError || 'Stockfish engine is still loading');
        setEvaluating(false);
        return;
      }

      try {
        const result = await engineRef.current.evaluatePosition(currentFen, 16);
        const sanLine = uciLineToSanLine(currentFen, result.bestLineUci);
        setBestLine(result.bestLineUci || (result.bestMove?.uci || 'No line returned'));
        setBestLineSan(sanLine || '');
        setEvalScore(scoreToWhitePerspective(result.score || '0.00', boardGame.turn));
      } catch (err: any) {
        setBestLine(err?.message || 'Evaluation failed for this position');
        setBestLineSan('');
        setEvalScore('');
      } finally {
        setEvaluating(false);
      }
      return;
    }

    try {
      const res = await api.post('/analysis/evaluate', { fen: currentFen, depth: 14 });
      setBestLine(res.data.bestLine);
      setBestLineSan(res.data.bestLineSan || '');
      setEvalScore(scoreToWhitePerspective(res.data.score || '0.00', boardGame.turn));
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
          <p className="mt-2 text-xs text-slate-400">
            Recent real games for username: {reviewUsername || user?.username || 'training-user'}
          </p>
          {FRONTEND_ONLY && !engineReady && !engineError ? (
            <p className="mt-2 text-xs text-slate-400">Loading Stockfish engine...</p>
          ) : null}
          {engineError ? <p className="mt-2 text-xs text-rose-300">Stockfish error: {engineError}</p> : null}
          {engineReady && engineSource ? (
            <p className="mt-2 break-all text-xs text-slate-500">Engine source: {engineSource}</p>
          ) : null}
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
            <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
              <EvalBar score={evalScore} perspective={selectedGame.asColor} />
              <ChessBoard game={boardGame} meColor={selectedGame.asColor} allowMoves={false} />
            </div>
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
                  disabled={evaluating || (FRONTEND_ONLY && !engineReady)}
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
                <div className="text-xs uppercase tracking-wide text-slate-400">Coach advice</div>
                {coachLoading ? (
                  <div className="mt-2 inline-flex items-center gap-2 text-slate-300">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Analyzing this position...
                  </div>
                ) : (
                  <div className="mt-2 text-slate-100">{coachAdvice}</div>
                )}
                <div className="mt-4 text-xs uppercase tracking-wide text-slate-400">Engine suggestion</div>
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
