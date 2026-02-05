import { Move } from '@/types';

export function MoveList({ moves }: { moves: Move[] }) {
  const pairs: Move[][] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push(moves.slice(i, i + 2));
  }
  return (
    <div className="h-64 overflow-y-auto rounded-2xl border border-white/5 bg-white/5 p-3 text-sm text-slate-100">
      {pairs.map((pair, idx) => (
        <div key={idx} className="flex gap-3 py-1">
          <div className="w-8 text-slate-400">{idx + 1}.</div>
          <div className="flex-1 text-white">{pair[0]?.san}</div>
          <div className="flex-1 text-white">{pair[1]?.san}</div>
        </div>
      ))}
      {moves.length === 0 && <div className="text-center text-slate-400">No moves yet</div>}
    </div>
  );
}
