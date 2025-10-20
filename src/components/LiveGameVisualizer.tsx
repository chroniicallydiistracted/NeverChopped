import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Activity,
  AlertCircle,
  ArrowLeftRight,
  Clock,
  Flag,
  Loader2,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  SkipBack,
  SkipForward,
  RadioTower,
} from 'lucide-react';
import { categoryToVector, inferPlayDirection } from '../utils/playDirection';
import { getFieldImageInfo } from '../constants/fieldTeams';
import { DEFAULT_UNIFORM_SEASON, type HelmetOrientation } from '../constants/uniforms';
import { fetchWeeklyUniforms, getHelmetUrls } from '../lib/uniforms';
import { loadPlaysForGame } from '../lib/play-data/orchestrator';
import type { GameInfo } from '../lib/play-data/types';
import type { PyESPNPlay } from '../lib/play-data/adapters/pyespn-adapter';

import { safeNumber } from '../lib/play-data/utils';

type ScheduleGame = {
  game_id: string;
  week: number;
  status: string;
  date: string;
  home: string;
  away: string;
};

type PlayStat = {
  player_id: string;
  stats?: Record<string, number>;
  player?: Record<string, any> | null;
};

type Play = {
  play_id: string;
  game_id: string;
  sequence: number;
  date?: string;
  metadata?: Record<string, any> | null;
  play_stats?: PlayStat[] | null;
  raw?: PyESPNPlay;
};

interface LiveGameVisualizerProps {
  season: string | null | undefined;
  seasonType: string | null | undefined;
  week: number | null | undefined;
  schedule: ScheduleGame[];
  playersById: Record<string, any>;
}

const speedOptions = [
  { label: '0.5x', interval: 10000 },
  { label: '1x', interval: 5000 },
  { label: '2x', interval: 3000 },
];

const evaluateCoverage = (plays: Play[]) => {
  if (!plays.length) {
    return {
      complete: false,
      hasKickoff: false,
      hasEnd: false,
      total: 0,
    };
  }
  const hasKickoff = plays.some(play => play.raw?.type.text.toLowerCase().includes('kickoff'));
  const hasEnd = plays.some(play => play.raw?.text.toLowerCase().includes('end of game'));
  return {
    complete: hasKickoff && hasEnd,
    hasKickoff,
    hasEnd,
    total: plays.length,
  };
};

const secondsToClock = (totalSeconds: number | null | undefined): { minutes: number; seconds: number } => {
  if (!Number.isFinite(totalSeconds ?? NaN)) {
    return { minutes: 0, seconds: 0 };
  }
  const secs = Math.max(0, Math.floor(totalSeconds as number));
  return { minutes: Math.floor(secs / 60), seconds: secs % 60 };
};

const buildMetadataFromRaw = (play: PyESPNPlay) => {
  const clock = {
    minutes: parseInt(play.clock.displayValue.split(':')[0]) || 0,
    seconds: parseInt(play.clock.displayValue.split(':')[1]) || 0
  };

  const possession = play.team.abbreviation || '';
  const homeTeam = '';  // Will be set at game level
  const awayTeam = '';  // Will be set at game level
  const defense = possession;

  const start = play.start?.yardsToEndzone || 50;
  let yardLine = Math.round(Math.abs(start - 50));
  let territory: string | null = null;
  if (start <= 50) {
    yardLine = Math.round(50 - start);
    territory = defense;
  } else {
    yardLine = Math.round(start - 50);
    territory = possession;
  }
  if (yardLine === 0) {
    territory = 'MIDFIELD';
  }

  return {
    description: play.text,
    fantasy_description: play.shortText || play.text,
    home_points: play.homeScore,
    away_points: play.awayScore,
    yards_gained: play.statYardage || 0,
    yards_to_end_zone: start,
    down: play.start?.down ?? undefined,
    distance: play.start?.yardsToGo ?? undefined,
    team: possession,
    possession,
    play_type: play.type.text.toLowerCase(),
    quarter_name: String(play.quarter),
    game_clock: `${clock.minutes}:${clock.seconds.toString().padStart(2, '0')}`,
    type: play.type.text.toLowerCase(),
    pass_location: null,
    pass_length: null,
    pass_air_yards: null,
    rec_yac: null,
    run_location: null,
    run_gap: null,
    yard_line: yardLine,
    yard_line_territory: territory,
    yards_to_end_zone_end: play.end?.yardsToEndzone || start,
    time_remaining_minutes: clock.minutes,
    time_remaining_seconds: clock.seconds,
    home_used_timeouts: null,
    away_used_timeouts: null,
    penalties: [],
  } as Record<string, any>;
};

