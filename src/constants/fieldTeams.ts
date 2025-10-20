const fieldImageModules = import.meta.glob<string>('../assets/fields/*.png', {
  eager: true,
  import: 'default',
});

const FIELD_IMAGE_MAP: Record<string, string> = {};

Object.entries(fieldImageModules).forEach(([path, url]) => {
  const match = path.match(/fields\/([a-z0-9]+)\.png$/i);
  if (!match) return;
  FIELD_IMAGE_MAP[match[1].toUpperCase()] = url;
});

export const FIELD_TEAM_CODES = new Set(Object.keys(FIELD_IMAGE_MAP));

export function getFieldImagePath(teamCode?: string | null): string | null {
  if (!teamCode) return null;
  const normalized = teamCode.toUpperCase();
  return FIELD_IMAGE_MAP[normalized] ?? null;
}

export type FieldCalibration = {
  // Horizontal percent (0-100) where the left and right goal lines map inside the image
  leftPct: number;
  rightPct: number;
  // Vertical padding for top/bottom endzones in percent of image height
  verticalPaddingPct: number;
};

const DEFAULT_FIELD_CALIBRATION: FieldCalibration = {
  // Tuned to current 1024px-wide assets used previously (107px, 915px)
  leftPct: (107 / 1024) * 100,
  rightPct: (915 / 1024) * 100,
  verticalPaddingPct: 3.8,
};

// Optional future hook: team-specific calibration overrides if image crops differ.
const TEAM_FIELD_CALIBRATION: Record<string, FieldCalibration> = {};

export function getFieldImageInfo(
  teamCode?: string | null,
): { src: string | null; calib: FieldCalibration } {
  const src = getFieldImagePath(teamCode);
  const normalized = teamCode ? teamCode.toUpperCase() : '';
  const calib = TEAM_FIELD_CALIBRATION[normalized] ?? DEFAULT_FIELD_CALIBRATION;
  return { src, calib };
}
