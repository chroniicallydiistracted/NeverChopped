import { getHelmetAsset } from '../constants/uniforms';

export type WeeklyUniforms = {
  game_id: string;
  year: string;
  week: string;
  away: string;
  home: string;
  uniforms: Record<string, { year: string; style: string; url: string }>;
  field?: { team?: string; url?: string };
};

export async function fetchWeeklyUniforms(gameId: string): Promise<WeeklyUniforms | null> {
  try {
    const res = await fetch(`/uniforms/weekly/${encodeURIComponent(gameId)}.json`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as WeeklyUniforms;
    return data;
  } catch {
    return null;
  }
}

// Map GUD codes to canonical folder names
const TO_CANONICAL_CODE: Record<string, string> = {
  ARZ: 'ARI',
  WSH: 'WAS',
};

export function getHelmetUrls(
  year: string,
  team: string,
  style: string,
): { left: string; right: string } {
  // Prefer compiled asset URLs (works in both dev + build)
  const leftAsset = getHelmetAsset({
    teamCode: team,
    season: year,
    style,
    orientation: 'left',
  });
  const rightAsset = getHelmetAsset({
    teamCode: team,
    season: year,
    style,
    orientation: 'right',
  });

  if (leftAsset || rightAsset) {
    return {
      left: leftAsset ?? rightAsset ?? '',
      right: rightAsset ?? leftAsset ?? '',
    };
  }

  const teamUpper = team.toUpperCase();
  // Normalize GUD codes (ARZ, WSH) to canonical codes (ARI, WAS) for file paths
  const t = TO_CANONICAL_CODE[teamUpper] || teamUpper;
  const s = style.toUpperCase();
  // Served from public/uniform_parts/{year}/{TEAM}/{STYLE}/{STYLE}_helmet_left.png
  const base = `/uniform_parts/${year}/${t}/${s}/${s}_helmet`;
  return { left: `${base}_left.png`, right: `${base}_right.png` };
}
