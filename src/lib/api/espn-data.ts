export interface EspnScheduleTeam {
  id: string | number | null;
  displayName: string | null;
  name: string | null;
  abbreviation: string | null;
  [key: string]: unknown;
}

export type EspnScheduleStatus =
  | 'pre_game'
  | 'in_progress'
  | 'complete'
  | 'postponed'
  | 'canceled'
  | 'delayed'
  | 'unknown';

export interface EspnScheduleEntry {
  game_id: string | null;
  week: number | null;
  season: number | null;
  season_type: string | null;
  date: string | null;
  status: EspnScheduleStatus;
  status_label: string;
  status_raw: string | null;
  home_team: EspnScheduleTeam | null;
  away_team: EspnScheduleTeam | null;
}

export interface EspnCompetitionStatus extends Record<string, unknown> {
  type?: unknown;
}

export interface EspnCompetitionEntry {
  id: string | null;
  status: EspnCompetitionStatus | null;
  competitors: Record<string, unknown>[];
  raw: Record<string, unknown>;
}

export interface EspnEventPayload {
  id: string;
  date: string | null;
  competitions: EspnCompetitionEntry[];
  raw: Record<string, unknown>;
}

export interface EspnPlayByPlayPayload extends EspnEventPayload {
  drives: Record<string, unknown>[];
  plays: Record<string, unknown>[];
}

export interface EspnPlayerPayload {
  id: string;
  fullName: string | null;
  displayName: string | null;
  position: string | null;
  raw: Record<string, unknown>;
}

export interface EspnSeasonTypeSummary {
  id: string;
  label: string;
  weeks: number[];
  current_week: number | null;
}

export interface EspnScheduleMeta {
  season: number | null;
  requested_season_type: string | null;
  resolved_season_type: string | null;
  requested_week: number | null;
  default_week: number | null;
  default_season_type: string | null;
  season_types: EspnSeasonTypeSummary[];
  week_to_season_type: Record<string, string>;
  generated_at: string | null;
}

