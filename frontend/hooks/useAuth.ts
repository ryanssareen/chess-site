'use client';

import { useCallback, useEffect, useState } from 'react';
import { AuthUser } from '@/types';
import { fetchMe, login, loginWithGoogle, loginWithPhone, register } from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';

const AUTH_STORAGE_KEY = 'auth_user';
const AUTH_CHANGED_EVENT = 'auth:changed';

function readStoredUser() {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch (err) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function broadcastAuthChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hydrate = async () => {
      const stored = readStoredUser();
      if (!stored) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const me = await fetchMe();
        const hydrated = { ...me, token: stored.token } satisfies AuthUser;
        setUser(hydrated);
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(hydrated));
      } catch (err) {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    hydrate();

    const onAuthChanged = () => {
      hydrate();
    };
    const onStorageChanged = (event: StorageEvent) => {
      if (event.key === AUTH_STORAGE_KEY) {
        hydrate();
      }
    };

    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    window.addEventListener('storage', onStorageChanged);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
      window.removeEventListener('storage', onStorageChanged);
    };
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const nextUser = await login(username, password);
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
    disconnectSocket();
    setUser(nextUser);
    broadcastAuthChanged();
    return nextUser;
  }, []);

  const signUp = useCallback(async (username: string, password: string) => {
    const nextUser = await register(username, password);
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
    disconnectSocket();
    setUser(nextUser);
    broadcastAuthChanged();
    return nextUser;
  }, []);

  const signInWithGoogle = useCallback(async (idToken: string) => {
    const nextUser = await loginWithGoogle(idToken);
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
    disconnectSocket();
    setUser(nextUser);
    broadcastAuthChanged();
    return nextUser;
  }, []);

  const signInWithPhone = useCallback(async (idToken: string) => {
    const nextUser = await loginWithPhone(idToken);
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser));
    disconnectSocket();
    setUser(nextUser);
    broadcastAuthChanged();
    return nextUser;
  }, []);

  const signOut = useCallback(() => {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    disconnectSocket();
    setUser(null);
    broadcastAuthChanged();
  }, []);

  return { user, loading, signIn, signUp, signInWithGoogle, signInWithPhone, signOut };
}