const buildPlayStatsFromRaw = (play: PyESPNPlay): PlayStat[] => {
  const stats: PlayStat[] = [];
  const { participants } = play;

  for (const participant of participants) {
    // Parse full name into first/last (simple split on first space)
    const fullName = participant.name || '';
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Create stats map from participant stats
    const statsMap = new Map(participant.stats.map((stat: any) => [stat.name, stat.value]));

    // Determine role based on stats
    if (statsMap.get('passingAttempts') || statsMap.get('passingYards')) {
      stats.push({
        player_id: participant.id,
        player: {
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          position: participant.position,
          team: participant.team,
        },
        stats: {
          pass_att: statsMap.get('passingAttempts') || 0,
          pass_yds: statsMap.get('passingYards') || 0,
        },
      });
    }

    if (statsMap.get('receptions') || statsMap.get('receivingYards')) {
      stats.push({
        player_id: participant.id,
        player: {
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          position: participant.position,
          team: participant.team,
        },
        stats: {
          rec: statsMap.get('receptions') || 0,
          rec_yds: statsMap.get('receivingYards') || 0,
          rec_yac: statsMap.get('yardsAfterCatch') || 0,
        },
      });
    }

    if (statsMap.get('rushingAttempts') || statsMap.get('rushingYards')) {
      stats.push({
        player_id: participant.id,
        player: {
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          position: participant.position,
          team: participant.team,
        },
        stats: {
          rush_att: statsMap.get('rushingAttempts') || 0,
          rush_yds: statsMap.get('rushingYards') || 0,
        },
      });
    }
  }

  return stats;
};

const convertRawPlaysToLegacy = (plays: PyESPNPlay[]): Play[] => {
  return plays.map(play => ({
    play_id: play.id,
    game_id: play.id,  // Using play.id as game_id for now
    sequence: play.sequence,
    date: undefined,
    metadata: buildMetadataFromRaw(play),
    play_stats: buildPlayStatsFromRaw(play),
    raw: play,
  }));
};

const formatClock = (
  minutes: number | null | undefined,
  seconds: number | null | undefined,
): string => {
  if (minutes === null || minutes === undefined || seconds === null || seconds === undefined) {
    return '--:--';
  }
  const clampedSeconds = Math.max(0, seconds);
  const paddedSeconds = clampedSeconds < 10 ? `0${clampedSeconds}` : `${clampedSeconds}`;
  return `${minutes}:${paddedSeconds}`;
};

const formatDownDistance = (meta: Record<string, any> | null | undefined): string | null => {
  const down = meta?.down;
  const distance = meta?.distance;
  if (down == null || distance == null) {
    return null;
  }

  const suffix = down === 1 ? 'st' : down === 2 ? 'nd' : down === 3 ? 'rd' : 'th';
  return `${down}${suffix} & ${distance}`;
};

const clamp = (value: number, min = 0, max = 100) => Math.min(Math.max(value, min), max);

type SportsPlayContext = {
  raw: SportsDataPlay;
  start: number;
  end: number;
};

const isSportsPlay = (play: Play | null): play is Play & { standard: StandardPlay & { rawData: SportsDataPlay } } =>
  Boolean(play?.standard && play.standard.dataSource === 'espn' && play.standard.rawData);

