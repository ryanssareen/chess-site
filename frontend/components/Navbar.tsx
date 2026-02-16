'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Brain, Flame, LogOut, Moon, Sun, User } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/hooks/useAuth';

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const { user, loading, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.body.classList.toggle('light', next === 'light');
    window.localStorage.setItem('theme', next);
  };

  return (
    <header className="backdrop-blur sticky top-0 z-30 border-b border-white/5 bg-slate-900/60 px-4 py-3 shadow-lg shadow-primary/10 dark:bg-slate-900/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-400 text-white shadow-glow">
            <Flame size={20} />
          </span>
          <div>
            <div className="text-sm uppercase tracking-[0.24em] text-slate-400">Arcade</div>
            <div className="-mt-1 text-xl font-bold">Chess</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-200 md:flex">
          <Link href="/play/ai" className="hover:text-white">
            Play vs Computer
          </Link>
          <Link href="/analysis" className="hover:text-white">
            Game Review
          </Link>
          <Link href="/profile" className="hover:text-white">
            Profile
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-100 transition hover:border-primary/50 hover:text-white"
          >
            {mounted && theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          {!loading && user ? (
            <button
              type="button"
              onClick={signOut}
              className={clsx(
                'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold shadow-sm transition',
                'border border-white/15 bg-white/5 text-slate-100 hover:border-primary/40'
              )}
            >
              <LogOut size={16} />
              Sign out
            </button>
          ) : (
            <Link
              href="/auth"
              className={clsx(
                'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold shadow-sm transition',
                'bg-gradient-to-r from-primary to-emerald-500 text-white hover:shadow-glow'
              )}
            >
              <User size={16} />
              Login
            </Link>
          )}

          <Link
            href="/play/ai"
            className={clsx(
              'hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold shadow-sm transition md:inline-flex',
              'bg-gradient-to-r from-primary to-emerald-500 text-white hover:shadow-glow'
            )}
          >
            <Brain size={16} />
            Train
          </Link>
        </div>
      </div>
    </header>
  );
}
