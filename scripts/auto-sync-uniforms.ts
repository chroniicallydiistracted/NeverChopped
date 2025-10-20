#!/usr/bin/env -S node --enable-source-maps
import { spawn } from 'node:child_process';

async function getSleeperState(): Promise<{ season?: string; week?: number } | null> {
  try {
    const res = await fetch('https://api.sleeper.app/v1/state/nfl', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    return { season: String(data.season ?? ''), week: Number(data.week ?? data.display_week) };
  } catch {
    return null;
  }
}

function run(cmd: string, args: string[], env: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } });
    child.on('exit', code => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}`));
    });
    child.on('error', reject);
  });
}

async function main() {
  let YEAR = process.env.YEAR || '';
  let WEEK = process.env.WEEK || '';
  if (!YEAR || !WEEK) {
    const state = await getSleeperState();
    if (state?.season && state?.week) {
      YEAR ||= String(state.season);
      WEEK ||= String(state.week);
    }
  }
  if (!YEAR || !WEEK) {
    // Default to current calendar year and week 1 as last resort; do not block dev
    const now = new Date();
    YEAR ||= String(now.getFullYear());
    WEEK ||= '1';
  }

  try {
    await run('npx', ['-y', 'tsx', 'scripts/sync-weekly-uniforms.ts'], { YEAR, WEEK });
  } catch (e) {
    console.warn('[auto-sync-uniforms] weekly sync failed:', (e as Error).message);
  }
  try {
    await run('npx', ['-y', 'tsx', 'scripts/sync-helmets.ts'], {});
  } catch (e) {
    console.warn('[auto-sync-uniforms] helmet sync failed:', (e as Error).message);
  }
}

main().catch(err => {
  console.warn('[auto-sync-uniforms] unexpected error:', err);
});
