export interface StandardPlayer {
  id: string;
  name: string;
  position: string;
  team: string;
  jerseyNumber?: string;
}

export interface StandardPenalty {
  description: string;
  yards: number | null;
  team: string | null;
  player?: StandardPlayer | null;
}

export type StandardPlayType =
  | 'rush'
  | 'pass'
  | 'punt'
  | 'kickoff'
  | 'field_goal'
  | 'extra_point'
  | 'two_point'
  | 'timeout'
  | 'penalty'
  | 'unknown';

export interface StandardPlay {
  id: string;
  gameId: string;
  sequence: number;

  quarter: number;
  gameClockSeconds: number;
  homeTeam: string;
  awayTeam: string;
  possession: string;

  playType: StandardPlayType;
  description: string;

  startFieldPosition: number;
  endFieldPosition: number;
  yardsGained: number;

  down: number | null;
  yardsToGo: number | null;
  yardsToEndzone: number;

  direction: {
    category: 'left' | 'middle' | 'right' | null;
    isDeep: boolean;
    isShort: boolean;
  };

  homeScore: number;
  awayScore: number;
  isTouchdown: boolean;
  isFieldGoal: boolean;
  isSafety: boolean;

  pass?: {
    isComplete: boolean;
    isInterception: boolean;
    airYards: number | null;
    yardsAfterCatch: number | null;
    location: 'left' | 'middle' | 'right' | null;
    depth: 'short' | 'deep' | null;
  };

  rush?: {
    location: 'left' | 'middle' | 'right' | null;
    gap: 'end' | 'tackle' | 'guard' | 'center' | null;
  };

  players: {
    passer?: StandardPlayer;
    receiver?: StandardPlayer;
    rusher?: StandardPlayer;
    kicker?: StandardPlayer;
    [role: string]: StandardPlayer | undefined;
  };

  penalties?: StandardPenalty[] | null;

  playerPositions?: {
    playerId: string;
    x: number;
    y: number;
    team: string;
  }[];

  metrics?: {
    epa: number | null;
    winProbability: number | null;
    winProbabilityAdded: number | null;
    successRate: number | null;
  };

  dataSource: 'sportsdataio' | 'espn' | 'sleeper' | 'merged';
  rawData: unknown;
}

export interface GameInfo {
  gameId: string;
  week: number | null;
  season: string;
  seasonType: string;
  date: string;
  status: string;
  homeTeam: string;
  awayTeam: string;
}
