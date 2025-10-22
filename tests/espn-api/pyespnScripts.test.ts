import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
  beforeEach(async () => {
    await resetFakeState();
  });

  afterEach(async () => {
    await resetFakeState();
  });

  it('emits a normalized schedule payload', async () => {
    const raw = await runPythonScript('espn_schedule.py', ['regular', 2025, 7]);
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
    expect(parsed[0]).toMatchObject({
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
    const preseason = JSON.parse(preseasonRaw) as Array<Record<string, unknown>>;
    expect(preseason[0]?.game_id).toBe('401770101');

    const postseasonRaw = await runPythonScript('espn_schedule.py', ['post', 2026, 1]);
    const postseason = JSON.parse(postseasonRaw) as Array<Record<string, unknown>>;
    expect(postseason[0]?.game_id).toBe('401770201');

    const playInRaw = await runPythonScript('espn_schedule.py', ['play-in', 2026, 1]);
    const playIn = JSON.parse(playInRaw) as Array<Record<string, unknown>>;
    expect(playIn[0]?.game_id).toBe('401770301');
  });

  it('returns an empty array when invalid numeric arguments are supplied', async () => {
    const raw = await runPythonScript('espn_schedule.py', ['regular', 'not-a-year', 'week']);
    const parsed = JSON.parse(raw) as Array<unknown>;
    expect(parsed).toEqual([]);
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
});
