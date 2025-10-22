export interface EspnScheduleTeam {
  id: string | number | null;
  displayName: string | null;
  name: string | null;
  abbreviation: string | null;
  [key: string]: unknown;
}

export interface EspnScheduleEntry {
  game_id: string | null;
  week: number | null;
  season: number | null;
  season_type: string | null;
  date: string | null;
  status: string | null;
  home_team: EspnScheduleTeam | null;
  away_team: EspnScheduleTeam | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

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
  const status = typeof value.status === 'string' ? value.status : null;

  const homeTeam = parseTeam(value.home_team);
  const awayTeam = parseTeam(value.away_team);

  return {
    game_id: gameId,
    week,
    season,
    season_type: seasonType,
    date,
    status,
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
): Promise<EspnScheduleEntry[]> {
  const normalizedSeasonType = normalizeSeasonType(seasonType);
  const data = await fetchJson(`/api/espn/schedule/${normalizedSeasonType}/${season}/${week}`);
  if (!Array.isArray(data)) {
    return [];
  }
  return data
    .map(parseScheduleEntry)
    .filter((entry): entry is EspnScheduleEntry => entry !== null);
}

export async function fetchEspnEvent(eventId: string): Promise<Record<string, unknown> | null> {
  const data = await fetchJson(`/api/espn/game/${eventId}`);
  return isRecord(data) ? data : null;
}

export async function fetchEspnPlayByPlay(eventId: string): Promise<Record<string, unknown> | null> {
  const data = await fetchJson(`/api/espn/game/${eventId}/pbp`);
  return isRecord(data) ? data : null;
}

export async function fetchEspnPlayer(playerId: string): Promise<Record<string, unknown> | null> {
  const data = await fetchJson(`/api/espn/player/${playerId}`);
  return isRecord(data) ? data : null;
}
