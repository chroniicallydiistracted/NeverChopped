#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';
import { parse } from 'csv-parse';

const DEFAULT_SEASON = new Date().getFullYear();
const seasonsEnv = process.env.SEASONS || process.env.SEASON || process.env.YEAR;
const seasons = seasonsEnv
  ? seasonsEnv.split(',').map(s => s.trim()).filter(Boolean).map(Number)
  : [DEFAULT_SEASON];

const OUTPUT_ROOT = path.resolve('public/nflfastr');

async function ensureDir(dir: string) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function downloadSeason(season: number) {
  const url = `https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_${season}.csv.gz`;
  console.log(`Fetching nflfastR pbp for ${season}...`);

  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url} (${response.status})`);
  }

  const seasonDir = path.join(OUTPUT_ROOT, String(season));
  await ensureDir(seasonDir);

  const gunzip = createGunzip();
  const parser = parse({ columns: true, skip_empty_lines: true });
  const rowsByGame = new Map<string, Record<string, string>[]>();

  parser.on('data', (record: Record<string, string>) => {
    const gameId = (record.game_id || '').toString();
    if (!gameId) return;
    if (!rowsByGame.has(gameId)) {
      rowsByGame.set(gameId, []);
    }
    rowsByGame.get(gameId)!.push(record);
  });

  await pipeline(
    Readable.fromWeb(response.body as any),
    gunzip,
    parser,
  );

  for (const [gameId, plays] of rowsByGame) {
    const filePath = path.join(seasonDir, `${gameId}.json`);
    await fs.promises.writeFile(filePath, JSON.stringify(plays));
  }

  console.log(`Saved ${rowsByGame.size} games for ${season} -> ${seasonDir}`);
}

(async () => {
  try {
    await ensureDir(OUTPUT_ROOT);
    for (const season of seasons) {
      await downloadSeason(season);
    }
    console.log('nflfastR fetch complete.');
  } catch (err) {
    console.error('[fetch-nflfastr] Failed:', err);
    process.exitCode = 1;
  }
})();
