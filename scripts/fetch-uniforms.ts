#!/usr/bin/env -S node --enable-source-maps
/**
 * Fetch high-resolution uniform images from Gridiron Uniform Database (GUD).
 * Pattern inferred from examples:
 *   https://www.gridiron-uniforms.com/GUD/images/singles/hr/{YEAR}_{TEAM}_{STYLE}.png
 * Where STYLE is usually a single letter (A, B, C, D, ...), indicating home/away/alt/color rush variants.
 *
 * We probe styles A..Z and save any that return HTTP 200.
 *
 * Output: downloads to ./assets/uniforms/{YEAR}/{TEAM}/{STYLE}.png
 */
import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const ALL_TEAMS = [
  'ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE','DAL','DEN','DET','GB','HOU','IND','JAX','KC','LAC','LAR','LV','MIA','MIN','NE','NO','NYG','NYJ','PHI','PIT','SEA','SF','TB','TEN','WAS'
];

// GUD uses legacy codes in filenames/paths for some teams.
const TO_GUD_CODE: Record<string, string> = {
  ARI: 'ARZ',
  WAS: 'WSH',
};

const DEFAULT_YEAR = new Date().getFullYear();
const YEAR = Number(process.env.YEAR || process.argv[2] || DEFAULT_YEAR);
const STYLES_ALL = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)); // A..Z
const BASE = 'https://www.gridiron-uniforms.com/GUD/images/singles/hr';

async function ensureDir(dir: string) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function head(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

async function download(url: string, outPath: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await ensureDir(path.dirname(outPath));
  await fs.promises.writeFile(outPath, buf);
}

async function loadStylesIndex(year: number): Promise<Record<string, string[]>> {
  const candidates = [
    path.resolve('public/uniforms/styles', `${year}.json`),
    path.resolve('assets/uniforms/styles', `${year}.json`),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const json = JSON.parse(await fs.promises.readFile(p, 'utf8')) as {
          styles: Record<string, { styles: string[] }>;
        };
        const map: Record<string, string[]> = {};
        Object.entries(json.styles || {}).forEach(([team, data]) => {
          map[team.toUpperCase()] = (data.styles || []).map(s => s.toUpperCase());
        });
        return map;
      } catch {
        // ignore and continue
      }
    }
  }
  return {};
}

function possibleFilenames(year: number, teamGud: string, style: string): string[] {
  const base = `${year}_${teamGud}_${style}`;
  // Some assets use uppercase PNG extension
  return [`${base}.png`, `${base}.PNG`];
}

async function main() {
  if (!Number.isFinite(YEAR)) {
    console.error('Usage: YEAR=<year> node scripts/fetch-uniforms.ts');
    process.exit(1);
  }
  // Optional filters: TEAM or TEAMS (comma separated), STYLE or STYLES (comma separated letters)
  const teamsEnv = (process.env.TEAM || process.env.TEAMS || '').trim();
  const stylesEnv = (process.env.STYLE || process.env.STYLES || '').trim();
  const TEAMS = teamsEnv
    ? teamsEnv.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    : ALL_TEAMS;
  const STYLES = stylesEnv
    ? stylesEnv.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    : STYLES_ALL;

  // If a styles index exists, prefer enumerating known styles for each team to catch variants like A2, C3, etc.
  const stylesIndex = await loadStylesIndex(YEAR);

  console.log(`Fetching GUD uniforms for ${YEAR}... (${TEAMS.length} teams, ${STYLES.length} styles)`);
  const outRoot = path.resolve('assets/uniforms');
  for (const team of TEAMS) {
    const gudTeam = TO_GUD_CODE[team] || team;
    const stylesForTeam = stylesIndex[gudTeam] && !stylesEnv
      ? stylesIndex[gudTeam]
      : STYLES;
    for (const style of stylesForTeam) {
      const candidates = possibleFilenames(YEAR, gudTeam, style);
      const out = path.join(outRoot, String(YEAR), team, `${style}.png`);
      const exists = fs.existsSync(out);
      if (exists) continue;
      let downloaded = false;
      for (const file of candidates) {
        const url = `${BASE}/${file}`;
        const ok = await head(url);
        if (!ok) continue;
        try {
          await download(url, out);
          console.log(`Downloaded ${team} ${style}`);
          downloaded = true;
          break;
        } catch (e) {
          // try next candidate
        }
      }
      if (!downloaded) {
        await delay(50);
      }
      await delay(100); // polite throttle
    }
  }
  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
