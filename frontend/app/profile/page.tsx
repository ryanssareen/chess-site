'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, UserRound } from 'lucide-react';
import { fetchHistory, fetchProfile } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

type Profile = {
  id: string;
  username: string;
  rating: number;
  email: string | null;
  provider: string;
  createdAt: string | null;
};

type HistoryGame = {
  id: string;
  result: string;
  createdAt: string;
  players: {
    white: { username: string };
    black: { username: string };
  };
  perspective: 'white' | 'black';
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<HistoryGame[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
    }
  }, [loading, router, user]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoadingData(true);
      setMessage('');
      try {
        const [profileRes, historyRes] = await Promise.all([fetchProfile(), fetchHistory(10)]);
        setProfile(profileRes);
        setHistory(historyRes.games || []);
      } catch (err: any) {
        setMessage(err?.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, [user]);

  if (loading || (!loading && !user) || loadingData) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-slate-100">
        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-slate-200">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <UserRound size={18} /> Training profile
        </div>
        {profile ? (
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
              <div className="text-xs text-slate-400">Username</div>
              <div className="font-semibold text-white">{profile.username}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
              <div className="text-xs text-slate-400">Rating</div>
              <div className="font-semibold text-white">{profile.rating}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
              <div className="text-xs text-slate-400">Email</div>
              <div className="font-semibold text-white">{profile.email || 'Not set'}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
              <div className="text-xs text-slate-400">Provider</div>
              <div className="font-semibold text-white">{profile.provider}</div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-sm font-semibold text-white">Recent training games</div>
        <div className="mt-3 space-y-2 text-sm">
          {history.map((game) => {
            const opponent = game.perspective === 'white' ? game.players.black.username : game.players.white.username;
            return (
              <div key={game.id} className="rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-slate-200">
                <div className="font-medium text-white">vs {opponent}</div>
                <div className="text-xs text-slate-400">
                  {new Date(game.createdAt).toLocaleString()} • {game.result}
                </div>
              </div>
            );
          })}
          {history.length === 0 ? <div className="text-slate-400">No completed games yet.</div> : null}
        </div>
      </div>

      {message ? <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{message}</div> : null}
    </div>
  );
}
