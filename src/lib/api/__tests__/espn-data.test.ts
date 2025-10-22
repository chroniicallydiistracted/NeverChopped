import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchEspnSchedule } from '../espn-data';

describe('fetchEspnSchedule', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('normalizes schedule statuses and preserves raw values', async () => {
    const mockResponse = [
      {
        game_id: '401770001',
        week: 7,
        season: 2025,
        season_type: 'regular',
        date: '2025-10-26T17:00Z',
        status: 'in-progress',
        home_team: { displayName: 'Mockington Home' },
        away_team: { displayName: 'Sample City Away' },
      },
      {
        game_id: '401770002',
        week: 7,
        season: 2025,
        season_type: 'regular',
        date: '2025-10-26T20:25Z',
        status: 'STATUS_FINAL',
        home_team: {},
        away_team: {},
      },
      {
        game_id: '401770003',
        week: 7,
        season: 2025,
        season_type: 'regular',
        date: null,
        status: 'STATUS_POSTPONED',
        home_team: {},
        away_team: {},
      },
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as unknown as Response);

    const result = await fetchEspnSchedule('regular', 2025, 7);

    expect(result[0]).toMatchObject({
      game_id: '401770001',
      status: 'in_progress',
      status_label: 'Live',
      status_raw: 'in-progress',
    });

    expect(result[1]).toMatchObject({
      game_id: '401770002',
      status: 'complete',
      status_label: 'Final',
      status_raw: 'STATUS_FINAL',
    });

    expect(result[2]).toMatchObject({
      game_id: '401770003',
      status: 'postponed',
      status_label: 'Postponed',
    });
  });
});
