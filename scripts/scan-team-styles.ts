#!/usr/bin/env -S node --enable-source-maps
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://www.gridiron-uniforms.com/GUD/controller/controller.php';

// GUD uses ARZ and WSH for Cardinals/Commanders in team_id params.
const GUD_TEAM_IDS = [
  'ARZ','ATL','BAL','BUF','CAR','CHI','CIN','CLE','DAL','DEN','DET','GB','HOU','IND','JAX','KC','LAC','LAR','LV','MIA','MIN','NE','NO','NYG','NYJ','PHI','PIT','SEA','SF','TB','TEN','WSH',
];

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

function extractStylesFromTeamSeason(html: string, year: number, team: string) {
  // Match uniform HR filenames for the given year/team. STYLE supports letter or letter+alphanum up to 2 chars.
  const re = new RegExp(`(${year})_(${team})_([A-Za-z][0-9A-Za-z]{0,2})\\.(?:png|PNG)`, 'g');
  const styles = new Set<string>();
  const urls: Record<string, string> = {};
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const style = m[3].toUpperCase();
    const filename = `${year}_${team}_${style}.png`;
    const url = `https://www.gridiron-uniforms.com/GUD/images/singles/hr/${filename}`;
    styles.add(style);
    urls[style] = url;
  }
  return { styles: Array.from(styles).sort(), urls };
}

async function aggregateStylesFromWeekly(year: number, team: string): Promise<{ styles: string[]; urls: Record<string,string> }> {
  const styles = new Set<string>();
  const urls: Record<string, string> = {};
  const weeklyBase = `${BASE}?action=weekly&year=${encodeURIComponent(String(year))}&league=NFL&week=`;
  const gameRe = /game_id=(\d{4}_[A-Za-z]{2,3}-[A-Za-z]{2,3}\^\d+)/g;
  const fileRe = new RegExp(`(${year})_([A-Za-z]{2,3})_([A-Za-z][0-9A-Za-z]{0,2})\\.(?:png|PNG)`, 'g');
  for (let w = 1; w <= 22; w++) {
    try {
      const weeklyHtml = await fetchText(`${weeklyBase}${w}`);
      const gameIds = new Set<string>();
      let gm: RegExpExecArray | null;
      while ((gm = gameRe.exec(weeklyHtml))) {
        gameIds.add(gm[1]);
      }
      for (const gameId of gameIds) {
        // Only fetch games involving the team
        const [, rest] = gameId.split('_');
        const [teams] = rest.split('^');
        const [away, home] = teams.split('-');
        if (away !== team && home !== team) continue;
        const gameUrl = `${BASE}?action=high-res-weekly&game_id=${encodeURIComponent(gameId)}`;
        try {
          const html = await fetchText(gameUrl);
          let f: RegExpExecArray | null;
          while ((f = fileRe.exec(html))) {
            const fileTeam = f[2].toUpperCase();
            if (fileTeam !== team) continue;
            const style = f[3].toUpperCase();
            const filename = `${year}_${team}_${style}.png`;
            const url = `https://www.gridiron-uniforms.com/GUD/images/singles/hr/${filename}`;
            styles.add(style);
            urls[style] = url;
          }
          await new Promise(r => setTimeout(r, 60));
        } catch {}
      }
    } catch {}
  }
  return { styles: Array.from(styles).sort(), urls };
}

async function main() {
  const year = getEnvInt('YEAR') ?? new Date().getFullYear();
  const teamsEnv = (process.env.TEAM || process.env.TEAMS || '').trim();
  const teams = teamsEnv
    ? teamsEnv.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    : GUD_TEAM_IDS;

  console.log(`Scanning GUD styles for year ${year} across ${teams.length} teams...`);

  const results: Record<string, { styles: string[]; urls: Record<string, string> }> = {};
  for (const team of teams) {
    const url = `${BASE}?action=teams-season&team_id=${encodeURIComponent(team)}&year=${encodeURIComponent(String(year))}`;
    try {
      const html = await fetchText(url);
      const { styles: s1, urls: u1 } = extractStylesFromTeamSeason(html, year, team);
      const { styles: s2, urls: u2 } = await aggregateStylesFromWeekly(year, team);
      const merged = Array.from(new Set([...s1, ...s2])).sort();
      const mergedUrls: Record<string, string> = { ...u1, ...u2 };
      results[team] = { styles: merged, urls: mergedUrls };
      console.log(`- ${team}: ${merged.length} styles${merged.length ? ' • ' + merged.join(',') : ''}`);
      // tiny polite delay
      await new Promise(r => setTimeout(r, 80));
    } catch (e: any) {
      console.warn(`Failed ${team}: ${e?.message || e}`);
      results[team] = { styles: [], urls: {} };
    }
  }

  // Write outputs
  const outDir = path.resolve('assets/uniforms/styles');
  const pubDir = path.resolve('public/uniforms/styles');
  await fs.promises.mkdir(outDir, { recursive: true });
  await fs.promises.mkdir(pubDir, { recursive: true });

  // Aggregate file per year
  const aggregate = {
    year: String(year),
    teams: Object.keys(results).sort(),
    styles: results,
    scraped_at: new Date().toISOString(),
    source: 'team-season pages',
  };
  await fs.promises.writeFile(path.join(outDir, `${year}.json`), JSON.stringify(aggregate, null, 2));
  await fs.promises.writeFile(path.join(pubDir, `${year}.json`), JSON.stringify(aggregate, null, 2));

  // Also individual team files
  for (const [team, data] of Object.entries(results)) {
    await fs.promises.writeFile(
      path.join(outDir, `${year}_${team}.json`),
      JSON.stringify({ year: String(year), team, ...data }, null, 2),
    );
    await fs.promises.writeFile(
      path.join(pubDir, `${year}_${team}.json`),
      JSON.stringify({ year: String(year), team, ...data }, null, 2),
    );
  }

  console.log(`Wrote styles index to ${outDir} and ${pubDir}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
