import { Chess } from 'chess.js';
import { config } from '../config';

type ChessComApiGame = {
  url?: string;
  pgn: string;
  end_time?: number;
  time_class?: string;
  time_control?: string;
  white: { username: string; rating: number; result: string };
  black: { username: string; rating: number; result: string };
};

type ReviewMove = {
  san: string;
  from: string;
  to: string;
  fen: string;
  moveNumber: number;
  player: 'white' | 'black';
};

export type ReviewGame = {
  id: string;
  url?: string;
  playedAt: string;
  opponent: string;
  asColor: 'white' | 'black';
  userResult: 'win' | 'draw' | 'loss';
  resultTag: string;
  timeClass: string;
  timeControl: string;
  opening: string;
  moves: ReviewMove[];
  pgn: string;
};

const REVIEW_CACHE_TTL_MS = 5 * 60 * 1000;
let reviewCache: ReviewGame[] = [];
let reviewCacheAt = 0;

const normalize = (value: string) => value.trim().toLowerCase();

const resultFromCode = (code: string): 'win' | 'draw' | 'loss' => {
  if (code === 'win') return 'win';
  if (['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'].includes(code)) {
    return 'draw';
  }
  return 'loss';
};

const readPgnTag = (pgn: string, key: string) => {
  const match = pgn.match(new RegExp(`\\[${key} "([^"]+)"\\]`));
  return match?.[1] || '';
};

const parsePgnDate = (pgn: string) => {
  const utcDate = readPgnTag(pgn, 'UTCDate') || readPgnTag(pgn, 'Date');
  const utcTime = readPgnTag(pgn, 'UTCTime') || '00:00:00';
  if (!utcDate) return null;

  const datePart = utcDate.replace(/\./g, '-');
  const candidate = `${datePart}T${utcTime}Z`;
  const parsed = Date.parse(candidate);
  return Number.isNaN(parsed) ? null : parsed;
};

const parseMovesFromPgn = (pgn: string): ReviewMove[] => {
  const parsed = new Chess();
  parsed.loadPgn(pgn, { strict: false });
  const verbose = parsed.history({ verbose: true });
  const replay = new Chess();

  return verbose.map((move, index) => {
    replay.move({ from: move.from, to: move.to, promotion: move.promotion });
    return {
      san: move.san,
      from: move.from,
      to: move.to,
      fen: replay.fen(),
      moveNumber: index + 1,
      player: move.color === 'w' ? 'white' : 'black'
    };
  });
};

const toReviewGame = (game: ChessComApiGame, username: string, index: number): ReviewGame | null => {
  const whiteUser = normalize(game.white.username);
  const blackUser = normalize(game.black.username);
  const asColor = whiteUser === username ? 'white' : blackUser === username ? 'black' : null;
  if (!asColor) return null;

  let moves: ReviewMove[] = [];
  try {
    moves = parseMovesFromPgn(game.pgn);
  } catch (err) {
    return null;
  }

  const playedAtMs = game.end_time ? game.end_time * 1000 : parsePgnDate(game.pgn);
  const playedAt = playedAtMs ? new Date(playedAtMs).toISOString() : new Date().toISOString();

  const opponent = asColor === 'white' ? game.black.username : game.white.username;
  const userResultCode = asColor === 'white' ? game.white.result : game.black.result;
  const resultTag = readPgnTag(game.pgn, 'Result') || '*';

  return {
    id: game.url ? game.url.split('/').pop() || `review-${index}` : `review-${index}`,
    url: game.url,
    playedAt,
    opponent,
    asColor,
    userResult: resultFromCode(userResultCode),
    resultTag,
    timeClass: game.time_class || 'unknown',
    timeControl: game.time_control || readPgnTag(game.pgn, 'TimeControl') || 'unknown',
    opening: readPgnTag(game.pgn, 'ECOUrl') || readPgnTag(game.pgn, 'Opening') || 'Unknown opening',
    moves,
    pgn: game.pgn
  };
};

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'chess-site-training/1.0'
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return (await response.json()) as T;
};

export async function getRecentReviewGames(limit = 12) {
  if (Date.now() - reviewCacheAt < REVIEW_CACHE_TTL_MS && reviewCache.length) {
    return reviewCache.slice(0, limit);
  }

  const username = config.chessComUsername;
  const archivesPayload = await fetchJson<{ archives: string[] }>(
    `https://api.chess.com/pub/player/${username}/games/archives`
  );
  const archiveUrls = [...(archivesPayload.archives || [])].slice(-3).reverse();
  const games: ChessComApiGame[] = [];

  for (const archiveUrl of archiveUrls) {
    const monthPayload = await fetchJson<{ games: ChessComApiGame[] }>(archiveUrl);
    games.push(...(monthPayload.games || []));
    if (games.length >= limit * 4) break;
  }

  const reviews = games
    .sort((a, b) => (b.end_time || 0) - (a.end_time || 0))
    .map((game, index) => toReviewGame(game, username, index))
    .filter((game): game is ReviewGame => Boolean(game))
    .slice(0, limit);

  reviewCache = reviews;
  reviewCacheAt = Date.now();

  return reviews;
}
