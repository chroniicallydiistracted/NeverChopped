import type { GameInfo, StandardPenalty, StandardPlay, StandardPlayer } from '../types';
import type { PlayDataAdapter } from './base';
import { clamp, parseGameClock, safeNumber } from '../utils';

type EspnScoreboardEvent = {
  id: string;
  date?: string;
  season?: { year?: number };
  competitions?: {
    id: string;
    competitors: {
      id: string;
      homeAway: 'home' | 'away';
      team: {
        id: string;
        abbreviation: string;
      };
    }[];
    playByPlayAvailable?: boolean;
  }[];
};

type ResolvedEspnEvent = {
  eventId: string;
  competitionId: string;
  teamMap: Map<string, string>;
};

type EspnParticipant = {
  athlete?: { $ref?: string };
  position?: { $ref?: string };
  stats?: { name?: string; value?: number }[];
  order?: number;
  type?: string;
};

type EspnPenalty = {
  yards?: number;
  type?: { text?: string };
  status?: { text?: string };
};

type EspnPlay = {
  id: string;
  sequenceNumber?: string;
  type?: { id?: string; text?: string };
  text?: string;
  shortText?: string;
  alternativeText?: string;
  awayScore?: number;
  homeScore?: number;
  period?: { number?: number };
  clock?: { value?: number; displayValue?: string };
  scoringPlay?: boolean;
  statYardage?: number;
  start?: {
    down?: number;
    distance?: number;
    yardLine?: number;
    yardsToEndzone?: number;
    team?: { $ref?: string };
    downDistanceText?: string;
    shortDownDistanceText?: string;
    possessionText?: string;
  };
  end?: {
    yardLine?: number;
    yardsToEndzone?: number;
    team?: { $ref?: string };
    downDistanceText?: string;
    shortDownDistanceText?: string;
    possessionText?: string;
  };
  team?: { $ref?: string };
  teamParticipants?: { team?: { $ref?: string }; type?: string; order?: number }[];
  participants?: EspnParticipant[] | null;
  penalty?: EspnPenalty | null;
};

type CachedAthlete = {
  id: string;
  fullName: string;
  displayName: string;
  shortName: string | null;
  firstName: string | null;
  lastName: string | null;
  teamId: string | null;
};

type PlayTeamContext = {
  offense: string | null;
  defense: string | null;
};

type EspnPlaysResponse = {
  items?: EspnPlay[];
};

const SCOREBOARD_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const CORE_BASE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl';

const TEAM_CODE_FIXES: Record<string, string> = {
  WAS: 'WSH',
  WFT: 'WSH',
  JAC: 'JAX',
  LA: 'LAR',
};

export class ESPNAdapter implements PlayDataAdapter {
  name = 'espn';

  private scoreboardCache = new Map<string, EspnScoreboardEvent[]>();
  private resolvedEventCache = new Map<string, ResolvedEspnEvent>();
  private athleteCache = new Map<string, CachedAthlete>();
  private pendingAthleteFetches = new Map<string, Promise<CachedAthlete | null>>();
  private positionCache = new Map<string, string>();
  private pendingPositionFetches = new Map<string, Promise<string | null>>();

  async canHandleGame(game: GameInfo): Promise<boolean> {
    const resolved = await this.resolveEvent(game);
    return Boolean(resolved);
  }

  async fetchPlays(game: GameInfo): Promise<StandardPlay[]> {
    const resolved = await this.resolveEvent(game);
    if (!resolved) {
      return [];
    }

    const response = await this.fetchJson<EspnPlaysResponse>(
      `${CORE_BASE}/events/${resolved.eventId}/competitions/${resolved.competitionId}/plays?limit=5000`,
    );
    if (!response || !Array.isArray(response.items) || !response.items.length) {
      return [];
    }

    return await this.convertPlays(response.items, resolved, game);
  }

