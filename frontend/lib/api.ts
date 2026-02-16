import axios, { AxiosHeaders } from 'axios';
import { Chess } from 'chess.js';
import { AuthUser, GameState, ReviewGame } from '@/types';

const rawBase =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');
const API_URL = rawBase.replace(/\/$/, '');
const AUTH_STORAGE_KEY = 'auth_user';
const LOCAL_CREDENTIALS_KEY = 'local_training_credentials';
const LOCAL_HISTORY_KEY = 'local_training_history';
const FRONTEND_ONLY = process.env.NEXT_PUBLIC_FRONTEND_ONLY === 'true';
const TRAINING_USERNAME = process.env.NEXT_PUBLIC_TRAINING_USERNAME || 'ryansucksatlifetoo';
const CHESS_COM_USERNAME = process.env.NEXT_PUBLIC_CHESS_COM_USERNAME || TRAINING_USERNAME;

type LocalCredentials = {
  username: string;
  password: string;
};

type LocalHistoryGame = {
  id: string;
  result: string;
  createdAt: string;
  players: {
    white: { username: string };
    black: { username: string };
  };
  perspective: 'white' | 'black';
};

type ChessComApiGame = {
  url?: string;
  pgn: string;
  end_time?: number;
  time_class?: string;
  time_control?: string;
  white: { username: string; rating: number; result: string };
  black: { username: string; rating: number; result: string };
};

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true
});

api.interceptors.request.use((request) => {
  if (typeof window === 'undefined') return request;
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return request;

  try {
    const parsed = JSON.parse(raw) as AuthUser;
    if (parsed.token) {
      const headers = AxiosHeaders.from(request.headers);
      headers.set('Authorization', `Bearer ${parsed.token}`);
      request.headers = headers;
    }
  } catch (err) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  return request;
});

function readJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    window.localStorage.removeItem(key);
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = window.atob(base64);
    return JSON.parse(json) as Record<string, unknown>;
  } catch (err) {
    return null;
  }
}

function userFromIdToken(idToken: string, provider: 'google' | 'phone' | 'firebase'): AuthUser {
  const payload = decodeJwtPayload(idToken) || {};
  const id = String(payload.user_id || payload.sub || payload.uid || `firebase-${Date.now()}`);
  const email = typeof payload.email === 'string' ? payload.email : null;

  return {
    id,
    username: TRAINING_USERNAME,
    rating: 1500,
    token: idToken,
    email,
    provider
  };
}

function localCredentialError() {
  throw new Error('This frontend-only build uses local credentials. Register once on this device first.');
}

function mapResultFromCode(code: string): 'win' | 'draw' | 'loss' {
  if (code === 'win') return 'win';
  if (['agreed', 'repetition', 'stalemate', 'insufficient', '50move', 'timevsinsufficient'].includes(code)) {
    return 'draw';
  }
  return 'loss';
}

function readPgnTag(pgn: string, key: string) {
  const match = pgn.match(new RegExp(`\\[${key} "([^"]+)"\\]`));
  return match?.[1] || '';
}

function parsePgnDate(pgn: string): number | null {
  const utcDate = readPgnTag(pgn, 'UTCDate') || readPgnTag(pgn, 'Date');
  const utcTime = readPgnTag(pgn, 'UTCTime') || '00:00:00';
  if (!utcDate) return null;

  const datePart = utcDate.replace(/\./g, '-');
  const parsed = Date.parse(`${datePart}T${utcTime}Z`);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseMovesFromPgn(pgn: string) {
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
      player: move.color === 'w' ? ('white' as const) : ('black' as const)
    };
  });
}

