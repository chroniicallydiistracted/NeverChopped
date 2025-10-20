// Configuration for Sleeper API
// IMPORTANT: Replace these with your actual values

export interface LeagueConfig {
  userId: string;
  leagueId: string;
  username: string;
  teamName: string;
  teamsRemaining?: number; // Optional: Manual override for survival leagues
  eliminatedRosterIds?: number[]; // Optional: List of eliminated roster IDs (for survival leagues)
}

// Default configuration - CHANGE THESE TO YOUR VALUES
export const defaultConfig: LeagueConfig = {
  userId: '1268309493943373825',
  leagueId: '1265326608424648704',
  username: 'CHRONiiC',
  teamName: 'Gods Gift to Girth',
  
  // 🎯 AUTOMATIC DETECTION ENABLED!
  // The app uses Sleeper's official "settings.eliminated" field to detect chopped teams
  // Works automatically week-to-week - no manual config needed! 🎉
  // 
  // Optional overrides (only if needed):
  // teamsRemaining: 12, // Manual count override
  // eliminatedRosterIds: [2, 7, 8, 16, 11, 15], // Manual list of eliminated roster IDs
};

// Helper to get config from localStorage or use default
export const getConfig = (): LeagueConfig => {
  const stored = localStorage.getItem('sleeperConfig');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse stored config', e);
    }
  }
  return defaultConfig;
};

// Helper to save config to localStorage
export const saveConfig = (config: LeagueConfig): void => {
  localStorage.setItem('sleeperConfig', JSON.stringify(config));
};

// Helper to check if using default config
export const isUsingDefaultConfig = (): boolean => {
  const stored = localStorage.getItem('sleeperConfig');
  return !stored;
};
