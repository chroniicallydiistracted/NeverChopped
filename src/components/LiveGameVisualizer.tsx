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
import type { GameInfo, StandardPlay } from '../lib/play-data/types';
import type { SportsDataPlay } from '../lib/play-data/adapters/sportsdataio-adapter';
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
  standard?: StandardPlay;
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
  const hasKickoff = plays.some(play => play.standard?.playType === 'kickoff');
  const hasEnd = plays.some(play => play.standard?.description?.toLowerCase().includes('end of game'));
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

const buildMetadataFromStandard = (play: StandardPlay) => {
  const clock = secondsToClock(play.gameClockSeconds);

  const possession = play.possession || '';
  const homeTeam = play.homeTeam || '';
  const awayTeam = play.awayTeam || '';
  const defense = possession.toUpperCase() === homeTeam.toUpperCase() ? awayTeam : homeTeam;

  const start = play.startFieldPosition;
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
    description: play.description,
    fantasy_description: play.description,
    home_points: play.homeScore,
    away_points: play.awayScore,
    yards_gained: play.yardsGained,
    yards_to_end_zone: play.yardsToEndzone,
    down: play.down ?? undefined,
    distance: play.yardsToGo ?? undefined,
    team: possession,
    possession,
    play_type: play.playType,
    quarter_name: String(play.quarter),
    game_clock: `${clock.minutes}:${clock.seconds.toString().padStart(2, '0')}`,
    type: play.playType,
    pass_location: play.pass?.location ?? null,
    pass_length: play.pass?.depth ?? null,
    pass_air_yards: play.pass?.airYards ?? null,
    rec_yac: play.pass?.yardsAfterCatch ?? null,
    run_location: play.rush?.location ?? null,
    run_gap: play.rush?.gap ?? null,
    yard_line: yardLine,
    yard_line_territory: territory,
    yards_to_end_zone_end: play.endFieldPosition,
    time_remaining_minutes: clock.minutes,
    time_remaining_seconds: clock.seconds,
    home_used_timeouts: null,
    away_used_timeouts: null,
    penalties: Array.isArray(play.penalties)
      ? play.penalties.map(penalty => {
          const player = penalty.player;
          let firstName: string | null = null;
          let lastName: string | null = null;
          let fullName: string | null = null;
          if (player?.name) {
            fullName = player.name;
            const parts = fullName.trim().split(/\s+/);
            firstName = parts[0] ?? null;
            lastName = parts.length > 1 ? parts.slice(1).join(' ') : null;
          }
          return {
            description: penalty.description,
            yards: penalty.yards,
            team: penalty.team,
            player: player
              ? {
                  id: player.id,
                  position: player.position || null,
                  team: player.team || null,
                  first_name: firstName,
                  last_name: lastName,
                  full_name: fullName,
                }
              : null,
          };
        })
      : [],
  } as Record<string, any>;
};

const buildPlayStatsFromStandard = (play: StandardPlay): PlayStat[] => {
  const stats: PlayStat[] = [];
  const { players } = play;
  
  if (players.passer) {
    // Parse full name into first/last (simple split on first space)
    const fullName = players.passer.name || '';
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    stats.push({
      player_id: players.passer.id,
      player: {
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        position: players.passer.position,
        team: players.passer.team,
      },
      stats: {
        pass_att: play.playType === 'pass' ? 1 : 0,
      },
    });
  }
  
  if (players.receiver) {
    const fullName = players.receiver.name || '';
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    stats.push({
      player_id: players.receiver.id,
      player: {
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        position: players.receiver.position,
        team: players.receiver.team,
      },
      stats: {
        rec: play.pass?.isComplete ? 1 : 0,
        rec_yac: play.pass?.yardsAfterCatch ?? 0,
      },
    });
  }
  
  if (players.rusher) {
    const fullName = players.rusher.name || '';
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    stats.push({
      player_id: players.rusher.id,
      player: {
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        position: players.rusher.position,
        team: players.rusher.team,
      },
      stats: {
        rush_att: play.playType === 'rush' ? 1 : 0,
        rush_yd: play.playType === 'rush' ? play.yardsGained : 0,
      },
    });
  }
  
  return stats;
};

