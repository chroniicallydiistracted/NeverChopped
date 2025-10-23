import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resetFakeState, updateFakeEvent } from './stateUtils';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const pythonStubPath = path.resolve(__dirname, 'fakes');
const pythonPathValue = [pythonStubPath, process.env.PYTHONPATH]
  .filter(Boolean)
  .join(path.delimiter);
const originalFakeStatePathEnv = process.env.PYESPN_FAKE_STATE_PATH;
const scriptsStatePath = path.resolve(pythonStubPath, 'pyespn', '_state-scripts.json');

const runPythonScript = async (scriptName: string, args: Array<string | number>) => {
  const scriptPath = path.resolve(repoRoot, 'py', scriptName);
  const { stdout } = await execFileAsync('python', [scriptPath, ...args.map(String)], {
    env: {
      ...process.env,
      PYTHONPATH: pythonPathValue,
    },
    cwd: repoRoot,
  });
  return stdout.trim();
};

describe('PyESPN Python entrypoints', () => {
  beforeAll(async () => {
    process.env.PYESPN_FAKE_STATE_PATH = scriptsStatePath;
    await resetFakeState();
  });

  beforeEach(async () => {
    await resetFakeState();
  });

  afterEach(async () => {
    await resetFakeState();
  });

  afterAll(async () => {
    if (originalFakeStatePathEnv === undefined) {
      delete process.env.PYESPN_FAKE_STATE_PATH;
    } else {
      process.env.PYESPN_FAKE_STATE_PATH = originalFakeStatePathEnv;
    }
    await resetFakeState();
  });

  it('emits a normalized schedule payload', async () => {
    const raw = await runPythonScript('espn_schedule.py', ['regular', 2025, 7]);
    const parsed = JSON.parse(raw) as { entries: Array<Record<string, unknown>>; meta: Record<string, unknown> | null };
    expect(Array.isArray(parsed.entries)).toBe(true);
    expect(parsed.entries.length).toBeGreaterThan(0);
    expect(parsed.meta?.resolved_season_type ?? parsed.meta?.['resolved_season_type']).toBe('regular');
    expect(parsed.entries[0]).toMatchObject({
      game_id: '401770001',
      season: 2025,
      season_type: 'regular',
      home_team: expect.objectContaining({ displayName: 'Mockington Home' }),
      away_team: expect.objectContaining({ displayName: 'Sample City Away' }),
    });
  });

  it('returns game metadata for a known event id', async () => {
    const raw = await runPythonScript('espn_game.py', [401770001]);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed.id ?? parsed['event_id']).toBe('401770001');
    expect(Array.isArray(parsed.competitions)).toBe(true);
  });

  it('returns play-by-play with drives and plays for a known event id', async () => {
    const raw = await runPythonScript('espn_pbp.py', [401770001]);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const plays = parsed.plays as unknown[];
    const drives = parsed.drives as unknown[];
    expect(Array.isArray(plays)).toBe(true);
    expect(Array.isArray(drives)).toBe(true);
    expect((plays as Array<Record<string, unknown>>)[0]).toMatchObject({ id: 'play-1' });
  });

  it('returns player metadata from the player script', async () => {
    const raw = await runPythonScript('espn_player.py', [15847]);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed.id).toBe('15847');
    expect(parsed.fullName).toBe('Mock Quarterback');
  });

  it('supports preseason, postseason, and play-in schedule types', async () => {
    const preseasonRaw = await runPythonScript('espn_schedule.py', ['Pre-Season', 2025, 1]);
    const preseason = JSON.parse(preseasonRaw) as { entries: Array<Record<string, unknown>>; meta: Record<string, unknown> | null };
    expect(preseason.entries[0]?.game_id).toBe('401770101');
    expect(preseason.meta?.resolved_season_type ?? preseason.meta?.['resolved_season_type']).toBe('pre');

    const postseasonRaw = await runPythonScript('espn_schedule.py', ['post', 2026, 1]);
    const postseason = JSON.parse(postseasonRaw) as { entries: Array<Record<string, unknown>>; meta: Record<string, unknown> | null };
    expect(postseason.entries[0]?.game_id).toBe('401770201');
    expect(postseason.meta?.resolved_season_type ?? postseason.meta?.['resolved_season_type']).toBe('post');

    const playInRaw = await runPythonScript('espn_schedule.py', ['play-in', 2026, 1]);
    const playIn = JSON.parse(playInRaw) as { entries: Array<Record<string, unknown>>; meta: Record<string, unknown> | null };
    expect(playIn.entries[0]?.game_id).toBe('401770301');
    expect(playIn.meta?.resolved_season_type ?? playIn.meta?.['resolved_season_type']).toBe('playin');
  }, 15000);

  it('returns an empty payload when invalid numeric arguments are supplied', async () => {
    const raw = await runPythonScript('espn_schedule.py', ['regular', 'not-a-year', 'week']);
    const parsed = JSON.parse(raw) as { entries: unknown[]; meta: unknown };
    expect(parsed.entries).toEqual([]);
  });

  it('reflects updated play-by-play state when the data changes', async () => {
    await updateFakeEvent('401770001', event => {
      const plays = Array.isArray(event.plays) ? event.plays : [];
      plays.push({
        id: 'play-99',
        sequence: 99,
        text: 'Updated fake play for refresh validation',
        clock: { displayValue: '10:00' },
      });
      event.plays = plays;
    });

    const raw = await runPythonScript('espn_pbp.py', [401770001]);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const plays = (parsed.plays as Array<Record<string, unknown>>) ?? [];
    expect(plays.some(play => play.id === 'play-99')).toBe(true);
  });

  it('compiles every PyESPN entrypoint without syntax errors', async () => {
    const scripts = ['espn_schedule.py', 'espn_game.py', 'espn_pbp.py', 'espn_player.py'];
    await Promise.all(
      scripts.map(scriptName => {
        const scriptPath = path.resolve(repoRoot, 'py', scriptName);
        return execFileAsync('python', ['-m', 'py_compile', scriptPath], {
          env: {
            ...process.env,
            PYTHONPATH: pythonPathValue,
          },
          cwd: repoRoot,
        });
      }),
    );
  });
});