const computeSportsStartPosition = (play: SportsDataPlay): number => {
  const yardsToEndzone = safeNumber(play.YardsToEndZone, NaN);
  if (Number.isFinite(yardsToEndzone)) {
    return clamp(100 - yardsToEndzone);
  }
  const yardLine = safeNumber(play.YardLine, NaN);
  const territory = play.YardLineTerritory;
  if (!Number.isFinite(yardLine) || !territory) {
    return 50;
  }
  const territoryCode = territory.toUpperCase();
  const offenseCode = (play.Team ?? '').toUpperCase();
  const defenseCode = (play.Opponent ?? '').toUpperCase();

  if (territoryCode === offenseCode) {
    return clamp(50 + yardLine);
  }
  if (territoryCode === defenseCode) {
    return clamp(50 - yardLine);
  }
  if (territoryCode === 'MIDFIELD') {
    return 50;
  }
  return 50;
};

const computeSportsEndPosition = (play: SportsDataPlay, start: number): number => {
  const yardsGained = safeNumber(play.YardsGained, 0);
  if (Number.isFinite(yardsGained)) {
    return clamp(start + yardsGained);
  }
  return start;
};

const computeSportsFirstDownPosition = (play: SportsDataPlay, start: number): number | null => {
  const distance = safeNumber(play.Distance, NaN);
  if (!Number.isFinite(distance)) {
    return null;
  }
  return clamp(start + distance);
};

const deriveSportsPlayKind = (play: SportsDataPlay): 'rush' | 'pass' | 'kick' | 'punt' | 'field_goal' | 'unknown' => {
  const type = (play.Type ?? '').toLowerCase();
  if (type.includes('pass')) return 'pass';
  if (type.includes('rush') || type.includes('run')) return 'rush';
  if (type.includes('punt')) return 'punt';
  if (type.includes('field')) return 'field_goal';
  if (type.includes('kick')) return 'kick';
  return 'unknown';
};

const deriveSportsDirectionCategory = (delta: number): 'left' | 'middle' | 'right' => {
  if (Math.abs(delta) < 0.5) return 'middle';
  return delta > 0 ? 'right' : 'left';
};

const createSportsContext = (play: Play | null): SportsPlayContext | null => {
  if (!isSportsPlay(play)) {
    return null;
  }
  const raw = play.standard.rawData as SportsDataPlay;
  const start = computeSportsStartPosition(raw);
  const end = computeSportsEndPosition(raw, start);
  return { raw, start, end };
};

// Create field mappers from current image calibration (left/right goal line positions)
const makeFieldMappers = (leftPct: number, rightPct: number) => {
  const range = rightPct - leftPct;
  const mapFieldX = (percent: number): number => {
    const clamped = clamp(percent);
    return leftPct + (clamped / 100) * range;
  };
  const unmapFieldX = (mappedPercent: number): number => {
    const normalized = ((mappedPercent - leftPct) / range) * 100;
    return clamp(normalized);
  };
  return { mapFieldX, unmapFieldX };
};

const getFieldPosition = (
  play: Play | null,
  options: { useEnd?: boolean; fallback?: number | null } = {},
): number | null => {
  if (!play) return options.fallback ?? null;

  if (play.raw) {
    const yards = options.useEnd 
      ? play.raw.end?.yardsToEndzone 
      : play.raw.start?.yardsToEndzone;
    if (yards) {
      return 100 - yards;
    }
  }

  const metadata = play.metadata || {};
  const useEnd = options.useEnd ?? false;
  const yardKey = useEnd ? 'yard_line_end' : 'yard_line';
  const territoryKey = useEnd ? 'yard_line_territory_end' : 'yard_line_territory';

  const yardLineRaw = metadata[yardKey];
  const territoryRaw = metadata[territoryKey];

  if (typeof yardLineRaw === 'number' && typeof territoryRaw === 'string') {
    const territory = territoryRaw.toUpperCase();
    const offense = (play.metadata?.team || play.metadata?.possession || '').toString().toUpperCase();
    const defense = territory === offense ? offense : territory;
    const normalizedYard = clamp(yardLineRaw);
    if (territory === defense) {
      return clamp(50 - normalizedYard);
    }
    return clamp(50 + normalizedYard);
  }

  if (typeof metadata?.yards_to_end_zone === 'number') {
    return clamp(100 - metadata.yards_to_end_zone);
  }

  return options.fallback ?? null;
};

