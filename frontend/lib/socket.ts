import { io, Socket } from 'socket.io-client';
import { GameState, Move } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function authPayload() {
  if (typeof window === 'undefined') return {};
  const raw = window.localStorage.getItem('auth');
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return { userId: parsed.id, username: parsed.username, token: parsed.token };
  } catch (err) {
    return {};
  }
}

export type ClientEvents = {
  connect: () => void;
  disconnect: () => void;
  game: (state: GameState) => void;
  move: (move: Move & { clocks: GameState['clocks'] }) => void;
  chat: (payload: { from: string; message: string; at: string }) => void;
  status: (payload: { message: string }) => void;
};

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io(API_URL, {
      transports: ['websocket'],
      autoConnect: true,
      withCredentials: true,
      auth: authPayload()
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
