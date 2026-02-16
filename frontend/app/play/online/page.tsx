'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OnlinePlayPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/play/ai');
  }, [router]);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-slate-100">
      Multiplayer has been removed. Redirecting to training vs computer.
    </div>
  );
}