const getPlayerName = (stat: PlayStat, playersById: Record<string, any>): string => {
  const playerMeta = stat.player || playersById[stat.player_id];
  if (!playerMeta) {
    return stat.player_id;
  }

  // Prefer full_name if available (from our adapter data)
  if (playerMeta.full_name) {
    return playerMeta.full_name;
  }

  // Otherwise construct from first/last
  const first = playerMeta.first_name || playerMeta.firstName || '';
  const last = playerMeta.last_name || playerMeta.lastName || '';
  const combined = `${first} ${last}`.trim();
  return combined.length > 0 ? combined : stat.player_id;
};

const formatStatusLabel = (status: string | undefined, quarter: string | null | undefined): string => {
  if (!status) return 'Status Unknown';
  if (status === 'in_progress') {
    return quarter ? `Live • Q${quarter}` : 'Live';
  }
  if (status === 'complete') {
    return quarter === 'OT' ? 'Final/OT' : 'Final';
  }
  if (status === 'pre_game') {
    return 'Pre-Game';
  }
  return status.replace(/_/g, ' ').replace(/\w/g, char => char.toUpperCase());
};

const formatGameDate = (dateString: string | null | undefined): string | null => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

const LiveGameVisualizer: React.FC<LiveGameVisualizerProps> = ({
  season,
  seasonType,
  week,
  schedule,
  playersById,
}) => {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [plays, setPlays] = useState<Play[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedIndex, setSpeedIndex] = useState(1);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [playSource, setPlaySource] = useState<
    'rest' | 'graphql' | 'sleeper' | 'espn' | 'merged' | null
  >(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [pathDashOffset, setPathDashOffset] = useState(0);
  const [coverage, setCoverage] = useState<{
    complete: boolean;
    hasKickoff: boolean;
    hasEnd: boolean;
    total: number;
  } | null>(null);
  const [weeklyUniformsYear, setWeeklyUniformsYear] = useState<string | null>(null);
  const [weeklyUniformStyles, setWeeklyUniformStyles] = useState<Record<string, string> | null>(
    null,
  );

  const currentWeekGames = useMemo(() => {
    if (!week) return [];
    return schedule.filter(game => game.week === week);
  }, [schedule, week]);

  const selectedGame = useMemo(() => {
    if (!selectedGameId) return null;
    return currentWeekGames.find(game => game.game_id === selectedGameId) || null;
  }, [currentWeekGames, selectedGameId]);

  useEffect(() => {
    if (currentWeekGames.length === 0) {
      setSelectedGameId(null);
      return;
    }
    if (!selectedGameId || !currentWeekGames.some(game => game.game_id === selectedGameId)) {
      setSelectedGameId(currentWeekGames[0].game_id);
    }
  }, [currentWeekGames, selectedGameId]);

  const loadGamePlays = useCallback(
    async (gameId: string, { silent = false }: { silent?: boolean } = {}) => {
      if (!season || !seasonType) {
        if (!silent) {
          setError('Season and season type are required');
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await loadPlaysForGame(gameId, {
          season,
          seasonType,
          week,
        });

        if (!result || !result.plays || !Array.isArray(result.plays)) {
          throw new Error('Invalid play data received');
        }

        const convertedPlays = convertRawPlaysToLegacy(result.plays);
        setPlays(convertedPlays);
        setPlaySource(result.source);
        setCoverage(evaluateCoverage(convertedPlays));
        setLastUpdatedAt(new Date());
        setCurrentIndex(0);
      } catch (err) {
        console.error('Error loading plays:', err);
        setError(err instanceof Error ? err.message : 'Failed to load plays');
        setPlays([]);
        setPlaySource(null);
        setCoverage(null);
      } finally {
        setLoading(false);
      }
    },
    [season, seasonType, week],
  );

  useEffect(() => {
    if (selectedGameId) {
      loadGamePlays(selectedGameId);
    }
  }, [selectedGameId, loadGamePlays]);

  // Auto-refresh in live mode
  useEffect(() => {
    if (!isLiveMode || !selectedGameId) return;

    const interval = setInterval(() => {
      loadGamePlays(selectedGameId, { silent: true });
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [isLiveMode, selectedGameId, loadGamePlays]);

  // Animation logic
  useEffect(() => {
    if (!isPlaying || !plays.length) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= plays.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, speedOptions[speedIndex].interval);

    return () => clearInterval(interval);
  }, [isPlaying, plays.length, speedIndex]);

  const currentPlay = plays[currentIndex] || null;
  const currentMetadata = currentPlay?.metadata || null;
  const currentStats = currentPlay?.play_stats || [];

  // Field position calculations
  const startPosition = getFieldPosition(currentPlay, { useEnd: false });
  const endPosition = getFieldPosition(currentPlay, { useEnd: true });

  // Animation path
  const pathLength = Math.abs((endPosition || 0) - (startPosition || 0));
  useEffect(() => {
    if (!isPlaying || !pathLength) return;
    const interval = setInterval(() => {
      setPathDashOffset(prev => {
        const next = prev + 2;
        return next > pathLength ? 0 : next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isPlaying, pathLength]);

  // Load weekly uniforms
  useEffect(() => {
    if (!season) return;
    const year = parseInt(season);
    if (isNaN(year)) return;

    setWeeklyUniformsYear(season);
    fetchWeeklyUniforms(year)
      .then(styles => {
        if (styles) {
          setWeeklyUniformStyles(styles);
        }
      })
      .catch(err => {
        console.warn('Failed to load weekly uniforms:', err);
      });
  }, [season]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <select
              value={selectedGameId || ''}
              onChange={(e) => setSelectedGameId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              {currentWeekGames.map(game => (
                <option key={game.game_id} value={game.game_id}>
                  {game.away} @ {game.home} ({formatStatusLabel(game.status, null)})
                </option>
              ))}
            </select>
            {selectedGame && (
              <div className="text-sm text-gray-600">
                {formatGameDate(selectedGame.date)}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {playSource && (
              <div className="text-sm text-gray-500">
                Source: {playSource}
              </div>
            )}
            {lastUpdatedAt && (
              <div className="text-sm text-gray-500">
                Updated: {lastUpdatedAt.toLocaleTimeString()}
              </div>
            )}
            <button
              onClick={() => setIsLiveMode(!isLiveMode)}
              className={`p-2 rounded-md ${
                isLiveMode
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
              title={isLiveMode ? 'Disable live mode' : 'Enable live mode'}
            >
              <RadioTower className="w-4 h-4" />
            </button>
            <button
              onClick={() => loadGamePlays(selectedGameId!)}
              disabled={loading || !selectedGameId}
              className="p-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              title="Refresh plays"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Play List */}
        <div className="w-full lg:w-1/3 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Plays</h2>
            {coverage && (
              <div className="mt-2 text-sm text-gray-600">
                {coverage.total} plays
                {coverage.hasKickoff && ' • Has kickoff'}
                {coverage.hasEnd && ' • Has end'}
                {coverage.complete && ' • Complete'}
              </div>
            )}
          </div>
          <div className="divide-y divide-gray-200">
            {plays.map((play, index) => (
              <div
                key={play.play_id}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${
                  index === currentIndex ? 'bg-blue-50' : ''
                }`}
                onClick={() => {
                  setCurrentIndex(index);
                  setIsPlaying(false);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">
                      Q{play.metadata?.quarter_name || '1'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatClock(
                        play.metadata?.time_remaining_minutes,
                        play.metadata?.time_remaining_seconds
                      )}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDownDistance(play.metadata)}
                  </div>
                </div>
                <div className="mt-1 text-sm text-gray-900">
                  {play.metadata?.description}
                </div>
                {play.metadata?.yards_gained !== undefined && (
                  <div className="mt-1 text-sm text-gray-500">
                    Yards: {play.metadata.yards_gained > 0 ? '+' : ''}{play.metadata.yards_gained}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Field Visualization */}
        <div className="flex-1 p-4">
          <div className="bg-white rounded-lg shadow-sm p-4 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Field View</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                  className="p-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  {isPlaying ? (
                    <PauseCircle className="w-4 h-4" />
                  ) : (
                    <PlayCircle className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => setCurrentIndex(Math.min(plays.length - 1, currentIndex + 1))}
                  disabled={currentIndex === plays.length - 1}
                  className="p-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
                <select
                  value={speedIndex}
                  onChange={(e) => setSpeedIndex(Number(e.target.value))}
                  className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                >
                  {speedOptions.map((option, index) => (
                    <option key={index} value={index}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setCurrentIndex(0)}
                  className="p-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Field */}
            <div className="relative bg-green-50 rounded-lg p-4 h-64">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-1 bg-green-300 relative">
                  {/* Start Position */}
                  {startPosition !== null && (
                    <div
                      className="absolute w-3 h-3 bg-blue-500 rounded-full -top-1"
                      style={{ left: `${startPosition}%` }}
                    />
                  )}
                  {/* End Position */}
                  {endPosition !== null && (
                    <div
                      className="absolute w-3 h-3 bg-red-500 rounded-full -top-1"
                      style={{ left: `${endPosition}%` }}
                    />
                  )}
                  {/* Animation Path */}
                  {startPosition !== null && endPosition !== null && (
                    <div
                      className="absolute h-1 bg-blue-300 -top-0.5"
                      style={{
                        left: `${Math.min(startPosition, endPosition)}%`,
                        width: `${Math.abs(endPosition - startPosition)}%`,
                      }}
                    />
                  )}
                </div>
              </div>
              {/* Yard Lines */}
              <div className="absolute inset-0 flex justify-between px-4">
                {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(yard => (
                  <div
                    key={yard}
                    className="text-xs text-gray-400"
                    style={{ left: `${yard}%` }}
                  >
                    {yard === 50 ? '50' : yard < 50 ? yard : 100 - yard}
                  </div>
                ))}
              </div>
            </div>

            {/* Play Details */}
            {currentPlay && (
              <div className="mt-4 space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Play Type:</span>{' '}
                  {currentMetadata?.play_type || 'Unknown'}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Description:</span>{' '}
                  {currentMetadata?.description || 'No description'}
                </div>
                {currentMetadata?.down && currentMetadata?.distance && (
                  <div className="text-sm">
                    <span className="font-medium">Down & Distance:</span>{' '}
                    {formatDownDistance(currentMetadata)}
                  </div>
                )}
                {currentMetadata?.yards_gained !== undefined && (
                  <div className="text-sm">
                    <span className="font-medium">Yards Gained:</span>{' '}
                    {currentMetadata.yards_gained > 0 ? '+' : ''}{currentMetadata.yards_gained}
                  </div>
                )}
                {/* Player Stats */}
                {currentStats.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2">Player Stats</h3>
                    <div className="space-y-1">
                      {currentStats.map((stat, index) => (
                        <div key={index} className="text-sm">
                          <span className="font-medium">{getPlayerName(stat, playersById)}</span>
                          {Object.entries(stat.stats || {}).map(([key, value]) => (
                            <span key={key} className="ml-2">
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveGameVisualizer;
