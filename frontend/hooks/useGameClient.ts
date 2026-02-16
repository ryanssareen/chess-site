'use client';

import { useEffect } from 'react';
import { create } from 'zustand';
import { getSocket } from '@/lib/socket';
import { GameState, Move } from '@/types';

interface GameStore {
  game?: GameState;
  setGame: (game: GameState) => void;
  addMove: (move: Move & { clocks: GameState['clocks']; lastMoveAt?: number }) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  game: undefined,
  setGame: (game) => set({ game }),
  addMove: (move) =>
    set((state) => {
      if (!state.game) return state;
      return {
        game: {
          ...state.game,
          moves: [...state.game.moves, move],
          fen: move.fen,
          turn: move.player === 'white' ? 'b' : 'w',
          clocks: move.clocks,
          lastMoveAt: move.lastMoveAt,
          pgn: `${state.game.pgn} ${move.san}`
        }
      };
    }),
  reset: () => set({ game: undefined })
}));

export function useGameSocket(gameId?: string, enabled = true) {
  const setGame = useGameStore((s) => s.setGame);
  const addMove = useGameStore((s) => s.addMove);
  const reset = useGameStore((s) => s.reset);

  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();

    const handlers = {
      game: (state: GameState) => setGame(state),
      move: (move: Move & { clocks: GameState['clocks']; lastMoveAt?: number }) => addMove(move)
    } as const;

    Object.entries(handlers).forEach(([event, handler]) => socket.on(event, handler as any));

    if (gameId) {
      socket.emit('joinGame', { gameId });
    }

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => socket.off(event, handler as any));
      if (gameId) {
        socket.emit('leaveGame', { gameId });
      }
      reset();
    };
  }, [gameId, addMove, enabled, reset, setGame]);
}
