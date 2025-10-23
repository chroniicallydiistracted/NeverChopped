import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execFileAsync = promisify(execFile);

interface EspnPlayByPlayPayload {
  [key: string]: unknown;
}

interface EspnScheduleResponse {
  entries: unknown[];
  meta: Record<string, unknown> | null;
}

const PYTHON_INTERPRETER = 'python';

const normalizeSeasonType = (value: string): string => {
  const key = value.toLowerCase();
  switch (key) {
    case 'preseason':
    case 'pre-season':
    case 'pre':
      return 'pre';
    case 'postseason':
    case 'post-season':
    case 'playoffs':
    case 'playoff':
    case 'post':
      return 'post';
    case 'playin':
    case 'play-in':
    case 'play_in':
      return 'playin';
    default:
      return 'regular';
  }
};

async function runPythonScript(scriptRelativePath: string, args: Array<string | number>): Promise<string> {
  const scriptPath = path.join(process.cwd(), scriptRelativePath);
  const { stdout } = await execFileAsync(PYTHON_INTERPRETER, [scriptPath, ...args.map(arg => String(arg))]);
  return stdout;
}

export async function fetchEspnGameData(gameId: string): Promise<EspnPlayByPlayPayload | null> {
  try {
    const raw = await runPythonScript('py/espn_pbp.py', [gameId]);
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }
    return JSON.parse(trimmed) as EspnPlayByPlayPayload;
  } catch (error) {
    console.error(`Error fetching ESPN data for game ${gameId}:`, error);
    return null;
  }
}

export async function fetchEspnSchedule(
  seasonType: string,
  season: number,
  week: number,
): Promise<EspnScheduleResponse | null> {
  try {
    const normalizedSeasonType = normalizeSeasonType(seasonType);
    const raw = await runPythonScript('py/espn_schedule.py', [normalizedSeasonType, season, week]);
    const trimmed = raw.trim();
    if (!trimmed) {
      return { entries: [], meta: null };
    }
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
      const meta = parsed.meta && typeof parsed.meta === 'object' ? (parsed.meta as Record<string, unknown>) : null;
      return { entries, meta };
    }
    return { entries: Array.isArray(parsed) ? parsed : [], meta: null };
  } catch (error) {
    console.error(`Error fetching ESPN schedule for ${seasonType} ${season} week ${week}:`, error);
    return null;
  }
}

if (require.main === module) {
  const [, , command, ...params] = process.argv;

  if (command === 'schedule') {
    const [seasonType = 'regular', seasonArg, weekArg] = params;
    const season = Number(seasonArg);
    const week = Number(weekArg);
    if (!Number.isFinite(season) || !Number.isFinite(week)) {
      console.error('Usage: ts-node fetch-espn-data.ts schedule <seasonType> <season> <week>');
      process.exit(1);
    }
    fetchEspnSchedule(seasonType, season, week)
      .then(data => {
        console.log(JSON.stringify(data ?? { entries: [], meta: null }, null, 2));
      })
      .catch(error => {
        console.error('Error:', error);
        process.exit(1);
      });
    return;
  }

  const gameId = command;
  if (!gameId) {
    console.error('Usage: ts-node fetch-espn-data.ts <gameId>');
    process.exit(1);
  }

  fetchEspnGameData(gameId)
    .then(data => {
      if (data) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.error('Failed to fetch data');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}
