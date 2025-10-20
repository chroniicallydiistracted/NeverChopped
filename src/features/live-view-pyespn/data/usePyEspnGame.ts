import { useCallback, useEffect, useRef, useState } from 'react';
import { loadPyEspnGame } from './loadPyEspnGame';
import type { PyEspnDataSource } from './pyespn-types';

export interface UsePyEspnGameOptions {
  gameId: string | null | undefined;
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
}

export interface UsePyEspnGameResult {
  data: PyEspnDataSource;
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
  refresh: () => Promise<void>;
}

const DEFAULT_REFRESH_INTERVAL = 20_000;

export function usePyEspnGame({
  gameId,
  autoRefresh = true,
  refreshIntervalMs = DEFAULT_REFRESH_INTERVAL,
}: UsePyEspnGameOptions): UsePyEspnGameResult {
  const [data, setData] = useState<PyEspnDataSource>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const runLoad = useCallback(
    async (force = false) => {
      if (!gameId) {
        setData(null);
        setLastUpdated(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const result = await loadPyEspnGame({ gameId, forceRefresh: force });
        if (mountedRef.current) {
          setData(result);
          setLastUpdated(Date.now());
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to load game data');
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [gameId],
  );

  useEffect(() => {
    runLoad(true).catch(() => {
      // Errors are handled in runLoad
    });
  }, [runLoad]);

  useEffect(() => {
    if (!autoRefresh || !gameId) {
      return;
    }

    const interval = window.setInterval(() => {
      runLoad(false).catch(() => {
        // silently swallow inside hook
      });
    }, refreshIntervalMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [autoRefresh, refreshIntervalMs, gameId, runLoad]);

  const refresh = useCallback(async () => {
    await runLoad(true);
  }, [runLoad]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh,
  };
}