  private async resolveEvent(game: GameInfo): Promise<ResolvedEspnEvent | null> {
    const cached = this.resolvedEventCache.get(game.gameId);
    if (cached) {
      return cached;
    }

    if (!game.date) {
      return null;
    }

    const dates = this.buildCandidateDates(game.date);
    const normalizedHome = this.normalizeTeamCode(game.homeTeam);
    const normalizedAway = this.normalizeTeamCode(game.awayTeam);
    const seasonYear = Number(game.season ?? NaN);

    for (const date of dates) {
      const events = await this.getScoreboardEvents(date);
      if (!events.length) continue;

      for (const event of events) {
        if (seasonYear && event.season?.year && event.season.year !== seasonYear) {
          continue;
        }
        const competition = event.competitions?.[0];
        if (!competition || competition.playByPlayAvailable === false) {
          continue;
        }

        const home = competition.competitors?.find(comp => comp.homeAway === 'home');
        const away = competition.competitors?.find(comp => comp.homeAway === 'away');

        if (
          !home ||
          !away ||
          this.normalizeTeamCode(home.team?.abbreviation ?? '') !== normalizedHome ||
          this.normalizeTeamCode(away.team?.abbreviation ?? '') !== normalizedAway
        ) {
          continue;
        }

        const teamMap = new Map<string, string>();
        competition.competitors?.forEach(comp => {
          if (comp.team?.id && comp.team?.abbreviation) {
            teamMap.set(comp.team.id, this.normalizeTeamCode(comp.team.abbreviation));
          }
        });

        const resolved: ResolvedEspnEvent = {
          eventId: event.id,
          competitionId: competition.id,
          teamMap,
        };
        this.resolvedEventCache.set(game.gameId, resolved);
        return resolved;
      }
    }

    return null;
  }

  private async getScoreboardEvents(date: string): Promise<EspnScoreboardEvent[]> {
    if (this.scoreboardCache.has(date)) {
      return this.scoreboardCache.get(date) ?? [];
    }
    const data = await this.fetchJson<{ events?: EspnScoreboardEvent[] }>(
      `${SCOREBOARD_BASE}/scoreboard?dates=${date}`,
    );
    const events = Array.isArray(data?.events) ? data?.events ?? [] : [];
    this.scoreboardCache.set(date, events);
    return events;
  }

  private toSecureUrl(url: string): string {
    if (typeof url !== 'string') return url;
    if (url.startsWith('http://')) {
      return `https://${url.slice('http://'.length)}`;
    }
    return url;
  }

  private async fetchJson<T>(url: string): Promise<T | null> {
    try {
      const secureUrl = this.toSecureUrl(url);
      const response = await fetch(secureUrl, { headers: { Accept: 'application/json' } });
      if (!response.ok) {
        console.warn(`[ESPNAdapter] Request failed (${response.status}) for ${secureUrl}`);
        return null;
      }
      return (await response.json()) as T;
    } catch (err) {
      console.warn('[ESPNAdapter] Request error', err, 'url:', url);
      return null;
    }
  }

  private async convertPlays(
    plays: EspnPlay[],
    context: ResolvedEspnEvent,
    game: GameInfo,
  ): Promise<StandardPlay[]> {
    const sorted = [...plays].sort((a, b) => safeNumber(a.sequenceNumber, 0) - safeNumber(b.sequenceNumber, 0));

    const athleteRefs = new Set<string>();
    const positionRefs = new Set<string>();

    for (const play of sorted) {
      play.participants?.forEach(participant => {
        const athleteRef = participant.athlete?.$ref;
        if (athleteRef) {
          athleteRefs.add(athleteRef);
        }
        const positionRef = participant.position?.$ref;
        if (positionRef) {
          positionRefs.add(positionRef);
        }
      });
    }

    await Promise.all([this.hydrateAthletes(athleteRefs), this.hydratePositions(positionRefs)]);

    let runningHome = 0;
    let runningAway = 0;

    return sorted.map(play => {
      runningHome = safeNumber(play.homeScore, runningHome);
      runningAway = safeNumber(play.awayScore, runningAway);

      const teams = this.resolveTeamsForPlay(play, context.teamMap, game);
      const possession = teams.offense ?? '';

      const startYardsToEndzone = safeNumber(play.start?.yardsToEndzone, NaN);
      const startFieldPosition = this.computeFieldPosition(startYardsToEndzone, play.start, context.teamMap);

      const endYardsToEndzone = safeNumber(play.end?.yardsToEndzone, NaN);
      let statYardage = safeNumber(play.statYardage, NaN);
      if (!Number.isFinite(statYardage) && Number.isFinite(startYardsToEndzone) && Number.isFinite(endYardsToEndzone)) {
        statYardage = startYardsToEndzone - endYardsToEndzone;
      }
      if (!Number.isFinite(statYardage)) {
        statYardage = 0;
      }
      const endFieldPosition = Number.isFinite(endYardsToEndzone)
        ? clamp(100 - endYardsToEndzone)
        : clamp(startFieldPosition + statYardage);

      const downValue = safeNumber(play.start?.down, NaN);
      const distanceValue = safeNumber(play.start?.distance, NaN);

      const standard: StandardPlay = {
        id: `espn_${play.id}`,
        gameId: game.gameId,
        sequence: safeNumber(play.sequenceNumber, 0),

        quarter: safeNumber(play.period?.number, 1) || 1,
        gameClockSeconds: this.toGameClockSeconds(play.clock),
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        possession,

        playType: this.mapPlayType(play.type?.text),
        description: play.text ?? play.shortText ?? '',

        startFieldPosition,
        endFieldPosition,
        yardsGained: statYardage,

        down: Number.isFinite(downValue) ? downValue : null,
        yardsToGo: Number.isFinite(distanceValue) ? distanceValue : null,
        yardsToEndzone: Number.isFinite(startYardsToEndzone)
          ? startYardsToEndzone
          : Math.max(0, 100 - startFieldPosition),

        direction: {
          category: null,
          isDeep: false,
          isShort: false,
        },

        homeScore: runningHome,
        awayScore: runningAway,
        isTouchdown: Boolean(play.scoringPlay && (play.type?.text ?? '').toLowerCase().includes('touchdown')),
        isFieldGoal: Boolean((play.type?.text ?? '').toLowerCase().includes('field goal')),
        isSafety: Boolean((play.text ?? '').toLowerCase().includes('safety')),

        pass: undefined,
        rush: undefined,
        players: this.mapParticipantsToPlayers(play, teams, context.teamMap),
        penalties: this.buildPenalties(play, teams, context.teamMap),
        playerPositions: undefined,
        metrics: undefined,

        dataSource: 'espn',
        rawData: play,
      };

      return standard;
    });
  }

