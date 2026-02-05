import React from 'react';
import clsx from 'clsx';

function format(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function TimerBar({
  value,
  active,
  lastMoveAt
}: {
  value: number;
  active?: boolean;
  lastMoveAt?: number;
}) {
  const [display, setDisplay] = React.useState(value);

  React.useEffect(() => {
    setDisplay(value);
    if (!active) return;
    let raf: number;
    const start = lastMoveAt || Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      setDisplay(value - elapsed);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, lastMoveAt, value]);

  return (
    <div
      className={clsx(
        'flex items-center justify-between rounded-xl border border-white/5 px-3 py-2 text-sm font-semibold',
        active ? 'bg-white/15 text-white shadow-glow' : 'bg-white/5 text-slate-200'
      )}
    >
      <span>{active ? 'Your clock' : 'Opponent'}</span>
      <span className="tabular-nums">{format(display)}</span>
    </div>
  );
}
