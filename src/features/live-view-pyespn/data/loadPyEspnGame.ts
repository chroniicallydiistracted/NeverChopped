import { fetchEspnGameData } from '../../../lib/api/espn-data';
import type {
  PyEspnDataSource,
  PyEspnGamePayload,
  PyEspnPlay,
} from './pyespn-types';

const CACHE_TTL_MS = 30_000;

interface CacheEntry {
  data: PyEspnGamePayload | null;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const sanitizeClockValue = (value: unknown): string | number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    return value.trim();
  }
  return null;
};

const normalizeTeam = (team: unknown): PyEspnPlay['team'] => {
  if (!isRecord(team)) {
    return null;
  }

  const id = 'id' in team ? team.id : null;
  const name = 'name' in team ? team.name : null;
  const abbreviation = 'abbreviation' in team ? team.abbreviation : null;
  const scoreRaw = 'score' in team ? team.score : undefined;
  const numericScore = Number(scoreRaw);

  return {
    id: typeof id === 'string' || typeof id === 'number' ? id : null,
    name: typeof name === 'string' ? name : null,
    abbreviation: typeof abbreviation === 'string' ? abbreviation : null,
    score:
      Number.isFinite(numericScore) && numericScore >= 0
        ? numericScore
        : typeof scoreRaw === 'number' && Number.isFinite(scoreRaw)
        ? scoreRaw
        : null,
  };
};

const normalizePlay = (play: unknown): PyEspnPlay | null => {
  if (!isRecord(play)) {
    return null;
  }

  const id = typeof play.id === 'string' ? play.id : String(play.id ?? '');
  if (!id) {
    return null;
  }

  const sequence = Number(play.sequence ?? play.sequence_number ?? NaN);
  if (!Number.isFinite(sequence)) {
    return null;
  }

  const participants: PyEspnPlay['participants'] = Array.isArray(play.participants)
    ? play.participants
        .map(participant => {
          if (!isRecord(participant)) {
            return null;
          }
          const statsValue = isRecord(participant.stats) ? participant.stats : {};
          const stats: Record<string, number> = {};
          Object.entries(statsValue).forEach(([key, raw]) => {
            const numeric = Number(raw);
            if (Number.isFinite(numeric)) {
              stats[key] = numeric;
            }
          });

          return {
            id: participant.id ?? null,
            name: typeof participant.name === 'string' ? participant.name : null,
            position: typeof participant.position === 'string' ? participant.position : null,
            team: typeof participant.team === 'string' ? participant.team : null,
            stats,
          };
        })
        .filter((value): value is PyEspnPlay['participants'][number] => value !== null)
    : [];

  const type = isRecord(play.type) ? (play.type as PyEspnPlay['type']) : null;

  const start = isRecord(play.start) ? (play.start as PyEspnPlay['start']) : null;
  const end = isRecord(play.end) ? (play.end as PyEspnPlay['end']) : null;

  const team = normalizeTeam(play.team);

  const clockRecord = isRecord(play.clock) ? play.clock : null;
  const displayValue =
    clockRecord && typeof clockRecord.displayValue === 'string' ? clockRecord.displayValue : null;
  const fallbackMinutes = displayValue ? displayValue.split(':')[0] : null;
  const fallbackSeconds = displayValue ? displayValue.split(':')[1] : null;

  const clock = clockRecord
    ? {
        minutes: sanitizeClockValue(clockRecord.minutes ?? fallbackMinutes),
        seconds: sanitizeClockValue(clockRecord.seconds ?? fallbackSeconds),
        displayValue,
      }
    : { minutes: null, seconds: null, displayValue: null };

  const coordinate = isRecord(play.coordinate) ? play.coordinate : null;

  return {
    id,
    sequence,
    type,
    text: typeof play.text === 'string' ? play.text : null,
    shortText: typeof play.shortText === 'string' ? play.shortText : null,
    altText: typeof play.altText === 'string' ? play.altText : null,
    quarter: Number.isFinite(Number(play.quarter)) ? Number(play.quarter) : null,
    clock,
    homeScore: Number.isFinite(Number(play.homeScore)) ? Number(play.homeScore) : null,
    awayScore: Number.isFinite(Number(play.awayScore)) ? Number(play.awayScore) : null,
    scoringPlay:
      typeof play.scoringPlay === 'boolean'
        ? play.scoringPlay
        : typeof play.scoringPlay === 'string'
        ? play.scoringPlay.toLowerCase() === 'true'
        : null,
    scoreValue: Number.isFinite(Number(play.scoreValue)) ? Number(play.scoreValue) : null,
    statYardage: Number.isFinite(Number(play.statYardage)) ? Number(play.statYardage) : null,
    start,
    end,
    team,
    participants,
    coordinate,
  };
};

const normalizePayload = (payload: unknown): PyEspnGamePayload | null => {
  if (!isRecord(payload)) {
    return null;
  }

  const game = isRecord(payload.game) ? payload.game : null;
  const playsRaw = Array.isArray(payload.plays) ? payload.plays : [];
  const plays: PyEspnPlay[] = playsRaw
    .map(normalizePlay)
    .filter((play): play is PyEspnPlay => play !== null)
    .sort((a, b) => a.sequence - b.sequence);

  if (!game) {
    return null;
  }

  const meta = {
    id: typeof game.id === 'string' ? game.id : String(game.id ?? ''),
    date: typeof game.date === 'string' ? game.date : null,
    status: typeof game.status === 'string' ? game.status : null,
    quarter: Number.isFinite(Number(game.quarter)) ? Number(game.quarter) : null,
    clock: typeof game.clock === 'string' ? game.clock : null,
    homeTeam: normalizeTeam(game.homeTeam),
    awayTeam: normalizeTeam(game.awayTeam),
  } as PyEspnGamePayload['game'];

  if (!meta.id) {
    return null;
  }

  return {
    game: meta,
    plays,
  };
};

export interface LoadPyEspnGameOptions {
  gameId: string;
  forceRefresh?: boolean;
}

export async function loadPyEspnGame({ gameId, forceRefresh }: LoadPyEspnGameOptions): Promise<PyEspnDataSource> {
  if (!gameId) {
    return null;
  }

  const now = Date.now();
  const cached = cache.get(gameId);
  if (cached && !forceRefresh && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const payload = await fetchEspnGameData(gameId);
  const normalized = normalizePayload(payload);
  cache.set(gameId, { data: normalized, fetchedAt: now });
  return normalized;
}

export function clearPyEspnGameCache(gameId?: string) {
  if (gameId) {
    cache.delete(gameId);
  } else {
    cache.clear();
  }
}
