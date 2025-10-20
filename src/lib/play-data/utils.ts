export const safeNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

export const clamp = (value: number, min = 0, max = 100): number =>
  Math.min(Math.max(value, min), max);

export const normalizeSeasonType = (seasonType: string | null | undefined): string => {
  if (!seasonType) return 'regular';
  const lower = seasonType.toLowerCase();
  if (lower === 'regular' || lower === 'preseason' || lower === 'postseason') return lower;
  if (lower === 'reg') return 'regular';
  if (lower === 'pre') return 'preseason';
  if (lower === 'playoffs' || lower === 'playoff') return 'postseason';
  return lower;
};

export const parseGameClock = (clock: string | undefined | null): number => {
  if (!clock) return 0;
  const parts = clock.split(':').map(Number);
  if (parts.length !== 2) return 0;
  return (parts[0] || 0) * 60 + (parts[1] || 0);
};