export interface EspnScheduleResponse {
  entries: EspnScheduleEntry[];
  meta: EspnScheduleMeta | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toIdString = (value: unknown): string | null => {
  if (typeof value === 'string' && value) {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

const parseRecordArray = (value: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isRecord) as Record<string, unknown>[];
};

const toTitleCase = (value: string): string =>
  value
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const containsAny = (value: string, fragments: string[]): boolean =>
  fragments.some(fragment => value.includes(fragment));

const equalsAny = (value: string, matches: string[]): boolean =>
  matches.includes(value);

const deriveScheduleStatus = (
  rawStatus: string | null,
): { normalized: EspnScheduleStatus; label: string; raw: string | null } => {
  if (!rawStatus) {
    return { normalized: 'unknown', label: 'Unknown', raw: null };
  }

  const trimmed = rawStatus.trim();
  if (!trimmed) {
    return { normalized: 'unknown', label: 'Unknown', raw: null }; 
  }

  const key = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  const postponed = containsAny(key, ['postpon', 'postpone', 'resched', 'ppd']);
  const canceled = containsAny(key, ['cancel', 'forfeit', 'no_contest', 'abandon']);
  const delayed = containsAny(key, [
    'delay',
    'suspend',
    'awaiting_resumption',
    'awaiting_resume',
    'resume_play',
    'weather',
    'lightning',
    'thunder',
    'storm',
    'travel',
    'maintenance',
  ]);
  const complete =
    equalsAny(key, ['post']) ||
    containsAny(key, [
      'final',
      'complete',
      'postgame',
      'post_game',
      'finished',
      'ended',
      'game_over',
      'fulltime',
      'finalized',
      'final_ot',
      'final_overtime',
      'final_pen',
      'end_of_game',
    ]);
  const preGame =
    equalsAny(key, ['pre']) ||
    containsAny(key, [
      'pregame',
      'pre_game',
      'scheduled',
      'schedule',
      'preview',
      'upcoming',
      'not_started',
      'time_tbd',
      'tbd',
      'tba',
      'to_be_determined',
      'to_be_announced',
      'warmup',
      'warm_up',
      'lineup',
      'tentative',
      'flex',
      'awaiting_start',
      'waiting_start',
      'pre_event',
    ]);
  const inProgress =
    containsAny(key, [
      'in_progress',
      'inprogress',
      'live',
      'halftime',
      'midgame',
      'mid_game',
      'end_of_',
      'endperiod',
      'end_period',
      '2nd_half',
      'second_half',
      'third_quarter',
      '3rd_quarter',
      'fourth_quarter',
      '4th_quarter',
      'overtime',
      'ot',
      'start_of',
      'kickoff',
      'resumed',
      'q1',
      'q2',
      'q3',
      'q4',
      'first_quarter',
      'second_quarter',
      'third_quarter',
      'fourth_quarter',
    ]) || equalsAny(key, ['live']);

  let normalized: EspnScheduleStatus = 'unknown';
  if (postponed) {
    normalized = 'postponed';
  } else if (canceled) {
    normalized = 'canceled';
  } else if (delayed) {
    normalized = 'delayed';
  } else if (complete) {
    normalized = 'complete';
  } else if (preGame) {
    normalized = 'pre_game';
  } else if (inProgress) {
    normalized = 'in_progress';
  }

  const label = (() => {
    switch (normalized) {
      case 'in_progress':
        return 'Live';
      case 'complete':
        return 'Final';
      case 'pre_game':
        return 'Scheduled';
      case 'postponed':
        return 'Postponed';
      case 'canceled':
        return 'Canceled';
      case 'delayed':
        return 'Delayed';
      default:
        return toTitleCase(trimmed.replace(/[_-]+/g, ' '));
    }
  })();

  return { normalized, label, raw: trimmed };
};

const parseCompetitionStatus = (value: unknown): EspnCompetitionStatus | null => {
  if (isRecord(value)) {
    return value as EspnCompetitionStatus;
  }
  if (typeof value === 'string' && value) {
    return { type: value };
  }
  return null;
};

const parseCompetitionEntry = (value: unknown): EspnCompetitionEntry | null => {
  if (!isRecord(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = toIdString(record.id ?? record['id']);
  const status = parseCompetitionStatus(record.status ?? record['status']);
  const competitors = parseRecordArray(record.competitors ?? record['competitors']);

  return {
    id,
    status,
    competitors,
    raw: record,
  };
};

const parseEventPayload = (value: unknown): EspnEventPayload | null => {
  if (!isRecord(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id =
    toIdString(record.id ?? record['id']) ??
    toIdString(record.event_id ?? record['event_id']) ??
    toIdString(record.eventId ?? record['eventId']);

  if (!id) {
    return null;
  }

  const competitionsSource = Array.isArray(record.competitions ?? record['competitions'])
    ? (record.competitions ?? record['competitions'])
    : [];
  const competitions = (competitionsSource as unknown[])
    .map(parseCompetitionEntry)
    .filter((entry): entry is EspnCompetitionEntry => entry !== null);

  const date = typeof record.date === 'string' ? record.date : null;

  return {
    id,
    date,
    competitions,
    raw: record,
  };
};

const parseListWithItems = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) {
    return parseRecordArray(value);
  }
  if (isRecord(value) && Array.isArray(value.items)) {
    return parseRecordArray(value.items);
  }
  return [];
};

const parsePlayByPlayPayload = (value: unknown): EspnPlayByPlayPayload | null => {
  const base = parseEventPayload(value);
  if (!base) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const drives = parseListWithItems(record.drives ?? record['drives']);
  const plays = parseListWithItems(record.plays ?? record['plays']);

  return {
    ...base,
    drives,
    plays,
  };
};

const parsePlayerPayload = (value: unknown): EspnPlayerPayload | null => {
  if (!isRecord(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id =
    toIdString(record.id ?? record['id']) ??
    toIdString(record.playerId ?? record['playerId']) ??
    toIdString(record.athleteId ?? record['athleteId']);

  if (!id) {
    return null;
  }

  const fullName = typeof record.fullName === 'string' ? record.fullName : null;
  const displayName = typeof record.displayName === 'string' ? record.displayName : null;

  let position: string | null = null;
  const positionValue = record.position ?? record['position'];
  if (typeof positionValue === 'string') {
    position = positionValue;
  } else if (isRecord(positionValue) && typeof positionValue.abbreviation === 'string') {
    position = positionValue.abbreviation as string;
  }

  return {
    id,
    fullName,
    displayName,
    position,
    raw: record,
  };
};

interface FetchOptions {
  forceRefresh?: boolean;
  includeMeta?: boolean;
  useMemo?: boolean;
}

const SCHEDULE_MEMO = new Map<string, { data: EspnScheduleResponse; ts: number }>();
const SCHEDULE_MEMO_TTL_MS = 60_000;

const getScheduleMemo = (key: string): EspnScheduleResponse | null => {
  const entry = SCHEDULE_MEMO.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.ts > SCHEDULE_MEMO_TTL_MS) {
    SCHEDULE_MEMO.delete(key);
    return null;
  }
  return entry.data;
};

const setScheduleMemo = (key: string, value: EspnScheduleResponse) => {
  SCHEDULE_MEMO.set(key, { data: value, ts: Date.now() });
};

const parseTeam = (value: unknown): EspnScheduleTeam | null => {
  if (!isRecord(value)) {
    return null;
  }

  const idValue = value.id;
  const id = typeof idValue === 'string' || typeof idValue === 'number' ? idValue : null;
  const displayName = typeof value.displayName === 'string' ? value.displayName : null;
  const name = typeof value.name === 'string' ? value.name : null;
  const abbreviation = typeof value.abbreviation === 'string' ? value.abbreviation : null;

  return {
    id,
    displayName,
    name,
    abbreviation,
    ...value,
  } as EspnScheduleTeam;
};

const normalizeSeasonType = (value: string): string => {
  const key = value.toLowerCase();
  switch (key) {
    case 'preseason':
    case 'pre-season':
    case 'pre':
      return 'pre';
    case 'postseason':
    case 'post-season':
    case 'playoffs':
    case 'playoff':
    case 'post':
      return 'post';
    case 'playin':
    case 'play-in':
    case 'play_in':
      return 'playin';
    default:
      return 'regular';
  }
};

const parseScheduleEntry = (value: unknown): EspnScheduleEntry | null => {
  if (!isRecord(value)) {
    return null;
  }

  const rawId = value.game_id ?? value.id ?? null;
  const gameId =
    typeof rawId === 'string'
      ? rawId
      : typeof rawId === 'number'
      ? String(rawId)
      : null;

  const week = Number.isFinite(Number(value.week)) ? Number(value.week) : null;
  const season = Number.isFinite(Number(value.season)) ? Number(value.season) : null;
  const seasonType = typeof value.season_type === 'string' ? value.season_type : null;
  const date = typeof value.date === 'string' ? value.date : null;
  const rawStatus = typeof value.status === 'string' ? value.status : null;
  const { normalized, label, raw } = deriveScheduleStatus(rawStatus);

  const homeTeam = parseTeam(value.home_team);
  const awayTeam = parseTeam(value.away_team);

  return {
    game_id: gameId,
    week,
    season,
    season_type: seasonType,
    date,
    status: normalized,
    status_label: label,
    status_raw: raw,
    home_team: homeTeam,
    away_team: awayTeam,
  };
};

async function fetchJson(url: string): Promise<any | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Request failed (${response.status}): ${response.statusText}`);
      return null;
    }
    return response.json();
  } catch (error) {
    console.error('Network error while fetching PyESPN data:', error);
    return null;
  }
}

export async function fetchEspnSchedule(
  seasonType: string,
  season: number,
  week: number,
  options: FetchOptions & { includeMeta: true },
): Promise<EspnScheduleResponse>;

export async function fetchEspnSchedule(
  seasonType: string,
  season: number,
  week: number,
  options?: FetchOptions,
): Promise<EspnScheduleEntry[]>;

export async function fetchEspnSchedule(
  seasonType: string,
  season: number,
  week: number,
  options: FetchOptions = {},
): Promise<EspnScheduleEntry[] | EspnScheduleResponse> {
  const normalizedSeasonType = normalizeSeasonType(seasonType);
  const encodedSeasonType = encodeURIComponent(normalizedSeasonType);
  const encodedSeason = encodeURIComponent(String(season));
  const encodedWeek = encodeURIComponent(String(week));
  const query = options.forceRefresh ? '?force=refresh' : '';
  const memoKey = `${normalizedSeasonType}:${season}:${week}`;
  const useMemo = options.useMemo !== false;
  if (useMemo && !options.forceRefresh) {
    const memoized = getScheduleMemo(memoKey);
    if (memoized) {
      return options.includeMeta ? memoized : memoized.entries;
    }
  }
  const data = await fetchJson(`/api/espn/schedule/${encodedSeasonType}/${encodedSeason}/${encodedWeek}${query}`);
  const parsed: EspnScheduleResponse = (() => {
    if (isRecord(data) && !Array.isArray(data)) {
      const entries = Array.isArray(data.entries) ? data.entries : [];
      const metaRecord = isRecord(data.meta) ? (data.meta as Record<string, unknown>) : null;
      const entriesParsed = entries
        .map(parseScheduleEntry)
        .filter((entry): entry is EspnScheduleEntry => entry !== null);
      const seasonTypes = Array.isArray(metaRecord?.season_types)
        ? (metaRecord?.season_types as unknown[]).reduce<EspnSeasonTypeSummary[]>((acc, value) => {
            if (!isRecord(value)) {
              return acc;
            }
            const id = typeof value.id === 'string' ? value.id : null;
            if (!id) {
              return acc;
            }
            const label = typeof value.label === 'string' ? value.label : id;
            const weeksRaw = Array.isArray(value.weeks) ? value.weeks : [];
            const weeks = weeksRaw
              .map(item => Number(item))
              .filter(num => Number.isFinite(num))
              .map(num => Number(num));
            const currentWeek = Number.isFinite(Number(value.current_week))
              ? Number(value.current_week)
              : null;
            acc.push({ id, label, weeks, current_week: currentWeek });
            return acc;
          }, [])
        : [];
      const weekToType = isRecord(metaRecord?.week_to_season_type)
        ? (metaRecord?.week_to_season_type as Record<string, string>)
        : {};
      const meta: EspnScheduleMeta | null = metaRecord
        ? {
            season: Number.isFinite(Number(metaRecord.season)) ? Number(metaRecord.season) : null,
            requested_season_type:
              typeof metaRecord.requested_season_type === 'string' ? metaRecord.requested_season_type : null,
            resolved_season_type:
              typeof metaRecord.resolved_season_type === 'string' ? metaRecord.resolved_season_type : null,
            requested_week: Number.isFinite(Number(metaRecord.requested_week))
              ? Number(metaRecord.requested_week)
              : null,
            default_week: Number.isFinite(Number(metaRecord.default_week)) ? Number(metaRecord.default_week) : null,
            default_season_type:
              typeof metaRecord.default_season_type === 'string' ? metaRecord.default_season_type : null,
            season_types: seasonTypes,
            week_to_season_type: weekToType,
            generated_at: typeof metaRecord.generated_at === 'string' ? metaRecord.generated_at : null,
          }
        : null;
      return { entries: entriesParsed, meta };
    }
    const entries = Array.isArray(data) ? data : [];
    const parsedEntries = entries
      .map(parseScheduleEntry)
      .filter((entry): entry is EspnScheduleEntry => entry !== null);
    return { entries: parsedEntries, meta: null };
  })();
  if (useMemo) {
    setScheduleMemo(memoKey, parsed);
  }
  return options.includeMeta ? parsed : parsed.entries;
}

export async function fetchEspnEvent(
  eventId: string,
  options: FetchOptions = {},
): Promise<EspnEventPayload | null> {
  const suffix = options.forceRefresh ? '?force=refresh' : '';
  const data = await fetchJson(`/api/espn/game/${encodeURIComponent(eventId)}${suffix}`);
  return parseEventPayload(data);
}

export async function fetchEspnPlayByPlay(
  eventId: string,
  options: FetchOptions = {},
): Promise<EspnPlayByPlayPayload | null> {
  const suffix = options.forceRefresh ? '?force=refresh' : '';
  const data = await fetchJson(`/api/espn/game/${encodeURIComponent(eventId)}/pbp${suffix}`);
  return parsePlayByPlayPayload(data);
}

export async function fetchEspnPlayer(
  playerId: string,
  options: FetchOptions = {},
): Promise<EspnPlayerPayload | null> {
  const suffix = options.forceRefresh ? '?force=refresh' : '';
  const data = await fetchJson(`/api/espn/player/${encodeURIComponent(playerId)}${suffix}`);
  return parsePlayerPayload(data);
}
