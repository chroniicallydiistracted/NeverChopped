import type { PyEspnPlay, PyEspnPlaySituation } from '../data/pyespn-types';

const clamp = (value: number, min = 0, max = 100) => Math.min(Math.max(value, min), max);

const safeNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const yardsToPercent = (yardsToEndzone: number | null | undefined): number | null => {
  const yards = safeNumber(yardsToEndzone);
  if (yards === null) {
    return null;
  }
  return clamp(100 - yards);
};

const situationToPercent = (situation: PyEspnPlaySituation | null | undefined): number | null => {
  if (!situation) {
    return null;
  }
  return yardsToPercent(situation.yardsToEndzone ?? null);
};

const coordinateToPercent = (play: PyEspnPlay): number | null => {
  const x = safeNumber(play.coordinate?.x);
  if (x === null) {
    return null;
  }
  return clamp(x);
};

export interface FieldGeometry {
  start: number | null;
  end: number | null;
  firstDown: number | null;
}

export const computeFieldGeometry = (play: PyEspnPlay): FieldGeometry => {
  const startDirect = situationToPercent(play.start);
  const fallbackStart = coordinateToPercent(play);
  const start = startDirect ?? fallbackStart;

  const endDirect = situationToPercent(play.end);
  const gained = safeNumber(play.statYardage);
  const end = endDirect
    ?? (gained !== null && start !== null ? clamp(start + gained) : null)
    ?? fallbackStart
    ?? start;

  const yardsToGo = safeNumber(play.start?.yardsToGo ?? play.start?.distance);
  const firstDown = yardsToGo !== null && start !== null ? clamp(start + yardsToGo) : null;

  return {
    start,
    end,
    firstDown,
  };
};

export const resolvePossession = (play: PyEspnPlay): string =>
  play.team?.abbreviation ?? play.start?.team?.abbreviation ?? '';

export const buildClockLabel = (play: PyEspnPlay): string => {
  const minutesRaw = play.clock?.minutes;
  const secondsRaw = play.clock?.seconds;
  const minutes = Number.parseInt(String(minutesRaw ?? '0'), 10);
  const seconds = Number.parseInt(String(secondsRaw ?? '0'), 10);
  const padded = Number.isFinite(seconds) ? String(seconds).padStart(2, '0') : '00';
  const minuteLabel = Number.isFinite(minutes) ? String(minutes) : '0';
  return `${minuteLabel}:${padded}`;
};

export { clamp };
