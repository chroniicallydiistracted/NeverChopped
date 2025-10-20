
import type { GameInfo } from '../types';
import type { PlayDataAdapter } from './base';
import { fetchEspnGameData } from '../../api/espn-data';

// Types for pyespn data
type PyESPNPlay = {
  id: string;
  sequence: number;
  type: {
    id: string;
    text: string;
  };
  text: string;
  shortText: string;
  altText?: string;
  quarter: number;
  clock: {
    minutes: number;
    seconds: number;
  };
  homeScore: number;
  awayScore: number;
  scoringPlay: boolean;
  scoreValue?: number;
  statYardage?: number;
  start: {
    down?: number;
    yardsToGo?: number;
    yardsToEndzone?: number;
    team?: {
      id: string;
      name: string;
      abbreviation: string;
    };
  };
  end: {
    yardsToEndzone?: number;
    team?: {
      id: string;
      name: string;
      abbreviation: string;
    };
  };
  team: {
    id: string;
    name: string;
    abbreviation: string;
  };
  participants: Array<{
    id: string;
    name: string;
    position: string;
    team: string;
    stats: Record<string, number>;
  }>;
  coordinate?: {
    x: number;
    y: number;
  };
};

type PyESPNGameData = {
  game: {
    id: string;
    date: string;
    homeTeam: {
      id: string;
      name: string;
      abbreviation: string;
    };
    awayTeam: {
      id: string;
      name: string;
      abbreviation: string;
    };
    status: string;
    quarter?: number;
    clock?: {
      minutes: number;
      seconds: number;
    };
  };
  plays: PyESPNPlay[];
};

export class PyESPNAdapter implements PlayDataAdapter {
  name = 'pyespn';

  private gameDataCache = new Map<string, PyESPNGameData>();

  async canHandleGame(game: GameInfo): Promise<boolean> {
    try {
      const data = await this.fetchGameData(game.gameId);
      return Boolean(data);
    } catch (err) {
      console.warn(`[PyESPNAdapter] Error checking if can handle game:`, err);
      return false;
    }
  }

  async fetchPlays(game: GameInfo): Promise<PyESPNPlay[]> {
    const data = await this.fetchGameData(game.gameId);
    if (!data || !data.plays || !Array.isArray(data.plays)) {
      return [];
    }

    return data.plays;
  }

  private async fetchGameData(gameId: string): Promise<PyESPNGameData | null> {
    // Check cache first
    if (this.gameDataCache.has(gameId)) {
      return this.gameDataCache.get(gameId) || null;
    }

    try {
      // Fetch data using our pyespn integration
      const data = await fetchEspnGameData(gameId);
      if (data) {
        this.gameDataCache.set(gameId, data);
        return data;
      }
      return null;
    } catch (err) {
      console.warn(`[PyESPNAdapter] Error fetching game data:`, err);
      return null;
    }
  }

  private convertPlays(
    plays: PyESPNPlay[],
    gameData: PyESPNGameData['game'],
    gameInfo: GameInfo,
  ): StandardPlay[] {
    return plays.map(play => {
      // Calculate field positions
      const startYardsToEndzone = safeNumber(play.start?.yardsToEndzone, 50);
      const startFieldPosition = this.calculateFieldPosition(startYardsToEndzone, play.start?.team?.abbreviation, play.team.abbreviation, gameInfo.homeTeam, gameInfo.awayTeam);

      const yardsGained = safeNumber(play.statYardage, 0);
      const endYardsToEndzone = Math.max(0, startYardsToEndzone - yardsGained);
      const endFieldPosition = this.calculateFieldPosition(endYardsToEndzone, play.end?.team?.abbreviation, play.team.abbreviation, gameInfo.homeTeam, gameInfo.awayTeam);

      // Determine play type
      const playType = this.mapPlayType(play.type.text);

      // Determine if it's a scoring play
      const isTouchdown = play.scoringPlay && this.isTouchdownPlay(play.type.text);
      const isFieldGoal = this.isFieldGoalPlay(play.type.text);
      const isSafety = this.isSafetyPlay(play.type.text);

      // Extract players from participants
      const players = this.extractPlayersFromParticipants(play.participants);

      // Build pass details if applicable
      const pass = playType === 'pass' ? {
        isComplete: Boolean(players.passer && players.receiver),
        isInterception: Boolean(players.passer?.stats?.interceptions),
        airYards: players.passer?.stats?.avgAirYards ?? null,
        yardsAfterCatch: players.receiver?.stats?.yardsAfterCatch ?? null,
        location: null,
        depth: yardsGained >= 20 ? 'deep' : yardsGained <= 5 ? 'short' : null,
      } : undefined;

      // Build rush details if applicable
      const rush = playType === 'rush' ? {
        location: null,
        gap: null,
      } : undefined;

      // Determine direction
      const direction = {
        category: 'middle' as const,
        isDeep: yardsGained >= 20,
        isShort: yardsGained <= 5,
      };

      const standard: StandardPlay = {
        id: `pyespn_${play.id}`,
        gameId: gameInfo.gameId,
        sequence: play.sequence,

        quarter: play.quarter,
        gameClockSeconds: this.toGameClockSeconds(play.clock),
        homeTeam: gameInfo.homeTeam,
        awayTeam: gameInfo.awayTeam,
        possession: play.team.abbreviation,

        playType,
        description: play.text,

        startFieldPosition,
        endFieldPosition,
        yardsGained,

        down: play.start?.down ?? null,
        yardsToGo: play.start?.yardsToGo ?? null,
        yardsToEndzone: startYardsToEndzone,

        direction,

        homeScore: play.homeScore,
        awayScore: play.awayScore,
        isTouchdown,
        isFieldGoal,
        isSafety,

        pass,
        rush,

        players,
        penalties: undefined,
        playerPositions: undefined,
        metrics: undefined,

        dataSource: 'espn',
        rawData: play,
      };

      return standard;
    });
  }