  private async hydrateAthletes(refs: Iterable<string>): Promise<void> {
    const fetches: Promise<unknown>[] = [];
    for (const ref of refs) {
      if (!ref) continue;
      if (this.athleteCache.has(ref)) continue;
      const existing = this.pendingAthleteFetches.get(ref);
      if (existing) {
        fetches.push(existing);
        continue;
      }
      const fetchPromise = this.fetchAndCacheAthlete(ref);
      this.pendingAthleteFetches.set(ref, fetchPromise);
      fetches.push(fetchPromise);
    }
    if (fetches.length) {
      await Promise.all(fetches);
    }
  }

  private async fetchAndCacheAthlete(ref: string): Promise<CachedAthlete | null> {
    try {
      const data = await this.fetchJson<any>(ref);
      if (!data) {
        return null;
      }
      const athleteId = String(data.id ?? this.extractAthleteId(ref) ?? '');
      if (!athleteId) {
        return null;
      }
      const fullName = String(
        data.fullName ??
          data.displayName ??
          data.shortName ??
          data.name ??
          athleteId,
      );
      const cached: CachedAthlete = {
        id: athleteId,
        fullName,
        displayName: String(data.displayName ?? fullName),
        shortName: data.shortName ? String(data.shortName) : null,
        firstName: data.firstName ? String(data.firstName) : null,
        lastName: data.lastName ? String(data.lastName) : null,
        teamId: this.extractTeamId(data.team?.$ref ?? data.team?.['$ref']),
      };
      this.athleteCache.set(ref, cached);
      return cached;
    } catch (err) {
      console.warn('[ESPNAdapter] Failed to hydrate athlete', ref, err);
      return null;
    } finally {
      this.pendingAthleteFetches.delete(ref);
    }
  }

  private async hydratePositions(refs: Iterable<string>): Promise<void> {
    const fetches: Promise<unknown>[] = [];
    for (const ref of refs) {
      if (!ref) continue;
      if (this.positionCache.has(ref)) continue;
      const existing = this.pendingPositionFetches.get(ref);
      if (existing) {
        fetches.push(existing);
        continue;
      }
      const fetchPromise = this.fetchAndCachePosition(ref);
      this.pendingPositionFetches.set(ref, fetchPromise);
      fetches.push(fetchPromise);
    }
    if (fetches.length) {
      await Promise.all(fetches);
    }
  }

  private async fetchAndCachePosition(ref: string): Promise<string | null> {
    try {
      const data = await this.fetchJson<any>(ref);
      if (!data) {
        return null;
      }
      const abbreviation = data.abbreviation ? String(data.abbreviation) : null;
      if (abbreviation) {
        this.positionCache.set(ref, abbreviation);
      }
      return abbreviation;
    } catch (err) {
      console.warn('[ESPNAdapter] Failed to hydrate position', ref, err);
      return null;
    } finally {
      this.pendingPositionFetches.delete(ref);
    }
  }

