import { memo } from 'react';
import type { PyEspnPlay } from '../data/pyespn-types';
import { buildClockLabel } from '../animation/fieldMath';

export interface PlayListProps {
  plays: PyEspnPlay[];
  activePlayId: string | null;
  onSelect: (playId: string) => void;
}

const PlayList = memo(({ plays, activePlayId, onSelect }: PlayListProps) => {
  if (!plays.length) {
    return (
      <div className="p-6 text-center text-slate-400 bg-slate-900/40 border border-slate-800 rounded-xl">
        No play-by-play data available yet. Select a scheduled game or refresh once the game begins.
      </div>
    );
  }

  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
      <div className="max-h-[420px] overflow-y-auto">
        {plays.map(play => {
          const isActive = play.id === activePlayId;
          const playType = play.type?.text ?? 'Play';
          const clock = buildClockLabel(play);
          return (
            <button
              key={play.id}
              onClick={() => onSelect(play.id)}
              className={`w-full text-left px-4 py-3 border-b border-slate-800/60 transition-colors ${
                isActive ? 'bg-purple-600/20 border-purple-500/40' : 'hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between text-xs uppercase tracking-widest text-slate-400">
                <span>{playType}</span>
                <span>
                  Q{play.quarter ?? '?'} • {clock}
                </span>
              </div>
              <p className="mt-2 text-sm text-white leading-relaxed">{play.text ?? 'No description available.'}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
});

PlayList.displayName = 'PlayList';

export default PlayList;
