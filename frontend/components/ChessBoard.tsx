'use client';

import { Chess } from 'chess.js';
import dynamic from 'next/dynamic';
import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { GameState } from '@/types';

const DynamicBoard = dynamic(() => import('react-chessboard').then((m) => m.Chessboard), {
  ssr: false
});

const GLASS_DARK_SQUARE = { backgroundColor: 'rgba(30, 58, 138, 0.42)' };
const GLASS_LIGHT_SQUARE = { backgroundColor: 'rgba(248, 250, 252, 0.3)' };
const GLASS_DROP_SQUARE = {
  boxShadow: 'inset 0 0 0 4px rgba(16, 185, 129, 0.7)',
  backgroundColor: 'rgba(16, 185, 129, 0.2)'
};

function pieceRenderer(token: string) {
  const Piece = ({ squareWidth, isDragging }: { squareWidth: number; isDragging: boolean }) => (
    <img
      src={`https://images.chesscomfiles.com/chess-themes/pieces/classic/150/${token}.png`}
      alt={token}
      style={{
        width: squareWidth,
        height: squareWidth,
        objectFit: 'contain',
        opacity: isDragging ? 0.72 : 1,
        filter: 'drop-shadow(0 2px 2px rgba(0, 0, 0, 0.3))'
      }}
      draggable={false}
    />
  );
  Piece.displayName = `ClassicPiece_${token}`;
  return Piece;
}

const CLASSIC_PIECES = {
  wP: pieceRenderer('wp'),
  wN: pieceRenderer('wn'),
  wB: pieceRenderer('wb'),
  wR: pieceRenderer('wr'),
  wQ: pieceRenderer('wq'),
  wK: pieceRenderer('wk'),
  bP: pieceRenderer('bp'),
  bN: pieceRenderer('bn'),
  bB: pieceRenderer('bb'),
  bR: pieceRenderer('br'),
  bQ: pieceRenderer('bq'),
  bK: pieceRenderer('bk')
};

interface Props {
  game: GameState;
  meColor: 'white' | 'black';
  allowMoves?: boolean;
  onMove?: (fen: string, san: string, move: { from: string; to: string; promotion?: string }) => void;
}

export function ChessBoard({ game, meColor, allowMoves = true, onMove }: Props) {
  const [chess, setChess] = useState(() => new Chess(game.fen));
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const socket = useMemo(() => (allowMoves && !onMove ? getSocket() : null), [allowMoves, onMove]);

  useEffect(() => {
    setChess(new Chess(game.fen));
    setSelectedSquare(null);
  }, [game.fen]);

  const playMove = (sourceSquare: string, targetSquare: string) => {
    if (!allowMoves) return false;
    const updated = new Chess(chess.fen());

    let move = null;
    try {
      move = updated.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    } catch (_err) {
      return false;
    }

    if (!move) {
      return false;
    }

    if (onMove) {
      setChess(updated);
      onMove(updated.fen(), move.san, { from: sourceSquare, to: targetSquare, promotion: 'q' });
    } else {
      socket?.emit('move', { gameId: game.id, from: sourceSquare, to: targetSquare, promotion: 'q' });
      setChess(updated);
    }

    setSelectedSquare(null);
    return true;
  };

  const onDrop = (sourceSquare: string, targetSquare: string) => {
    return playMove(sourceSquare, targetSquare);
  };

  const onSquareClick = (square: string) => {
    if (!allowMoves) return;

    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }

      const moved = playMove(selectedSquare, square);
      if (moved) return;
    }

    const piece = chess.get(square as any);
    if (piece && piece.color === chess.turn()) {
      setSelectedSquare(square);
    } else {
      setSelectedSquare(null);
    }
  };

  const customSquareStyles = useMemo(() => {
    const styles: Record<string, CSSProperties> = {};
    if (!selectedSquare) return styles;

    styles[selectedSquare] = {
      boxShadow: 'inset 0 0 0 3px rgba(16, 185, 129, 0.9)',
      backgroundImage: 'radial-gradient(circle at center, rgba(16, 185, 129, 0.35), rgba(16, 185, 129, 0.05))'
    };

    try {
      const legalMoves = chess.moves({ square: selectedSquare as any, verbose: true }) as Array<{ to: string }>;
      legalMoves.forEach((move) => {
        styles[move.to] = {
          backgroundImage:
            'radial-gradient(circle at center, rgba(250, 204, 21, 0.65) 0%, rgba(250, 204, 21, 0.28) 20%, transparent 22%)'
        };
      });
    } catch (_err) {
      return styles;
    }

    return styles;
  }, [chess, selectedSquare]);

  return (
    <div className="board-shadow overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-white/20 via-slate-300/10 to-sky-500/10 p-3 backdrop-blur-md">
      <DynamicBoard
        id={`board-${game.id}`}
        position={game.fen}
        boardOrientation={meColor}
        arePiecesDraggable={allowMoves}
        animationDuration={200}
        onPieceDrop={onDrop}
        onSquareClick={(square) => onSquareClick(square)}
        snapToCursor={true}
        customPieces={CLASSIC_PIECES}
        customSquareStyles={customSquareStyles}
        customBoardStyle={{ borderRadius: '18px', overflow: 'hidden' }}
        customNotationStyle={{ color: 'rgba(255, 255, 255, 0.92)', fontWeight: 600 }}
        customDropSquareStyle={GLASS_DROP_SQUARE}
        customDarkSquareStyle={GLASS_DARK_SQUARE}
        customLightSquareStyle={GLASS_LIGHT_SQUARE}
      />
    </div>
  );
}
