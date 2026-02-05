import axios from 'axios';
import { AuthUser, GameState } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true
});

export async function register(username: string, password: string) {
  const res = await api.post<AuthUser>('/auth/register', { username, password });
  return res.data;
}

export async function login(username: string, password: string) {
  const res = await api.post<AuthUser>('/auth/login', { username, password });
  return res.data;
}

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
