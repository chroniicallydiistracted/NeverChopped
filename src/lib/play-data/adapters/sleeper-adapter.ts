import { inferPlayDirection } from '../../../utils/playDirection';
import { query } from '../../../graphql/client';
import { PLAYS_BY_GAME_QUERY } from '../../../graphql/queries';

import type { GameInfo, StandardPlay } from '../types';
import type { PlayDataAdapter } from './base';
import { clamp, normalizeSeasonType, parseGameClock, safeNumber } from '../utils';

type SleeperPlay = {
  play_id: string;
  game_id: string;
  sequence: number;
  metadata?: Record<string, any>;
  stats?: Record<string, any>;
};

export class SleeperAdapter implements PlayDataAdapter {
  name = 'sleeper';

  async canHandleGame(game: GameInfo): Promise<boolean> {
    const now = new Date();
    const gameDate = new Date(game.date);
    const diffDays = Math.abs(now.getTime() - gameDate.getTime()) / (1000 * 60 * 60 * 24);

    if (game.status === 'in_progress' || game.status === 'pre_game') {
      return true;
    }

    return diffDays <= 2;
  }

  async fetchPlays(game: GameInfo): Promise<StandardPlay[]> {
    const seasonType = normalizeSeasonType(game.seasonType);
    const restUrl = `https://api.sleeper.app/plays/nfl/${seasonType}/${game.season}/game/${game.gameId}?limit=0`;

    let plays: SleeperPlay[] = [];
    try {
      const resp = await fetch(restUrl, { headers: { Accept: 'application/json' } });
      if (resp.ok) {
        plays = await resp.json();
      }
    } catch (err) {
      console.warn('[SleeperAdapter] REST fetch failed', err);
    }

    if (!plays.length) {
      plays = await this.fetchFromGraphQL(game);
    }

    return plays.map(play => this.toStandardPlay(play, game));
  }

  private async fetchFromGraphQL(game: GameInfo): Promise<SleeperPlay[]> {
    try {
      const response = await query<{ plays: SleeperPlay[] }>(PLAYS_BY_GAME_QUERY, {
        sport: 'nfl',
        season: game.season,
        season_type: game.seasonType,
        gameId: game.gameId,
      });

      if (response?.plays?.length) {
        return response.plays;
      }
    } catch (err) {
      console.warn('[SleeperAdapter] GraphQL fetch failed', err);
    }
    return [];
  }

  private toStandardPlay(raw: SleeperPlay, game: GameInfo): StandardPlay {
    const metadata = raw.metadata || {};
    const stats = raw.stats || {};

    const direction = inferPlayDirection({
      metadata,
      play_stats: stats,
    });

    const startPos = clamp(100 - safeNumber(metadata.yards_to_end_zone, 50));
    const yardsGained = safeNumber(metadata.yards_gained, 0);
    const endPos = clamp(startPos + yardsGained);

    const down = safeNumber(metadata.down, NaN);
    const distance = safeNumber(metadata.distance, NaN);
    const quarter = safeNumber(metadata.quarter, 1);
    const homeScore = safeNumber(metadata.home_points, 0);
    const awayScore = safeNumber(metadata.away_points, 0);

    const possession = (metadata.team || metadata.possession || '').toString();

    const playType = this.normalizePlayType(metadata.play_type);
    const description = metadata.description || metadata.fantasy_description || '';

    const standard: StandardPlay = {
      id: raw.play_id || `sleeper_${raw.sequence}`,
      gameId: game.gameId,
      sequence: safeNumber(raw.sequence, 0),

      quarter,
      gameClockSeconds: parseGameClock(metadata.game_clock),
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      possession,

      playType,
      description,

      startFieldPosition: startPos,
      endFieldPosition: endPos,
      yardsGained,

      down: Number.isNaN(down) ? null : down,
      yardsToGo: Number.isNaN(distance) ? null : distance,
      yardsToEndzone: safeNumber(metadata.yards_to_end_zone, 0),

      direction: {
        category: direction.category,
        isDeep: direction.isDeep,
        isShort: direction.isShort,
      },

      homeScore,
      awayScore,
      isTouchdown: Boolean(stats.rec_td || stats.rush_td || stats.pass_td),
      isFieldGoal: metadata.play_type === 'field_goal',
      isSafety: Boolean(stats.def_st_td),

      pass:
        playType === 'pass'
          ? {
              isComplete: Boolean(stats.rec || stats.pass_cmp),
              isInterception: Boolean(stats.pass_int),
              airYards: safeNumber(stats.pass_air_yards, NaN) || null,
              yardsAfterCatch: safeNumber(stats.rec_yac, NaN) || null,
              location: metadata.pass_location || null,
              depth: direction.isDeep ? 'deep' : direction.isShort ? 'short' : null,
            }
          : undefined,

      rush:
        playType === 'rush'
          ? {
              location: metadata.run_location || null,
              gap: metadata.run_gap || null,
            }
          : undefined,

      players: this.extractPlayers(stats, possession),
      metrics: undefined,
      dataSource: 'sleeper',
      rawData: raw,
    };

    return standard;
  }

  private extractPlayers(stats: Record<string, any>, possession: string) {
    const players: StandardPlay['players'] = {};
    if (stats.pass_att || stats.pass_cmp) {
      players.passer = {
        id: stats.player_id || stats.pass_player_id || '',
        name: stats.player_name || stats.pass_player_name || '',
        position: 'QB',
        team: possession,
      };
    }

    if (stats.rec) {
      players.receiver = {
        id: stats.receiver_id || '',
        name: stats.receiver_name || '',
        position: stats.receiver_position || 'WR',
        team: possession,
      };
    }

    if (stats.rush_att) {
      players.rusher = {
        id: stats.player_id || '',
        name: stats.player_name || '',
        position: stats.position || 'RB',
        team: possession,
      };
    }

    return players;
  }

  private normalizePlayType(type: string | undefined): StandardPlay['playType'] {
    const map: Record<string, StandardPlay['playType']> = {
      rush: 'rush',
      pass: 'pass',
      punt: 'punt',
      kickoff: 'kickoff',
      field_goal: 'field_goal',
      extra_point: 'extra_point',
      two_point_conversion: 'two_point',
      timeout: 'timeout',
      penalty: 'penalty',
    };
    return map[type || ''] || 'unknown';
  }
}

