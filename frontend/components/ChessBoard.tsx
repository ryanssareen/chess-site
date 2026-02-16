'use client';

import { Chess } from 'chess.js';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { GameState } from '@/types';

const DynamicBoard = dynamic(() => import('react-chessboard').then((m) => m.Chessboard), {
  ssr: false
});

interface Props {
  game: GameState;
  meColor: 'white' | 'black';
  allowMoves?: boolean;
  onMove?: (fen: string, san: string, move: { from: string; to: string; promotion?: string }) => void;
}

export function ChessBoard({ game, meColor, allowMoves = true, onMove }: Props) {
  const [chess, setChess] = useState(() => new Chess(game.fen));
  const socket = useMemo(() => (allowMoves && !onMove ? getSocket() : null), [allowMoves, onMove]);

  useEffect(() => {
    setChess(new Chess(game.fen));
  }, [game.fen]);

  const onDrop = (sourceSquare: string, targetSquare: string) => {
    if (!allowMoves) return false;
    const updated = new Chess(chess.fen());
    const move = updated.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    if (move) {
      if (onMove) {
        setChess(updated);
        onMove(updated.fen(), move.san, { from: sourceSquare, to: targetSquare, promotion: 'q' });
      } else {
        socket?.emit('move', { gameId: game.id, from: sourceSquare, to: targetSquare, promotion: 'q' });
        setChess(updated);
      }
      return true;
    }
    return false;
  };

  return (
    <div className="board-shadow overflow-hidden rounded-3xl border border-white/5 bg-slate-900/70 p-3">
      <DynamicBoard
        id={`board-${game.id}`}
        position={game.fen}
        boardOrientation={meColor}
        arePiecesDraggable={allowMoves}
        animationDuration={200}
        onPieceDrop={onDrop}
        customDarkSquareStyle={{ backgroundColor: '#b58863' }}
        customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
      />
    </div>
  );
}
