import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const pythonStubPath = path.resolve(__dirname, 'fakes');
const pythonPathValue = [pythonStubPath, process.env.PYTHONPATH]
  .filter(Boolean)
  .join(path.delimiter);

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

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = null;
    }
  });

  it('serves schedule, game, play-by-play, and player data via HTTP', async () => {
    const scheduleResponse = await fetch('http://127.0.0.1:3001/api/espn/schedule/regular/2025/7');
    expect(scheduleResponse.ok).toBe(true);
    const schedule = (await scheduleResponse.json()) as Array<Record<string, unknown>>;
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
});
