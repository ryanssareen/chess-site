'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock } from 'lucide-react';

export default function AuthPage() {
  const { user, signIn, signUp } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      router.replace('/profile');
    }
  }, [user, router]);

  if (user) {
    return <div className="text-slate-200">Redirecting to your profile...</div>;
  }

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        await signIn(username, password);
      } else {
        await signUp(username, password);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-white/5 bg-white/5 p-6 shadow-lg">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <ShieldCheck size={18} /> Secure account
      </div>
      <p className="mt-2 text-sm text-slate-300">Sign up or log in to play rated games and sync progress.</p>

      <div className="mt-4 space-y-3">
        <div>
          <label className="text-xs text-slate-400">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-primary/60"
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">Password</label>
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-primary/60"
            />
            <Lock className="absolute right-3 top-2.5 h-4 w-4 text-slate-500" />
          </div>
        </div>
        {error && <div className="text-sm text-red-400">{error}</div>}
        <button
          onClick={submit}
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-primary to-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
        >
          {loading ? 'Working...' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
        <button
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="w-full text-center text-xs text-slate-300 hover:text-white"
        >
          {mode === 'login' ? "Don't have an account? Register" : 'Already registered? Sign in'}
        </button>
      </div>
    </div>
  );
}