  private extractPlayersFromParticipants(participants: PyESPNPlay['participants']): StandardPlay['players'] {
    const players: StandardPlay['players'] = {};

    for (const participant of participants) {
      // Check stats to determine role
      if (participant.stats.passingAttempts || participant.stats.passingYards) {
        players.passer = {
          id: participant.id,
          name: participant.name,
          position: participant.position,
          team: participant.team,
          stats: participant.stats,
        };
      }
      if (participant.stats.receptions || participant.stats.receivingYards) {
        players.receiver = {
          id: participant.id,
          name: participant.name,
          position: participant.position,
          team: participant.team,
          stats: participant.stats,
        };
      }
      if (participant.stats.rushingAttempts || participant.stats.rushingYards) {
        players.rusher = {
          id: participant.id,
          name: participant.name,
          position: participant.position,
          team: participant.team,
          stats: participant.stats,
        };
      }
      if (participant.stats.fieldGoalsMade || participant.stats.extraPointsMade) {
        players.kicker = {
          id: participant.id,
          name: participant.name,
          position: participant.position,
          team: participant.team,
          stats: participant.stats,
        };
      }
    }

    return players;
  }

  private isTouchdownPlay(type: string): boolean {
    return type.toLowerCase().includes('touchdown');
  }

  private isFieldGoalPlay(type: string): boolean {
    return type.toLowerCase().includes('field goal');
  }

  private isSafetyPlay(type: string): boolean {
    return type.toLowerCase().includes('safety');
  }

  private convertPlayer(player: PyESPNPlayer): StandardPlay['players'][string] {
    return {
      id: player.id,
      name: player.fullName,
      position: player.position,
      team: player.team,
      jerseyNumber: player.jerseyNumber,
    };
  }

  private calculateFieldPosition(
    yardsToEndzone: number,
    territory: string | undefined,
    possession: string,
    homeTeam: string,
    awayTeam: string,
  ): number {
    // If we have yards to endzone, use that
    if (Number.isFinite(yardsToEndzone)) {
      return clamp(100 - yardsToEndzone);
    }

    // Default to midfield
    return 50;
  }

  private toGameClockSeconds(clock: PyESPNPlay['clock']): number {
    if (!clock) return 0;
    return Math.max(0, (safeNumber(clock.minutes, 0) * 60) + safeNumber(clock.seconds, 0));
  }

  private mapPlayType(type: string): StandardPlay['playType'] {
    const normalized = type.toLowerCase();

    if (normalized.includes('pass')) return 'pass';
    if (normalized.includes('rush') || normalized.includes('run')) return 'rush';
    if (normalized.includes('punt')) return 'punt';
    if (normalized.includes('kickoff')) return 'kickoff';
    if (normalized.includes('field goal')) return 'field_goal';
    if (normalized.includes('extra point')) return 'extra_point';
    if (normalized.includes('two point')) return 'two_point';
    if (normalized.includes('timeout')) return 'timeout';
    if (normalized.includes('penalty')) return 'penalty';

    return 'unknown';
  }
}
