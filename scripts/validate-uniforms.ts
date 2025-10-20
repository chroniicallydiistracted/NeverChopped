#!/usr/bin/env -S node --enable-source-maps
/**
 * Validate that sliced uniform parts exist for all styles discovered in the styles index.
 *
 * - Reads styles from public/uniforms/styles/{YEAR}.json (or assets fallback)
 * - Verifies assets/uniform_parts/{YEAR}/{TEAM}/{STYLE}/{STYLE}_{helmet_left,helmet_right,jersey_front,jersey_back}.png
 * - If REPAIR=1, attempts to auto-repair missing items by:
 *    1) Downloading the raw uniform (scripts/fetch-uniforms.ts) for the team/style
 *    2) Running the Python splicer (py scripts/split_uniforms.py)
 *    3) Syncing to public (scripts/sync-helmets.ts)
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

type StylesIndex = {
  year: string;
  teams: string[];
  styles: Record<string, { styles: string[] }>; // keys are GUD codes (e.g., ARZ, WSH)
};

const DEFAULT_YEAR = new Date().getFullYear();
const YEAR = String(process.env.YEAR || DEFAULT_YEAR);
const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === '1';
const REPAIR = String(process.env.REPAIR || '').toLowerCase() === '1';

// Map GUD codes back to our canonical local codes used in folder structure
const FROM_GUD_CODE: Record<string, string> = {
  ARZ: 'ARI',
  WSH: 'WAS',
};

const REQUIRED_PARTS = ['helmet_left', 'helmet_right', 'jersey_front', 'jersey_back'] as const;

function findStylesIndex(year: string): StylesIndex | null {
  const candidates = [
    path.resolve('public/uniforms/styles', `${year}.json`),
    path.resolve('assets/uniforms/styles', `${year}.json`),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf8');
        return JSON.parse(raw) as StylesIndex;
      } catch (e) {
        console.warn(`Failed to parse styles index at ${p}:`, (e as Error).message);
      }
    }
  }
  return null;
}

function exists(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function run(cmd: string, args: string[], env?: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      env: { ...process.env, ...(env || {}) },
    });
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}`));
    });
    child.on('error', reject);
  });
}

async function ensureUniformDownloaded(year: string, team: string, style: string) {
  const out = path.resolve('assets/uniforms', year, team, `${style}.png`);
  if (exists(out)) return; // already downloaded
  console.log(`[repair] Downloading raw uniform for ${team} ${style} ${year}...`);
  await run('npx', ['-y', 'tsx', 'scripts/fetch-uniforms.ts'], {
    YEAR: year,
    TEAM: team,
    STYLES: style,
  });
}

async function runSplicer() {
  console.log('[repair] Running splicer...');
  // Processes all uniforms; idempotent and safe
  await run('python3', ['py scripts/split_uniforms.py']);
}

async function syncPublic() {
  console.log('[repair] Syncing uniform parts to public...');
  await run('npx', ['-y', 'tsx', 'scripts/sync-helmets.ts']);
}

async function main() {
  const index = findStylesIndex(YEAR);
  if (!index) {
    console.error(`No styles index found for ${YEAR}. Run: npm run uniforms:scan-styles -- YEAR=${YEAR}`);
    process.exit(1);
  }
  const missing: Array<{ team: string; style: string; part: string; path: string }> = [];
  const teams = Object.keys(index.styles).sort();
  for (const gudTeam of teams) {
    const localTeam = FROM_GUD_CODE[gudTeam] || gudTeam; // use canonical local folder code
    const styles = (index.styles[gudTeam]?.styles || []).map(s => s.toUpperCase());
    for (const style of styles) {
      const baseDir = path.resolve('assets/uniform_parts', YEAR, localTeam, style);
      for (const part of REQUIRED_PARTS) {
        const file = path.join(baseDir, `${style}_${part}.png`);
        if (!exists(file)) {
          missing.push({ team: localTeam, style, part, path: file });
        }
      }
    }
  }

  if (missing.length === 0) {
    console.log(`All uniform parts present for ${YEAR}.`);
    // Still ensure public is in sync
    try {
      await syncPublic();
    } catch (e) {
      console.warn('Public sync skipped/failed:', (e as Error).message);
    }
    return;
  }

  console.log(`Found ${missing.length} missing uniform parts for ${YEAR}.`);
  const byTeamStyle = new Map<string, { team: string; style: string; parts: Set<string> }>();
  for (const m of missing) {
    const key = `${m.team}:${m.style}`;
    const entry = byTeamStyle.get(key) || { team: m.team, style: m.style, parts: new Set<string>() };
    entry.parts.add(m.part);
    byTeamStyle.set(key, entry);
  }
  for (const { team, style, parts } of byTeamStyle.values()) {
    console.log(`- ${team} ${style}: missing ${Array.from(parts).join(', ')}`);
  }

  if (!REPAIR) {
    console.log('Run with REPAIR=1 to attempt auto-repair (download, splice, sync).');
    process.exit(2);
  }

  // Attempt repairs
  for (const { team, style } of byTeamStyle.values()) {
    try {
      await ensureUniformDownloaded(YEAR, team, style);
    } catch (e) {
      console.warn(`[repair] Download failed for ${team} ${style}:`, (e as Error).message);
    }
  }

  // Run splicer once after downloads
  try {
    await runSplicer();
  } catch (e) {
    console.warn('[repair] Splicer failed:', (e as Error).message);
  }

  // Sync to public
  try {
    await syncPublic();
  } catch (e) {
    console.warn('[repair] Public sync failed:', (e as Error).message);
  }

  // Re-validate
  const stillMissing: string[] = [];
  for (const { team, style, part, path: filePath } of missing) {
    const ok = exists(filePath);
    if (!ok) stillMissing.push(`${team} ${style} ${part}`);
  }
  if (stillMissing.length === 0) {
    console.log('Auto-repair completed successfully. All parts present.');
  } else {
    console.log('Some parts are still missing after repair:');
    stillMissing.forEach(s => console.log('  - ' + s));
    process.exitCode = 3;
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
