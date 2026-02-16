import axios from 'axios';
import { AuthUser, GameState, ReviewGame } from '@/types';

const rawBase =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');
const API_URL = rawBase.replace(/\/$/, '');
const AUTH_STORAGE_KEY = 'auth_user';

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
      const headers = (request.headers || {}) as Record<string, string>;
      headers.Authorization = `Bearer ${parsed.token}`;
      request.headers = headers;
    }
  } catch (err) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  return request;
});

export async function createAIGame(level: number, timeControl: string) {
  const res = await api.post<GameState>('/match/ai', { level, timeControl });
  return res.data;
}

export async function register(username: string, password: string) {
  const res = await api.post<{ token: string; user: Omit<AuthUser, 'token'> }>('/auth/register', {
    username,
    password
  });
  return { ...res.data.user, token: res.data.token } satisfies AuthUser;
}

export async function login(username: string, password: string) {
  const res = await api.post<{ token: string; user: Omit<AuthUser, 'token'> }>('/auth/login', {
    username,
    password
  });
  return { ...res.data.user, token: res.data.token } satisfies AuthUser;
}

export async function loginWithFirebase(idToken: string) {
  const res = await api.post<{ token: string; user: Omit<AuthUser, 'token'> }>('/auth/firebase', { idToken });
  return { ...res.data.user, token: res.data.token } satisfies AuthUser;
}

export async function loginWithGoogle(idToken: string) {
  const res = await api.post<{ token: string; user: Omit<AuthUser, 'token'> }>('/auth/google', { idToken });
  return { ...res.data.user, token: res.data.token } satisfies AuthUser;
}

export async function loginWithPhone(idToken: string) {
  const res = await api.post<{ token: string; user: Omit<AuthUser, 'token'> }>('/auth/phone', { idToken });
  return { ...res.data.user, token: res.data.token } satisfies AuthUser;
}

export async function fetchMe() {
  const res = await api.get<{ user: Omit<AuthUser, 'token'> }>('/auth/me');
  return res.data.user;
}

export async function fetchProfile() {
  const res = await api.get('/profile/me');
  return res.data;
}

export async function fetchHistory(limit = 20) {
  const res = await api.get(`/history?limit=${limit}`);
  return res.data;
}

export async function fetchReviewGames(limit = 12) {
  const res = await api.get<{ username: string; games: ReviewGame[] }>(`/analysis/review-games?limit=${limit}`);
  return res.data;
}
