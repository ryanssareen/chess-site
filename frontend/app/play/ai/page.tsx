'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Chess } from 'chess.js';
import { TIME_CONTROLS } from '@/lib/timeControls';
import { appendLocalTrainingHistory, createAIGame, isFrontendOnlyMode } from '@/lib/api';
import { useGameSocket, useGameStore } from '@/hooks/useGameClient';
import { ChessBoard } from '@/components/ChessBoard';
import { MoveList } from '@/components/MoveList';
import { TimerBar } from '@/components/TimerBar';
import { GameHeader } from '@/components/GameHeader';
import { Cpu, Loader2, Play } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { GameState } from '@/types';

const LEVELS = [1, 2, 4, 6, 8, 10];
const FRONTEND_ONLY = isFrontendOnlyMode();
const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0
};

type VerboseMove = {
  from: string;
  to: string;
  promotion?: string;
  san: string;
  color: 'w' | 'b';
  flags: string;
};

function finishedResult(board: Chess) {
  if (!board.isGameOver()) return undefined;
  if (board.isCheckmate()) {
    return board.turn() === 'w' ? '0-1' : '1-0';
  }
  if (board.isDraw()) {
    return '1/2-1/2';
  }
  return '1/2-1/2';
}

function terminalScore(board: Chess, aiColor: 'w' | 'b', depth: number) {
  if (board.isCheckmate()) {
    return board.turn() === aiColor ? -100000 - depth : 100000 + depth;
  }
  if (board.isDraw()) return 0;
  return null;
}

function evaluateBoard(board: Chess, aiColor: 'w' | 'b') {
  const rows = board.board();
  let score = 0;

  rows.forEach((row) => {
    row.forEach((piece) => {
      if (!piece) return;
      const value = PIECE_VALUES[piece.type] || 0;
      score += piece.color === aiColor ? value : -value;
    });
  });

  const mobility = board.moves().length;
  score += board.turn() === aiColor ? mobility : -mobility;
  return score;
}

function tacticalWeight(move: VerboseMove) {
  let weight = 0;
  if (move.flags.includes('c') || move.flags.includes('e')) weight += 30;
  if (move.flags.includes('p')) weight += 20;
  if (move.san.includes('+')) weight += 10;
  if (move.san.includes('#')) weight += 1000;
  return weight;
}

function orderMoves(moves: VerboseMove[]) {
  return [...moves].sort((a, b) => tacticalWeight(b) - tacticalWeight(a));
}

