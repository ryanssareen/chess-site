import Link from 'next/link';
import { Sparkles, ShieldCheck, Timer, Cpu, NotebookTabs } from 'lucide-react';

const TRAINING_USERNAME = process.env.NEXT_PUBLIC_TRAINING_USERNAME || 'ryansucksatlifetoo';

const features = [
  {
    title: 'AI Sparring',
    description: 'Stockfish-powered training with adjustable depth and themed challenges.',
    icon: Cpu
  },
  {
    title: 'Single-User Focus',
    description: 'Locked to one dedicated training account for consistent progress tracking.',
    icon: ShieldCheck
  },
  {
    title: 'Game Review',
    description: 'Import recent Chess.com games and replay every move with board states.',
    icon: NotebookTabs
  },
  {
    title: 'Time Controls',
    description: 'Bullet to Classical with increment support and smart delay clocks.',
    icon: Timer
  }
];

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="grid gap-10 overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 p-10 shadow-xl shadow-primary/10 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-white/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles size={14} />
            Training platform for {TRAINING_USERNAME}
          </div>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            Train against Stockfish and review real Chess.com games.
          </h1>
          <p className="text-lg text-slate-300">
            This build is optimized for one account only, with password/Google login, AI practice, and real-game review workflows.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/play/ai"
              className="rounded-xl bg-gradient-to-r from-primary to-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:scale-[1.01]"
            >
              Start Training
            </Link>
            <Link
              href="/analysis"
              className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-primary/50 hover:text-white"
            >
              Review Games
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm text-slate-300 sm:w-3/4">
            <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
              <div className="text-3xl font-bold text-white">+120 ms</div>
              <div className="text-slate-400">median move latency</div>
            </div>
            <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
              <div className="text-3xl font-bold text-white">6 tiers</div>
              <div className="text-slate-400">AI sparring levels</div>
            </div>
          </div>
        </div>
        <div className="relative">
          <div className="absolute inset-6 rounded-[30px] bg-gradient-to-br from-primary/30 via-emerald-400/10 to-transparent blur-3xl" />
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/80 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between text-xs text-slate-400">
              <span>Live Blitz • 3+2</span>
              <span>120k watching</span>
            </div>
            <div className="aspect-[4/5] rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-4">
              <div className="h-full w-full rounded-2xl bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.08),transparent_20%),radial-gradient(circle_at_50%_60%,rgba(79,70,229,0.1),transparent_35%),linear-gradient(135deg,#0f172a,#111827)]" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-slate-200">
              <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                <div className="text-slate-400">Time</div>
                <div className="text-white">03:00 training</div>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                <div className="text-slate-400">Increment</div>
                <div className="text-white">+2s</div>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                <div className="text-slate-400">Mode</div>
                <div className="text-white">Single-user</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-2xl border border-white/5 bg-white/5 p-5 shadow-lg shadow-black/20"
          >
            <feature.icon className="mb-4 h-10 w-10 text-primary" />
            <div className="text-lg font-semibold text-white">{feature.title}</div>
            <p className="mt-2 text-sm text-slate-300">{feature.description}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/5 bg-white/5 p-6 shadow-lg shadow-primary/20">
          <h2 className="text-2xl font-semibold text-white">Real-game review workflow</h2>
          <p className="mt-2 text-slate-300">
            Pull your latest Chess.com games, replay each position, and ask Stockfish for better lines on any move.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li>• Real move-by-move replay from imported PGN</li>
            <li>• Opening metadata and game outcomes</li>
            <li>• Position evaluation with principal variation</li>
          </ul>
          <Link
            href="/analysis"
            className="mt-4 inline-flex rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-primary/50"
          >
            Open analysis board
          </Link>
        </div>

        <div className="rounded-3xl border border-white/5 bg-white/5 p-6 shadow-lg shadow-primary/20">
          <h2 className="text-2xl font-semibold text-white">Focused AI training</h2>
          <p className="mt-2 text-slate-300">
            Build consistency with controlled practice games against Stockfish at the time controls you care about.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li>• Difficulty levels for tactical and positional drills</li>
            <li>• Stored game history under your account</li>
            <li>• Multiplayer removed to keep training uninterrupted</li>
          </ul>
          <Link
            href="/play/ai"
            className="mt-4 inline-flex rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-primary/50"
          >
            Open training board
          </Link>
        </div>
      </section>
    </div>
  );
}
