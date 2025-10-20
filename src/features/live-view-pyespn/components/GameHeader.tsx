import { memo } from 'react';
import type { PyEspnGamePayload } from '../data/pyespn-types';

export interface GameHeaderProps {
  game: PyEspnGamePayload['game'] | null;
  lastUpdated: number | null;
  homeScore: number | null;
  awayScore: number | null;
}

const formatLastUpdated = (timestamp: number | null) => {
  if (!timestamp) {
    return 'Never';
  }
  return new Date(timestamp).toLocaleTimeString();
};

const teamLabel = (name: string | null, abbreviation: string | null) => {
  if (abbreviation) return abbreviation;
  return name ?? 'TBD';
};

const GameHeader = memo(({ game, lastUpdated, homeScore, awayScore }: GameHeaderProps) => {
  return (
    <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">ESPN LIVE PLAY BY PLAY</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white mt-2">
            {teamLabel(game?.awayTeam?.name ?? null, game?.awayTeam?.abbreviation ?? null)} @{' '}
            {teamLabel(game?.homeTeam?.name ?? null, game?.homeTeam?.abbreviation ?? null)}
          </h2>
          <p className="text-sm text-slate-300/80 mt-1">
            Status: {game?.status ?? 'Unknown'} • Updated {formatLastUpdated(lastUpdated)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-sm text-slate-400">{teamLabel(game?.awayTeam?.name ?? null, game?.awayTeam?.abbreviation ?? null)}</p>
            <p className="text-4xl font-black text-white">{awayScore ?? '--'}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-400">{teamLabel(game?.homeTeam?.name ?? null, game?.homeTeam?.abbreviation ?? null)}</p>
            <p className="text-4xl font-black text-white">{homeScore ?? '--'}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

GameHeader.displayName = 'GameHeader';

export default GameHeader;
