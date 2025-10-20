import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { defaultConfig } from '../config';

interface LeagueContextValue {
  selectedLeagueId: string | null;
  setSelectedLeagueId: (leagueId: string | null) => void;
}

const LeagueContext = createContext<LeagueContextValue | undefined>(undefined);

const STORAGE_KEY = 'selectedLeagueId';

export function LeagueProvider({ children }: { children: React.ReactNode }) {
  const [selectedLeagueId, setSelectedLeagueIdState] = useState<string | null>(null);

  // Initialize from localStorage or default config on mount
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored && stored !== 'null' && stored !== 'undefined') {
      setSelectedLeagueIdState(stored);
    } else if (defaultConfig?.leagueId) {
      setSelectedLeagueIdState(defaultConfig.leagueId);
    }
  }, []);

  const setSelectedLeagueId = (leagueId: string | null) => {
    setSelectedLeagueIdState(leagueId);
    try {
      if (typeof window !== 'undefined') {
        if (leagueId) {
          localStorage.setItem(STORAGE_KEY, leagueId);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {}
  };

  const value = useMemo(() => ({ selectedLeagueId, setSelectedLeagueId }), [selectedLeagueId]);

  return <LeagueContext.Provider value={value}>{children}</LeagueContext.Provider>;
}

export function useLeague(): LeagueContextValue {
  const ctx = useContext(LeagueContext);
  if (!ctx) throw new Error('useLeague must be used within a LeagueProvider');
  return ctx;
}
