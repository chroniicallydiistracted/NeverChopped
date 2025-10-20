#!/usr/bin/env -S node --enable-source-maps
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://www.gridiron-uniforms.com/GUD/controller/controller.php';

function getEnvInt(name: string, fallback?: number): number | undefined {
  const v = process.env[name];
  if (v == null || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: 'https://www.gridiron-uniforms.com/',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

function extractGameIdsFromWeekly(html: string): string[] {
  // Capture game ids from multiple attribute patterns found on the weekly page.
  // Examples seen:
  //   game_id=2025_PIT-CIN^7
  //   title=2025_PIT-CIN^7
  //   title="2025_PIT-CIN^7"
  const patterns: RegExp[] = [
    /game_id=(\d{4}_[A-Za-z]{2,3}-[A-Za-z]{2,3}\^\d+)/g,
    /title=\"?(\d{4}_[A-Za-z]{2,3}-[A-Za-z]{2,3}\^\d+)\"?/g,
  ];
  const out = new Set<string>();
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) {
      out.add(m[1]);
    }
  }
  return Array.from(out);
}

function parseUniformsFromWeeklyPage(html: string) {
  // Robust extraction by filename; supports letter or letter+digit styles; handles PNG case variations.
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
  // Field info
  const fieldMatch = html.match(/view-single-field[^\"]+image_path=([^\"]+)/i);
  let field: { team?: string; url?: string } = {};
  if (fieldMatch) {
    try {
      const raw = decodeURIComponent(fieldMatch[1]);
      const url = raw.startsWith('http') ? raw : `https://gridiron-uniforms.com${raw}`;
      const segs = new URL(url).pathname.split('/');
      const idx = segs.findIndex(s => s === 'regular-season');
      if (idx !== -1 && segs[idx + 1]) {
        field.team = segs[idx + 1].toUpperCase();
      }
      field.url = url;
    } catch {}
  }
  return { uniforms, field };
}

async function main() {
  const yearNum = getEnvInt('YEAR') ?? new Date().getFullYear();
  const weekNum = getEnvInt('WEEK');
  if (weekNum == null) {
    // Helpful for postbuild hook which may not pass WEEK; silently skip.
    console.log('Skipping weekly sync: no WEEK provided');
    process.exit(0);
  }
  const year = String(yearNum);
  const week = String(weekNum);
  const weeklyUrl = `${BASE}?action=weekly&week=${encodeURIComponent(week)}&year=${encodeURIComponent(year)}`;
  console.log(`Fetching weekly page: ${weeklyUrl}`);
  const weeklyHtml = await fetchText(weeklyUrl);
  const gameIds = extractGameIdsFromWeekly(weeklyHtml);
  if (gameIds.length === 0) {
    console.error('No game_ids found on weekly page');
    process.exit(2);
  }
  if (gameIds.length < 10) {
    console.warn(
      `Warning: Only discovered ${gameIds.length} games on the weekly page. The site markup may have changed; check extractGameIdsFromWeekly patterns.`,
    );
  }
  console.log(`Found ${gameIds.length} games for week ${week} ${year}`);

  const results: any[] = [];
  for (const gameId of gameIds) {
    const gameUrl = `${BASE}?action=high-res-weekly&game_id=${encodeURIComponent(gameId)}`;
    try {
      const html = await fetchText(gameUrl);
      const { uniforms, field } = parseUniformsFromWeeklyPage(html);
      const [, rest] = gameId.split('_');
      const [teams, weekPart] = rest.split('^');
      const [away, home] = teams.split('-');
      const record = {
        game_id: gameId,
        year,
        week,
        away,
        home,
        uniforms,
        field,
        source: gameUrl,
        scraped_at: new Date().toISOString(),
      };
      // Write per-game JSONs
      const assetsDir = path.resolve('assets/uniforms/weekly');
      const publicDir = path.resolve('public/uniforms/weekly');
      await fs.promises.mkdir(assetsDir, { recursive: true });
      await fs.promises.mkdir(publicDir, { recursive: true });
      const fname = `${gameId.replace(/\//g, '_')}.json`;
      await fs.promises.writeFile(path.join(assetsDir, fname), JSON.stringify(record, null, 2));
      await fs.promises.writeFile(path.join(publicDir, fname), JSON.stringify(record, null, 2));
      results.push(record);
      console.log(`Saved ${gameId}`);
      // tiny throttle
      await new Promise(r => setTimeout(r, 80));
    } catch (e: any) {
      console.warn(`Failed ${gameId}: ${e?.message || e}`);
    }
  }

  // Write summary index for week
  const summary = {
    year,
    week,
    total_games: results.length,
    games: results.map(r => ({
      game_id: r.game_id,
      away: r.away,
      home: r.home,
      uniforms: r.uniforms,
      field: r.field,
    })),
    scraped_at: new Date().toISOString(),
    source: weeklyUrl,
  };
  const outAssets = path.resolve('assets/uniforms/weekly');
  const outPublic = path.resolve('public/uniforms/weekly');
  await fs.promises.writeFile(
    path.join(outAssets, `${year}_week_${week}.json`),
    JSON.stringify(summary, null, 2),
  );
  await fs.promises.writeFile(
    path.join(outPublic, `${year}_week_${week}.json`),
    JSON.stringify(summary, null, 2),
  );
  console.log(`Wrote summary for week ${week}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
