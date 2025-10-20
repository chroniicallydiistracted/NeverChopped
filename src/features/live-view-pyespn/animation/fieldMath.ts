import type { PyEspnPlay } from '../data/pyespn-types';

const clamp = (value: number, min = 0, max = 100) => Math.min(Math.max(value, min), max);

const yardsToPercent = (yardsToEndzone: number | null | undefined): number | null => {
  if (!Number.isFinite(yardsToEndzone ?? NaN)) {
    return null;
  }
  const yards = Number(yardsToEndzone);
  return clamp(100 - yards);
};

export interface FieldGeometry {
  start: number | null;
  end: number | null;
  firstDown: number | null;
}

export const computeFieldGeometry = (play: PyEspnPlay): FieldGeometry => {
  const start = yardsToPercent(play.start?.yardsToEndzone ?? null);
  const endCandidate = yardsToPercent(play.end?.yardsToEndzone ?? null);
  const gained = Number(play.statYardage);
  const end = endCandidate ?? (Number.isFinite(gained) && start !== null ? clamp(start + gained) : start);
  const firstDown = play.start?.yardsToGo && start !== null
    ? clamp(start + Number(play.start.yardsToGo))
    : null;

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
