import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { PyEspnPlay } from '../data/pyespn-types';
import { usePyEspnGame } from '../data/usePyEspnGame';
import GameHeader from './GameHeader';
import FieldAnimationCanvas from './FieldAnimationCanvas';
import PlayList from './PlayList';
import ParticipantStats from './ParticipantStats';
import PlaybackControls from './PlaybackControls';

interface ScheduleGame {
  game_id: string;
  week: number;
  status: string;
  date: string;
  home: string;
  away: string;
}

interface PyEspnLiveViewProps {
  season: string | null | undefined;
  seasonType: string | null | undefined;
  week: number | null | undefined;
  schedule: ScheduleGame[];
}

const speedOptions = [
  { id: 'slow', label: 'Slow', interval: 8000 },
  { id: 'normal', label: 'Normal', interval: 5000 },
  { id: 'fast', label: 'Fast', interval: 2500 },
];

const deriveScore = (plays: PyEspnPlay[], index: number) => {
  if (!plays.length) {
    return { home: null, away: null };
  }
  const upto = index >= 0 ? plays.slice(0, index + 1) : plays;
  const latest = [...upto].reverse().find(play => Number.isFinite(play.homeScore) || Number.isFinite(play.awayScore));
  return {
    home: latest?.homeScore ?? null,
    away: latest?.awayScore ?? null,
  };
};

const formatGameOption = (game: ScheduleGame) => {
  const kickoff = game.date ? new Date(game.date).toLocaleString() : 'TBD';
  return `${game.away} @ ${game.home} • ${game.status} • ${kickoff}`;
};

const PyEspnLiveView = ({ season, seasonType, week, schedule }: PyEspnLiveViewProps) => {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(() => schedule[0]?.game_id ?? null);
  const [playIndex, setPlayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSpeedId, setActiveSpeedId] = useState(speedOptions[1].id);

  const activeSpeed = useMemo(
    () => speedOptions.find(option => option.id === activeSpeedId) ?? speedOptions[1],
    [activeSpeedId],
  );

  useEffect(() => {
    if (schedule.length && !selectedGameId) {
      setSelectedGameId(schedule[0].game_id);
    }
  }, [schedule, selectedGameId]);

  const { data, loading, error, lastUpdated, refresh } = usePyEspnGame({
    gameId: selectedGameId,
    autoRefresh: true,
    refreshIntervalMs: 25_000,
  });

  const plays = data?.plays ?? [];
  const currentPlay = plays[playIndex] ?? null;

  useEffect(() => {
    if (!plays.length) {
      setPlayIndex(0);
      setIsPlaying(false);
      return;
    }
    if (playIndex >= plays.length) {
      setPlayIndex(Math.max(plays.length - 1, 0));
    }
  }, [plays, playIndex]);

  useEffect(() => {
    if (!isPlaying || !plays.length) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setPlayIndex(index => {
        if (index + 1 >= plays.length) {
          return index;
        }
        return index + 1;
      });
    }, activeSpeed.interval);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isPlaying, plays.length, activeSpeed.interval]);

  const { home: homeScore, away: awayScore } = useMemo(
    () => deriveScore(plays, playIndex),
    [plays, playIndex],
  );

  const handleSelectPlay = (playId: string) => {
    const idx = plays.findIndex(play => play.id === playId);
    if (idx !== -1) {
      setPlayIndex(idx);
      setIsPlaying(false);
    }
  };

  const handleReset = () => {
    setPlayIndex(0);
    setIsPlaying(false);
  };

  const handleTogglePlay = () => {
    if (!plays.length) {
      return;
    }
    setIsPlaying(value => !value);
  };

  const handleStep = (direction: -1 | 1) => {
    setPlayIndex(index => {
      const next = index + direction;
      if (next < 0) return 0;
      if (next >= plays.length) return plays.length - 1;
      return next;
    });
  };

  const scheduleContent = (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
      <div>
        <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">Week Context</p>
        <p className="text-sm text-slate-300">
          Season {season ?? '—'} • {seasonType ?? '—'} • Week {week ?? '—'}
        </p>
      </div>
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-slate-400">Select Game</p>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {schedule.map(game => {
            const isSelected = game.game_id === selectedGameId;
            return (
              <button
                key={game.game_id}
                onClick={() => {
                  setSelectedGameId(game.game_id);
                  setPlayIndex(0);
                  setIsPlaying(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                  isSelected
                    ? 'border-purple-500/70 bg-purple-500/10 text-white'
                    : 'border-slate-700 text-slate-300 hover:bg-slate-800/40'
                }`}
              >
                <p className="font-semibold">{game.away} @ {game.home}</p>
                <p className="text-xs text-slate-400">{formatGameOption(game)}</p>
              </button>
            );
          })}
          {!schedule.length && (
            <div className="text-sm text-slate-400">No scheduled games available for this week.</div>
          )}
        </div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">Playback Speed</p>
        <div className="flex flex-wrap gap-2">
          {speedOptions.map(option => (
            <button
              key={option.id}
              onClick={() => setActiveSpeedId(option.id)}
              className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                option.id === activeSpeedId
                  ? 'border-purple-500/70 bg-purple-500/10 text-white'
                  : 'border-slate-700 text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMainContent = () => {
    if (!selectedGameId) {
      return (
        <div className="flex items-center justify-center h-64 text-slate-300">
          Select a game from the schedule to begin streaming PyESPN data.
        </div>
      );
    }

    if (loading && !data) {
      return (
        <div className="flex items-center justify-center h-64 text-slate-300 gap-3">
          <Loader2 className="w-6 h-6 animate-spin" /> Loading PyESPN feed…
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64 text-red-300 gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <GameHeader game={data?.game ?? null} lastUpdated={lastUpdated} homeScore={homeScore} awayScore={awayScore} />
        <PlaybackControls
          isPlaying={isPlaying}
          canStepBackward={playIndex > 0}
          canStepForward={playIndex < plays.length - 1}
          speedLabel={activeSpeed.label}
          onTogglePlay={handleTogglePlay}
          onStepBackward={() => handleStep(-1)}
          onStepForward={() => handleStep(1)}
          onReset={handleReset}
          onRefresh={refresh}
        />
        <div className="grid lg:grid-cols-2 gap-6">
          <FieldAnimationCanvas play={currentPlay} />
          <PlayList plays={plays} activePlayId={currentPlay?.id ?? null} onSelect={handleSelectPlay} />
        </div>
        <ParticipantStats play={currentPlay} />
      </div>
    );
  };

  return (
    <div className="grid lg:grid-cols-[320px,1fr] gap-6">
      {scheduleContent}
      {renderMainContent()}
    </div>
  );
};

export default PyEspnLiveView;
