import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchEspnPlayer, type EspnPlayerPayload } from '../../../lib/api/espn-data';

export interface EspnPlayerMeta {
  id: string;
  fullName: string | null;
  displayName: string | null;
  position: string | null;
  jersey: string | null;
  teamAbbreviation: string | null;
  teamDisplayName: string | null;
}

type PlayerCacheEntry = EspnPlayerMeta | null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const extractTeamAbbreviation = (raw: Record<string, unknown>): string | null => {
  const teamValue = raw.team;
  if (!isRecord(teamValue)) {
    return null;
  }
  if (typeof teamValue.abbreviation === 'string' && teamValue.abbreviation) {
    return teamValue.abbreviation;
  }
  if (typeof teamValue.shortDisplayName === 'string' && teamValue.shortDisplayName) {
    return teamValue.shortDisplayName;
  }
  return null;
};

const extractTeamDisplayName = (raw: Record<string, unknown>): string | null => {
  const teamValue = raw.team;
  if (!isRecord(teamValue)) {
    return null;
  }
  if (typeof teamValue.displayName === 'string' && teamValue.displayName) {
    return teamValue.displayName;
  }
  if (typeof teamValue.name === 'string' && teamValue.name) {
    return teamValue.name;
  }
  return null;
};

const buildPlayerMeta = (payload: EspnPlayerPayload): EspnPlayerMeta => {
  const rawRecord = isRecord(payload.raw) ? payload.raw : {};
  const jerseyValue = rawRecord.jersey;
  let jersey: string | null = null;
  if (typeof jerseyValue === 'string' && jerseyValue.trim().length > 0) {
    jersey = jerseyValue.trim();
  } else if (typeof jerseyValue === 'number' && Number.isFinite(jerseyValue)) {
    jersey = String(jerseyValue);
  }

  return {
    id: payload.id,
    fullName: payload.fullName ?? null,
    displayName: payload.displayName ?? null,
    position: payload.position ?? null,
    jersey,
    teamAbbreviation: extractTeamAbbreviation(rawRecord),
    teamDisplayName: extractTeamDisplayName(rawRecord),
  };
};

export interface UseEspnPlayersResult {
  playersById: Record<string, PlayerCacheEntry>;
  loading: boolean;
  error: string | null;
}

export function useEspnPlayers(playerIds: string[]): UseEspnPlayersResult {
  const normalized = useMemo(() => {
    const set = new Set<string>();
    playerIds.forEach(id => {
      if (!id) {
        return;
      }
      const trimmed = id.trim();
      if (trimmed.length > 0) {
        set.add(trimmed);
      }
    });
    return Array.from(set).sort();
  }, [playerIds]);

  const cacheRef = useRef<Map<string, PlayerCacheEntry>>(new Map());
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signature = useMemo(() => normalized.join('|'), [normalized]);

  useEffect(() => {
    let cancelled = false;
    const missing = normalized.filter(id => !cacheRef.current.has(id));
    if (!missing.length) {
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.allSettled(
      missing.map(async id => {
        const payload = await fetchEspnPlayer(id);
        return { id, payload };
      }),
    )
      .then(results => {
        if (cancelled) {
          return;
        }
        let changed = false;
        let failure = false;
        results.forEach((result, index) => {
          const id = missing[index];
          if (result.status === 'fulfilled') {
            const payload = result.value.payload;
            if (payload) {
              cacheRef.current.set(id, buildPlayerMeta(payload));
            } else {
              cacheRef.current.set(id, null);
            }
            changed = true;
          } else {
            failure = true;
          }
        });
        if (changed) {
          setVersion(prev => prev + 1);
        }
        setError(failure ? 'Failed to load some ESPN player data.' : null);
      })
      .catch(err => {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load ESPN player data.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [signature, normalized]);

  const playersById = useMemo(() => {
    const record: Record<string, PlayerCacheEntry> = {};
    cacheRef.current.forEach((value, key) => {
      record[key] = value;
    });
    return record;
  }, [version]);

  return { playersById, loading, error };
}
