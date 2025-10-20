import type { GameInfo, StandardPlay } from './types';
import type { PlayDataAdapter } from './adapters/base';
import { SportsDataIOAdapter } from './adapters/sportsdataio-adapter';

const sportsDataAdapter = new SportsDataIOAdapter();
const ADAPTERS: PlayDataAdapter[] = [sportsDataAdapter];

export async function loadPlaysForGame(game: GameInfo): Promise<StandardPlay[]> {
  console.log(`[PlayData Orchestrator] Loading plays for game ${game.gameId} (${game.awayTeam} @ ${game.homeTeam})`);

  for (const adapter of ADAPTERS) {
    try {
      console.log(`[PlayData Orchestrator] Checking ${adapter.name}...`);
      if (await adapter.canHandleGame(game)) {
        console.log(`[PlayData Orchestrator] ✅ ${adapter.name} can handle this game. Attempting fetch...`);
        try {
          const plays = await adapter.fetchPlays(game);
          console.log(`[PlayData Orchestrator] ${adapter.name} returned ${plays.length} plays`);
          if (plays.length > 0) {
            return normalizeAndSort(plays);
          }
          console.warn(`[PlayData Orchestrator] ${adapter.name} returned no plays, continuing to next adapter.`);
        } catch (fetchErr) {
          console.warn(`[PlayData Orchestrator] ⚠️ ${adapter.name} fetch error:`, fetchErr);
        }
        continue;
      }
      console.log(`[PlayData Orchestrator] ❌ ${adapter.name} cannot handle this game`);
    } catch (err) {
      console.warn(`[PlayData Orchestrator] ⚠️ ${adapter.name} canHandleGame error:`, err);
    }
  }

  throw new Error('SportsDataIO did not return any play data for this game.');
}

function normalizeAndSort(plays: StandardPlay[]): StandardPlay[] {
  return plays
    .map(play => ({
      ...play,
      sequence: Number.isFinite(play.sequence) ? play.sequence : 0,
    }))
    .sort((a, b) => {
      if (a.quarter !== b.quarter) return a.quarter - b.quarter;
      if (a.gameClockSeconds !== b.gameClockSeconds) {
        return a.gameClockSeconds - b.gameClockSeconds;
      }
      return a.sequence - b.sequence;
    });
}
