import { memo, useMemo } from 'react';
import type { PyEspnPlay } from '../data/pyespn-types';
import { useEspnPlayers } from '../data/useEspnPlayers';

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

  const participantIds = useMemo(() => {
    const ids = new Set<string>();
    play.participants.forEach(participant => {
      if (participant?.id === null || participant?.id === undefined) {
        return;
      }
      if (typeof participant.id === 'string' && participant.id.trim().length > 0) {
        ids.add(participant.id);
        return;
      }
      if (typeof participant.id === 'number' && Number.isFinite(participant.id)) {
        ids.add(String(participant.id));
      }
    });
    return Array.from(ids);
  }, [play.participants]);

  const { playersById, loading: loadingPlayers, error: playersError } = useEspnPlayers(participantIds);

  return (
    <div className="grid gap-3">
      {loadingPlayers && (
        <div className="text-xs text-slate-400">Loading official player metadata…</div>
      )}
      {playersError && (
        <div className="text-xs text-amber-400">Some ESPN player data is unavailable right now.</div>
      )}
      {play.participants.map(participant => {
        const stats = participant.stats || {};
        const keys = Object.keys(stats);
        const playerId =
          participant?.id === null || participant?.id === undefined ? null : String(participant.id);
        const playerMeta = playerId ? playersById[playerId] ?? null : null;
        const displayName =
          playerMeta?.displayName ?? playerMeta?.fullName ?? participant.name ?? 'Unknown Player';
        const position = playerMeta?.position ?? participant.position ?? 'N/A';
        const teamCode =
          playerMeta?.teamAbbreviation ?? playerMeta?.teamDisplayName ?? participant.team ?? '---';
        const jersey = playerMeta?.jersey ?? null;
        const detailParts = [teamCode, position].filter(Boolean);
        if (jersey) {
          detailParts.push(`#${jersey}`);
        }
        const detailLine = detailParts.length ? detailParts.join(' • ') : '---';
        return (
          <div
            key={`${participant.id}-${participant.name}`}
            className="bg-slate-900/40 border border-slate-800 rounded-xl p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-white">{displayName}</p>
                <p className="text-xs uppercase tracking-widest text-slate-400">{detailLine}</p>
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
