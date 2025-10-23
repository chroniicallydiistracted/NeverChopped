# nflfastR Integration Implementation Guide

**Purpose**: Add nflfastR as a data source to complement and enhance Sleeper API play-by-play data  
**Target**: LiveGameVisualizer component and related utilities  
**Timeline**: Phased rollout with backwards compatibility

---

## Table of Contents
1. [Overview](#overview)
2. [nflfastR Data Structure](#nflfastr-data-structure)
3. [Architecture Design](#architecture-design)
4. [Phase 1: Adapter Layer](#phase-1-adapter-layer)
5. [Phase 2: Data Fetching](#phase-2-data-fetching)
6. [Phase 3: Field Position Accuracy](#phase-3-field-position-accuracy)
7. [Phase 4: Player Positioning](#phase-4-player-positioning)
8. [Phase 5: Advanced Metrics](#phase-5-advanced-metrics)
9. [Testing Strategy](#testing-strategy)
10. [Rollout Plan](#rollout-plan)

---

## Overview

### What is nflfastR?

nflfastR is an R package and dataset that provides:
- **Complete NFL play-by-play data** from 1999 to present
- **Next Gen Stats integration** (player tracking, field coordinates)
- **Advanced metrics** (EPA, win probability, success rate)
- **Standardized format** across all seasons
- **Weekly updates** during the season

### Why Use nflfastR?

| Feature | Sleeper API | nflfastR |
|---------|-------------|----------|
| Data Completeness | ❌ Missing plays | ✅ 100% coverage |
| Field Position | ⚠️ Inconsistent | ✅ Standardized |
| Player Tracking | ❌ Not available | ✅ X, Y coordinates |
| Advanced Stats | ❌ Basic only | ✅ EPA, WP, Success |
| Historical Data | ⚠️ Limited | ✅ 1999-present |
| Live Updates | ✅ Real-time | ❌ Post-game only |

### Integration Strategy

**Hybrid Approach**:
- Use **Sleeper** for live/in-progress games (real-time updates)
- Use **nflfastR** for completed games (accuracy and richness)
- Merge data when both available (best of both worlds)

---

## nflfastR Data Structure

### Play-by-Play Schema

Key fields we'll use from nflfastR dataset:

```typescript
interface NFLfastRPlay {
  // Identifiers
  game_id: string;           // Format: YYYY_MM_DD_away_home (e.g., "2024_09_05_KC_BAL")
  play_id: number;           // Unique within game
  old_game_id: string;       // Legacy format: YYYYMMDDHH
  
  // Game Context
  game_date: string;         // ISO date
  season: number;            // Year
  week: number;              // 1-18 (regular), 19+ (playoffs)
  home_team: string;         // 3-letter code
  away_team: string;
  posteam: string;           // Possessing team
  defteam: string;           // Defending team
  
  // Play Details
  play_type: string;         // "run", "pass", "punt", "kickoff", "field_goal", etc.
  desc: string;              // Full play description
  
  // Field Position (STANDARDIZED)
  yardline_100: number;      // Yards from opponent's endzone (0-100)
                             // 0 = opponent's goal line
                             // 100 = own goal line
                             // 50 = midfield
  
  // Alternative field position fields for validation
  yardline_side: string;     // Team whose side of field (null if midfield)
  yardline_number: number;   // Yard line number (1-50)
  
  // Down & Distance
  down: number;              // 1, 2, 3, 4
  ydstogo: number;          // Yards to first down
  yards_gained: number;      // Yards gained on play
  
  // Scoring
  home_score: number;        // Score after play
  away_score: number;
  touchdown: number;         // 1 if TD, 0 if not
  field_goal_result: string; // "made", "missed", "blocked"
  
  // Pass-Specific
  pass_location: string;     // "left", "middle", "right"
  pass_length: string;       // "short", "deep"
  air_yards: number;         // Yards ball traveled in air
  yards_after_catch: number; // YAC
  complete_pass: number;     // 1 if complete
  incomplete_pass: number;   // 1 if incomplete
  interception: number;      // 1 if INT
  
  // Rush-Specific
  run_location: string;      // "left", "middle", "right"
  run_gap: string;           // "end", "tackle", "guard", "center"
  
  // Players
  passer_player_name: string;
  passer_player_id: string;
  receiver_player_name: string;
  receiver_player_id: string;
  rusher_player_name: string;
  rusher_player_id: string;
  
  // Advanced Metrics
  epa: number;               // Expected Points Added
  wp: number;                // Win Probability (0-1)
  wpa: number;               // Win Probability Added
  success: number;           // 1 if "successful" play
  
  // Player Tracking (if available)
  receiver_x?: number;       // X coordinate at catch (0-120 yards)
  receiver_y?: number;       // Y coordinate at catch (0-53.3 yards)
  rusher_x?: number;
  rusher_y?: number;
  
  // Time
  quarter_seconds_remaining: number;
  half_seconds_remaining: number;
  game_seconds_remaining: number;
  
  // Many more fields available...
}
```

### Data Access Options

#### Option 1: R Package (Requires R Runtime)
```r
library(nflfastR)
pbp <- load_pbp(2024)  # Load season
```

#### Option 2: Direct CSV Download
```bash
# Weekly updates available at:
https://github.com/nflverse/nflverse-data/releases/tag/pbp

# Parquet files (smaller, faster):
https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_YYYY.parquet

# CSV files:
https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_YYYY.csv.gz
```

#### Option 3: JavaScript Package (RECOMMENDED)
```bash
npm install nflverse
```

```typescript
import { loadPbp } from 'nflverse';

const plays = await loadPbp({ seasons: [2024] });
```

---

## Architecture Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│         LiveGameVisualizer Component            │
└────────────┬────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────┐
│         Play Data Orchestrator (NEW)            │
│  - Determines which source to use               │
│  - Merges data from multiple sources            │
│  - Handles caching                              │
└────────────┬────────────────────────────────────┘
             │
      ┌──────┴──────┐
      ▼             ▼
┌──────────┐  ┌──────────┐
│ Sleeper  │  │ nflfastR │
│ Adapter  │  │ Adapter  │
└────┬─────┘  └────┬─────┘
     │             │
     ▼             ▼
┌──────────┐  ┌──────────┐
│ Sleeper  │  │ nflfastR │
│   API    │  │  Dataset │
└──────────┘  └──────────┘
```

### Normalized Play Interface

Create a source-agnostic interface that both adapters output:

```typescript
// src/lib/play-data/types.ts

export interface StandardPlay {
  // Core Identifiers
  id: string;
  gameId: string;
  sequence: number;
  
  // Context
  quarter: number;
  gameClockSeconds: number;
  homeTeam: string;
  awayTeam: string;
  possession: string;
  
  // Play Type
  playType: 'rush' | 'pass' | 'punt' | 'kickoff' | 'field_goal' | 'extra_point' | 'two_point' | 'timeout' | 'penalty' | 'unknown';
  description: string;
  
  // Field Position (ALWAYS 0-100 scale)
  startFieldPosition: number;  // 0 = opponent's goal, 100 = own goal
  endFieldPosition: number;
  yardsGained: number;
  
  // Down & Distance
  down: number | null;
  yardsToGo: number | null;
  yardsToEndzone: number;
  
  // Play Direction (derived or explicit)
  direction: {
    category: 'left' | 'middle' | 'right' | null;
    isDeep: boolean;
    isShort: boolean;
  };
  
  // Scoring
  homeScore: number;
  awayScore: number;
  isTouchdown: boolean;
  isFieldGoal: boolean;
  isSafety: boolean;
  
  // Pass Details (if applicable)
  pass?: {
    isComplete: boolean;
    isInterception: boolean;
    airYards: number | null;
    yardsAfterCatch: number | null;
    location: 'left' | 'middle' | 'right' | null;
    depth: 'short' | 'deep' | null;
  };
  
  // Rush Details (if applicable)
  rush?: {
    location: 'left' | 'middle' | 'right' | null;
    gap: 'end' | 'tackle' | 'guard' | 'center' | null;
  };
  
  // Players Involved
  players: {
    passer?: StandardPlayer;
    receiver?: StandardPlayer;
    rusher?: StandardPlayer;
    kicker?: StandardPlayer;
    // ... others
  };
  
  // Player Positions (if available)
  playerPositions?: {
    playerId: string;
    x: number;  // 0-120 yards
    y: number;  // 0-53.3 yards
    team: string;
  }[];
  
  // Advanced Metrics (if available)
  metrics?: {
    epa: number | null;
    winProbability: number | null;  // 0-1
    winProbabilityAdded: number | null;
    successRate: number | null;
  };
  
  // Metadata
  dataSource: 'sleeper' | 'nflfastr' | 'merged';
  rawData: any;  // Preserve original for debugging
}

export interface StandardPlayer {
  id: string;
  name: string;
  position: string;
  team: string;
  jerseyNumber?: string;
}
```

---

## Phase 1: Adapter Layer

### Step 1.1: Create Base Adapter Interface

```typescript
// src/lib/play-data/adapters/base.ts

export interface PlayDataAdapter {
  name: string;
  
  /**
   * Check if this adapter can provide data for a game
   */
  canHandleGame(gameId: string, gameDate: Date): Promise<boolean>;
  
  /**
   * Fetch all plays for a game
   */
  fetchPlays(gameId: string): Promise<StandardPlay[]>;
  
  /**
   * Get real-time updates (if supported)
   */
  subscribeToUpdates?(
    gameId: string, 
    callback: (plays: StandardPlay[]) => void
  ): () => void;  // Returns unsubscribe function
}
```

### Step 1.2: Implement Sleeper Adapter

> **Note:** The legacy `src/utils/playDirection.ts` helper was removed during the 2025 redundancy cleanup. Inline a lightweight heuristic or use orientation data from your provider if you still need left/right hints for plays.

```typescript
// src/lib/play-data/adapters/sleeper-adapter.ts

import type { PlayDataAdapter, StandardPlay } from '../types';

function inferPlayDirection(play: any): 'left' | 'right' | 'unknown' {
  const side = play?.possession?.direction ?? play?.direction;
  if (side === 'left' || side === 'right') return side;
  return 'unknown';
}

export class SleeperAdapter implements PlayDataAdapter {
  name = 'sleeper';
  
  async canHandleGame(gameId: string, gameDate: Date): Promise<boolean> {
    // Sleeper is best for live/recent games
    const now = new Date();
    const daysSinceGame = (now.getTime() - gameDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // Use Sleeper if game is within last 2 days (likely still updating)
    return daysSinceGame <= 2;
  }
  
  async fetchPlays(gameId: string): Promise<StandardPlay[]> {
    // Extract Sleeper game ID from our internal format
    const sleeperGameId = this.extractSleeperGameId(gameId);
    
    // Try REST API first
    let plays: any[];
    try {
      const resp = await fetch(`https://api.sleeper.com/stats/nfl/game/${sleeperGameId}`);
      if (resp.ok) {
        const data = await resp.json();
        plays = data.plays || [];
      } else {
        // Fall back to GraphQL
        plays = await this.fetchFromGraphQL(sleeperGameId);
      }
    } catch (e) {
      console.error('[SleeperAdapter] Fetch failed', e);
      return [];
    }
    
    // Convert to StandardPlay format
    return plays.map(p => this.toStandardPlay(p));
  }
  
  private toStandardPlay(raw: any): StandardPlay {
    const metadata = raw.metadata || {};
    const stats = raw.stats || {};
    
    // Extract field position
    const { startPos, endPos } = this.extractFieldPosition(metadata);
    
    // Infer direction
    const direction = inferPlayDirection({
      description: metadata.description || '',
      play_type: metadata.play_type,
      pass_location: metadata.pass_location,
      run_location: metadata.run_location,
    });
    
    return {
      id: raw.play_id || `sleeper_${raw.sequence}`,
      gameId: raw.game_id,
      sequence: parseInt(raw.sequence) || 0,
      
      quarter: parseInt(metadata.quarter) || 1,
      gameClockSeconds: this.parseGameClock(metadata.game_clock),
      homeTeam: metadata.home_team || '',
      awayTeam: metadata.away_team || '',
      possession: metadata.team || metadata.possession || '',
      
      playType: this.normalizePlayType(metadata.play_type),
      description: metadata.description || '',
      
      startFieldPosition: startPos,
      endFieldPosition: endPos,
      yardsGained: parseInt(metadata.yards_gained) || 0,
      
      down: parseInt(metadata.down) || null,
      yardsToGo: parseInt(metadata.distance) || null,
      yardsToEndzone: parseInt(metadata.yards_to_end_zone) || 0,
      
      direction: {
        category: direction.category,
        isDeep: direction.isDeep,
        isShort: direction.isShort,
      },
      
      homeScore: parseInt(metadata.home_points) || 0,
      awayScore: parseInt(metadata.away_points) || 0,
      isTouchdown: Boolean(stats.rec_td || stats.rush_td || stats.pass_td),
      isFieldGoal: metadata.play_type === 'field_goal',
      isSafety: false,  // Not in Sleeper data
      
      // Pass details
      pass: metadata.play_type === 'pass' ? {
        isComplete: Boolean(stats.rec),
        isInterception: Boolean(stats.pass_int),
        airYards: parseInt(stats.pass_air_yards) || null,
        yardsAfterCatch: parseInt(stats.rec_yac) || null,
        location: metadata.pass_location || null,
        depth: direction.isDeep ? 'deep' : direction.isShort ? 'short' : null,
      } : undefined,
      
      // Rush details
      rush: metadata.play_type === 'rush' ? {
        location: metadata.run_location || null,
        gap: metadata.run_gap || null,
      } : undefined,
      
      players: this.extractPlayers(stats),
      
      // No advanced metrics from Sleeper
      metrics: undefined,
      
      dataSource: 'sleeper',
      rawData: raw,
    };
  }
  
  private extractFieldPosition(meta: any): { startPos: number, endPos: number } {
    // Convert Sleeper's yard_line + territory to 0-100 scale
    const yardLine = parseInt(meta.yard_line) || 50;
    const territory = meta.yard_line_territory || '';
    const yardsToEnd = parseInt(meta.yards_to_end_zone) || 50;
    
    // Standardize: 0 = opponent's endzone, 100 = own endzone
    let startPos = 100 - yardsToEnd;  // Inverse of Sleeper's convention
    let endPos = startPos + (parseInt(meta.yards_gained) || 0);
    
    // Clamp to valid range
    startPos = Math.max(0, Math.min(100, startPos));
    endPos = Math.max(0, Math.min(100, endPos));
    
    return { startPos, endPos };
  }
  
  private normalizePlayType(sleeperType: string | undefined): StandardPlay['playType'] {
    const map: Record<string, StandardPlay['playType']> = {
      'rush': 'rush',
      'pass': 'pass',
      'punt': 'punt',
      'kickoff': 'kickoff',
      'field_goal': 'field_goal',
      'extra_point': 'extra_point',
      'two_point_conversion': 'two_point',
      'timeout': 'timeout',
      'penalty': 'penalty',
    };
    return map[sleeperType || ''] || 'unknown';
  }
  
  private parseGameClock(clockStr: string | undefined): number {
    // Convert "12:34" to seconds
    if (!clockStr) return 0;
    const [min, sec] = clockStr.split(':').map(Number);
    return (min || 0) * 60 + (sec || 0);
  }
  
  private extractPlayers(stats: any): StandardPlay['players'] {
    return {
      passer: stats.pass_att ? {
        id: stats.player_id || '',
        name: stats.player_name || '',
        position: 'QB',
        team: stats.team || '',
      } : undefined,
      
      receiver: stats.rec ? {
        id: stats.receiver_id || '',
        name: stats.receiver_name || '',
        position: stats.receiver_position || '',
        team: stats.team || '',
      } : undefined,
      
      rusher: stats.rush_att ? {
        id: stats.player_id || '',
        name: stats.player_name || '',
        position: stats.position || '',
        team: stats.team || '',
      } : undefined,
    };
  }
  
  private extractSleeperGameId(internalGameId: string): string {
    // Implement based on your game ID format
    return internalGameId;
  }
  
  private async fetchFromGraphQL(gameId: string): Promise<any[]> {
    // Existing GraphQL logic from LiveGameVisualizer
    // ... (copy from lines 376-423)
    return [];
  }
}
```

### Step 1.3: Implement nflfastR Adapter

```typescript
// src/lib/play-data/adapters/nflfastr-adapter.ts

import type { PlayDataAdapter, StandardPlay } from '../types';

export class NFLfastRAdapter implements PlayDataAdapter {
  name = 'nflfastr';
  private cachedData: Map<string, StandardPlay[]> = new Map();
  
  async canHandleGame(gameId: string, gameDate: Date): Promise<boolean> {
    // nflfastR is best for completed games (final data available ~1 hour after game)
    const now = new Date();
    const hoursSinceGame = (now.getTime() - gameDate.getTime()) / (1000 * 60 * 60);
    
    // Use nflfastR if game ended at least 1 hour ago
    return hoursSinceGame >= 1;
  }
  
  async fetchPlays(gameId: string): Promise<StandardPlay[]> {
    // Check cache first
    if (this.cachedData.has(gameId)) {
      return this.cachedData.get(gameId)!;
    }
    
    // Extract season and week from game ID
    const { season, week, awayTeam, homeTeam } = this.parseGameId(gameId);
    
    // Fetch nflfastR data
    const plays = await this.fetchNFLfastRData(season, week, awayTeam, homeTeam);
    
    // Convert to StandardPlay format
    const standardPlays = plays.map(p => this.toStandardPlay(p));
    
    // Cache for future use
    this.cachedData.set(gameId, standardPlays);
    
    return standardPlays;
  }
  
  private async fetchNFLfastRData(
    season: number,
    week: number,
    awayTeam: string,
    homeTeam: string
  ): Promise<any[]> {
    try {
      // Option 1: Use nflverse npm package (if installed)
      // const { loadPbp } = await import('nflverse');
      // const allPlays = await loadPbp({ seasons: [season] });
      // return allPlays.filter(p => p.home_team === homeTeam && p.away_team === awayTeam && p.week === week);
      
      // Option 2: Fetch from hosted parquet files (RECOMMENDED for now)
      const url = `https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_${season}.parquet`;
      
      // Use a parquet parsing library
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      
      // Parse parquet (need to add parquet library)
      // For now, use CSV fallback:
      const csvUrl = `https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_${season}.csv.gz`;
      return await this.fetchAndParseCSV(csvUrl, homeTeam, awayTeam, week);
      
    } catch (e) {
      console.error('[NFLfastRAdapter] Fetch failed', e);
      return [];
    }
  }
  
  private async fetchAndParseCSV(
    url: string,
    homeTeam: string,
    awayTeam: string,
    week: number
  ): Promise<any[]> {
    // Implementation depends on CSV parsing library
    // Pseudo-code:
    // 1. Fetch compressed CSV
    // 2. Decompress
    // 3. Parse with Papa Parse or similar
    // 4. Filter for specific game
    // 5. Return rows as objects
    
    // For production, consider:
    // - Downloading full season data once and storing in IndexedDB
    // - Using parquet format (smaller, faster)
    // - Server-side preprocessing
    
    console.warn('CSV parsing not yet implemented');
    return [];
  }
  
  private toStandardPlay(raw: any): StandardPlay {
    return {
      id: `nflfastr_${raw.game_id}_${raw.play_id}`,
      gameId: raw.old_game_id,  // Use legacy format for compatibility
      sequence: raw.play_id,
      
      quarter: raw.qtr || 1,
      gameClockSeconds: raw.quarter_seconds_remaining || 0,
      homeTeam: raw.home_team,
      awayTeam: raw.away_team,
      possession: raw.posteam || '',
      
      playType: this.normalizePlayType(raw.play_type),
      description: raw.desc || '',
      
      // KEY ADVANTAGE: Standardized field position
      startFieldPosition: raw.yardline_100 || 50,
      endFieldPosition: Math.max(0, Math.min(100, (raw.yardline_100 || 50) - (raw.yards_gained || 0))),
      yardsGained: raw.yards_gained || 0,
      
      down: raw.down || null,
      yardsToGo: raw.ydstogo || null,
      yardsToEndzone: raw.yardline_100 || 50,
      
      direction: {
        category: this.normalizeLocation(raw.pass_location || raw.run_location),
        isDeep: raw.pass_length === 'deep',
        isShort: raw.pass_length === 'short',
      },
      
      homeScore: raw.total_home_score || 0,
      awayScore: raw.total_away_score || 0,
      isTouchdown: Boolean(raw.touchdown),
      isFieldGoal: raw.field_goal_result === 'made',
      isSafety: Boolean(raw.safety),
      
      // Pass details with ACTUAL air yards data
      pass: raw.play_type === 'pass' ? {
        isComplete: Boolean(raw.complete_pass),
        isInterception: Boolean(raw.interception),
        airYards: raw.air_yards,
        yardsAfterCatch: raw.yards_after_catch,
        location: this.normalizeLocation(raw.pass_location),
        depth: raw.pass_length as any,
      } : undefined,
      
      // Rush details with gap data
      rush: raw.play_type === 'run' ? {
        location: this.normalizeLocation(raw.run_location),
        gap: raw.run_gap,
      } : undefined,
      
      players: {
        passer: raw.passer_player_name ? {
          id: raw.passer_player_id,
          name: raw.passer_player_name,
          position: 'QB',
          team: raw.posteam,
        } : undefined,
        
        receiver: raw.receiver_player_name ? {
          id: raw.receiver_player_id,
          name: raw.receiver_player_name,
          position: 'WR',  // Simplified
          team: raw.posteam,
        } : undefined,
        
        rusher: raw.rusher_player_name ? {
          id: raw.rusher_player_id,
          name: raw.rusher_player_name,
          position: 'RB',  // Simplified
          team: raw.posteam,
        } : undefined,
      },
      
      // Player positioning (if available)
      playerPositions: this.extractPlayerPositions(raw),
      
      // ADVANCED METRICS - nflfastR's killer feature
      metrics: {
        epa: raw.epa,
        winProbability: raw.wp,
        winProbabilityAdded: raw.wpa,
        successRate: raw.success,
      },
      
      dataSource: 'nflfastr',
      rawData: raw,
    };
  }
  
  private normalizePlayType(nflfastrType: string | undefined): StandardPlay['playType'] {
    const map: Record<string, StandardPlay['playType']> = {
      'run': 'rush',
      'pass': 'pass',
      'punt': 'punt',
      'kickoff': 'kickoff',
      'field_goal': 'field_goal',
      'extra_point': 'extra_point',
      'qb_kneel': 'rush',  // Treat as rush
      'qb_spike': 'pass',  // Treat as pass
    };
    return map[nflfastrType || ''] || 'unknown';
  }
  
  private normalizeLocation(loc: string | null): 'left' | 'middle' | 'right' | null {
    if (!loc) return null;
    if (loc.includes('left')) return 'left';
    if (loc.includes('right')) return 'right';
    if (loc.includes('middle') || loc.includes('center')) return 'middle';
    return null;
  }
  
  private extractPlayerPositions(raw: any): StandardPlay['playerPositions'] {
    // Check if Next Gen Stats tracking data is available
    if (!raw.receiver_x && !raw.rusher_x) return undefined;
    
    const positions: StandardPlay['playerPositions'] = [];
    
    if (raw.receiver_x !== null && raw.receiver_y !== null) {
      positions.push({
        playerId: raw.receiver_player_id,
        x: raw.receiver_x,
        y: raw.receiver_y,
        team: raw.posteam,
      });
    }
    
    if (raw.rusher_x !== null && raw.rusher_y !== null) {
      positions.push({
        playerId: raw.rusher_player_id,
        x: raw.rusher_x,
        y: raw.rusher_y,
        team: raw.posteam,
      });
    }
    
    return positions.length > 0 ? positions : undefined;
  }
  
  private parseGameId(internalGameId: string): {
    season: number;
    week: number;
    awayTeam: string;
    homeTeam: string;
  } {
    // Implement based on your internal game ID format
    // Example: "2024_SEA_SF_W1" → { season: 2024, week: 1, awayTeam: 'SEA', homeTeam: 'SF' }
    
    const parts = internalGameId.split('_');
    return {
      season: parseInt(parts[0]) || 2024,
      week: parseInt(parts[3]?.replace('W', '')) || 1,
      awayTeam: parts[1] || '',
      homeTeam: parts[2] || '',
    };
  }
}
```

---

## Phase 2: Data Fetching

### Step 2.1: Create Orchestrator

```typescript
// src/lib/play-data/orchestrator.ts

import type { StandardPlay } from './types';
import type { PlayDataAdapter } from './adapters/base';
import { SleeperAdapter } from './adapters/sleeper-adapter';
import { NFLfastRAdapter } from './adapters/nflfastr-adapter';

export class PlayDataOrchestrator {
  private adapters: PlayDataAdapter[];
  
  constructor() {
    this.adapters = [
      new SleeperAdapter(),
      new NFLfastRAdapter(),
    ];
  }
  
  /**
   * Fetch plays from the best available source
   */
  async fetchPlays(gameId: string, gameDate: Date): Promise<StandardPlay[]> {
    // Try adapters in priority order
    for (const adapter of this.adapters) {
      if (await adapter.canHandleGame(gameId, gameDate)) {
        console.log(`[PlayDataOrchestrator] Using ${adapter.name} for game ${gameId}`);
        try {
          const plays = await adapter.fetchPlays(gameId);
          if (plays.length > 0) {
            return plays;
          }
        } catch (e) {
          console.error(`[PlayDataOrchestrator] ${adapter.name} failed`, e);
          // Continue to next adapter
        }
      }
    }
    
    // No adapter could handle the game
    console.warn('[PlayDataOrchestrator] No adapter available for game', gameId);
    return [];
  }
  
  /**
   * Fetch from multiple sources and merge (best of both worlds)
   */
  async fetchAndMerge(gameId: string, gameDate: Date): Promise<StandardPlay[]> {
    const results = await Promise.allSettled(
      this.adapters.map(async adapter => {
        if (await adapter.canHandleGame(gameId, gameDate)) {
          return adapter.fetchPlays(gameId);
        }
        return [];
      })
    );
    
    const allPlays = results
      .filter((r): r is PromiseFulfilledResult<StandardPlay[]> => r.status === 'fulfilled')
      .flatMap(r => r.value);
    
    if (allPlays.length === 0) return [];
    
    // Merge plays by sequence number, preferring nflfastR data
    return this.mergePlays(allPlays);
  }
  
  private mergePlays(plays: StandardPlay[]): StandardPlay[] {
    const playMap = new Map<number, StandardPlay>();
    
    // First pass: Add all plays
    for (const play of plays) {
      const existing = playMap.get(play.sequence);
      if (!existing) {
        playMap.set(play.sequence, play);
      } else {
        // Merge: prefer nflfastR for field position and metrics
        playMap.set(play.sequence, {
          ...existing,
          startFieldPosition: play.dataSource === 'nflfastr' ? play.startFieldPosition : existing.startFieldPosition,
          endFieldPosition: play.dataSource === 'nflfastr' ? play.endFieldPosition : existing.endFieldPosition,
          metrics: play.metrics || existing.metrics,
          playerPositions: play.playerPositions || existing.playerPositions,
          dataSource: 'merged' as const,
        });
      }
    }
    
    return Array.from(playMap.values()).sort((a, b) => a.sequence - b.sequence);
  }
}
```

### Step 2.2: Update LiveGameVisualizer to Use Orchestrator

```typescript
// In LiveGameVisualizer.tsx

import { PlayDataOrchestrator } from '@/lib/play-data/orchestrator';
import type { StandardPlay } from '@/lib/play-data/types';

// Replace current loadGamePlays function
const orchestrator = useMemo(() => new PlayDataOrchestrator(), []);

const loadGamePlays = useCallback(async (g: GameMeta) => {
  setPlays([]);
  setError(null);
  
  try {
    const gameDate = new Date(g.date);
    const standardPlays = await orchestrator.fetchPlays(g.game_id, gameDate);
    
    if (standardPlays.length === 0) {
      throw new Error('No plays found');
    }
    
    setPlays(standardPlays);
    setCurrentIndex(0);
    
  } catch (err: any) {
    console.error('[loadGamePlays] Error:', err);
    setError(err.message || 'Failed to load plays');
  }
}, [orchestrator]);
```

---

## Phase 3: Field Position Accuracy

### Update Field Mapping to Use Standardized Positions

```typescript
// In LiveGameVisualizer.tsx

// Update lineOfScrimmagePercent calculation
const lineOfScrimmagePercent = useMemo(() => {
  if (!currentPlay) return null;
  
  // StandardPlay already has normalized 0-100 position!
  return currentPlay.startFieldPosition;
  
}, [currentPlay]);

const previousBallPosition = useMemo(() => {
  if (currentIndex <= 0) return null;
  
  const prevPlay = plays[currentIndex - 1];
  return prevPlay?.endFieldPosition ?? null;
  
}, [plays, currentIndex]);

// Update animation points calculation
const animationPoints = useMemo(() => {
  if (!currentPlay || !isAnimationPlayable) return null;
  
  const start = currentPlay.startFieldPosition;
  const end = currentPlay.endFieldPosition;
  
  // Use direction from StandardPlay
  const direction = currentPlay.direction;
  
  // Calculate lane offset based on direction
  const laneStart = direction.category === 'left' ? -0.25 :
                    direction.category === 'right' ? 0.25 : 0;
  const laneEnd = direction.category === 'left' ? -0.6 :
                  direction.category === 'right' ? 0.6 : 0;
  
  // Map to calibrated field
  const { mapFieldX, mapFieldY } = makeFieldMappers(teamId);
  
  const startX = mapFieldX(start);
  const endX = mapFieldX(end);
  
  const startY = mapFieldY(0.5 + laneStart);
  const endY = mapFieldY(0.5 + laneEnd);
  
  // Generate arc based on play type
  if (currentPlay.playType === 'pass') {
    const isDeep = direction.isDeep;
    const arcHeight = isDeep ? 26 : 18;
    const midY = Math.min(mapFieldY(0.05), startY - arcHeight, endY - arcHeight);
    
    return {
      path: `M ${startX} ${startY} Q ${(startX + endX) / 2} ${midY}, ${endX} ${endY}`,
      kind: 'pass' as const,
    };
  } else {
    // Rush: straight line with slight curve
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2 + 2;
    
    return {
      path: `M ${startX} ${startY} L ${midX} ${midY} L ${endX} ${endY}`,
      kind: 'rush' as const,
    };
  }
}, [currentPlay, isAnimationPlayable, teamId]);
```

---

## Phase 4: Player Positioning

### Use Actual Player Tracking Data (When Available)

```typescript
// Add new component for accurate player badges

interface PlayerPositionProps {
  position: StandardPlay['playerPositions'][0];
  play: StandardPlay;
  isActive: boolean;
}

const PlayerBadge: React.FC<PlayerPositionProps> = ({ position, play, isActive }) => {
  const { mapFieldX, mapFieldY } = makeFieldMappers(teamId);
  
  // Convert nflfastR coordinates (0-120 yards, 0-53.3 yards)
  // to our 0-100 field position scale
  const fieldPercent = (120 - position.x) / 120 * 100;  // Flip X axis
  const lateralPercent = position.y / 53.3;
  
  const x = mapFieldX(fieldPercent);
  const y = mapFieldY(lateralPercent);
  
  const player = Object.values(play.players).find(p => p?.id === position.playerId);
  
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Helmet */}
      <image
        href={getHelmetUrl(position.team)}
        width="24"
        height="24"
        x="-12"
        y="-12"
        className={isActive ? 'scale-110 drop-shadow-glow' : ''}
      />
      
      {/* Name */}
      <text
        y="-20"
        className="text-xs font-bold text-white"
        textAnchor="middle"
      >
        {player?.name || '?'}
      </text>
    </g>
  );
};

// In main render:
{currentPlay?.playerPositions?.map((pos, idx) => (
  <PlayerBadge
    key={`${pos.playerId}_${idx}`}
    position={pos}
    play={currentPlay}
    isActive={pos.playerId === activePlayerId}
  />
))}
```

---

## Phase 5: Advanced Metrics

### Display EPA and Win Probability

```typescript
// Add new metrics display component

const PlayMetrics: React.FC<{ play: StandardPlay }> = ({ play }) => {
  if (!play.metrics) return null;
  
  const { epa, winProbability, successRate } = play.metrics;
  
  return (
    <div className="absolute top-4 right-4 bg-black/80 p-4 rounded-lg">
      <div className="text-sm font-mono space-y-1">
        {epa !== null && (
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">EPA:</span>
            <span className={epa > 0 ? 'text-green-400' : 'text-red-400'}>
              {epa > 0 ? '+' : ''}{epa.toFixed(2)}
            </span>
          </div>
        )}
        
        {winProbability !== null && (
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Win Prob:</span>
            <span className="text-white">
              {(winProbability * 100).toFixed(1)}%
            </span>
          </div>
        )}
        
        {successRate !== null && (
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Success:</span>
            <span className={successRate > 0 ? 'text-green-400' : 'text-gray-400'}>
              {successRate > 0 ? 'Yes' : 'No'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Add to render:
<PlayMetrics play={currentPlay} />
```

### Animate Win Probability Over Time

```typescript
// Add win probability chart below field

const WinProbabilityChart: React.FC<{ plays: StandardPlay[] }> = ({ plays }) => {
  const data = plays
    .filter(p => p.metrics?.winProbability !== null)
    .map((p, idx) => ({
      play: idx,
      wp: p.metrics!.winProbability! * 100,
      possession: p.possession,
    }));
  
  return (
    <div className="w-full h-24 bg-black/50 p-2">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* 50% line */}
        <line x1="0" y1="50" x2="100" y2="50" stroke="#444" strokeWidth="0.5" />
        
        {/* Win probability line */}
        <polyline
          points={data.map((d, i) => 
            `${(i / data.length) * 100},${100 - d.wp}`
          ).join(' ')}
          fill="none"
          stroke="#22c55e"
          strokeWidth="1"
        />
        
        {/* Current play indicator */}
        <circle
          cx={(currentIndex / data.length) * 100}
          cy={100 - (data[currentIndex]?.wp || 50)}
          r="2"
          fill="#22c55e"
        />
      </svg>
    </div>
  );
};
```

---

## Testing Strategy

### Unit Tests

```typescript
// src/lib/play-data/__tests__/adapters.test.ts

import { describe, it, expect } from 'vitest';
import { SleeperAdapter } from '../adapters/sleeper-adapter';
import { NFLfastRAdapter } from '../adapters/nflfastr-adapter';

describe('SleeperAdapter', () => {
  const adapter = new SleeperAdapter();
  
  it('should handle recent games', async () => {
    const today = new Date();
    const result = await adapter.canHandleGame('test', today);
    expect(result).toBe(true);
  });
  
  it('should convert Sleeper play to StandardPlay', () => {
    const sleeperPlay = {
      play_id: '123',
      metadata: {
        yard_line: 25,
        yard_line_territory: 'SF',
        yards_gained: 10,
        // ...
      },
    };
    
    const standard = adapter['toStandardPlay'](sleeperPlay);
    
    expect(standard.id).toBe('sleeper_123');
    expect(standard.yardsGained).toBe(10);
    expect(standard.dataSource).toBe('sleeper');
  });
});

describe('NFLfastRAdapter', () => {
  const adapter = new NFLfastRAdapter();
  
  it('should handle completed games', async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await adapter.canHandleGame('test', yesterday);
    expect(result).toBe(true);
  });
  
  it('should normalize field position correctly', () => {
    const nflfastRPlay = {
      yardline_100: 25,  // 25 yards from opponent's endzone
      yards_gained: 10,
      // ...
    };
    
    const standard = adapter['toStandardPlay'](nflfastRPlay);
    
    expect(standard.startFieldPosition).toBe(25);
    expect(standard.endFieldPosition).toBe(15);  // Moved 10 yards closer
  });
});
```

### Integration Tests

```typescript
// src/lib/play-data/__tests__/orchestrator.test.ts

import { describe, it, expect, vi } from 'vitest';
import { PlayDataOrchestrator } from '../orchestrator';

describe('PlayDataOrchestrator', () => {
  it('should choose Sleeper for recent games', async () => {
    const orchestrator = new PlayDataOrchestrator();
    const today = new Date();
    
    const plays = await orchestrator.fetchPlays('test_game', today);
    
    // Should attempt Sleeper first
    expect(plays[0]?.dataSource).toBe('sleeper');
  });
  
  it('should fall back to nflfastR if Sleeper fails', async () => {
    // Mock Sleeper adapter to fail
    // ...
  });
  
  it('should merge plays from multiple sources', async () => {
    const orchestrator = new PlayDataOrchestrator();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const plays = await orchestrator.fetchAndMerge('test_game', yesterday);
    
    // Should combine data from both sources
    expect(plays.some(p => p.dataSource === 'merged')).toBe(true);
    expect(plays.some(p => p.metrics?.epa !== undefined)).toBe(true);  // From nflfastR
  });
});
```

### E2E Testing Checklist

- [ ] Load live game → Verify Sleeper adapter used
- [ ] Load completed game → Verify nflfastR adapter used
- [ ] Load game from 6 hours ago → Verify merge happens
- [ ] Verify field positions render correctly
- [ ] Verify player tracking shows accurate positions
- [ ] Verify EPA/WP metrics display
- [ ] Verify animations smooth with new data
- [ ] Test fallback when nflfastR data unavailable
- [ ] Test offline behavior (cached data)

---

## Rollout Plan

### Week 1: Foundation
- [ ] Create `StandardPlay` interface
- [ ] Implement base adapter interface
- [ ] Set up project structure (`src/lib/play-data/`)
- [ ] Add nflverse npm package or CSV parsing library

### Week 2: Sleeper Adapter
- [ ] Extract existing Sleeper logic into adapter
- [ ] Implement `SleeperAdapter.toStandardPlay()`
- [ ] Write unit tests
- [ ] Verify no regressions in live game viewing

### Week 3: nflfastR Adapter
- [ ] Implement `NFLfastRAdapter`
- [ ] Set up CSV/Parquet downloading
- [ ] Implement caching strategy (IndexedDB)
- [ ] Write unit tests

### Week 4: Orchestrator
- [ ] Implement `PlayDataOrchestrator`
- [ ] Add merge logic
- [ ] Integrate into `LiveGameVisualizer`
- [ ] Test with real games

### Week 5: Enhanced Visuals
- [ ] Update field position rendering
- [ ] Add player tracking badges
- [ ] Implement EPA/WP display
- [ ] Add win probability chart

### Week 6: Polish & Testing
- [ ] E2E testing across game states
- [ ] Performance optimization
- [ ] Documentation
- [ ] Deploy to production

---

## Dependencies to Add

```json
{
  "dependencies": {
    "nflverse": "^1.0.0",           // Official nflfastR JS package
    "papaparse": "^5.4.1",          // CSV parsing (fallback)
    "parquetjs": "^0.11.2",         // Parquet file parsing (faster)
    "idb": "^7.1.1"                 // IndexedDB wrapper for caching
  },
  "devDependencies": {
    "@types/papaparse": "^5.3.7",
    "vitest": "^0.34.0"             // Unit testing
  }
}
```

---

## Configuration

### Environment Variables

```env
# .env.local

# nflfastR data source (csv or parquet)
VITE_NFLFASTR_FORMAT=parquet

# Cache strategy (memory, indexeddb, or none)
VITE_NFLFASTR_CACHE=indexeddb

# Fallback timeout (ms)
VITE_ADAPTER_TIMEOUT=5000

# Enable merge mode (fetch from both sources)
VITE_ENABLE_DATA_MERGE=true
```

---

## Monitoring & Debugging

### Add Telemetry

```typescript
// src/lib/play-data/telemetry.ts

export const logAdapterUsage = (adapter: string, gameId: string, success: boolean) => {
  console.log(`[Telemetry] Adapter: ${adapter}, Game: ${gameId}, Success: ${success}`);
  
  // In production, send to analytics
  // window.gtag?.('event', 'play_data_fetch', {
  //   adapter,
  //   gameId,
  //   success,
  // });
};

export const logMergeQuality = (plays: StandardPlay[]) => {
  const sources = {
    sleeper: plays.filter(p => p.dataSource === 'sleeper').length,
    nflfastr: plays.filter(p => p.dataSource === 'nflfastr').length,
    merged: plays.filter(p => p.dataSource === 'merged').length,
  };
  
  console.log('[Telemetry] Merge quality:', sources);
};
```

---

## Future Enhancements

### Phase 6: Player Headshots
- Use nflfastR's player roster data
- Fetch headshots from NFL.com or ESPN
- Display in player badges

### Phase 7: Drive Charts
- Aggregate plays into drives
- Show drive success rate
- Visualize field position over time

### Phase 8: Formation Detection
- Use nflfastR's formation data
- Show offensive/defensive alignments
- Animate pre-snap motion

### Phase 9: Real-Time Predictions
- Train ML model on nflfastR data
- Predict play outcome based on situation
- Show probability of different outcomes

---

## Troubleshooting

### Issue: nflfastR data not loading

**Check**:
1. Is the CSV/Parquet URL correct?
2. Is CORS blocking the request? (May need proxy)
3. Is the file too large? (Consider server-side preprocessing)

**Solution**: Download season data once, host on own CDN

### Issue: Field positions don't match

**Check**:
1. Are you using `yardline_100` field?
2. Is the coordinate system flipped?
3. Did you account for possession changes?

**Solution**: Add validation logging, compare with official play-by-play

### Issue: Performance degradation

**Check**:
1. Are you caching parsed data?
2. Are you re-parsing CSV on every game load?
3. Is IndexedDB being used correctly?

**Solution**: Implement aggressive caching, use parquet format

---

## Conclusion

This implementation guide provides a **complete roadmap** for integrating nflfastR into your play-by-play visualizer. The adapter pattern ensures:

✅ **Backwards compatibility** - Sleeper API continues to work  
✅ **Gradual migration** - Roll out feature by feature  
✅ **Best of both worlds** - Merge data from multiple sources  
✅ **Future-proof** - Easy to add more data sources later  

**Start with Phase 1** (adapter layer) and work through each phase systematically. Each phase builds on the previous one and can be tested independently.

Good luck! 🏈
