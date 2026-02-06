'use client';

import Link from 'next/link';
import { Smile } from 'lucide-react';

export default function ProfilePage() {
  return (
    <div className="rounded-3xl border border-white/5 bg-white/5 p-6 text-slate-200">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <Smile size={18} /> Profiles disabled
      </div>
      <p className="mt-2 text-sm text-slate-300">
        Accounts and saved ratings are turned off. Play instantly as a guest—no login required.
      </p>
      <Link
        href="/play/online"
        className="mt-4 inline-flex rounded-lg bg-gradient-to-r from-primary to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-glow"
      >
        Jump into a game
      </Link>
    </div>
  );
}