function toReviewGame(game: ChessComApiGame, username: string, index: number): ReviewGame | null {
  const whiteUser = normalizeUsername(game.white.username);
  const blackUser = normalizeUsername(game.black.username);
  const asColor = whiteUser === username ? 'white' : blackUser === username ? 'black' : null;
  if (!asColor) return null;

  let moves: ReviewGame['moves'] = [];
  try {
    moves = parseMovesFromPgn(game.pgn);
  } catch (err) {
    return null;
  }

  const playedAtMs = game.end_time ? game.end_time * 1000 : parsePgnDate(game.pgn);
  const playedAt = playedAtMs ? new Date(playedAtMs).toISOString() : new Date().toISOString();

  const opponent = asColor === 'white' ? game.black.username : game.white.username;
  const resultCode = asColor === 'white' ? game.white.result : game.black.result;

  return {
    id: game.url ? game.url.split('/').pop() || `review-${index}` : `review-${index}`,
    url: game.url,
    playedAt,
    opponent,
    asColor,
    userResult: mapResultFromCode(resultCode),
    resultTag: readPgnTag(game.pgn, 'Result') || '*',
    timeClass: game.time_class || 'unknown',
    timeControl: game.time_control || readPgnTag(game.pgn, 'TimeControl') || 'unknown',
    opening: readPgnTag(game.pgn, 'ECOUrl') || readPgnTag(game.pgn, 'Opening') || 'Unknown opening',
    moves,
    pgn: game.pgn
  };
}

export function isFrontendOnlyMode() {
  return FRONTEND_ONLY;
}

export function appendLocalTrainingHistory(game: LocalHistoryGame) {
  if (typeof window === 'undefined') return;
  const existing = readJson<LocalHistoryGame[]>(LOCAL_HISTORY_KEY) || [];
  writeJson(LOCAL_HISTORY_KEY, [game, ...existing].slice(0, 100));
}

export async function createAIGame(level: number, timeControl: string) {
  if (FRONTEND_ONLY) {
    const player = readJson<AuthUser>(AUTH_STORAGE_KEY);
    const [minutes, increment] = timeControl.split('+').map(Number);
    const initialSeconds = Number.isFinite(minutes) ? minutes * 60 : 300;
    const inc = Number.isFinite(increment) ? increment : 0;
    const label = `${Number.isFinite(minutes) ? minutes : 5}+${inc}`;
    const initialFen = new Chess().fen();

    const localGame: GameState = {
      id: `local-ai-${Date.now()}`,
      fen: initialFen,
      pgn: '',
      moves: [],
      turn: 'w',
      players: {
        white: {
          id: player?.id || 'training-user',
          username: player?.username || TRAINING_USERNAME,
          rating: player?.rating || 1500
        },
        black: {
          id: 'local-bot',
          username: `Stockfish ${level}`,
          rating: 2600
        }
      },
      clocks: { white: initialSeconds * 1000, black: initialSeconds * 1000 },
      status: 'active',
      timeControl: { label, initial: initialSeconds, increment: inc, code: timeControl },
      lastMoveAt: Date.now(),
      perspective: 'white'
    };

    return localGame;
  }

  const res = await api.post<GameState>('/match/ai', { level, timeControl });
  return res.data;
}

export async function register(username: string, password: string) {
  if (FRONTEND_ONLY) {
    if (normalizeUsername(username) !== normalizeUsername(TRAINING_USERNAME)) {
      throw new Error(`Only ${TRAINING_USERNAME} is allowed`);
    }
    const creds: LocalCredentials = { username: TRAINING_USERNAME, password };
    writeJson(LOCAL_CREDENTIALS_KEY, creds);
    const user: AuthUser = {
      id: `local-${TRAINING_USERNAME}`,
      username: TRAINING_USERNAME,
      rating: 1500,
      token: `local-token-${Date.now()}`,
      provider: 'local'
    };
    return user;
  }

  const res = await api.post<{ token: string; user: Omit<AuthUser, 'token'> }>('/auth/register', {
    username,
    password
  });
  return { ...res.data.user, token: res.data.token } satisfies AuthUser;
}