  private resolveTeamsForPlay(
    play: EspnPlay,
    teamMap: Map<string, string>,
    game: GameInfo,
  ): PlayTeamContext {
    const offenseParticipant = play.teamParticipants?.find(tp => tp.type === 'offense');
    const defenseParticipant = play.teamParticipants?.find(tp => tp.type === 'defense');

    let offense =
      this.resolveTeamByRef(offenseParticipant?.team?.$ref, teamMap) ??
      this.resolveTeamByRef(play.team?.$ref, teamMap) ??
      this.resolveTeamByRef(play.start?.team?.$ref, teamMap);

    let defense =
      this.resolveTeamByRef(defenseParticipant?.team?.$ref, teamMap) ??
      this.resolveTeamByRef(play.end?.team?.$ref, teamMap) ??
      null;

    const normalizedHome = this.normalizeTeamCode(game.homeTeam);
    const normalizedAway = this.normalizeTeamCode(game.awayTeam);

    if (!defense && offense) {
      defense = offense === normalizedHome ? normalizedAway : normalizedHome;
    }

    if (!offense && defense) {
      offense = defense === normalizedHome ? normalizedAway : normalizedHome;
    }

    if (!offense) {
      offense = normalizedAway || normalizedHome || null;
    }

    if (!defense) {
      defense = offense === normalizedHome ? normalizedAway : normalizedHome;
    }

    return {
      offense: offense ?? null,
      defense: defense ?? null,
    };
  }

  private resolveTeamByRef(ref: string | undefined, teamMap: Map<string, string>): string | null {
    const teamId = this.extractTeamId(ref);
    if (teamId && teamMap.has(teamId)) {
      return teamMap.get(teamId) ?? null;
    }
    return null;
  }

  private mapTeamIdToCode(
    teamId: string | null,
    fallback: string | null,
    teamMap: Map<string, string>,
  ): string | null {
    if (teamId && teamMap.has(teamId)) {
      return teamMap.get(teamId) ?? null;
    }
    return fallback ?? null;
  }

  private resolvePositionForParticipant(participant: EspnParticipant): string {
    const type = (participant.type ?? '').toLowerCase();
    if (type === 'passer') return 'QB';
    if (type === 'rusher') return 'RB';
    if (type === 'receiver' || type === 'targetedreceiver' || type === 'targeted_receiver') return 'WR';
    if (type === 'kicker') return 'K';
    if (type === 'punter') return 'P';
    if (type === 'returner') return 'KR';
    if (type === 'holder') return 'H';
    const positionRef = participant.position?.$ref;
    if (positionRef && this.positionCache.has(positionRef)) {
      return this.positionCache.get(positionRef) ?? '';
    }
    return '';
  }

  private resolveStandardPlayer(
    participant: EspnParticipant,
    defaultTeam: string | null,
    teamMap: Map<string, string>,
  ): StandardPlayer | null {
    const athleteRef = participant.athlete?.$ref;
    if (!athleteRef) {
      return null;
    }
    const cached = this.athleteCache.get(athleteRef);
    if (!cached) {
      return null;
    }
    const teamCode = this.mapTeamIdToCode(cached.teamId, defaultTeam, teamMap) ?? '';
    return {
      id: cached.id,
      name: cached.fullName,
      position: this.resolvePositionForParticipant(participant),
      team: teamCode,
    };
  }

  private mapParticipantsToPlayers(
    play: EspnPlay,
    teams: PlayTeamContext,
    teamMap: Map<string, string>,
  ): StandardPlay['players'] {
    const players: StandardPlay['players'] = {};
    const participants = play.participants ?? [];
    for (const participant of participants) {
      const type = (participant.type ?? '').toLowerCase();
      if (!type) continue;

      if (type === 'passer') {
        if (!players.passer) {
          const player = this.resolveStandardPlayer(participant, teams.offense, teamMap);
          if (player) {
            players.passer = player;
          }
        }
        continue;
      }

      if (type === 'rusher') {
        if (!players.rusher) {
          const player = this.resolveStandardPlayer(participant, teams.offense, teamMap);
          if (player) {
            players.rusher = player;
          }
        }
        continue;
      }

      if (type === 'receiver' || type === 'targetedreceiver' || type === 'targeted_receiver') {
        if (!players.receiver) {
          const player = this.resolveStandardPlayer(participant, teams.offense, teamMap);
          if (player) {
            players.receiver = player;
          }
        }
        continue;
      }

      if (type === 'kicker' || type === 'punter') {
        if (!players.kicker) {
          const player = this.resolveStandardPlayer(participant, teams.offense, teamMap);
          if (player) {
            players.kicker = {
              ...player,
              position: type === 'punter' ? 'P' : player.position || 'K',
            };
          }
        }
      }
    }
    return players;
  }

