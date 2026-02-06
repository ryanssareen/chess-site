'use client';

import { useEffect, useState } from 'react';
import { AuthUser } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem('guest');
    if (stored) {
      const parsed: AuthUser = JSON.parse(stored);
      setUser(parsed);
    } else {
      const guest: AuthUser = {
        id: `guest-${Math.random().toString(36).slice(2, 7)}`,
        username: 'Guest',
        rating: 1500,
        token: ''
      };
      window.localStorage.setItem('guest', JSON.stringify(guest));
      setUser(guest);
    }
    setLoading(false);
  }, []);

  const signIn = async (username: string, password: string) => {
    const guest = {
      id: `guest-${Math.random().toString(36).slice(2, 7)}`,
      username: username || 'Guest',
      rating: 1500,
      token: ''
    };
    window.localStorage.setItem('guest', JSON.stringify(guest));
    setUser(guest);
  };

  const signUp = async (username: string, password: string) => {
    return signIn(username, password);
  };

  const signInWithGoogle = async (idToken: string) => {
    return signIn('Guest', idToken);
  };

  const signOut = () => {
    window.localStorage.removeItem('guest');
    setUser(null);
  };

  return { user, loading, signIn, signUp, signInWithGoogle, signOut };
}