export async function login(username: string, password: string) {
  if (FRONTEND_ONLY) {
    if (normalizeUsername(username) !== normalizeUsername(TRAINING_USERNAME)) {
      throw new Error(`Only ${TRAINING_USERNAME} is allowed`);
    }
    const creds = readJson<LocalCredentials>(LOCAL_CREDENTIALS_KEY);
    if (!creds) {
      localCredentialError();
    }
    if (!creds || creds.password !== password) {
      throw new Error('Invalid username or password');
    }
    const user: AuthUser = {
      id: `local-${TRAINING_USERNAME}`,
      username: TRAINING_USERNAME,
      rating: 1500,
      token: `local-token-${Date.now()}`,
      provider: 'local'
    };
    return user;
  }

  const res = await api.post<{ token: string; user: Omit<AuthUser, 'token'> }>('/auth/login', {
    username,
    password
  });
  return { ...res.data.user, token: res.data.token } satisfies AuthUser;
}

export async function loginWithFirebase(idToken: string) {
  if (FRONTEND_ONLY) {
    return userFromIdToken(idToken, 'firebase');
  }

  const res = await api.post<{ token: string; user: Omit<AuthUser, 'token'> }>('/auth/firebase', { idToken });
  return { ...res.data.user, token: res.data.token } satisfies AuthUser;
}

export async function loginWithGoogle(idToken: string) {
  if (FRONTEND_ONLY) {
    return userFromIdToken(idToken, 'google');
  }

  const res = await api.post<{ token: string; user: Omit<AuthUser, 'token'> }>('/auth/google', { idToken });
  return { ...res.data.user, token: res.data.token } satisfies AuthUser;
}

export async function loginWithPhone(idToken: string) {
  if (FRONTEND_ONLY) {
    return userFromIdToken(idToken, 'phone');
  }

  const res = await api.post<{ token: string; user: Omit<AuthUser, 'token'> }>('/auth/phone', { idToken });
  return { ...res.data.user, token: res.data.token } satisfies AuthUser;
}

export async function fetchMe() {
  if (FRONTEND_ONLY) {
    const stored = readJson<AuthUser>(AUTH_STORAGE_KEY);
    if (!stored) {
      throw new Error('Not authenticated');
    }
    const { token, ...user } = stored;
    return user;
  }

  const res = await api.get<{ user: Omit<AuthUser, 'token'> }>('/auth/me');
  return res.data.user;
}

export async function fetchProfile() {
  if (FRONTEND_ONLY) {
    const stored = readJson<AuthUser>(AUTH_STORAGE_KEY);
    if (!stored) throw new Error('Not authenticated');
    return {
      id: stored.id,
      username: stored.username,
      rating: stored.rating,
      email: stored.email || null,
      provider: stored.provider || 'firebase',
      createdAt: null
    };
  }

  const res = await api.get('/profile/me');
  return res.data;
}

export async function fetchHistory(limit = 20) {
  if (FRONTEND_ONLY) {
    const history = (readJson<LocalHistoryGame[]>(LOCAL_HISTORY_KEY) || []).slice(0, limit);
    return { games: history };
  }

  const res = await api.get(`/history?limit=${limit}`);
  return res.data;
}

export async function fetchReviewGames(limit = 12) {
  if (FRONTEND_ONLY) {
    const username = normalizeUsername(CHESS_COM_USERNAME);
    const archivesResponse = await fetch(`https://api.chess.com/pub/player/${username}/games/archives`);
    if (!archivesResponse.ok) {
      throw new Error('Failed to load Chess.com archives');
    }
    const archivesPayload = (await archivesResponse.json()) as { archives?: string[] };
    const archiveUrls = [...(archivesPayload.archives || [])].slice(-3).reverse();
    const games: ChessComApiGame[] = [];

    for (const archiveUrl of archiveUrls) {
      const monthlyResponse = await fetch(archiveUrl);
      if (!monthlyResponse.ok) continue;
      const monthlyPayload = (await monthlyResponse.json()) as { games?: ChessComApiGame[] };
      games.push(...(monthlyPayload.games || []));
      if (games.length >= limit * 4) break;
    }

    const mapped = games
      .sort((a, b) => (b.end_time || 0) - (a.end_time || 0))
      .map((game, index) => toReviewGame(game, username, index))
      .filter((game): game is ReviewGame => Boolean(game))
      .slice(0, limit);

    return { username, games: mapped };
  }

  const res = await api.get<{ username: string; games: ReviewGame[] }>(`/analysis/review-games?limit=${limit}`);
  return res.data;
}
