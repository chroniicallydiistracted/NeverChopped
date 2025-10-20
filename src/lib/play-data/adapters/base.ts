import type { GameInfo } from '../types';
import type { PyESPNPlay } from './pyespn-adapter';

export interface PlayDataAdapter {
  name: string;
  canHandleGame(game: GameInfo): Promise<boolean>;
  fetchPlays(game: GameInfo): Promise<PyESPNPlay[]>;
}

