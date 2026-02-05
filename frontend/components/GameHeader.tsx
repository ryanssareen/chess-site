import { GameState } from '@/types';
import { Trophy, Eye } from 'lucide-react';

export function GameHeader({ game }: { game: GameState }) {
  return (
    <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-slate-100">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="font-semibold">{game.players.white.username}</span>
          <span className="text-xs text-slate-400">White • {game.players.white.rating}</span>
        </div>
        <div className="text-xs uppercase tracking-wide text-slate-500">vs</div>
        <div className="flex flex-col text-right">
          <span className="font-semibold">{game.players.black.username}</span>
          <span className="text-xs text-slate-400">Black • {game.players.black.rating}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-300">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-3 py-1 text-primary">
          <Trophy size={14} /> {game.timeControl.label || game.timeControl.code}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1">
          <Eye size={14} /> Spectator mode
        </span>
      </div>
    </div>
  );
}
