export type TimeControl = {
  label: string;
  initial: number; // seconds
  increment: number; // seconds
  code: string;
};

export type PlayerProfile = {
  id: string;
  username: string;
  rating: number;
  country?: string;
  title?: string;
};

export type Move = {
  san: string;
  from: string;
  to: string;
  fen: string;
  moveNumber: number;
  player: 'white' | 'black';
  createdAt?: string;
};

export type GameState = {
  id: string;
  fen: string;
  pgn: string;
  moves: Move[];
  turn: 'w' | 'b';
  players: { white: PlayerProfile; black: PlayerProfile };
  clocks: { white: number; black: number }; // milliseconds remaining
  result?: string;
  status: 'pending' | 'active' | 'finished';
  timeControl: TimeControl;
  lastMoveAt?: number;
  perspective?: 'white' | 'black';
};

export type AuthUser = {
  id: string;
  username: string;
  token: string;
  rating: number;
};
