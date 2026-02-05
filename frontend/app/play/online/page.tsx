'use client';

import { useEffect, useState } from 'react';
import { TIME_CONTROLS } from '@/lib/timeControls';
import { useGameSocket, useGameStore } from '@/hooks/useGameClient';
import { ChessBoard } from '@/components/ChessBoard';
import { MoveList } from '@/components/MoveList';
import { TimerBar } from '@/components/TimerBar';
import { GameHeader } from '@/components/GameHeader';
import { Loader2, Users } from 'lucide-react';
import { getSocket } from '@/lib/socket';

export default function OnlinePlayPage() {
  const [selected, setSelected] = useState(TIME_CONTROLS[2]);
  const [gameId, setGameId] = useState<string>();
  const [queueing, setQueueing] = useState(false);
  const game = useGameStore((s) => s.game);
  const [myColor, setMyColor] = useState<'white' | 'black'>('white');

  useGameSocket(gameId);

  useEffect(() => {
    // auto-join game if id present in query (future enhancement)
  }, []);

  const startQueue = async () => {
    setQueueing(true);
    const socket = getSocket();
    socket.emit('queue', { timeControl: selected.code, rated: true });
    socket.once('game', (g: any) => {
      setGameId(g.id);
      if (g.perspective) setMyColor(g.perspective);
      setQueueing(false);
    });
  };

  useEffect(() => {
    if (game) {
      setGameId(game.id);
      if (game.perspective) {
        setMyColor(game.perspective);
      } else if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem('auth');
        const me = raw ? JSON.parse(raw) : null;
        if (me?.id) {
          setMyColor(game.players.white.id === me.id ? 'white' : 'black');
        } else {
          setMyColor('white');
        }
      }
    }
  }, [game]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div>
        {!game && (
          <div className="rounded-3xl border border-white/5 bg-white/5 p-6 shadow-lg">
            <h1 className="text-2xl font-semibold text-white">Find a match</h1>
            <p className="mt-2 text-slate-300">
              Choose a time control and we'll pair you with someone near your rating.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
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
                  <div className="text-xs text-slate-400">Rated & Casual supported</div>
                </button>
              ))}
            </div>
            <button
              onClick={startQueue}
              disabled={queueing}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
            >
              {queueing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              {queueing ? 'Searching...' : 'Start matchmaking'}
            </button>
            <p className="mt-3 text-xs text-slate-400">You can leave anytime; we match on latency and rating.</p>
          </div>
        )}

        {game && (
          <div className="space-y-4">
            <GameHeader game={game} />
            <ChessBoard
              game={game}
              meColor={myColor}
              allowMoves={game.status === 'active'}
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
            <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-slate-200">
              {game.result ? `Result: ${game.result}` : 'Playing...'}
            </div>
          </>
        ) : (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-6 text-slate-300">
            Waiting for a game to start. Pick a time control and hit start!
          </div>
        )}
      </div>
    </div>
  );
}
