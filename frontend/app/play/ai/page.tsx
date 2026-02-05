'use client';

import { useState } from 'react';
import { TIME_CONTROLS } from '@/lib/timeControls';
import { createAIGame } from '@/lib/api';
import { useGameSocket, useGameStore } from '@/hooks/useGameClient';
import { ChessBoard } from '@/components/ChessBoard';
import { MoveList } from '@/components/MoveList';
import { TimerBar } from '@/components/TimerBar';
import { GameHeader } from '@/components/GameHeader';
import { Cpu, Play } from 'lucide-react';

const LEVELS = [1, 2, 4, 6, 8, 10];

export default function AIPlayPage() {
  const [selected, setSelected] = useState(TIME_CONTROLS[3]);
  const [level, setLevel] = useState(4);
  const [gameId, setGameId] = useState<string>();
  const game = useGameStore((s) => s.game);

  useGameSocket(gameId);

  const startGame = async () => {
    const res = await createAIGame(level, selected.code);
    setGameId(res.id);
  };

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
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-glow"
            >
              <Play className="h-4 w-4" /> Start training game
            </button>
          </div>
        )}

        {game && (
          <div className="space-y-4">
            <GameHeader game={game} />
            <ChessBoard game={game} meColor={game.perspective || 'white'} allowMoves />
          </div>
        )}
      </div>

      <div className="space-y-4">
        {game ? (
          <>
            <TimerBar value={game.clocks.white} active={game.turn === 'w'} lastMoveAt={game.lastMoveAt} />
            <TimerBar value={game.clocks.black} active={game.turn === 'b'} lastMoveAt={game.lastMoveAt} />
            <MoveList moves={game.moves} />
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
