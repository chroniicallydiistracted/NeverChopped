import type { GameInfo, StandardPlay } from '../types';

export interface PlayDataAdapter {
  name: string;
  canHandleGame(game: GameInfo): Promise<boolean>;
  fetchPlays(game: GameInfo): Promise<StandardPlay[]>;
}

