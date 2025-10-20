#!/usr/bin/env -S node --enable-source-maps
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PY_FIELDS_ROOT = path.resolve(ROOT, 'py scripts/output_fields');
const PUBLIC_FIELDS = path.resolve(ROOT, 'public/fields');

const TEAM_CODES = [
  'ARZ','ATL','BAL','BUF','CAR','CHI','CIN','CLE','DAL','DEN','DET','GB','HOU','IND','JAX','KC','LAC','LAR','LV','MIA','MIN','NE','NO','NYG','NYJ','PHI','PIT','SEA','SF','TB','TEN','WSH',
];

function findNewestDir(base: string, prefix: string) {
  const entries = fs.readdirSync(base, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name.startsWith(prefix))
    .map(d => ({ name: d.name, mtime: fs.statSync(path.join(base, d.name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return entries.length ? entries[0].name : null;
}

function pickBestImage(dir: string): string | null {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.png'));
  if (!files.length) return null;
  // Prefer files with year range '2024-2025' or '2025' then any
  const preferred = files
    .sort((a, b) => b.length - a.length);
  return path.join(dir, preferred[0]);
}

async function main() {
  if (!fs.existsSync(PY_FIELDS_ROOT)) {
    console.error(`Python fields not found at ${PY_FIELDS_ROOT}`);
    process.exit(1);
  }
  const seasonDir = findNewestDir(PY_FIELDS_ROOT, 'regular-season_');
  if (!seasonDir) {
    console.error('No season directory found in py scripts/output_fields');
    process.exit(1);
  }
  const seasonPath = path.join(PY_FIELDS_ROOT, seasonDir);
  await fs.promises.mkdir(PUBLIC_FIELDS, { recursive: true });

  let copied = 0;
  for (const team of TEAM_CODES) {
    const teamDir = path.join(seasonPath, team);
    const src = pickBestImage(teamDir);
    if (!src) {
      console.warn(`No image for ${team} in ${teamDir}`);
      continue;
    }
    const dst = path.join(PUBLIC_FIELDS, `${team}.png`);
    await fs.promises.copyFile(src, dst);
    copied++;
  }
  console.log(`Synced ${copied} team field images from '${seasonDir}' to public/fields`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
