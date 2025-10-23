// @vitest-environment jsdom
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import {
  fetchEspnEvent,
  fetchEspnPlayByPlay,
  fetchEspnPlayer,
  fetchEspnSchedule,
} from '../../src/lib/api/espn-data';
import {
  clearPyEspnGameCache,
  loadPyEspnGame,
} from '../../src/features/live-view-pyespn/data/loadPyEspnGame';
import { usePyEspnGame } from '../../src/features/live-view-pyespn/data/usePyEspnGame';
import { resetFakeState, updateFakeEvent } from './stateUtils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const pythonStubPath = path.resolve(__dirname, 'fakes');
const pythonPathValue = [pythonStubPath, process.env.PYTHONPATH]
  .filter(Boolean)
  .join(path.delimiter);
const originalFakeStatePathEnv = process.env.PYESPN_FAKE_STATE_PATH;
const e2eStatePath = path.resolve(pythonStubPath, 'pyespn', '_state-e2e.json');

const baseUrl = 'http://127.0.0.1:3001';
const originalFetch = globalThis.fetch;

function waitForServer(proc: ChildProcessWithoutNullStreams) {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanupListeners();
        reject(new Error('Timed out waiting for ESPN API server to start.'));
      }
    }, 15000);

    const handleData = (chunk: Buffer) => {
      const text = chunk.toString();
      if (text.includes('ESPN API server running on port')) {
        if (!settled) {
          settled = true;
          cleanupListeners();
          resolve();
        }
      }
    };

    const handleExit = (code: number | null, signal: NodeJS.Signals | null) => {
      if (!settled) {
        settled = true;
        cleanupListeners();
        reject(new Error(`Server exited prematurely with code ${code} signal ${signal}`));
      }
    };

    const cleanupListeners = () => {
      clearTimeout(timeout);
      proc.stdout.off('data', handleData);
      proc.off('exit', handleExit);
    };

    proc.stdout.on('data', handleData);
    proc.on('exit', handleExit);
  });
}

let serverProcess: ChildProcessWithoutNullStreams | null = null;

