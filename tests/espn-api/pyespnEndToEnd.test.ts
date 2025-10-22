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
import { cleanup, renderHook, waitFor } from '@testing-library/react';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const pythonStubPath = path.resolve(__dirname, 'fakes');
const pythonPathValue = [pythonStubPath, process.env.PYTHONPATH]
  .filter(Boolean)
  .join(path.delimiter);

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

  afterEach(() => {
    clearPyEspnGameCache();
    cleanup();
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = null;
    }
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

  it('normalizes combined game payloads via loadPyEspnGame', async () => {
    const result = await loadPyEspnGame({ gameId: '401770001', forceRefresh: true });
    expect(result).not.toBeNull();
    expect(result?.game.id).toBe('401770001');
    expect(result?.plays.length).toBeGreaterThan(0);
    expect(result?.plays[0]).toMatchObject({
      id: 'play-1',
      sequence: 1,
    });
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
  }, 20000);
});