  private buildPenalties(
    play: EspnPlay,
    teams: PlayTeamContext,
    teamMap: Map<string, string>,
  ): StandardPenalty[] | null {
    const penaltyMeta = play.penalty;
    const penalizedParticipants =
      play.participants?.filter(participant => (participant.type ?? '').toLowerCase() === 'penalized') ?? [];

    if (!penaltyMeta && penalizedParticipants.length === 0) {
      return null;
    }

    const descriptionParts: string[] = [];
    if (penaltyMeta?.type?.text) {
      descriptionParts.push(String(penaltyMeta.type.text));
    }
    if (penaltyMeta?.status?.text && penaltyMeta.status.text !== 'Accepted') {
      descriptionParts.push(String(penaltyMeta.status.text));
    }
    const description = descriptionParts.length ? descriptionParts.join(' • ') : 'Penalty';
    const yards =
      typeof penaltyMeta?.yards === 'number' && Number.isFinite(penaltyMeta.yards)
        ? penaltyMeta.yards
        : null;

    const penalties: StandardPenalty[] = [];

    if (penalizedParticipants.length) {
      for (const participant of penalizedParticipants) {
        const player = this.resolveStandardPlayer(participant, teams.offense ?? teams.defense, teamMap);
        penalties.push({
          description,
          yards,
          team: player?.team ?? teams.offense ?? teams.defense ?? null,
          player,
        });
      }
    } else {
      penalties.push({
        description,
        yards,
        team: teams.offense ?? teams.defense ?? null,
        player: null,
      });
    }

    return penalties.length ? penalties : null;
  }

  private computeFieldPosition(
    yardsToEndzone: number,
    start: EspnPlay['start'],
    teamMap: Map<string, string>,
  ): number {
    if (Number.isFinite(yardsToEndzone)) {
      return clamp(100 - yardsToEndzone);
    }

    const yardLine = safeNumber(start?.yardLine, NaN);
    if (!Number.isFinite(yardLine)) {
      return 50;
    }

    const teamRef = start?.team?.$ref;
    if (teamRef) {
      const teamId = this.extractTeamId(teamRef);
      if (teamId && teamMap.has(teamId)) {
        return clamp(50 + yardLine);
      }
    }

    return 50;
  }

  private extractAthleteId(ref: string | undefined): string | null {
    if (!ref) return null;
    const match = ref.match(/athletes\/(\d+)/);
    return match ? match[1] : null;
  }

  private extractTeamId(ref: string | undefined): string | null {
    if (!ref) return null;
    const match = ref.match(/teams\/(\d+)/);
    return match ? match[1] : null;
  }

  private toGameClockSeconds(clock: EspnPlay['clock']): number {
    if (!clock) return 0;
    if (Number.isFinite(clock.value)) {
      return Math.max(0, Math.floor(clock.value as number));
    }
    if (clock.displayValue) {
      return parseGameClock(clock.displayValue);
    }
    return 0;
  }

  private mapPlayType(text: string | undefined): StandardPlay['playType'] {
    if (!text) return 'unknown';
    const normalized = text.toLowerCase();
    if (normalized.includes('pass')) return 'pass';
    if (normalized.includes('run') || normalized.includes('rush')) return 'rush';
    if (normalized.includes('punt')) return 'punt';
    if (normalized.includes('kickoff')) return 'kickoff';
    if (normalized.includes('field goal')) return 'field_goal';
    if (normalized.includes('extra point')) return 'extra_point';
    if (normalized.includes('two-point') || normalized.includes('two point')) return 'two_point';
    if (normalized.includes('timeout')) return 'timeout';
    if (normalized.includes('penalty')) return 'penalty';
    return 'unknown';
  }

  private buildCandidateDates(dateString: string): string[] {
    const baseDate = new Date(dateString);
    if (Number.isNaN(baseDate.getTime())) {
      return [];
    }

    const format = (date: Date) => {
      const year = date.getUTCFullYear();
      const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
      const day = `${date.getUTCDate()}`.padStart(2, '0');
      return `${year}${month}${day}`;
    };

    const previous = new Date(baseDate);
    previous.setUTCDate(previous.getUTCDate() - 1);

    const next = new Date(baseDate);
    next.setUTCDate(next.getUTCDate() + 1);

    return [format(baseDate), format(previous), format(next)];
  }

  private normalizeTeamCode(code: string): string {
    const upper = code.toUpperCase();
    return TEAM_CODE_FIXES[upper] ?? upper;
  }

}