const convertStandardPlaysToLegacy = (plays: StandardPlay[]): Play[] => {
  return plays.map(play => ({
    play_id: play.id,
    game_id: play.gameId,
    sequence: play.sequence,
    date: (play.rawData as any)?.game_date || undefined,
    metadata: buildMetadataFromStandard(play),
    play_stats: buildPlayStatsFromStandard(play),
    standard: play,
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
  Boolean(play?.standard && play.standard.dataSource === 'sportsdataio' && play.standard.rawData);

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

  if (play.standard) {
    return options.useEnd ? play.standard.endFieldPosition : play.standard.startFieldPosition;
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
  return status.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
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
    'rest' | 'graphql' | 'sleeper' | 'sportsdataio' | 'espn' | 'merged' | null
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
        setError('Missing season or season type information.');
        return;
      }

      const game = schedule.find(entry => entry.game_id === gameId);
      if (!game) {
        setError('Game information unavailable.');
        return;
      }

      const gameInfo: GameInfo = {
        gameId: game.game_id,
        week: Number.isFinite(game.week) ? Number(game.week) : null,
        season,
        seasonType,
        date: game.date,
        status: game.status,
        homeTeam: game.home,
        awayTeam: game.away,
      };

      if (!silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const standardPlays = await loadPlaysForGame(gameInfo);
        const converted = convertStandardPlaysToLegacy(standardPlays);
        const source = standardPlays[0]?.dataSource ?? null;

        console.log('[LiveGameVisualizer] Loaded plays:', {
          count: converted.length,
          source: source,
          firstPlay: converted[0],
          hasPlayStats: converted[0]?.play_stats && converted[0].play_stats.length > 0,
          firstPlayerName: converted[0]?.play_stats?.[0]?.player?.first_name,
          standardPlayers: standardPlays[0]?.players,
        });

        setPlays(converted);
        setPlaySource(source);
        setCoverage(evaluateCoverage(converted));
        setLastUpdatedAt(new Date());

        if (!silent) {
          if (isLiveMode) {
            setCurrentIndex(Math.max(converted.length - 1, 0));
            setIsPlaying(false);
          } else {
            setCurrentIndex(0);
            setIsPlaying(true);
          }
        } else if (isLiveMode) {
          setCurrentIndex(Math.max(converted.length - 1, 0));
          setIsPlaying(false);
        } else {
          setCurrentIndex(prev => {
            if (converted.length === 0) return 0;
            if (prev >= converted.length - 2) {
              return converted.length - 1;
            }
            return Math.min(prev, converted.length - 1);
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setPlays([]);
        setCoverage(null);
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [season, seasonType, schedule, isLiveMode],
  );

  useEffect(() => {
    if (!selectedGameId) return;
    loadGamePlays(selectedGameId);
  }, [selectedGameId, loadGamePlays]);

  // Load weekly uniforms mapping for the selected game (if available)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedGame) {
        setWeeklyUniformsYear(null);
        setWeeklyUniformStyles(null);
        return;
      }
      const data = await fetchWeeklyUniforms(selectedGame.game_id);
      if (cancelled) return;
      if (data && data.uniforms) {
        const map: Record<string, string> = {};
        Object.entries(data.uniforms).forEach(([team, info]) => {
          map[team.toUpperCase()] = info.style.toUpperCase();
        });
        setWeeklyUniformStyles(map);
        setWeeklyUniformsYear(data.year);
      } else {
        setWeeklyUniformStyles(null);
        setWeeklyUniformsYear(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedGame]);

  useEffect(() => {
    if (!isPlaying) return;
    if (plays.length === 0) return;
    const interval = speedOptions[speedIndex]?.interval ?? speedOptions[1].interval;
    const timer = setTimeout(() => {
      setCurrentIndex(prev => {
        if (prev >= plays.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, interval);

    return () => clearTimeout(timer);
  }, [isPlaying, plays, currentIndex, speedIndex]);

  // Live mode polling - polls every 10 seconds when enabled
  useEffect(() => {
    if (!isLiveMode) return undefined;
    if (!selectedGame) return undefined;
    
    const poller = setInterval(() => {
      loadGamePlays(selectedGame.game_id, { silent: true });
    }, 10000); // Poll every 10 seconds
    
    return () => clearInterval(poller);
  }, [isLiveMode, selectedGame, loadGamePlays]);

  // Original in-progress game polling (can coexist with live mode)
  useEffect(() => {
    if (!selectedGame) return undefined;
    if (selectedGame.status !== 'in_progress') return undefined;
    if (isLiveMode) return undefined; // Don't duplicate polling if in live mode
    const poller = setInterval(() => {
      loadGamePlays(selectedGame.game_id, { silent: true });
    }, 30000);
    return () => clearInterval(poller);
  }, [selectedGame, loadGamePlays]);

  useEffect(() => {
    if (plays.length === 0) {
      setCurrentIndex(0);
      return;
    }
    setCurrentIndex(prev => Math.min(prev, plays.length - 1));
  }, [plays.length]);

  const currentPlay = plays[currentIndex] || null;
  const previousPlay = currentIndex > 0 ? plays[currentIndex - 1] : null;
  const currentSports = useMemo(() => createSportsContext(currentPlay), [currentPlay]);
  const previousSports = useMemo(() => createSportsContext(previousPlay), [previousPlay]);
  const playMeta = useMemo(() => {
    if (!currentPlay) return {} as Record<string, any>;
    if (currentPlay.standard) {
      return {
        ...buildMetadataFromStandard(currentPlay.standard),
        ...(currentPlay.metadata || {}),
      } as Record<string, any>;
    }
    return (currentPlay.metadata || {}) as Record<string, any>;
  }, [currentPlay]);
  const cumulativePlays = useMemo(() => plays.slice(0, currentIndex + 1), [plays, currentIndex]);
  const currentDirection = useMemo(() => {
    if (currentSports) {
      const delta = currentSports.end - currentSports.start;
      const kindType = deriveSportsPlayKind(currentSports.raw);
      const mappedKind = kindType === 'rush' ? 'rush' : kindType === 'pass' ? 'pass' : 'unknown';
      const category = deriveSportsDirectionCategory(delta);
      const absDelta = Math.abs(delta);
      return {
        kind: mappedKind,
        category,
        isDeep: absDelta >= 20,
        isShort: absDelta <= 10,
      };
    }
    if (currentPlay?.standard) {
      const { direction, playType } = currentPlay.standard;
      return {
        kind: playType === 'rush' ? 'rush' : playType === 'pass' ? 'pass' : 'unknown',
        category: direction.category ?? 'middle',
        isDeep: direction.isDeep,
        isShort: direction.isShort,
      };
    }
    return inferPlayDirection(currentPlay);
  }, [currentSports, currentPlay]);
  const directionVector = useMemo(() => categoryToVector(currentDirection.category), [currentDirection]);
  const laneOffsetPercent = directionVector.x * 6;
  const ballLanePercent = useMemo(() => clamp(50 + laneOffsetPercent, 0, 100), [laneOffsetPercent]);
  const isAnimationPlayable = useMemo(() => {
    if (currentSports) {
      const kindType = deriveSportsPlayKind(currentSports.raw);
      return ['rush', 'pass', 'punt', 'kick', 'field_goal'].includes(kindType);
    }
    if (currentPlay?.standard) {
      return ['rush', 'pass', 'punt', 'kickoff', 'field_goal', 'two_point'].includes(
        currentPlay.standard.playType,
      );
    }
    const animatedKinds = new Set(['rush', 'pass', 'kick', 'punt', 'special']);
    return animatedKinds.has(currentDirection.kind);
  }, [currentSports, currentDirection, currentPlay]);
  const previousBallPosition = useMemo(() => {
    if (previousSports) {
      return previousSports.end;
    }
    if (!previousPlay) return null;
    return getFieldPosition(previousPlay, { useEnd: true, fallback: null });
  }, [previousPlay, previousSports]);

  const scoreSummary = useMemo(() => {
    console.log('🔍 [scoreSummary DEBUG] cumulativePlays:', cumulativePlays.length, 'plays');
    const summary = {
      homePoints: 0,
      awayPoints: 0,
      quarter: null as string | null,
      clock: null as string | null,
      statusLabel: null as string | null,
      lastType: null as string | null,
      downDistance: null as string | null,
      driveSummary: null as string | null,
      homeTimeoutsRemaining: null as number | null,
      awayTimeoutsRemaining: null as number | null,
      homeTimeoutsUsed: null as number | null,
      awayTimeoutsUsed: null as number | null,
      possessionTeam: null as string | null,
      yardLine: null as number | null,
      yardLineTerritory: null as string | null,
      yardsToEndZone: null as number | null,
    };

    const lastPlay = cumulativePlays[cumulativePlays.length - 1];
    console.log('🔍 [scoreSummary DEBUG] lastPlay:', lastPlay);
    if (lastPlay) {
      const meta = lastPlay.standard
        ? buildMetadataFromStandard(lastPlay.standard)
        : (lastPlay.metadata || {});

      console.log('🔍 [scoreSummary DEBUG] meta:', meta);
      console.log('🔍 [scoreSummary DEBUG] lastPlay.standard:', lastPlay.standard);
      console.log('🔍 [scoreSummary DEBUG] homeScore from meta:', meta.home_points);
      console.log('🔍 [scoreSummary DEBUG] homeScore from standard:', lastPlay.standard?.homeScore);
      
      summary.homePoints = meta.home_points ?? lastPlay.standard?.homeScore ?? 0;
      summary.awayPoints = meta.away_points ?? lastPlay.standard?.awayScore ?? 0;
      
      console.log('✅ [scoreSummary DEBUG] Final scores - Home:', summary.homePoints, 'Away:', summary.awayPoints);
      summary.quarter = meta.quarter_name ?? (lastPlay.standard ? String(lastPlay.standard.quarter) : null);

      if (lastPlay.standard) {
        const { minutes, seconds } = secondsToClock(lastPlay.standard.gameClockSeconds);
        summary.clock = formatClock(minutes, seconds);
      } else if (
        meta.time_remaining_minutes !== undefined &&
        meta.time_remaining_seconds !== undefined
      ) {
        summary.clock = formatClock(meta.time_remaining_minutes, meta.time_remaining_seconds);
      }

      summary.lastType = (lastPlay.standard?.playType || meta.type || '').toString();
      summary.driveSummary = meta.description || lastPlay.standard?.description || null;
      summary.possessionTeam = meta.possession || lastPlay.standard?.possession || null;
      summary.yardLine = meta.yard_line ?? null;
      summary.yardLineTerritory = meta.yard_line_territory ?? null;
      summary.yardsToEndZone =
        meta.yards_to_end_zone ?? lastPlay.standard?.yardsToEndzone ?? null;
    }

    if (currentPlay) {
      const meta = currentPlay.standard
        ? buildMetadataFromStandard(currentPlay.standard)
        : (currentPlay.metadata || {});
      const downResult = formatDownDistance(meta);
      if (downResult) {
        summary.downDistance = downResult;
      }
    }

    if (selectedGame) {
      summary.statusLabel = formatStatusLabel(selectedGame.status, summary.quarter);
    }

    return summary;
  }, [cumulativePlays, currentPlay, selectedGame]);

  const ballPosition = useMemo(() => {
    if (currentSports) {
      return currentSports.end;
    }
    const meta = currentPlay?.metadata;
    if (!meta) {
      return previousBallPosition ?? 50;
    }
    const pos = getFieldPosition(currentPlay, {
      useEnd: true,
      fallback: previousBallPosition ?? null,
    });
    return pos ?? 50;
  }, [currentSports, currentPlay, previousBallPosition]);

  const helmetOrientation: HelmetOrientation = useMemo(() => {
    if (previousBallPosition !== null) {
      const delta = ballPosition - previousBallPosition;
      if (Math.abs(delta) > 0.5) {
        return delta >= 0 ? 'right' : 'left';
      }
    }
    if (directionVector.x < 0) return 'left';
    if (directionVector.x > 0) return 'right';
    return 'right';
  }, [ballPosition, previousBallPosition, directionVector.x]);

  const keyPlayers = useMemo(() => {
    // CRITICAL DEBUG: Log what we're receiving
    console.log('🔍 [keyPlayers DEBUG] currentPlay:', currentPlay);
    console.log('🔍 [keyPlayers DEBUG] currentPlay?.standard:', currentPlay?.standard);
    console.log('🔍 [keyPlayers DEBUG] currentPlay?.standard?.players:', currentPlay?.standard?.players);
    console.log('🔍 [keyPlayers DEBUG] currentPlay?.play_stats:', currentPlay?.play_stats);
    
    // PRIORITY #1: Use StandardPlay.players directly (from adapters) - most reliable
    if (currentPlay?.standard?.players) {
      const { players } = currentPlay.standard;
      console.log('✅ [keyPlayers] standard.players exists:', players);
      
      const keyRoles: Array<keyof typeof players> = ['passer', 'receiver', 'rusher', 'kicker'];
      const result = keyRoles
        .map(role => {
          console.log(`  - Checking role "${role}":`, players[role]);
          return players[role];
        })
        .filter((player): player is NonNullable<typeof player> => Boolean(player))
        .map((player, idx) => ({
          id: player.id || `player_${idx}`,
          name: player.name || 'Unknown Player',  // Full name from adapter
          statSummary: {},
          playerMeta: {
            position: player.position,
            team: player.team,
            team_abbreviation: player.team,
            team_abbr: player.team,
            teamAbbr: player.team,
          },
        }))
        .slice(0, 3);
      
      if (result.length > 0) {
        console.log('✅ [keyPlayers] Using standard.players:', result.map(p => p.name).join(', '));
        return result;
      } else {
        console.warn('⚠️ [keyPlayers] standard.players exists but no valid players found');
      }
    } else {
      console.warn('⚠️ [keyPlayers] currentPlay?.standard?.players is missing or empty');
    }
    
    // FALLBACK: Try play_stats (from converted legacy format or Sleeper data)
    if (currentPlay?.play_stats && currentPlay.play_stats.length > 0) {
      const result = currentPlay.play_stats
        .map(stat => ({
          id: stat.player_id,
          name: getPlayerName(stat, playersById),
          statSummary: stat.stats,
          playerMeta: stat.player || playersById[stat.player_id],
        }))
        .filter(player => {
          const position = player.playerMeta?.position;
          if (!position) return true;
          return !['OL', 'DL', 'T', 'G', 'C'].includes(position);
        })
        .slice(0, 3);
      
      if (result.length > 0) {
        console.log('[keyPlayers] Using play_stats fallback:', result.map(p => p.name).join(', '));
        return result;
      }
    }
    
    console.warn('[keyPlayers] No player data available in standard.players or play_stats');
    return [];
  }, [currentPlay, playersById]);

  const activePlayerIds = useMemo(() => {
    const stats = currentPlay?.play_stats || [];
    return new Set(stats.map(stat => String(stat.player_id)));
  }, [currentPlay]);
  // Note: Badge positions are cosmetic; arc physics are metadata-driven now.

  const currentPenalties = useMemo(() => {
    if (!currentPlay?.metadata) return [];
    const penalties = currentPlay.metadata.penalties;
    return Array.isArray(penalties) ? penalties : [];
  }, [currentPlay]);

  const earliestPlay = plays.length > 0 ? plays[0] : null;
  const formatQuarterClock = (play: Play | null) => {
    if (!play?.standard) return null;
    const { minutes, seconds } = secondsToClock(play.standard.gameClockSeconds);
    return `Q${play.standard.quarter} • ${formatClock(minutes, seconds)}`;
  };
  const { minutes: playClockMinutes, seconds: playClockSeconds } = secondsToClock(
    currentPlay?.standard?.gameClockSeconds ?? null,
  );
  const playClockLabel = formatClock(playClockMinutes, playClockSeconds);

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsPlaying(true);
  };

  const handleAdvance = (direction: 'forward' | 'backward') => {
    if (plays.length === 0) return;
    setIsPlaying(false);
    setCurrentIndex(prev => {
      if (direction === 'forward') {
        return Math.min(prev + 1, plays.length - 1);
      }
      return Math.max(prev - 1, 0);
    });
  };

  const handleToggleLiveMode = () => {
    setIsLiveMode(prev => {
      const newMode = !prev;
      if (newMode) {
        // Entering live mode - jump to last play and stop autoplay
        setCurrentIndex(plays.length - 1);
        setIsPlaying(false);
      }
      return newMode;
    });
  };

  const selectedGameDateLabel = selectedGame ? formatGameDate(selectedGame.date) : null;
  const yardLineTicks = useMemo(() => Array.from({ length: 21 }, (_, idx) => idx * 5), []);
  // Per-team field image and calibration
  const fieldImageInfo = useMemo(() => getFieldImageInfo(selectedGame?.home), [selectedGame]);
  const { mapFieldX } = useMemo(() => {
    const left = fieldImageInfo.calib.leftPct;
    const right = fieldImageInfo.calib.rightPct;
    return makeFieldMappers(left, right);
  }, [fieldImageInfo]);
  const FIELD_VERTICAL_PADDING_PERCENT = fieldImageInfo.calib.verticalPaddingPct;
  // Map Y (0..100) into the playable area bounded by vertical padding
  const mapFieldY = (percent: number): number => {
    const clampedPct = clamp(percent, 0, 100);
    const top = FIELD_VERTICAL_PADDING_PERCENT;
    const bottom = 100 - FIELD_VERTICAL_PADDING_PERCENT;
    const height = bottom - top;
    return top + (clampedPct / 100) * height;
  };
  const lineOfScrimmagePercent = useMemo(() => {
    if (currentSports) {
      return currentSports.start;
    }
    if (!currentPlay) return null;
    if (currentPlay.standard) {
      return currentPlay.standard.startFieldPosition;
    }
    const los = getFieldPosition(currentPlay, {
      useEnd: false,
      fallback: previousBallPosition,
    });
    if (los !== null) return los;
    const meta = currentPlay.metadata || {};
    const yte = typeof meta.yards_to_end_zone === 'number' ? meta.yards_to_end_zone : null;
    const gained = typeof meta.yards_gained === 'number' ? meta.yards_gained : null;
    if (yte !== null && gained !== null) {
      const startYte = clamp(yte + gained, 0, 100);
      return clamp(100 - startYte);
    }
    return previousBallPosition;
  }, [currentSports, currentPlay, previousBallPosition]);

  const firstDownMarkerPercent = useMemo(() => {
    if (currentSports) {
      const marker = computeSportsFirstDownPosition(currentSports.raw, currentSports.start);
      if (marker !== null) {
        return marker;
      }
    }
    if (!currentPlay?.metadata) return null;
    const meta = currentPlay.metadata;
    const distance = typeof meta.distance === 'number' ? meta.distance : null;
    const yardsToEndZone = typeof meta.yards_to_end_zone === 'number' ? meta.yards_to_end_zone : null;
    if (distance === null || yardsToEndZone === null) return null;
    const target = Math.max(yardsToEndZone - distance, 0);
    return clamp(100 - target);
  }, [currentPlay, currentSports]);
  const animationPoints = useMemo(() => {
    if (!isAnimationPlayable) return null;
    if (lineOfScrimmagePercent === null && previousBallPosition === null) return null;
    const startXSource = lineOfScrimmagePercent ?? previousBallPosition ?? ballPosition;
    const endXSource = ballPosition;
    if (startXSource === null || endXSource === null) {
      return null;
    }

    const startXNormBase = clamp(startXSource);
    const endXNormBase = clamp(endXSource);
    const startYBase = clamp(52 + laneOffsetPercent * 0.25, 5, 95);
    const endYBase = clamp(50 + laneOffsetPercent, 5, 95);

    if (
      Number.isNaN(startXNormBase) ||
      Number.isNaN(endXNormBase) ||
      Number.isNaN(startYBase) ||
      Number.isNaN(endYBase)
    ) {
      return null;
    }

    if (currentDirection.kind === 'pass') {
      const startXNorm = startXNormBase;
      const endXNorm = endXNormBase;
      const startY = mapFieldY(startYBase);
      const endY = mapFieldY(endYBase);
      const controlXNorm = clamp((startXNorm + endXNorm) / 2, 0, 100);
      const controlY = mapFieldY(
        clamp(Math.min(startYBase, endYBase) - (currentDirection.isDeep ? 26 : 18), 0, 100),
      );
      return {
        d: `M ${mapFieldX(startXNorm)} ${startY} Q ${mapFieldX(controlXNorm)} ${controlY} ${mapFieldX(endXNorm)} ${endY}`,
        stroke: '#60a5fa',
      };
    }

    const midXNorm = clamp((startXNormBase + endXNormBase) / 2, 0, 100);
    const midY = mapFieldY(clamp((startYBase + endYBase) / 2 + laneOffsetPercent * 0.2, 5, 95));
    return {
      d: `M ${mapFieldX(startXNormBase)} ${mapFieldY(startYBase)} L ${mapFieldX(midXNorm)} ${midY} L ${mapFieldX(endXNormBase)} ${mapFieldY(endYBase)}`,
      stroke: '#34d399',
    };
  }, [
    isAnimationPlayable,
    lineOfScrimmagePercent,
    previousBallPosition,
    ballPosition,
    laneOffsetPercent,
    currentDirection,
    mapFieldX,
    mapFieldY,
  ]);

  useEffect(() => {
    if (!animationPoints) {
      setPathDashOffset(0);
      return;
    }
    setPathDashOffset(1);
    const frame = requestAnimationFrame(() => setPathDashOffset(0));
    return () => cancelAnimationFrame(frame);
  }, [animationPoints, currentIndex]);

  const coverageMessage = useMemo(() => {
    if (!plays.length) return null;
    const sourceLabel = (() => {
      switch (playSource) {
        case 'rest':
          return 'Sleeper REST';
        case 'graphql':
          return 'Sleeper GraphQL';
        case 'sleeper':
          return 'Sleeper data';
        case 'sportsdataio':
          return 'SportsDataIO';
        case 'espn':
          return 'ESPN';
        case 'merged':
          return 'Merged feeds';
        default:
          return 'Unknown source';
      }
    })();
    if (!coverage) {
      return {
        tone: 'warning' as const,
        text: `Loaded ${plays.length} plays via ${sourceLabel}.`,
      };
    }
    if (coverage.complete) {
      return {
        tone: 'success' as const,
        text: `Full game loaded (${plays.length} plays via ${sourceLabel}).`,
      };
    }
    const missing: string[] = [];
    if (!coverage.hasKickoff) missing.push('opening kickoff');
    if (!coverage.hasEnd) missing.push('final whistle');
    const missingText =
      missing.length > 0 ? `Missing ${missing.join(' & ')}` : 'Partial drive log';
    const earliestStamp = formatQuarterClock(earliestPlay);
    return {
      tone: 'warning' as const,
      text: `${missingText} — ${plays.length} plays via ${sourceLabel}${
        earliestStamp ? ` (starts ${earliestStamp})` : ''
      }.`,
    };
  }, [coverage, plays.length, playSource, earliestPlay]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-purple-500/30 bg-black/40 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-purple-300">
              Live Game Visualizer
            </p>
            <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold">
              <Activity className="h-5 w-5 text-green-400" />
              Play-by-Play Field Tracker
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              Select any game from the current week to watch every snap unfold on a live field.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-green-400" />
              <span>{schedule.length} games loaded • Week {week ?? '—'}</span>
            </div>
            {lastUpdatedAt && (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-blue-400" />
                <span>Plays synced {lastUpdatedAt.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-purple-500/20">
          <div className="bg-black/30 px-4 py-2 text-xs uppercase tracking-wide text-purple-300">
            Choose Game
          </div>
          <div className="max-h-48 divide-y divide-purple-500/20 overflow-y-auto">
            {currentWeekGames.length === 0 ? (
              <div className="p-4 text-sm text-gray-400">
                NFL schedule unavailable for this week.
              </div>
            ) : (
              currentWeekGames.map(game => {
                const isActive = game.game_id === selectedGameId;
                const formattedDate = formatGameDate(game.date);
                return (
                  <button
                    key={game.game_id}
                    onClick={() => setSelectedGameId(game.game_id)}
                    className={`flex w-full items-center justify-between px-4 py-3 text-left transition-all ${
                      isActive
                        ? 'bg-purple-600/20 text-white'
                        : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <div>
                      <p className="font-semibold">
                        {game.away} @ {game.home}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatStatusLabel(game.status, null)}
                        {formattedDate ? ` • ${formattedDate}` : ''}
                      </p>
                    </div>
                    {isActive && (
                      <span className="rounded-full border border-green-400/40 px-2 py-1 text-xs font-semibold text-green-400">
                        Watching
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-purple-500/30 bg-black/40 p-6">
        {!selectedGame ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-gray-400">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p>No game selected. Choose a matchup above to begin the live playback.</p>
          </div>
        ) : loading && plays.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center text-gray-300">
            <Loader2 className="h-10 w-10 animate-spin text-green-400" />
            <p>Loading play-by-play data…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="text-red-200">{error}</p>
            <button
              onClick={() => selectedGame && loadGamePlays(selectedGame.game_id)}
              className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/20 px-4 py-2 text-red-200 transition-colors hover:bg-red-500/30"
            >
              <RefreshCw className="h-4 w-4" />
              Retry Fetch
            </button>
          </div>
        ) : plays.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-gray-400">
            <Flag className="h-10 w-10 text-yellow-400" />
            <p>No play data reported yet for this game. Try refreshing once the game kicks off.</p>
            <button
              onClick={() => loadGamePlays(selectedGame.game_id)}
              className="inline-flex items-center gap-2 rounded-lg border border-purple-500/40 bg-purple-600/20 px-4 py-2 text-purple-200 transition-colors hover:bg-purple-600/30"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Plays
            </button>
          </div>
        ) : (
          <React.Fragment>
            <div className="flex justify-center">
              <div className="relative w-full max-w-[1024px] aspect-[512/243] overflow-hidden rounded-xl border border-green-500/30 bg-[#0b3d1a] shadow-lg">
                {fieldImageInfo && fieldImageInfo.src && (
                  <img
                    src={fieldImageInfo.src}
                    alt={`${selectedGame.home} home field`}
                    className="absolute inset-0 h-full w-full object-cover"
                    draggable={false}
                  />
                )}
                <div className="absolute inset-0">
                  <div className="pointer-events-none absolute inset-0">
                    {yardLineTicks.map(tick => (
                      <div
                        key={`tick-${tick}`}
                        className={`absolute ${
                          tick % 10 === 0 ? 'bg-white/70' : 'bg-white/35'
                        }`}
                        style={{
                          left: `${mapFieldX(tick)}%`,
                          top: `${FIELD_VERTICAL_PADDING_PERCENT}%`,
                          bottom: `${FIELD_VERTICAL_PADDING_PERCENT}%`,
                          width: tick === 0 || tick === 100 ? '3px' : '1px',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {lineOfScrimmagePercent !== null && (
                  <div
                    className="absolute border-l-2 border-white"
                    style={{
                      left: `${mapFieldX(lineOfScrimmagePercent)}%`,
                      top: `${FIELD_VERTICAL_PADDING_PERCENT}%`,
                      bottom: `${FIELD_VERTICAL_PADDING_PERCENT}%`,
                    }}
                  />
                )}
                {firstDownMarkerPercent !== null &&
                  lineOfScrimmagePercent !== null &&
                  Math.abs(firstDownMarkerPercent - lineOfScrimmagePercent) > 0.5 && (
                    <div
                      className="absolute border-l-2 border-dashed border-yellow-300"
                      style={{
                        left: `${mapFieldX(firstDownMarkerPercent)}%`,
                        top: `${FIELD_VERTICAL_PADDING_PERCENT}%`,
                        bottom: `${FIELD_VERTICAL_PADDING_PERCENT}%`,
                      }}
                    />
                  )}
                {animationPoints && (
                  <svg
                    className="pointer-events-none absolute inset-0"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    <path
                      d={animationPoints.d}
                      stroke={animationPoints.stroke}
                      strokeWidth={currentDirection.kind === 'pass' ? 1.8 : 1.4}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="1"
                      strokeDashoffset={pathDashOffset}
                      style={{ transition: 'stroke-dashoffset 0.9s ease' }}
                      pathLength={1}
                      opacity={0.9}
                    />
                  </svg>
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="absolute w-px bg-yellow-300"
                    style={{
                      left: `${mapFieldX(ballPosition)}%`,
                      top: `${FIELD_VERTICAL_PADDING_PERCENT}%`,
                      bottom: `${FIELD_VERTICAL_PADDING_PERCENT}%`,
                      transform: 'translateX(-50%)',
                      transition: 'left 0.8s ease',
                    }}
                  />
                  <div
                    className="absolute"
                    style={{
                      left: `${mapFieldX(ballPosition)}%`,
                      transform: 'translate(-50%, -50%)',
                      top: `${mapFieldY(ballLanePercent)}%`,
                      transition: 'left 0.8s ease, top 0.8s ease',
                    }}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border-4 border-white/70 bg-gradient-to-br from-orange-400 to-red-500 text-sm font-bold text-white shadow-xl shadow-black/60 md:h-12 md:w-12">
                      🏈
                    </div>
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-0">
                  {keyPlayers.map((player, idx) => {
                    const isActive = activePlayerIds.has(String(player.id));
                    const playerLanePercent = clamp(42 + idx * 16 + laneOffsetPercent * 0.5, 0, 100);
                    
                    // Get team from play metadata or player metadata with comprehensive fallbacks
                    const offenseTeam = playMeta.team || playMeta.possession || scoreSummary.possessionTeam;
                    const playerTeamCode =
                      player.playerMeta?.team_abbreviation ??
                      player.playerMeta?.team_abbr ??
                      player.playerMeta?.teamAbbr ??
                      player.playerMeta?.team ??
                      null;
                    
                    // For helmet display, use the team that's currently on offense (from play metadata)
                    // Fallback chain: offense team → player team → selected game home/away
                    const teamForHelmet = offenseTeam 
                      || playerTeamCode 
                      || selectedGame?.home 
                      || selectedGame?.away 
                      || '';
                    const normalizedTeam = (teamForHelmet || '').toString().toUpperCase();
                    
                    // Get the helmet style and URL
                    const yearForHelmets = weeklyUniformsYear || season || DEFAULT_UNIFORM_SEASON;
                    const weeklyStyle = weeklyUniformStyles?.[normalizedTeam];
                    
                    // Use default style 'A' if weekly style not available
                    const styleToUse = weeklyStyle || 'A';
                    
                    let helmetSrc: string | null = null;
                    
                    if (normalizedTeam && styleToUse) {
                      try {
                        // Get helmet URL from public directory
                        const urls = getHelmetUrls(String(yearForHelmets), normalizedTeam, styleToUse);
                        helmetSrc = helmetOrientation === 'left' ? urls.left : urls.right;
                      } catch (error) {
                        console.error(`[Helmet] Failed to get helmet for team=${normalizedTeam}, style=${styleToUse}:`, error);
                      }
                    } else {
                      console.warn(`[Helmet] Missing team code for player ${player.name}. team=${normalizedTeam}, offense=${offenseTeam}, playerTeam=${playerTeamCode}`);
                    }

                    return (
                      <div
                        key={player.id}
                        className="absolute"
                        style={{
                          left: `${mapFieldX(clamp(ballPosition + (idx - 1) * 6))}%`,
                          top: `${mapFieldY(playerLanePercent)}%`,
                          transform: 'translate(-50%, -50%)',
                          transition: 'left 0.8s ease, top 0.8s ease',
                        }}
                      >
                        <div className="flex flex-col items-center gap-1">
                          {/* Player name above helmet */}
                          <div className="flex flex-col items-center">
                            <span className={`text-sm font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${
                              isActive ? 'text-emerald-300' : 'text-white'
                            }`}>
                              {player.name}
                            </span>
                            {player.playerMeta?.position && (
                              <span className="text-[10px] uppercase text-gray-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                                {player.playerMeta.position}
                              </span>
                            )}
                          </div>
                          
                          {/* Helmet */}
                          {helmetSrc ? (
                            <img
                              src={helmetSrc}
                              alt={`${teamForHelmet ?? 'team'} helmet`}
                              className={`h-12 w-12 object-contain md:h-14 md:w-14 transition-transform ${
                                isActive ? 'scale-110 drop-shadow-[0_0_12px_rgba(16,185,129,0.7)]' : 'drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]'
                              }`}
                              draggable={false}
                              onError={(e) => {
                                console.error(`[Helmet Load Error] Failed to load: ${helmetSrc}`);
                                e.currentTarget.style.border = '2px solid red';
                              }}
                            />
                          ) : (
                            <div className="flex flex-col items-center">
                              <div className="h-12 w-12 rounded border-2 border-red-500 bg-red-900/40 flex items-center justify-center text-lg text-red-400">
                                ?
                              </div>
                              <span className="text-[9px] text-red-400 mt-1">
                                {normalizedTeam || 'NO_TEAM'} {styleToUse || 'NO_STYLE'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mx-auto mt-6 w-full max-w-4xl">
              <div className="space-y-4 rounded-lg border border-purple-500/20 bg-black/40 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-purple-300">
                      Scoreboard
                    </p>
                    <p className="text-lg font-semibold text-white" data-testid="scoreboard-line">
                      {selectedGame.away}{' '}
                      <span className="text-xl text-green-400">{scoreSummary.awayPoints}</span>{' '}
                      @ {selectedGame.home}{' '}
                      <span className="text-xl text-green-400">{scoreSummary.homePoints}</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {scoreSummary.statusLabel || 'Status Unavailable'}
                    </p>
                    {selectedGameDateLabel && (
                      <p className="text-xs text-gray-500">{selectedGameDateLabel}</p>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 sm:text-right">
                    {scoreSummary.clock && <div>{scoreSummary.clock}</div>}
                    {scoreSummary.possessionTeam && (
                      <div>
                        Possession:{' '}
                        <span className="text-white">{scoreSummary.possessionTeam}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-black/55 p-3">
                    <p className="text-xs uppercase text-gray-400">Drive Summary</p>
                    <p className="text-sm text-gray-200">
                      {scoreSummary.driveSummary || 'Awaiting play-by-play updates.'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/55 p-3">
                    <p className="text-xs uppercase text-gray-400">Last Play Type</p>
                    <p className="text-sm text-gray-200">
                      {currentPlay?.metadata?.type || scoreSummary.lastType || '—'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/55 p-3">
                    <p className="text-xs uppercase text-gray-400">Down & Distance</p>
                    <p className="text-sm text-gray-200">
                      {scoreSummary.downDistance || formatDownDistance(currentPlay?.metadata) || '—'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-black/55 p-3">
                    <p className="text-xs uppercase text-gray-400">Time Remaining</p>
                    <p className="text-sm text-gray-200">{playClockLabel}</p>
                  </div>
                  {typeof playMeta.yards_gained === 'number' && (
                    <div className="rounded-lg border border-white/10 bg-black/55 p-3">
                      <p className="text-xs uppercase text-gray-400">Last Gain</p>
                      <p className="text-sm text-gray-200">{playMeta.yards_gained} yds</p>
                    </div>
                  )}
                  {playMeta.team && (
                    <div className="rounded-lg border border-white/10 bg-black/55 p-3">
                      <p className="text-xs uppercase text-gray-400">Current Offense</p>
                      <p className="text-sm text-gray-200">{playMeta.team}</p>
                    </div>
                  )}
                </div>

                {coverageMessage && (
                  <div
                    className={`rounded-lg border px-3 py-2 text-xs ${
                      coverageMessage.tone === 'success'
                        ? 'border-green-500/40 bg-green-500/15 text-green-200'
                        : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-100'
                    }`}
                  >
                    {coverageMessage.text}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2 text-sm text-gray-200 sm:grid-cols-2">
                  {(scoreSummary.yardLine !== null ||
                    scoreSummary.yardLineTerritory ||
                    scoreSummary.yardsToEndZone !== null) && (
                    <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2">
                      <span className="text-xs uppercase text-gray-400">Ball On</span>
                      <span className="font-semibold">
                        {scoreSummary.yardLineTerritory
                          ? `${scoreSummary.yardLineTerritory} `
                          : ''}
                        {scoreSummary.yardLine !== null ? `${scoreSummary.yardLine}` : '—'}{' '}
                        {scoreSummary.yardsToEndZone !== null
                          ? `• ${scoreSummary.yardsToEndZone} to end zone`
                          : ''}
                      </span>
                    </div>
                  )}
                  {(scoreSummary.homeTimeoutsRemaining !== null ||
                    scoreSummary.awayTimeoutsRemaining !== null) && (
                    <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-300">
                      <span className="uppercase text-gray-400">Timeouts</span>
                      <span>
                        {selectedGame.home}:{' '}
                        {scoreSummary.homeTimeoutsRemaining ?? '—'} • {selectedGame.away}:{' '}
                        {scoreSummary.awayTimeoutsRemaining ?? '—'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mx-auto mt-6 w-full max-w-4xl space-y-4 rounded-lg border border-purple-500/30 bg-black/40 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleLiveMode}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                      isLiveMode
                        ? 'border-red-500/60 bg-red-600/30 text-red-100 shadow-lg shadow-red-500/20'
                        : 'border-gray-500/40 bg-gray-600/20 text-gray-300 hover:bg-gray-600/30'
                    }`}
                    title={isLiveMode ? 'Live mode active - polling every 10s' : 'Enable live mode'}
                  >
                    <RadioTower className={`h-4 w-4 ${isLiveMode ? 'animate-pulse' : ''}`} />
                    {isLiveMode ? 'LIVE' : 'Live Mode'}
                  </button>
                  <div className="h-6 w-px bg-white/20" />
                  <button
                    onClick={() => setIsPlaying(prev => !prev)}
                    disabled={isLiveMode}
                    className={`inline-flex items-center justify-center rounded-full border px-3 py-2 transition-colors ${
                      isLiveMode
                        ? 'cursor-not-allowed border-white/10 bg-white/5 opacity-50'
                        : 'border-purple-500/40 bg-purple-600/20 hover:bg-purple-600/30'
                    }`}
                  >
                    {isPlaying ? (
                      <PauseCircle className="h-5 w-5 text-purple-200" />
                    ) : (
                      <PlayCircle className="h-5 w-5 text-purple-200" />
                    )}
                  </button>
                  <button
                    onClick={handleRestart}
                    disabled={isLiveMode}
                    className={`inline-flex items-center justify-center rounded-full border px-3 py-2 transition-colors ${
                      isLiveMode
                        ? 'cursor-not-allowed border-white/10 bg-white/5 opacity-50'
                        : 'border-green-500/40 bg-green-600/20 hover:bg-green-600/30'
                    }`}
                  >
                    <RotateCcw className="h-5 w-5 text-green-200" />
                  </button>
                  <button
                    onClick={() => handleAdvance('backward')}
                    disabled={isLiveMode}
                    className={`inline-flex items-center justify-center rounded-full border px-3 py-2 transition-colors ${
                      isLiveMode
                        ? 'cursor-not-allowed border-white/10 bg-white/5 opacity-50'
                        : 'border-white/20 bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <SkipBack className="h-5 w-5 text-white" />
                  </button>
                  <button
                    onClick={() => handleAdvance('forward')}
                    disabled={isLiveMode}
                    className={`inline-flex items-center justify-center rounded-full border px-3 py-2 transition-colors ${
                      isLiveMode
                        ? 'cursor-not-allowed border-white/10 bg-white/5 opacity-50'
                        : 'border-white/20 bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <SkipForward className="h-5 w-5 text-white" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>Speed</span>
                  <div className={`flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 ${isLiveMode ? 'opacity-50' : ''}`}>
                    {speedOptions.map((option, idx) => (
                      <button
                        key={option.label}
                        onClick={() => setSpeedIndex(idx)}
                        disabled={isLiveMode}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          idx === speedIndex
                            ? 'bg-purple-600 text-white'
                            : 'text-gray-300 hover:bg-white/10'
                        } ${isLiveMode ? 'cursor-not-allowed' : ''}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => loadGamePlays(selectedGame.game_id, { silent: false })}
                    className="inline-flex items-center gap-1 rounded-full border border-purple-500/40 px-3 py-1 text-purple-200 transition-colors hover:bg-purple-600/20"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Sync Plays
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm text-gray-300">
                <span className="w-16 text-xs uppercase text-gray-400">Timeline</span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(plays.length - 1, 0)}
                  value={currentIndex}
                  onChange={event => {
                    const value = Number(event.target.value);
                    setCurrentIndex(value);
                    setIsPlaying(false);
                  }}
                  disabled={isLiveMode}
                  className={`flex-1 ${isLiveMode ? 'cursor-not-allowed opacity-50' : 'accent-green-400'}`}
                />
                <span className="w-16 text-right text-xs text-gray-400">
                  {currentIndex + 1}/{plays.length}
                </span>
              </div>
              {isLiveMode && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm font-semibold text-red-200">
                    <RadioTower className="h-4 w-4 animate-pulse" />
                    Live Mode Active - Showing latest play • Polling every 10 seconds
                  </div>
                  <p className="mt-1 text-xs text-red-300/80">
                    Playback controls disabled • Last updated: {lastUpdatedAt?.toLocaleTimeString() || 'N/A'}
                  </p>
                </div>
              )}

              {currentPlay && (
                <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <RadioTower className="h-4 w-4 text-green-400" />
                      Play #{currentIndex + 1} • Sequence {currentPlay.sequence}
                    </div>
                    <div className="text-xs text-gray-400">
                      {currentPlay.date
                        ? new Date(currentPlay.date).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : ''}
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-200">
                    {playMeta.description || 'Play description unavailable.'}
                  </p>
                  {playMeta.fantasy_description && (
                    <p className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-300">
                      {playMeta.fantasy_description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 text-xs text-gray-300">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5">
                      <Clock className="h-3 w-3 text-green-300" />
                      <span>
                        Q{playMeta.quarter_name || scoreSummary.quarter || '—'} • {playClockLabel}
                      </span>
                    </div>
                    {playMeta.type && (
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 uppercase tracking-wide text-white/80">
                        {playMeta.type}
                      </span>
                    )}
                  </div>
                  {currentPenalties.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {currentPenalties.map((penalty, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-2 rounded-full border border-yellow-500/40 bg-yellow-500/20 px-3 py-1 text-xs text-yellow-200"
                        >
                          <Flag className="h-3 w-3" />
                          <span>
                            {penalty.description || 'Penalty'}
                            {penalty.yards ? ` (${penalty.yards} yds)` : ''}
                            {penalty.player
                              ? ` • ${penalty.player.first_name ?? ''} ${penalty.player.last_name ?? ''}`
                              : ''}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </React.Fragment>
        )}
      </div>
    </div>
  );
};

export default LiveGameVisualizer;
