import { describe, expect, it } from 'vitest';
import { buildClockLabel, computeFieldGeometry, resolvePossession } from '../animation/fieldMath';
import type { PyEspnPlay } from '../data/pyespn-types';

const basePlay = (overrides: Partial<PyEspnPlay> = {}): PyEspnPlay => ({
  id: 'play-1',
  sequence: 1,
  type: null,
  text: 'Test play',
  shortText: 'Test',
  altText: null,
  quarter: 1,
  clock: { minutes: '10', seconds: '15', displayValue: '10:15' },
  homeScore: 7,
  awayScore: 3,
  scoringPlay: false,
  scoreValue: null,
  statYardage: 5,
  start: {
    down: 1,
    distance: 10,
    yardsToGo: 10,
    yardsToEndzone: 75,
    team: { id: 'away', name: 'Away', abbreviation: 'AWY', score: 3 },
  },
  end: {
    down: 2,
    distance: 5,
    yardsToGo: 5,
    yardsToEndzone: 70,
    team: { id: 'away', name: 'Away', abbreviation: 'AWY', score: 3 },
  },
  team: { id: 'away', name: 'Away', abbreviation: 'AWY', score: 3 },
  participants: [],
  coordinate: { x: null, y: null },
  ...overrides,
});

describe('computeFieldGeometry', () => {
  it('converts yards-to-endzone into field percentages', () => {
    const result = computeFieldGeometry(basePlay());
    expect(result).toEqual({
      start: 25,
      end: 30,
      firstDown: 35,
    });
  });

  it('falls back to stat yardage when end yards missing', () => {
    const play = basePlay({ end: null });
    const result = computeFieldGeometry(play);
    expect(result).toEqual({
      start: 25,
      end: 30,
      firstDown: 35,
    });
  });

  it('uses coordinate fallback when yardsToEndzone data is unavailable', () => {
    const play = basePlay({
      start: null,
      end: null,
      coordinate: { x: 62, y: null },
      statYardage: null,
    });
    const result = computeFieldGeometry(play);
    expect(result).toEqual({
      start: 62,
      end: 62,
      firstDown: null,
    });
  });

  it('clamps geometry when stat yardage pushes beyond field bounds', () => {
    const play = basePlay({
      start: {
        down: 1,
        distance: 10,
        yardsToGo: 10,
        yardsToEndzone: 5,
        team: { id: 'away', name: 'Away', abbreviation: 'AWY', score: 3 },
      },
      end: null,
      statYardage: 15,
    });
    const result = computeFieldGeometry(play);
    expect(result).toEqual({
      start: 95,
      end: 100,
      firstDown: 100,
    });
  });
});

describe('resolvePossession', () => {
  it('returns the play team abbreviation when available', () => {
    const play = basePlay({ team: { id: 'home', name: 'Home', abbreviation: 'HME', score: 7 } });
    expect(resolvePossession(play)).toBe('HME');
  });

  it('falls back to start team abbreviation', () => {
    const play = basePlay({ team: null });
    expect(resolvePossession(play)).toBe('AWY');
  });
});

describe('buildClockLabel', () => {
  it('formats minutes and seconds into mm:ss', () => {
    const play = basePlay({ clock: { minutes: '4', seconds: '7', displayValue: null } });
    expect(buildClockLabel(play)).toBe('4:07');
  });

  it('handles missing clock values', () => {
    const play = basePlay({ clock: { minutes: null, seconds: null, displayValue: null } });
    expect(buildClockLabel(play)).toBe('0:00');
  });
});
