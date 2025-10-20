import { memo } from 'react';
import type { PyEspnGamePayload } from '../data/pyespn-types';

export interface GameHeaderProps {
  game: PyEspnGamePayload['game'] | null;
  lastUpdated: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homeHelmet?: { left: string; right: string } | null;
  awayHelmet?: { left: string; right: string } | null;
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

const formatStatusLine = (game: PyEspnGamePayload['game'] | null) => {
  if (!game) {
    return 'STATUS UNKNOWN';
  }
  const parts: string[] = [];
  if (game.status) {
    parts.push(game.status.replace(/_/g, ' ').toUpperCase());
  }
  if (Number.isFinite(game.quarter)) {
    parts.push(`Q${game.quarter}`);
  }
  if (game.clock) {
    parts.push(game.clock);
  }
  return parts.length ? parts.join(' • ') : 'STATUS UNKNOWN';
};

const HelmetImage = ({ src, alt }: { src: string | null; alt: string }) => {
  if (!src) {
    return <div className="w-16 h-12 sm:w-20 sm:h-16 rounded-full border border-slate-700/60 bg-slate-900/80" />;
  }
  return (
    <div className="w-16 h-12 sm:w-20 sm:h-16 flex items-center justify-center">
      <img src={src} alt={alt} className="max-h-full max-w-full object-contain" />
    </div>
  );
};

const GameHeader = memo(({ game, lastUpdated, homeScore, awayScore, homeHelmet, awayHelmet }: GameHeaderProps) => {
  const awayLabel = teamLabel(game?.awayTeam?.name ?? null, game?.awayTeam?.abbreviation ?? null);
  const homeLabel = teamLabel(game?.homeTeam?.name ?? null, game?.homeTeam?.abbreviation ?? null);

  return (
    <div className="bg-slate-900/70 border border-slate-700 rounded-2xl p-5 sm:p-7 shadow-lg shadow-slate-900/30">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">ESPN LIVE PLAY BY PLAY</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            {awayLabel} @ {homeLabel}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300/80 tracking-widest uppercase">
            {formatStatusLine(game)} • Updated {formatLastUpdated(lastUpdated)}
          </p>
        </div>
        <div className="w-full lg:w-auto bg-slate-900/60 border border-slate-700/80 rounded-2xl px-4 py-3 sm:px-6 sm:py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 items-center">
            <div className="flex items-center gap-3 sm:gap-4">
              <HelmetImage src={awayHelmet?.right ?? null} alt={`${awayLabel} helmet`} />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">AWAY</p>
                <p className="text-lg font-semibold text-slate-100">{awayLabel}</p>
              </div>
              <p className="ml-auto text-4xl font-black text-white tabular-nums">{awayScore ?? '--'}</p>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 sm:justify-end">
              <p className="text-4xl font-black text-white tabular-nums">{homeScore ?? '--'}</p>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">HOME</p>
                <p className="text-lg font-semibold text-slate-100">{homeLabel}</p>
              </div>
              <HelmetImage src={homeHelmet?.left ?? null} alt={`${homeLabel} helmet`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

GameHeader.displayName = 'GameHeader';

export default GameHeader;
