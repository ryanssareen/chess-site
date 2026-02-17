import React from 'react';
import clsx from 'clsx';

function format(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
}

export function TimerBar({
  value,
  active,
  lastMoveAt,
  label
}: {
  value: number;
  active?: boolean;
  lastMoveAt?: number;
  label?: string;
}) {
  const [display, setDisplay] = React.useState(value);

  React.useEffect(() => {
    setDisplay(value);
    if (!active) return;

    const baseline = value;
    const startedAt = lastMoveAt || Date.now();
    let raf = 0;

    const tick = () => {
      const elapsed = Date.now() - startedAt;
      setDisplay(Math.max(0, baseline - elapsed));
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, lastMoveAt, value]);

  return (
    <div
      className={clsx(
        'flex items-center justify-between rounded-2xl border px-4 py-3',
        active ? 'border-emerald-400/50 bg-emerald-500/15 text-white shadow-glow' : 'border-white/10 bg-white/5 text-slate-100'
      )}
    >
      <span className="text-sm font-semibold uppercase tracking-wide text-slate-300">{label || (active ? 'Your clock' : 'Opponent')}</span>
      <span className="tabular-nums text-3xl font-black leading-none">{format(display)}</span>
    </div>
  );
}
