#!/usr/bin/env -S node --enable-source-maps
import fs from 'node:fs';
import path from 'node:path';

function buildGameId(opts: { year?: string | number; away?: string; home?: string; week?: string | number; game_id?: string }) {
  if (opts.game_id) return String(opts.game_id);
  const year = String(opts.year ?? '').trim();
  const away = String(opts.away ?? '').trim().toUpperCase();
  const home = String(opts.home ?? '').trim().toUpperCase();
  const week = String(opts.week ?? '').trim();
  if (!year || !away || !home || !week) {
    throw new Error('Missing required params. Provide GAME_ID or YEAR, AWAY, HOME, WEEK');
  }
  return `${year}_${away}-${home}^${week}`;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(encodeURI(url), {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.gridiron-uniforms.com/',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return await res.text();
}

function parseUniforms(html: string) {
  // Robustly find HR uniform images by filename regardless of path or extension case.
  // Supports style codes like A, B, E, and A2 (letter followed by optional alphanumeric).
  const reFile = /(\d{4})_([A-Za-z]{2,3})_([A-Za-z][0-9A-Za-z]?)\.(?:png|PNG)/g;
  const uniforms: Record<string, { year: string; style: string; url: string }> = {};
  let f: RegExpExecArray | null;
  while ((f = reFile.exec(html))) {
    const [full, year, teamRaw, styleRaw] = f;
    const team = teamRaw.toUpperCase();
    const style = styleRaw.toUpperCase();
    const url = `https://www.gridiron-uniforms.com/GUD/images/singles/hr/${full}`;
    uniforms[team] = { year, style, url };
  }

  // Find field link to get the field image and home team from path
  // Example anchor contains image_path=.../fields/images/regular-season/CIN/r1024/CIN_2024-2025^2.png
  const fieldMatch = html.match(/view-single-field[^\"]+image_path=([^\"]+)/i);
  let field: { team?: string; url?: string } = {};
  if (fieldMatch) {
    try {
      const raw = decodeURIComponent(fieldMatch[1]);
      const url = raw.startsWith('http') ? raw : `https://gridiron-uniforms.com${raw}`;
      const segs = new URL(url).pathname.split('/');
      // .../regular-season/{TEAM}/r1024/{FILENAME}
      const idx = segs.findIndex(s => s === 'regular-season');
      if (idx !== -1 && segs[idx + 1]) {
        field.team = segs[idx + 1].toUpperCase();
      }
      field.url = url;
    } catch {
      // ignore
    }
  }
  return { uniforms, field };
}

async function main() {
  const env = process.env;
  const gameId = buildGameId({
    game_id: env.GAME_ID || process.argv[2],
    year: env.YEAR,
    away: env.AWAY,
    home: env.HOME,
    week: env.WEEK,
  });
  const url = `https://www.gridiron-uniforms.com/GUD/controller/controller.php?action=high-res-weekly&game_id=${gameId}`;
  const html = await fetchText(url);
  const { uniforms, field } = parseUniforms(html);

  // Infer away/home from gameId
  const [, rest] = gameId.split('_');
  const [teams, weekPart] = rest.split('^');
  const [away, home] = teams.split('-');
  const year = gameId.slice(0, 4);
  const week = weekPart;

  const out = {
    game_id: gameId,
    year,
    week,
    away,
    home,
    uniforms,
    field,
    source: url,
    scraped_at: new Date().toISOString(),
  };

  const outDir = path.resolve('assets/uniforms/weekly');
  await fs.promises.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `${gameId.replace(/\//g, '_')}.json`);
  await fs.promises.writeFile(outPath, JSON.stringify(out, null, 2));
  console.log(`Wrote ${outPath}`);
  // Also copy to public for client consumption
  const pubDir = path.resolve('public/uniforms/weekly');
  await fs.promises.mkdir(pubDir, { recursive: true });
  const pubPath = path.join(pubDir, `${gameId.replace(/\//g, '_')}.json`);
  await fs.promises.writeFile(pubPath, JSON.stringify(out, null, 2));
  console.log(`Wrote ${pubPath}`);
  console.log(JSON.stringify(out, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
