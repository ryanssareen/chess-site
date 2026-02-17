'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import { StockfishClient } from '@/lib/stockfish';

const LEVELS = [1, 2, 4, 6, 8, 10];
const FRONTEND_ONLY = isFrontendOnlyMode();

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

export default function AIPlayPage() {
  const { user, loading } = useAuth();
  const [selected, setSelected] = useState(TIME_CONTROLS[3]);
  const [level, setLevel] = useState(4);
  const [gameId, setGameId] = useState<string>();
  const [status, setStatus] = useState<string>('');
  const [starting, setStarting] = useState(false);
  const [localGame, setLocalGame] = useState<GameState>();
  const [savedLocalGames, setSavedLocalGames] = useState<string[]>([]);
  const [engineReady, setEngineReady] = useState(!FRONTEND_ONLY);
  const [engineError, setEngineError] = useState<string>('');
  const [engineSource, setEngineSource] = useState<string>('');
  const [aiThinking, setAiThinking] = useState(false);
  const socketGame = useGameStore((s) => s.game);
  const game = useMemo(() => (FRONTEND_ONLY ? localGame : socketGame), [localGame, socketGame]);

  const engineRef = useRef<StockfishClient | null>(null);
  const aiThinkingRef = useRef(false);
  const levelRef = useRef(level);

  useGameSocket(gameId, Boolean(user) && !FRONTEND_ONLY);

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

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
        const message = err instanceof Error ? err.message : 'Failed to initialize Stockfish';
        setEngineError(message);
      });

    return () => {
      active = false;
      aiThinkingRef.current = false;
      engine.destroy();
      if (engineRef.current === engine) {
        engineRef.current = null;
      }
    };
  }, []);

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

  useEffect(() => {
    if (!FRONTEND_ONLY || !game || game.status !== 'active' || game.turn !== 'b') return;
    if (!engineReady || engineError) return;
    if (aiThinkingRef.current) return;
    if (!engineRef.current) return;

    const expectedFen = game.fen;
    const engine = engineRef.current;
    let active = true;
    aiThinkingRef.current = true;
    setAiThinking(true);

    engine
      .bestMove(expectedFen, levelRef.current)
      .then((bestMove) => {
        if (!active) return;

        setLocalGame((current) => {
          if (!current || current.status !== 'active' || current.turn !== 'b' || current.fen !== expectedFen) {
            return current;
          }

          const board = new Chess(current.fen);
          const aiPlayed = board.move({
            from: bestMove.from,
            to: bestMove.to,
            promotion: bestMove.promotion || 'q'
          });
          if (!aiPlayed) return current;

          const updated: GameState = {
            ...current,
            fen: board.fen(),
            pgn: board.pgn(),
            turn: board.turn(),
            lastMoveAt: Date.now(),
            moves: [
              ...current.moves,
              {
                san: aiPlayed.san,
                from: aiPlayed.from,
                to: aiPlayed.to,
                fen: board.fen(),
                moveNumber: current.moves.length + 1,
                player: aiPlayed.color === 'w' ? 'white' : 'black'
              }
            ]
          };

          const result = finishedResult(board);
          if (result) {
            return { ...updated, status: 'finished', result };
          }

          return updated;
        });
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Stockfish failed to generate a move';
        setStatus(message);
      })
      .finally(() => {
        aiThinkingRef.current = false;
        if (!active) return;
        setAiThinking(false);
      });

    return () => {
      active = false;
    };
  }, [engineError, engineReady, game]);

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
      if (!current || current.status !== 'active' || current.turn !== 'w') return current;

      const board = new Chess(current.fen);
      const played = board.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
      if (!played) return current;

      const updated: GameState = {
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

      const result = finishedResult(board);
      if (result) {
        return { ...updated, status: 'finished', result };
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
                Stockfish.js runs in-browser for frontend-only mode. No backend is required.
              </p>
            ) : null}
            {!engineReady && FRONTEND_ONLY && !engineError ? (
              <p className="mt-2 text-xs text-slate-300">Loading Stockfish engine...</p>
            ) : null}
            {engineError ? <p className="mt-2 text-xs text-rose-300">Stockfish error: {engineError}</p> : null}
            {engineReady && engineSource ? (
              <p className="mt-2 break-all text-xs text-slate-400">Engine source: {engineSource}</p>
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
              disabled={starting || (FRONTEND_ONLY && (!engineReady || Boolean(engineError)))}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
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
              allowMoves={
                game.status === 'active' && (!FRONTEND_ONLY || (game.turn === 'w' && !aiThinking && !engineError))
              }
              onMove={FRONTEND_ONLY ? handleLocalMove : undefined}
            />
            {FRONTEND_ONLY && game.status === 'active' && game.turn === 'b' ? (
              <div className="rounded-2xl border border-white/5 bg-white/5 p-3 text-xs text-slate-300">
                {aiThinking ? 'Stockfish is thinking...' : 'Waiting for Stockfish response...'}
              </div>
            ) : null}
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
