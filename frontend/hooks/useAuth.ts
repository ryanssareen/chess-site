'use client';

import { useEffect, useState } from 'react';
import { AuthUser } from '@/types';
import { api, login, register } from '@/lib/api';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem('auth');
    if (stored) {
      const parsed: AuthUser = JSON.parse(stored);
      setUser(parsed);
      api.defaults.headers.common['Authorization'] = `Bearer ${parsed.token}`;
    }
    setLoading(false);
  }, []);

  const signIn = async (username: string, password: string) => {
    const res = await login(username, password);
    api.defaults.headers.common['Authorization'] = `Bearer ${res.token}`;
    window.localStorage.setItem('auth', JSON.stringify(res));
    setUser(res);
  };

  const signUp = async (username: string, password: string) => {
    const res = await register(username, password);
    api.defaults.headers.common['Authorization'] = `Bearer ${res.token}`;
    window.localStorage.setItem('auth', JSON.stringify(res));
    setUser(res);
  };

  const signOut = () => {
    window.localStorage.removeItem('auth');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return { user, loading, signIn, signUp, signOut };
}
