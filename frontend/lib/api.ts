import axios from 'axios';
import { GameState } from '@/types';

const rawBase =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');
const API_URL = rawBase.replace(/\/$/, '');

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true
});

export async function createAIGame(level: number, timeControl: string) {
  const res = await api.post<GameState>('/match/ai', { level, timeControl });
  return res.data;
}

export async function createOnlineGame(timeControl: string, rated = true) {
  const res = await api.post<{ gameId: string }>('/match/queue', { timeControl, rated });
  return res.data;
}

export async function fetchProfile() {
  const res = await api.get('/profile/me');
  return res.data;
}

export async function fetchHistory(limit = 20) {
  const res = await api.get(`/history?limit=${limit}`);
  return res.data;
}
