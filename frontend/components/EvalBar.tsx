import clsx from 'clsx';

function parseScore(value?: string) {
  if (!value) return 0;
  const text = value.trim();
  if (!text) return 0;

  if (text.includes('M')) {
    const sign = text.startsWith('-') ? -1 : 1;
    return sign * 10;
  }

  const numeric = Number(text);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(-10, Math.min(10, numeric));
}

export function EvalBar({
  score,
  perspective = 'white',
  className
}: {
  score?: string;
  perspective?: 'white' | 'black';
  className?: string;
}) {
  const whiteAdvantage = parseScore(score);
  const whitePercent = ((whiteAdvantage + 10) / 20) * 100;
  const displayPercent = perspective === 'white' ? whitePercent : 100 - whitePercent;
  const safePercent = Math.max(0, Math.min(100, displayPercent));
  const displayScore = score || '0.00';

  return (
    <div className={clsx('flex h-full min-h-[360px] flex-col items-center gap-2', className)}>
      <div className="rounded-md border border-white/15 bg-white/10 px-2 py-1 text-xs font-semibold text-slate-100">
        {displayScore}
      </div>
      <div className="relative w-6 flex-1 overflow-hidden rounded-full border border-white/20 bg-slate-900/80 shadow-inner">
        <div
          className="absolute bottom-0 left-0 right-0 bg-white transition-all duration-300"
          style={{ height: `${safePercent}%` }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-white/25" />
      </div>
      <div className="text-[10px] uppercase tracking-wide text-slate-400">Eval</div>
    </div>
  );
}
