export interface PyEspnTeam {
  id: string | number | null;
  name: string | null;
  abbreviation: string | null;
  score?: number | null;
}

export interface PyEspnClock {
  minutes: string | number | null;
  seconds: string | number | null;
  displayValue?: string | null;
}

export interface PyEspnPlaySituation {
  down?: number | null;
  distance?: number | null;
  yardsToGo?: number | null;
  yardsToEndzone?: number | null;
  team?: PyEspnTeam | null;
  possessionText?: string | null;
  shortDownDistanceText?: string | null;
  downDistanceText?: string | null;
  isRedZone?: boolean | null;
}

export interface PyEspnPlayType {
  id?: string | number | null;
  text?: string | null;
  shortText?: string | null;
  abbreviation?: string | null;
  description?: string | null;
  slug?: string | null;
  [key: string]: unknown;
}

export interface PyEspnPlayParticipant {
  id: string | number | null;
  name: string | null;
  position: string | null;
  team: string | null;
  stats: Record<string, number>;
}

export interface PyEspnCoordinate {
  x?: number | null;
  y?: number | null;
}

export interface PyEspnPlay {
  id: string;
  sequence: number;
  type: PyEspnPlayType | null;
  text: string | null;
  shortText?: string | null;
  altText?: string | null;
  quarter: number | null;
  clock: PyEspnClock;
  homeScore: number | null;
  awayScore: number | null;
  scoringPlay: boolean | null;
  scoreValue: number | null;
  statYardage: number | null;
  start: PyEspnPlaySituation | null | undefined;
  end: PyEspnPlaySituation | null | undefined;
  team: PyEspnTeam | null | undefined;
  participants: PyEspnPlayParticipant[];
  coordinate?: PyEspnCoordinate | null;
}

export interface PyEspnGameMetaClock {
  period?: number | null;
  clock?: string | null;
}

export interface PyEspnGameInfo {
  id: string;
  date: string | null;
  status: string | null;
  quarter: number | null;
  clock: string | null;
  homeTeam: PyEspnTeam | null;
  awayTeam: PyEspnTeam | null;
}

export interface PyEspnGamePayload {
  game: PyEspnGameInfo;
  plays: PyEspnPlay[];
}

export type PyEspnDataSource = PyEspnGamePayload | null;
