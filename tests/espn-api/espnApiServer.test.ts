import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resetFakeState, updateFakeEvent } from './stateUtils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const pythonStubPath = path.resolve(__dirname, 'fakes');
const pythonPathValue = [pythonStubPath, process.env.PYTHONPATH]
  .filter(Boolean)
  .join(path.delimiter);
const originalFakeStatePathEnv = process.env.PYESPN_FAKE_STATE_PATH;
const serverStatePath = path.resolve(pythonStubPath, 'pyespn', '_state-server.json');

let serverProcess: ChildProcessWithoutNullStreams | null = null;

const waitForServer = (proc: ChildProcessWithoutNullStreams) =>
  new Promise<void>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error('Timed out waiting for ESPN API server to start.'));
      }
    }, 15000);

    const handleData = (chunk: Buffer) => {
      const text = chunk.toString();
      if (text.includes('ESPN API server running on port')) {
        if (!settled) {
          settled = true;
          cleanup();
          resolve();
        }
      }
    };

    const handleExit = (code: number | null, signal: NodeJS.Signals | null) => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error(`Server exited prematurely with code ${code} signal ${signal}`));
      }
    };

    const cleanup = () => {
      clearTimeout(timeout);
      proc.stdout.off('data', handleData);
      proc.off('exit', handleExit);
    };

    proc.stdout.on('data', handleData);
    proc.on('exit', handleExit);
  });

describe('espn-api-server integration', () => {
  beforeAll(async () => {
    process.env.PYESPN_FAKE_STATE_PATH = serverStatePath;
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
  }, 20000);

  beforeEach(async () => {
    await resetFakeState();
  });

  afterEach(async () => {
    await resetFakeState();
  });

  afterAll(async () => {
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

  it('serves schedule, game, play-by-play, and player data via HTTP', async () => {
    const scheduleResponse = await fetch('http://127.0.0.1:3001/api/espn/schedule/regular/2025/7');
    expect(scheduleResponse.ok).toBe(true);
    const scheduleEnvelope = (await scheduleResponse.json()) as
      | Array<Record<string, unknown>>
      | { entries?: Array<Record<string, unknown>> };
    const schedule = Array.isArray(scheduleEnvelope)
      ? scheduleEnvelope
      : scheduleEnvelope.entries ?? [];
    expect(schedule[0]).toMatchObject({ game_id: '401770001' });

    const gameResponse = await fetch('http://127.0.0.1:3001/api/espn/game/401770001');
    expect(gameResponse.ok).toBe(true);
    const game = (await gameResponse.json()) as Record<string, unknown>;
    expect(game.id ?? game['event_id']).toBe('401770001');

    const pbpResponse = await fetch('http://127.0.0.1:3001/api/espn/game/401770001/pbp');
    expect(pbpResponse.ok).toBe(true);
    const pbp = (await pbpResponse.json()) as Record<string, unknown>;
    expect(Array.isArray(pbp.plays)).toBe(true);
    expect((pbp.plays as Array<Record<string, unknown>>)[0]).toMatchObject({ id: 'play-1' });

    const playerResponse = await fetch('http://127.0.0.1:3001/api/espn/player/15847');
    expect(playerResponse.ok).toBe(true);
    const player = (await playerResponse.json()) as Record<string, unknown>;
    expect(player.id).toBe('15847');
  }, 20000);

  it('respects cache until a force refresh bypasses it', async () => {
    const initialResponse = await fetch('http://127.0.0.1:3001/api/espn/schedule/regular/2025/7');
    const initialEnvelope = (await initialResponse.json()) as
      | Array<Record<string, string>>
      | { entries?: Array<Record<string, string>> };
    const initialSchedule = Array.isArray(initialEnvelope)
      ? initialEnvelope
      : initialEnvelope.entries ?? [];
    expect(initialSchedule[0]?.status).toBe('in-progress');

    await updateFakeEvent('401770001', event => {
      event.status = 'post';
    });

    const cachedResponse = await fetch('http://127.0.0.1:3001/api/espn/schedule/regular/2025/7');
    const cachedEnvelope = (await cachedResponse.json()) as
      | Array<Record<string, string>>
      | { entries?: Array<Record<string, string>> };
    const cachedSchedule = Array.isArray(cachedEnvelope)
      ? cachedEnvelope
      : cachedEnvelope.entries ?? [];
    expect(cachedSchedule[0]?.status).toBe('in-progress');

    const refreshedResponse = await fetch(
      'http://127.0.0.1:3001/api/espn/schedule/regular/2025/7?force=refresh',
    );
    const refreshedEnvelope = (await refreshedResponse.json()) as
      | Array<Record<string, string>>
      | { entries?: Array<Record<string, string>> };
    const refreshedSchedule = Array.isArray(refreshedEnvelope)
      ? refreshedEnvelope
      : refreshedEnvelope.entries ?? [];
    expect(refreshedSchedule[0]?.status).toBe('post');
  }, 20000);
});
