'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchHistory, fetchProfile } from '@/lib/api';
import { Trophy, LogOut, BarChart3, Clock3 } from 'lucide-react';

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>();

  useEffect(() => {
    if (!user) return;
    fetchProfile().then(setProfile).catch(() => undefined);
    fetchHistory().then((res) => setHistory(res.games || [])).catch(() => undefined);
  }, [user]);

  if (loading) {
    return <div className="text-slate-200">Loading...</div>;
  }

  if (!user) {
    return <div className="text-slate-200">Sign in to see your rating, stats, and match history.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-3xl border border-white/5 bg-white/5 p-6">
        <div>
          <div className="text-sm uppercase tracking-wide text-slate-400">Player</div>
          <div className="text-2xl font-semibold text-white">{profile?.username || user.username}</div>
          <div className="mt-1 flex items-center gap-3 text-sm text-slate-300">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-3 py-1 text-primary">
              <Trophy size={14} /> {profile?.rating || user.rating}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1">
              <Clock3 size={14} /> Joined recently
            </span>
          </div>
        </div>
        <button
          onClick={signOut}
          className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200 hover:border-primary/50"
        >
          <LogOut size={16} />
        </button>
      </div>

      <div className="rounded-3xl border border-white/5 bg-white/5 p-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <BarChart3 size={18} /> Recent games
        </div>
        <div className="mt-3 divide-y divide-white/5 text-sm text-slate-200">
          {history.length === 0 && <div className="py-4 text-slate-400">No games yet.</div>}
          {history.map((g) => (
            <div key={g.id} className="flex items-center justify-between py-3">
              <div>
                <div className="font-semibold text-white">{g.white.username} vs {g.black.username}</div>
                <div className="text-xs text-slate-400">{g.result} • {g.timeControl}</div>
              </div>
              <div className="text-xs text-slate-400">{new Date(g.playedAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
