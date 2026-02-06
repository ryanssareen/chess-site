'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/play/online');
  }, [router]);

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-white/5 bg-white/5 p-6 text-slate-200">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <Sparkles size={18} /> No account needed
      </div>
      <p className="mt-2 text-sm text-slate-300">
        Authentication has been removed—jump straight into games as a guest. You&apos;ll be redirected to matchmaking.
      </p>
      <Link
        href="/play/online"
        className="mt-4 inline-flex rounded-lg bg-gradient-to-r from-primary to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-glow"
      >
        Start playing
      </Link>
    </div>
  );
}
