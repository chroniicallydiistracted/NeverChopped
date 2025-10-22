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

  let normalized: EspnScheduleStatus = 'unknown';
  if (key.includes('in_progress') || key.includes('inprogress') || key === 'live') {
    normalized = 'in_progress';
  } else if (
    key.includes('final') ||
    key.includes('complete') ||
    key.includes('postgame') ||
    key.includes('post_game') ||
    key.includes('finished') ||
    key.includes('ended')
  ) {
    normalized = 'complete';
  } else if (
    key === 'pre' ||
    key.includes('pregame') ||
    key.includes('pre_game') ||
    key.includes('scheduled') ||
    key.includes('preview') ||
    key.includes('upcoming') ||
    key.includes('not_started')
  ) {
    normalized = 'pre_game';
  } else if (key.includes('postpon')) {
    normalized = 'postponed';
  } else if (key.includes('cancel')) {
    normalized = 'canceled';
  } else if (key.includes('delay')) {
    normalized = 'delayed';
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
}

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
  options: FetchOptions = {},
): Promise<EspnScheduleEntry[]> {
  const normalizedSeasonType = normalizeSeasonType(seasonType);
  const encodedSeasonType = encodeURIComponent(normalizedSeasonType);
  const encodedSeason = encodeURIComponent(String(season));
  const encodedWeek = encodeURIComponent(String(week));
  const suffix = options.forceRefresh ? '?force=refresh' : '';
  const data = await fetchJson(`/api/espn/schedule/${encodedSeasonType}/${encodedSeason}/${encodedWeek}${suffix}`);
  if (!Array.isArray(data)) {
    return [];
  }
  return data
    .map(parseScheduleEntry)
    .filter((entry): entry is EspnScheduleEntry => entry !== null);
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
