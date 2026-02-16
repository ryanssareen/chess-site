import { Request } from 'express';

export type SessionUser = {
  id: string;
  username: string;
  rating: number;
  email?: string | null;
  provider?: string;
  createdAt?: Date;
};

export interface AuthedRequest extends Request {
  userId?: string;
  user?: SessionUser;
}

export type TimeControl = {
  code: string; // e.g. 3+2
  initial: number; // seconds
  increment: number; // seconds
  label?: string;
};

export type InMemoryGame = {
  id: string;
  white: { id: string; username: string; rating: number };
  black: { id: string; username: string; rating: number };
  timeControl: TimeControl;
  rated: boolean;
  fen: string;
  pgn: string;
  moves: any[];
  turn: 'w' | 'b';
  clocks: { white: number; black: number };
  lastMoveAt: number;
  status: 'pending' | 'active' | 'finished';
  result?: string;
};
