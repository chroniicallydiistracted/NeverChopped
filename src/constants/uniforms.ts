const DEFAULT_UNIFORM_SEASON = '2025';
const DEFAULT_STYLE_PRIORITY = ['A', 'H', 'B', 'C', 'D', 'E', 'F'];

export type HelmetOrientation = 'left' | 'right';

const TEAM_CODE_OVERRIDES: Record<string, string> = {
  ARZ: 'ARI',
  WSH: 'WAS',
};

type StyleAssets = Record<string, string>;
type TeamAssets = Record<string, StyleAssets>;
type SeasonAssets = Record<string, TeamAssets>;

const UNIFORM_ASSET_TREE: Record<string, SeasonAssets> = {};

const helmetImports = import.meta.glob<string>('../assets/uniform_parts/**/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

Object.entries(helmetImports).forEach(([path, url]) => {
  const parts = path.split('/');
  if (parts.length < 5) {
    return;
  }
  const filename = parts[parts.length - 1]; // e.g. A_helmet_right.png
  const style = parts[parts.length - 2]; // A
  const team = parts[parts.length - 3]; // GB
  const season = parts[parts.length - 4]; // 2025
  const rawLabel = filename.replace('.png', '');
  const stylePrefix = `${style}_`;
  const label = rawLabel.startsWith(stylePrefix)
    ? rawLabel.slice(stylePrefix.length)
    : rawLabel;

  if (!UNIFORM_ASSET_TREE[season]) {
    UNIFORM_ASSET_TREE[season] = {};
  }
  if (!UNIFORM_ASSET_TREE[season][team]) {
    UNIFORM_ASSET_TREE[season][team] = {};
  }
  if (!UNIFORM_ASSET_TREE[season][team][style]) {
    UNIFORM_ASSET_TREE[season][team][style] = {};
  }
  UNIFORM_ASSET_TREE[season][team][style][label] = url;
});

function resolveTeamCode(teamCode?: string | null): string | null {
  if (!teamCode) return null;
  const upper = teamCode.toUpperCase();
  return TEAM_CODE_OVERRIDES[upper] ?? upper;
}

function pickStyle(styles: TeamAssets, preferredStyle?: string | null): string | null {
  if (preferredStyle && styles[preferredStyle]) {
    return preferredStyle;
  }
  for (const style of DEFAULT_STYLE_PRIORITY) {
    if (styles[style]) {
      return style;
    }
  }
  const fallback = Object.keys(styles)[0];
  return fallback ?? null;
}

function getSeasonAssets(season?: string | null): SeasonAssets | undefined {
  if (season) {
    const seasonAssets = UNIFORM_ASSET_TREE[season];
    if (seasonAssets) return seasonAssets;
  }
  return UNIFORM_ASSET_TREE[DEFAULT_UNIFORM_SEASON];
}

export function getHelmetAsset(options: {
  teamCode?: string | null;
  season?: string | null;
  style?: string | null;
  orientation: HelmetOrientation;
}): string | null {
  const resolvedTeam = resolveTeamCode(options.teamCode);
  if (!resolvedTeam) return null;

  const seasonAssets = getSeasonAssets(options.season);
  if (!seasonAssets) return null;

  const teamAssets = seasonAssets[resolvedTeam];
  if (!teamAssets) return null;

  const styleKey = pickStyle(teamAssets, options.style ?? null);
  if (!styleKey) return null;

  const styleAssets = teamAssets[styleKey];
  if (!styleAssets) return null;

  const expectedLabel = options.orientation === 'left' ? 'helmet_left' : 'helmet_right';
  const candidate = styleAssets[expectedLabel];
  if (candidate) return candidate;

  return styleAssets.helmet_right ?? styleAssets.helmet_left ?? null;
}

export { DEFAULT_UNIFORM_SEASON };
