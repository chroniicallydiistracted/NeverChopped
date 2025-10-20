import type { GameInfo, StandardPlay } from '../types';
import type { PlayDataAdapter } from './base';
import { clamp, safeNumber } from '../utils';

type SportsDataScore = {
  GameKey?: string;
  ScoreID?: number;
  Season?: number;
  SeasonType?: number;
  Week?: number;
  HomeTeam?: string;
  AwayTeam?: string;
};

export type SportsDataPlayStat = {
  PlayerID?: number;
  Name?: string;
  Team?: string;
  Opponent?: string;
  PassingAttempts?: number;
  PassingCompletions?: number;
  PassingYards?: number;
  PassingInterceptions?: number;
  RushingAttempts?: number;
  RushingYards?: number;
  ReceivingTargets?: number;
  Receptions?: number;
  ReceivingYards?: number;
  Kickoffs?: number;
  Punts?: number;
  FieldGoalsAttempted?: number;
  FieldGoalsMade?: number;
  ExtraPointsAttempted?: number;
  ExtraPointsMade?: number;
};

export type SportsDataPlay = {
  PlayID: number;
  QuarterName?: string;
  Sequence?: number;
  TimeRemainingMinutes?: number;
  TimeRemainingSeconds?: number;
  Team?: string;
  Opponent?: string;
  Down?: number;
  Distance?: number;
  YardLine?: number;
  YardLineTerritory?: string | null;
  YardsToEndZone?: number;
  Type?: string;
  YardsGained?: number;
  Description?: string;
  IsScoringPlay?: boolean;
  ScoringPlay?: {
    HomeScore?: number;
    AwayScore?: number;
    PlayDescription?: string;
  } | null;
  PlayStats?: SportsDataPlayStat[];
};

type SportsDataPlayByPlayResponse = {
  Score?: {
    HomeScore?: number;
    AwayScore?: number;
  };
  Plays?: SportsDataPlay[];
};

type ResolvedSportsDataGame = {
  scoreId: number;
  gameKey: string;
  season: number;
  seasonType: number;
  week: number;
  homeTeam: string;
  awayTeam: string;
};

const SCORES_BASE = 'https://api.sportsdata.io/v3/nfl/scores/json';
const PBP_BASE = 'https://api.sportsdata.io/v3/nfl/pbp/json';

const TEAM_ABBREVIATION_FIXES: Record<string, string> = {
  WFT: 'WAS',
  WAS: 'WAS',
  WSH: 'WAS',
};

export class SportsDataIOAdapter implements PlayDataAdapter {
  name = 'sportsdataio';

  private apiKey =
    import.meta.env.VITE_SPORTSDATAIO_API_KEY ??
    import.meta.env.VITE_SPORTSDATA_IO_KEY ??
    import.meta.env.VITE_SPORTSDATA_API_KEY ??
    null;

  private scoreboardCache = new Map<string, SportsDataScore[]>();
  private resolvedGameCache = new Map<string, ResolvedSportsDataGame>();