function minimax(
  board: Chess,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  aiColor: 'w' | 'b'
): number {
  const terminal = terminalScore(board, aiColor, depth);
  if (terminal !== null) return terminal;
  if (depth === 0) return evaluateBoard(board, aiColor);

  const legalMoves = orderMoves(board.moves({ verbose: true }) as unknown as VerboseMove[]);
  if (legalMoves.length === 0) return evaluateBoard(board, aiColor);

  if (maximizing) {
    let best = -Infinity;
    for (const move of legalMoves) {
      board.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
      const score = minimax(board, depth - 1, alpha, beta, false, aiColor);
      board.undo();
      if (score > best) best = score;
      if (score > alpha) alpha = score;
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const move of legalMoves) {
    board.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
    const score = minimax(board, depth - 1, alpha, beta, true, aiColor);
    board.undo();
    if (score < best) best = score;
    if (score < beta) beta = score;
    if (beta <= alpha) break;
  }
  return best;
}

function searchAIMove(board: Chess, level: number, aiColor: 'w' | 'b') {
  const legalMoves = orderMoves(board.moves({ verbose: true }) as unknown as VerboseMove[]);
  if (legalMoves.length === 0) return null;

  if (level <= 2) {
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  const depth = level >= 10 ? 4 : level >= 8 ? 3 : level >= 6 ? 3 : level >= 4 ? 2 : 1;
  let bestScore = -Infinity;
  let bestMoves: VerboseMove[] = [];

  for (const move of legalMoves) {
    board.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
    const score = minimax(board, depth - 1, -Infinity, Infinity, false, aiColor);
    board.undo();

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  if (bestMoves.length === 0) {
    return legalMoves[0];
  }

  if (level <= 4) {
    const topSlice = bestMoves.slice(0, Math.min(3, bestMoves.length));
    return topSlice[Math.floor(Math.random() * topSlice.length)];
  }

  return bestMoves[0];
}

export default function AIPlayPage() {
  const { user, loading } = useAuth();
  const [selected, setSelected] = useState(TIME_CONTROLS[3]);
  const [level, setLevel] = useState(4);
  const [gameId, setGameId] = useState<string>();
  const [status, setStatus] = useState<string>('');
  const [starting, setStarting] = useState(false);
  const [localGame, setLocalGame] = useState<GameState>();
  const [savedLocalGames, setSavedLocalGames] = useState<string[]>([]);
  const socketGame = useGameStore((s) => s.game);
  const game = useMemo(() => (FRONTEND_ONLY ? localGame : socketGame), [localGame, socketGame]);

  useGameSocket(gameId, Boolean(user) && !FRONTEND_ONLY);

  useEffect(() => {
    if (!FRONTEND_ONLY || !game || game.status !== 'finished' || !user) return;
    if (savedLocalGames.includes(game.id)) return;

    appendLocalTrainingHistory({
      id: game.id,
      result: game.result || '1/2-1/2',
      createdAt: new Date().toISOString(),
      players: {
        white: { username: game.players.white.username },
        black: { username: game.players.black.username }
      },
      perspective: game.perspective || 'white'
    });
    setSavedLocalGames((current) => [...current, game.id]);
  }, [game, savedLocalGames, user]);

  const startGame = async () => {
    setStatus('');
    setStarting(true);
    try {
      const res = await createAIGame(level, selected.code);
      if (FRONTEND_ONLY) {
        setLocalGame(res);
      } else {
        setGameId(res.id);
      }
    } catch (err: any) {
      setStatus(err?.response?.data?.message || err?.message || 'Failed to start game');
    } finally {
      setStarting(false);
    }
  };

  const handleLocalMove = (_fen: string, _san: string, move: { from: string; to: string; promotion?: string }) => {
    if (!FRONTEND_ONLY) return;

    setLocalGame((current) => {
      if (!current || current.status !== 'active') return current;

      const board = new Chess(current.fen);
      const played = board.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
      if (!played) return current;

      let updated: GameState = {
        ...current,
        fen: board.fen(),
        pgn: board.pgn(),
        turn: board.turn(),
        lastMoveAt: Date.now(),
        moves: [
          ...current.moves,
          {
            san: played.san,
            from: played.from,
            to: played.to,
            fen: board.fen(),
            moveNumber: current.moves.length + 1,
            player: played.color === 'w' ? 'white' : 'black'
          }
        ]
      };

      const firstResult = finishedResult(board);
      if (firstResult) {
        return { ...updated, status: 'finished', result: firstResult };
      }

      if (board.turn() !== 'b') return updated;

      const aiChoice = searchAIMove(board, level, 'b');
      if (!aiChoice) {
        return { ...updated, status: 'finished', result: '1/2-1/2' };
      }

      const aiPlayed = board.move({
        from: aiChoice.from,
        to: aiChoice.to,
        promotion: aiChoice.promotion || 'q'
      });
      if (!aiPlayed) return updated;

      updated = {
        ...updated,
        fen: board.fen(),
        pgn: board.pgn(),
        turn: board.turn(),
        lastMoveAt: Date.now(),
        moves: [
          ...updated.moves,
          {
            san: aiPlayed.san,
            from: aiPlayed.from,
            to: aiPlayed.to,
            fen: board.fen(),
            moveNumber: updated.moves.length + 1,
            player: aiPlayed.color === 'w' ? 'white' : 'black'
          }
        ]
      };

      const secondResult = finishedResult(board);
      if (secondResult) {
        return { ...updated, status: 'finished', result: secondResult };
      }

      return updated;
    });
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
        <p className="mt-2 text-sm text-slate-300">Login first to start training and save your local progress.</p>
        <Link
          href="/auth"
          className="mt-4 inline-flex rounded-lg bg-gradient-to-r from-primary to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-glow"
        >
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div>
        {!game && (
          <div className="rounded-3xl border border-white/5 bg-white/5 p-6 shadow-lg">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Cpu size={18} /> Train vs Stockfish
            </div>
            <p className="mt-2 text-slate-300">
              Choose a difficulty and time control, then practice openings, tactics, and endgames.
            </p>
            {FRONTEND_ONLY ? (
              <p className="mt-2 text-xs text-amber-300">
                Frontend-only mode is active. A local minimax engine is used while backend is offline.
              </p>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {TIME_CONTROLS.map((tc) => (
                <button
                  key={tc.code}
                  onClick={() => setSelected(tc)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    tc.code === selected.code
                      ? 'border-primary/60 bg-primary/10 text-white shadow-glow'
                      : 'border-white/5 bg-white/5 text-slate-200 hover:border-primary/40'
                  }`}
                >
                  <div className="text-sm font-semibold">{tc.label}</div>
                  <div className="text-xs text-slate-400">Ideal for drills</div>
                </button>
              ))}
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between text-sm text-slate-200">
                <span>Difficulty</span>
                <span className="font-semibold text-primary">Level {level}</span>
              </div>
              <div className="mt-3 grid grid-cols-6 gap-2">
                {LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setLevel(lvl)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                      lvl === level
                        ? 'border-primary/70 bg-primary/20 text-white'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:border-primary/40'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={startGame}
              disabled={starting}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-glow"
            >
              {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Start training game
            </button>
            {status ? <div className="mt-3 text-xs text-rose-300">{status}</div> : null}
          </div>
        )}

        {game && (
          <div className="space-y-4">
            <GameHeader game={game} />
            <ChessBoard
              game={game}
              meColor={game.perspective || 'white'}
              allowMoves={game.status === 'active'}
              onMove={FRONTEND_ONLY ? handleLocalMove : undefined}
            />
          </div>
        )}
      </div>

      <div className="space-y-4">
        {game ? (
          <>
            <TimerBar value={game.clocks.white} active={game.turn === 'w'} lastMoveAt={game.lastMoveAt} />
            <TimerBar value={game.clocks.black} active={game.turn === 'b'} lastMoveAt={game.lastMoveAt} />
            <MoveList moves={game.moves} />
            {game.result ? (
              <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-slate-100">
                Result: {game.result}
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-6 text-slate-300">
            Launch a game to see the live board, clocks, and move explorer.
          </div>
        )}
      </div>
    </div>
  );
}