describe('PyESPN end-to-end integration', () => {
  beforeAll(async () => {
    process.env.PYESPN_FAKE_STATE_PATH = e2eStatePath;
    await resetFakeState();
    serverProcess = spawn('node', ['espn-api-server.cjs'], {
      cwd: repoRoot,
      env: {
        ...process.env,
        PYTHONPATH: pythonPathValue,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    await waitForServer(serverProcess);

    globalThis.fetch = ((input: Parameters<typeof originalFetch>[0], init) => {
      if (typeof input === 'string' && !/^https?:/i.test(input)) {
        const absolute = new URL(input, baseUrl).toString();
        return originalFetch(absolute, init);
      }
      if (input instanceof URL) {
        const absolute = input.href.startsWith('http')
          ? input.href
          : new URL(input.href, baseUrl).toString();
        return originalFetch(absolute, init);
      }
      return originalFetch(input, init);
    }) as typeof globalThis.fetch;
  }, 20000);

  afterEach(async () => {
    clearPyEspnGameCache();
    cleanup();
    await resetFakeState();
  });

  afterAll(async () => {
    globalThis.fetch = originalFetch;
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = null;
    }
    if (originalFakeStatePathEnv === undefined) {
      delete process.env.PYESPN_FAKE_STATE_PATH;
    } else {
      process.env.PYESPN_FAKE_STATE_PATH = originalFakeStatePathEnv;
    }
    await resetFakeState();
  });

  it('fetches schedule, game, play-by-play, and player data through the web stack', async () => {
    const schedule = await fetchEspnSchedule('regular', 2025, 7);
    expect(Array.isArray(schedule)).toBe(true);
    expect(schedule[0]).toMatchObject({
      game_id: '401770001',
      status: 'in_progress',
      status_label: 'Live',
    });

    const event = await fetchEspnEvent('401770001');
    expect(event?.id ?? event?.event_id).toBe('401770001');

    const pbp = await fetchEspnPlayByPlay('401770001');
    expect(pbp?.plays?.length).toBeGreaterThan(0);
    expect(pbp?.plays?.[0]?.id).toBe('play-1');

    const player = await fetchEspnPlayer('15847');
    expect(player?.id).toBe('15847');
    expect(player?.fullName).toBe('Mock Quarterback');
  }, 20000);

  it('refreshes schedule entries after state updates when forceRefresh is set', async () => {
    const initial = await fetchEspnSchedule('regular', 2025, 7);
    expect(initial[0]?.status_label).toBe('Live');

    await updateFakeEvent('401770001', event => {
      event.status = 'post';
    });

    const refreshed = await fetchEspnSchedule('regular', 2025, 7, { forceRefresh: true });
    expect(refreshed[0]?.status).toBe('complete');
    expect(refreshed[0]?.status_label).toBe('Final');
  }, 20000);

  it('exposes season metadata and resolves season type automatically for alternate weeks', async () => {
    const response = await fetchEspnSchedule('regular', 2025, 1, {
      includeMeta: true,
      forceRefresh: true,
    });
    expect(response.entries.length).toBeGreaterThan(0);
    expect(response.entries[0]?.season_type).toBe('pre');
    expect(response.meta?.resolved_season_type).toBe('pre');
    expect(response.meta?.week_to_season_type?.['1']).toBe('pre');
    const summaries = response.meta?.season_types ?? [];
    const preseasonSummary = summaries.find(summary => summary.id === 'pre');
    expect(preseasonSummary?.weeks).toContain(1);
    expect(preseasonSummary?.label).toBe('Preseason');
  }, 20000);

  it('normalizes combined game payloads via loadPyEspnGame', async () => {
    const result = await loadPyEspnGame({ gameId: '401770001', forceRefresh: true });
    expect(result).not.toBeNull();
    expect(result?.game.id).toBe('401770001');
    expect(result?.plays.length).toBeGreaterThan(0);
    expect(result?.plays[0]).toMatchObject({
      id: 'play-1',
      sequence: 1,
    });

    const ensureAugmentedEvent = async () => {
      await updateFakeEvent('401770001', event => {
        const plays = Array.isArray(event.plays) ? [...event.plays] : [];
        const alreadyPresent = plays.some(play => play && play.id === 'play-77');
        if (!alreadyPresent) {
          plays.push({
            id: 'play-77',
            sequence: 77,
            text: 'New play pushed after refresh',
            clock: { displayValue: '09:59' },
          });
        }
        event.plays = plays;

        const homeTeam =
          event.home_team && typeof event.home_team === 'object'
            ? (event.home_team as Record<string, unknown>)
            : null;
        if (homeTeam) {
          homeTeam.score = 14;
        }
        const awayTeam =
          event.away_team && typeof event.away_team === 'object'
            ? (event.away_team as Record<string, unknown>)
            : null;
        if (awayTeam) {
          awayTeam.score = 7;
        }
        event.status = 'in-progress';
      });
    };

    await ensureAugmentedEvent();

    let refreshed: Awaited<ReturnType<typeof loadPyEspnGame>> = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      // eslint-disable-next-line no-await-in-loop
      await ensureAugmentedEvent();
      clearPyEspnGameCache('401770001');
      // eslint-disable-next-line no-await-in-loop
      const candidate = await loadPyEspnGame({ gameId: '401770001', forceRefresh: true });
      if (candidate?.plays.some(play => play.id === 'play-77')) {
        refreshed = candidate;
        break;
      }
      // eslint-disable-next-line no-await-in-loop
      await new Promise(resolve => setTimeout(resolve, 250));
    }

    expect(refreshed?.plays.some(play => play.id === 'play-77')).toBe(true);
    expect(refreshed?.game.homeTeam?.score).toBe(14);
    expect(refreshed?.game.awayTeam?.score).toBe(7);
  }, 20000);

  it('hydrates the usePyEspnGame hook against live endpoints', async () => {
    const { result } = renderHook(() =>
      usePyEspnGame({ gameId: '401770001', autoRefresh: false }),
    );

    await waitFor(
      () => {
        expect(result.current.loading).toBe(false);
        expect(result.current.data).not.toBeNull();
      },
      { timeout: 10000 },
    );

    expect(result.current.error).toBeNull();
    expect(result.current.data?.game.id).toBe('401770001');
    expect(result.current.data?.plays.length).toBeGreaterThan(0);
    expect(result.current.lastUpdated).not.toBeNull();

    await updateFakeEvent('401770001', event => {
      if (Array.isArray(event.plays) && event.plays[0] && typeof event.plays[0] === 'object') {
        (event.plays[0] as Record<string, unknown>).text = 'Hook refreshed play text';
      }
      event.status = 'post';
    });

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.data?.plays[0]?.text).toBe('Hook refreshed play text');
    });
    expect(result.current.data?.game.status).toBe('post');
  }, 20000);
});