  async canHandleGame(game: GameInfo): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }
    const resolved = await this.resolveGame(game);
    return Boolean(resolved);
  }

  async fetchPlays(game: GameInfo): Promise<StandardPlay[]> {
    const resolved = await this.resolveGame(game);
    if (!resolved) {
      return [];
    }

    const response = await this.fetchPlayByPlay(resolved.scoreId);
    if (!response || !Array.isArray(response.Plays) || !response.Plays.length) {
      return [];
    }

    const plays = this.convertPlays(response.Plays, response.Score ?? undefined, game);
    return plays;
  }

  private async resolveGame(game: GameInfo): Promise<ResolvedSportsDataGame | null> {
    const cached = this.resolvedGameCache.get(game.gameId);
    if (cached) {
      return cached;
    }

    const seasonKey = this.buildSeasonKey(game.season, game.seasonType);
    const week = Number(game.week ?? NaN);

    let candidates: SportsDataScore[] = [];

    if (seasonKey && Number.isFinite(week)) {
      candidates = await this.getScoresByWeek(seasonKey, week);
    }

    if (!candidates.length && game.date) {
      const dateKey = this.normalizeDate(game.date);
      if (dateKey) {
        candidates = await this.getScoresByDate(dateKey);
      }
    }

    if (!candidates.length) {
      return null;
    }

    const normalizedHome = this.normalizeTeam(game.homeTeam);
    const normalizedAway = this.normalizeTeam(game.awayTeam);

    const match =
      candidates.find(score => String(score.GameKey) === String(game.gameId)) ??
      candidates.find(
        score =>
          this.normalizeTeam(score.HomeTeam ?? '') === normalizedHome &&
          this.normalizeTeam(score.AwayTeam ?? '') === normalizedAway,
      );

    if (!match || !Number.isFinite(match.ScoreID ?? NaN)) {
      return null;
    }

    const resolved: ResolvedSportsDataGame = {
      scoreId: Number(match.ScoreID),
      gameKey: String(match.GameKey ?? game.gameId),
      season: Number(match.Season ?? game.season) || Number(game.season),
      seasonType: Number(match.SeasonType ?? this.toSeasonTypeNumber(game.seasonType)),
      week: Number(match.Week ?? week) || week || 0,
      homeTeam: this.normalizeTeam(match.HomeTeam ?? ''),
      awayTeam: this.normalizeTeam(match.AwayTeam ?? ''),
    };

    this.resolvedGameCache.set(game.gameId, resolved);
    return resolved;
  }

  private async getScoresByWeek(seasonKey: string, week: number): Promise<SportsDataScore[]> {
    const cacheKey = `week:${seasonKey}:${week}`;
    if (this.scoreboardCache.has(cacheKey)) {
      return this.scoreboardCache.get(cacheKey) ?? [];
    }

    const data = await this.fetchJson(`${SCORES_BASE}/ScoresByWeek/${seasonKey}/${week}`);
    if (Array.isArray(data)) {
      this.scoreboardCache.set(cacheKey, data);
      return data;
    }
    this.scoreboardCache.set(cacheKey, []);
    return [];
  }

  private async getScoresByDate(date: string): Promise<SportsDataScore[]> {
    const cacheKey = `date:${date}`;
    if (this.scoreboardCache.has(cacheKey)) {
      return this.scoreboardCache.get(cacheKey) ?? [];
    }

    const data = await this.fetchJson(`${SCORES_BASE}/ScoresByDate/${date}`);
    if (Array.isArray(data)) {
      this.scoreboardCache.set(cacheKey, data);
      return data;
    }
    this.scoreboardCache.set(cacheKey, []);
    return [];
  }

  private async fetchPlayByPlay(scoreId: number): Promise<SportsDataPlayByPlayResponse | null> {
    const data = await this.fetchJson(`${PBP_BASE}/PlayByPlay/${scoreId}`);
    if (!data) {
      return null;
    }
    return data as SportsDataPlayByPlayResponse;
  }

  private async fetchJson(url: string): Promise<any | null> {
    if (!this.apiKey) {
      return null;
    }
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'Ocp-Apim-Subscription-Key': this.apiKey,
        },
      });
      if (!response.ok) {
        console.warn(`[SportsDataIOAdapter] Request failed (${response.status}) for ${url}`);
        return null;
      }
      return await response.json();
    } catch (err) {
      console.warn('[SportsDataIOAdapter] Request error', err);
      return null;
    }
  }

  private convertPlays(
    plays: SportsDataPlay[],
    score: SportsDataPlayByPlayResponse['Score'],
    game: GameInfo,
  ): StandardPlay[] {
    const sorted = [...plays].sort((a, b) => safeNumber(a.Sequence, 0) - safeNumber(b.Sequence, 0));
    let runningHome = safeNumber(score?.HomeScore, 0);
    let runningAway = safeNumber(score?.AwayScore, 0);

    if (runningHome || runningAway) {
      // If score object already has final totals we shouldn't start with them.
      runningHome = 0;
      runningAway = 0;
    }

    return sorted.map(play => {
      if (play.IsScoringPlay && play.ScoringPlay) {
        runningHome = safeNumber(play.ScoringPlay.HomeScore, runningHome);
        runningAway = safeNumber(play.ScoringPlay.AwayScore, runningAway);
      }

      const yardsToEndzoneRaw = safeNumber(play.YardsToEndZone, NaN);
      const startFieldPosition = this.computeStartFieldPosition(
        yardsToEndzoneRaw,
        play.YardLine,
        play.YardLineTerritory,
        play.Team,
        play.Opponent,
      );
      const yardsGained = safeNumber(play.YardsGained, 0);
      const endFieldPosition = clamp(startFieldPosition + yardsGained);
      const downValue = safeNumber(play.Down, NaN);
      const distanceValue = safeNumber(play.Distance, NaN);
      const yardsToEndzone = Number.isFinite(yardsToEndzoneRaw)
        ? yardsToEndzoneRaw
        : Math.max(0, 100 - startFieldPosition);

      const standard: StandardPlay = {
        id: `sportsdataio_${play.PlayID}`,
        gameId: game.gameId,
        sequence: safeNumber(play.Sequence, 0),

        quarter: this.parseQuarter(play.QuarterName),
        gameClockSeconds: this.toGameClockSeconds(play.TimeRemainingMinutes, play.TimeRemainingSeconds),
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        possession: play.Team ?? '',

        playType: this.mapPlayType(play.Type),
        description: play.Description ?? '',

        startFieldPosition,
        endFieldPosition,
        yardsGained,

        down: Number.isFinite(downValue) ? downValue : null,
        yardsToGo: Number.isFinite(distanceValue) ? distanceValue : null,
        yardsToEndzone,

        direction: {
          category: null,
          isDeep: false,
          isShort: false,
        },

        homeScore: runningHome,
        awayScore: runningAway,
        isTouchdown: Boolean(
          (play.ScoringPlay?.PlayDescription || play.Description || '').toLowerCase().includes('touchdown'),
        ),
        isFieldGoal: this.isFieldGoal(play.Type),
        isSafety: (play.Description || '').toLowerCase().includes('safety'),

        pass: this.buildPassDetails(play),
        rush: this.buildRushDetails(play),

        players: this.buildPlayers(play.PlayStats, play.Team ?? ''),
        playerPositions: undefined,
        metrics: undefined,

        dataSource: 'sportsdataio',
        rawData: play,
      };

      return standard;
    });
  }

  private buildPlayers(stats: SportsDataPlayStat[] | undefined, possession: string) {
    const players: StandardPlay['players'] = {};
    if (!Array.isArray(stats)) {
      return players;
    }

    const passer = stats.find(
      stat =>
        safeNumber(stat.PassingAttempts, 0) > 0 ||
        safeNumber(stat.PassingCompletions, 0) > 0 ||
        safeNumber(stat.PassingYards, 0) !== 0,
    );
    if (passer) {
      players.passer = {
        id: passer.PlayerID ? String(passer.PlayerID) : '',
        name: passer.Name ?? '',
        position: 'QB',
        team: passer.Team ?? possession,
      };
    }

    const rusher = stats.find(stat => safeNumber(stat.RushingAttempts, 0) > 0 || safeNumber(stat.RushingYards, 0) !== 0);
    if (rusher) {
      players.rusher = {
        id: rusher.PlayerID ? String(rusher.PlayerID) : '',
        name: rusher.Name ?? '',
        position: 'RB',
        team: rusher.Team ?? possession,
      };
    }

    const receiver = stats.find(
      stat =>
        safeNumber(stat.Receptions, 0) > 0 ||
        safeNumber(stat.ReceivingTargets, 0) > 0 ||
        safeNumber(stat.ReceivingYards, 0) !== 0,
    );
    if (receiver) {
      players.receiver = {
        id: receiver.PlayerID ? String(receiver.PlayerID) : '',
        name: receiver.Name ?? '',
        position: 'WR',
        team: receiver.Team ?? possession,
      };
    }

    const kicker = stats.find(
      stat =>
        safeNumber(stat.Kickoffs, 0) > 0 ||
        safeNumber(stat.Punts, 0) > 0 ||
        safeNumber(stat.FieldGoalsAttempted, 0) > 0 ||
        safeNumber(stat.ExtraPointsAttempted, 0) > 0,
    );
    if (kicker) {
      players.kicker = {
        id: kicker.PlayerID ? String(kicker.PlayerID) : '',
        name: kicker.Name ?? '',
        position: 'K',
        team: kicker.Team ?? possession,
      };
    }

    return players;
  }

  private buildPassDetails(play: SportsDataPlay): StandardPlay['pass'] {
    if (this.mapPlayType(play.Type) !== 'pass' || !Array.isArray(play.PlayStats)) {
      return undefined;
    }
    const passer = play.PlayStats.find(
      stat => safeNumber(stat.PassingAttempts, 0) > 0 || safeNumber(stat.PassingCompletions, 0) > 0,
    );
    if (!passer) {
      return {
        isComplete: false,
        isInterception: false,
        airYards: null,
        yardsAfterCatch: null,
        location: null,
        depth: null,
      };
    }
    return {
      isComplete: safeNumber(passer.PassingCompletions, 0) > 0,
      isInterception: safeNumber(passer.PassingInterceptions, 0) > 0,
      airYards: null,
      yardsAfterCatch: null,
      location: null,
      depth: null,
    };
  }

  private buildRushDetails(play: SportsDataPlay): StandardPlay['rush'] {
    if (this.mapPlayType(play.Type) !== 'rush') {
      return undefined;
    }
    return {
      location: null,
      gap: null,
    };
  }

  private parseQuarter(value: string | undefined): number {
    if (!value) return 1;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
    const lower = value.toLowerCase();
    if (lower.includes('ot')) return 5;
    return 1;
  }

  private toGameClockSeconds(minutes: number | undefined, seconds: number | undefined): number {
    const mins = Number.isFinite(minutes) ? safeNumber(minutes, 0) : 0;
    const secs = Number.isFinite(seconds) ? safeNumber(seconds, 0) : 0;
    return Math.max(0, mins * 60 + secs);
  }

  private computeStartFieldPosition(
    yardsToEndzone: number,
    yardLine: number | undefined,
    territory: string | null | undefined,
    offense: string | undefined,
    defense: string | undefined,
  ): number {
    if (Number.isFinite(yardsToEndzone)) {
      return clamp(100 - yardsToEndzone);
    }
    const yard = Number.isFinite(yardLine) ? safeNumber(yardLine, NaN) : NaN;
    if (!Number.isFinite(yard) || !territory) {
      return 50;
    }

    const territoryCode = territory.toUpperCase();
    const offenseCode = (offense ?? '').toUpperCase();
    const defenseCode = (defense ?? '').toUpperCase();

    if (territoryCode === offenseCode) {
      return clamp(50 + yard);
    }
    if (territoryCode === defenseCode) {
      return clamp(50 - yard);
    }
    if (territoryCode === 'MIDFIELD') {
      return 50;
    }
    return 50;
  }

  private normalizeDate(value: string): string | null {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
    const day = `${date.getUTCDate()}`.padStart(2, '0');
    return `${date.getUTCFullYear()}-${month}-${day}`;
  }

  private buildSeasonKey(season: string | number | undefined, seasonType: string | undefined): string | null {
    const seasonValue = season != null ? String(season).trim() : '';
    if (!seasonValue) {
      return null;
    }
    const type = this.toSeasonTypeCode(seasonType);
    if (!type) {
      return null;
    }
    return `${seasonValue}${type}`;
  }

  private toSeasonTypeCode(seasonType: string | undefined): 'REG' | 'POST' | 'PRE' | null {
    const normalized = (seasonType ?? '').toLowerCase();
    if (normalized.includes('post')) return 'POST';
    if (normalized.includes('pre')) return 'PRE';
    if (normalized.includes('reg')) return 'REG';
    if (!normalized) return 'REG';
    return null;
  }

  private toSeasonTypeNumber(seasonType: string | undefined): number {
    const normalized = (seasonType ?? '').toLowerCase();
    if (normalized.includes('post')) return 3;
    if (normalized.includes('pre')) return 2;
    return 1;
  }

  private normalizeTeam(team: string | undefined): string {
    if (!team) return '';
    const upper = team.toUpperCase();
    return TEAM_ABBREVIATION_FIXES[upper] ?? upper;
  }

  private mapPlayType(type: string | undefined): StandardPlay['playType'] {
    if (!type) return 'unknown';
    const normalized = type.toLowerCase();
    if (normalized.includes('pass')) return 'pass';
    if (normalized.includes('rush') || normalized.includes('run')) return 'rush';
    if (normalized.includes('punt')) return 'punt';
    if (normalized.includes('kickoff')) return 'kickoff';
    if (normalized.includes('field')) return 'field_goal';
    if (normalized.includes('extra')) return 'extra_point';
    if (normalized.includes('two point')) return 'two_point';
    if (normalized.includes('timeout')) return 'timeout';
    if (normalized.includes('penalty')) return 'penalty';
    return 'unknown';
  }

  private isFieldGoal(type: string | undefined): boolean {
    return Boolean(type && type.toLowerCase().includes('field'));
  }
}
