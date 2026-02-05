import { Chess } from 'chess.js';
import { nanoid } from 'nanoid';
import { prisma } from '../db';
import { InMemoryGame, TimeControl } from '../types';
import { updateElo } from './rating';
import { engine } from './chessEngine';

const games = new Map<string, InMemoryGame>();
const boards = new Map<string, Chess>();
const queues = new Map<string, { player: { id: string; username: string; rating: number } }>();

export function parseTimeControl(code: string): TimeControl {
  const [initial, inc] = code.split('+').map(Number);
  const base = Number.isFinite(initial) ? initial : 3;
  const increment = Number.isFinite(inc) ? inc : 0;
  return {
    code,
    initial: base * 60,
    increment,
    label: `${base}+${increment}`
  };
}

export function getGame(gameId: string) {
  return games.get(gameId);
}

export function createGame(
  white: { id: string; username: string; rating: number },
  black: { id: string; username: string; rating: number },
  timeControlCode: string,
  rated: boolean
) {
  const id = nanoid();
  const chess = new Chess();
  const tc = parseTimeControl(timeControlCode);
  const game: InMemoryGame = {
    id,
    white,
    black,
    timeControl: tc,
    rated,
    fen: chess.fen(),
    pgn: '',
    moves: [],
    turn: 'w',
    clocks: { white: tc.initial * 1000, black: tc.initial * 1000 },
    lastMoveAt: Date.now(),
    status: 'active'
  };
  games.set(id, game);
  boards.set(id, chess);
  return game;
}

export async function queuePlayer(
  player: { id: string; username: string; rating: number },
  timeControl: string,
  rated: boolean
): Promise<{ matched: boolean; game?: InMemoryGame }> {
  const existing = queues.get(timeControl);
  if (existing) {
    queues.delete(timeControl);
    const whiteFirst = Math.random() > 0.5;
    const game = createGame(whiteFirst ? player : existing.player, whiteFirst ? existing.player : player, timeControl, rated);
    return { matched: true, game };
  }
  queues.set(timeControl, { player });
  return { matched: false };
}

export async function createAIGame(
  player: { id: string; username: string; rating: number },
  timeControl: string,
  level: number
) {
  const ai = { id: 'ai', username: `Stockfish ${level}`, rating: 2600 };
  const game = createGame(player, ai, timeControl, false);
  // Immediately make AI weaker by setting skill level via rating maybe not needed
  return game;
}

export async function handleMove(
  gameId: string,
  move: { from: string; to: string; promotion?: string },
  playerId: string
): Promise<{ game?: InMemoryGame; error?: string; aiMove?: any }> {
  const game = games.get(gameId);
  const board = boards.get(gameId);
  if (!game || !board) return { error: 'Game not found' };
  if (game.status !== 'active') return { error: 'Game finished' };
  const turnColor = game.turn === 'w' ? 'white' : 'black';
  const playerColor = game.white.id === playerId ? 'white' : game.black.id === playerId ? 'black' : undefined;
  if (!playerColor) return { error: 'Not a participant' };
  if (turnColor !== playerColor) return { error: "Not your turn" };

  const now = Date.now();
  const elapsed = now - game.lastMoveAt;
  const clockKey = turnColor as 'white' | 'black';
  game.clocks[clockKey] -= elapsed;
  if (game.clocks[clockKey] <= 0) {
    game.status = 'finished';
    game.result = clockKey === 'white' ? '0-1 (time)' : '1-0 (time)';
    await persistGame(game);
    boards.delete(gameId);
    games.set(gameId, game);
    return { game };
  }

  const result = board.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
  if (!result) return { error: 'Illegal move' };

  game.moves.push({
    san: result.san,
    from: result.from,
    to: result.to,
    fen: board.fen(),
    moveNumber: board.history().length,
    player: turnColor
  });
  game.fen = board.fen();
  game.turn = board.turn();
  game.pgn = board.pgn();
  game.lastMoveAt = now;
  const incMs = game.timeControl.increment * 1000;
  game.clocks[clockKey] += incMs;

  if (board.isGameOver()) {
    game.status = 'finished';
    if (board.isCheckmate()) {
      game.result = turnColor === 'white' ? '1-0' : '0-1';
    } else if (board.isDraw()) {
      game.result = '1/2-1/2';
    }
    await persistGame(game);
    boards.delete(gameId);
    games.set(gameId, game);
  }

  let aiMove;
  if (game.black.id === 'ai' || game.white.id === 'ai') {
    const aiColor = game.black.id === 'ai' ? 'b' : 'w';
    if (board.turn() === aiColor && !board.isGameOver()) {
      aiMove = await makeAIMove(gameId);
    }
  }

  return { game, aiMove };
}

async function makeAIMove(gameId: string) {
  const game = games.get(gameId);
  const board = boards.get(gameId);
  if (!game || !board) return null;
  const fen = board.fen();
  const { move } = await engine.bestMove(fen, 10);
  if (!move) return null;
  const from = move.slice(0, 2);
  const to = move.slice(2, 4);
  const promotion = move.slice(4) || 'q';
  return handleMove(gameId, { from, to, promotion }, game.black.id === 'ai' ? game.black.id : game.white.id);
}

async function persistGame(game: InMemoryGame) {
  const skipPersist =
    !game.white.id ||
    !game.black.id ||
    game.white.id.startsWith('guest') ||
    game.black.id.startsWith('guest') ||
    game.white.id === 'ai' ||
    game.black.id === 'ai';
  if (skipPersist) return;
  try {
    await prisma.game.create({
      data: {
        id: game.id,
        whiteId: game.white.id,
        blackId: game.black.id,
        timeControl: game.timeControl.code,
        rated: game.rated,
        result: game.result || '1/2-1/2',
        pgn: game.pgn,
        moves: {
          create: game.moves.map((m, idx) => ({
            san: m.san,
            from: m.from,
            to: m.to,
            fen: m.fen,
            ply: idx + 1
          }))
        }
      }
    });

    if (game.rated) {
      const scoreWhite = game.result?.startsWith('1-0') ? 1 : game.result === '1/2-1/2' ? 0.5 : 0;
      const { newA, newB } = updateElo(game.white.rating, game.black.rating, scoreWhite);
      await prisma.user.update({ where: { id: game.white.id }, data: { rating: newA } });
      await prisma.user.update({ where: { id: game.black.id }, data: { rating: newB } });
    }
  } catch (err) {
    console.error('Persist game failed', err);
  }
}
