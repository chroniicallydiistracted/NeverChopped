import {
  fetchEspnEvent,
  fetchEspnPlayByPlay,
  type EspnEventPayload,
  type EspnPlayByPlayPayload,
} from '../../../lib/api/espn-data';
import type {
  PyEspnDataSource,
  PyEspnGamePayload,
  PyEspnPlay,
  PyEspnTeam,
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

const normalizeTeam = (team: unknown): PyEspnTeam | null => {
  if (!isRecord(team)) {
    return null;
  }

  const source = isRecord(team.team) ? team.team : team;
  const idValue = source.id;
  const id = typeof idValue === 'string' || typeof idValue === 'number' ? idValue : null;
  const displayName =
    typeof source.displayName === 'string'
      ? source.displayName
      : typeof source.shortDisplayName === 'string'
      ? source.shortDisplayName
      : null;
  const nameValue = typeof source.name === 'string' ? source.name : null;
  const name = displayName ?? nameValue ?? null;
  const abbreviation = typeof source.abbreviation === 'string' ? source.abbreviation : null;

  let scoreValue: unknown = null;
  if ('score' in team) {
    scoreValue = (team as Record<string, unknown>).score;
  } else if (isRecord(team.team) && 'score' in team.team) {
    scoreValue = team.team.score;
  }

  const numericScore = Number(scoreValue);
  const score =
    Number.isFinite(numericScore) && numericScore >= 0
      ? numericScore
      : typeof scoreValue === 'number' && Number.isFinite(scoreValue)
      ? scoreValue
      : typeof scoreValue === 'string' && Number.isFinite(Number(scoreValue))
      ? Number(scoreValue)
      : null;

  return {
    id,
    name,
    abbreviation,
    score,
  };
};

const normalizePlay = (play: unknown): PyEspnPlay | null => {
  if (!isRecord(play)) {
    return null;
  }

  const rawId = play.id ?? play.uid ?? null;
  const id =
    typeof rawId === 'string'
      ? rawId
      : rawId !== null && rawId !== undefined
      ? String(rawId)
      : '';
  if (!id) {
    return null;
  }

  const sequenceCandidate =
    play.sequence ?? play.sequence_number ?? play.sequenceNumber ?? (typeof play.id === 'number' ? play.id : undefined);
  const sequence = Number(sequenceCandidate);
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
    clockRecord && typeof clockRecord.displayValue === 'string'
      ? clockRecord.displayValue
      : typeof clockRecord?.display_value === 'string'
      ? clockRecord.display_value
      : null;
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

const extractStatusText = (status: Record<string, unknown> | null): string | null => {
  if (!status) {
    return null;
  }
  const typeValue = status.type;
  if (isRecord(typeValue)) {
    if (typeof typeValue.state === 'string' && typeValue.state) {
      return typeValue.state;
    }
    if (typeof typeValue.description === 'string' && typeValue.description) {
      return typeValue.description;
    }
    if (typeof typeValue.detail === 'string' && typeValue.detail) {
      return typeValue.detail;
    }
    if (typeof typeValue.shortDetail === 'string' && typeValue.shortDetail) {
      return typeValue.shortDetail;
    }
  } else if (typeof typeValue === 'string') {
    return typeValue;
  }
  if (typeof status.name === 'string' && status.name) {
    return status.name;
  }
  if (typeof status.text === 'string' && status.text) {
    return status.text;
  }
  return null;
};

const normalizePayload = (
  eventPayload: EspnEventPayload | null,
  pbpPayload: EspnPlayByPlayPayload | null,
): PyEspnGamePayload | null => {
  const base = pbpPayload ?? eventPayload;
  if (!base) {
    return null;
  }

  const competition = base.competitions.find(entry => entry && Array.isArray(entry.competitors)) || null;
  const statusRecord = (competition?.status ?? null) as Record<string, unknown> | null;
  const statusText = extractStatusText(statusRecord);

  let clock: string | null = null;
  if (statusRecord) {
    if (typeof statusRecord.displayClock === 'string') {
      clock = statusRecord.displayClock;
    } else if (typeof statusRecord.clock === 'string') {
      clock = statusRecord.clock;
    }
  }

  let quarter: number | null = null;
  if (statusRecord) {
    const periodValue = statusRecord.period;
    if (isRecord(periodValue) && Number.isFinite(Number(periodValue.number))) {
      quarter = Number(periodValue.number);
    } else if (Number.isFinite(Number(periodValue))) {
      quarter = Number(periodValue);
    }
  }

  const competitors = competition?.competitors ?? [];
  const homeCompetitor = competitors.find(entry => {
    const homeAway = (entry as Record<string, unknown>).homeAway;
    return typeof homeAway === 'string' && homeAway === 'home';
  });
  const awayCompetitor = competitors.find(entry => {
    const homeAway = (entry as Record<string, unknown>).homeAway;
    return typeof homeAway === 'string' && homeAway === 'away';
  });

  const playsSource: unknown[] = [];
  const drives = pbpPayload?.drives ?? [];
  drives.forEach(drive => {
    const driveRecord = drive as Record<string, unknown>;
    const drivePlays = driveRecord.plays;
    if (Array.isArray(drivePlays)) {
      playsSource.push(...drivePlays);
    } else if (isRecord(drivePlays) && Array.isArray(drivePlays.items)) {
      playsSource.push(...drivePlays.items);
    }
  });

  if (!playsSource.length) {
    const playsRaw = pbpPayload?.plays ?? [];
    playsRaw.forEach(play => {
      playsSource.push(play);
    });
  }

  const plays: PyEspnPlay[] = playsSource
    .map(normalizePlay)
    .filter((play): play is PyEspnPlay => play !== null)
    .sort((a, b) => a.sequence - b.sequence);

  const meta: PyEspnGamePayload['game'] = {
    id: base.id,
    date: base.date,
    status: statusText,
    quarter,
    clock,
    homeTeam: normalizeTeam(homeCompetitor),
    awayTeam: normalizeTeam(awayCompetitor),
  };

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

  const [eventPayload, pbpPayload] = await Promise.all([
    fetchEspnEvent(gameId, { forceRefresh }),
    fetchEspnPlayByPlay(gameId, { forceRefresh }),
  ]);
  const normalized = normalizePayload(eventPayload, pbpPayload);
  if (!normalized) {
    console.warn(
      `PyESPN payload unavailable for game ${gameId}; verify event and play-by-play availability.`,
      {
        eventAvailable: Boolean(eventPayload),
        playByPlayAvailable: Boolean(pbpPayload),
      },
    );
  }
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
