import { memo } from 'react';
import type { PyEspnPlay } from '../data/pyespn-types';

export interface ParticipantStatsProps {
  play: PyEspnPlay | null;
}

const formatStat = (label: string, value: number | undefined) => {
  if (value === undefined) {
    return null;
  }
  return (
    <span className="inline-flex items-center gap-1 bg-slate-900/80 border border-slate-700/60 px-2 py-1 rounded-full text-xs">
      <span className="font-semibold text-slate-200">{label}</span>
      <span className="text-slate-300">{value}</span>
    </span>
  );
};

const ParticipantStats = memo(({ play }: ParticipantStatsProps) => {
  if (!play) {
    return null;
  }
  if (!play.participants.length) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 text-sm text-slate-400">
        No participant tracking data available for this play.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {play.participants.map(participant => {
        const stats = participant.stats || {};
        const keys = Object.keys(stats);
        return (
          <div
            key={`${participant.id}-${participant.name}`}
            className="bg-slate-900/40 border border-slate-800 rounded-xl p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-white">{participant.name ?? 'Unknown Player'}</p>
                <p className="text-xs uppercase tracking-widest text-slate-400">
                  {participant.team ?? '---'} • {participant.position ?? 'N/A'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {keys.length === 0 && <span className="text-xs text-slate-400">No stats recorded</span>}
                {keys.map(key => formatStat(key, stats[key]))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

ParticipantStats.displayName = 'ParticipantStats';

export default ParticipantStats;
