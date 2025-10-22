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
      {
        game_id: '401770004',
        week: 7,
        season: 2025,
        season_type: 'regular',
        date: null,
        status: 'STATUS_HALFTIME',
        home_team: {},
        away_team: {},
      },
      {
        game_id: '401770005',
        week: 7,
        season: 2025,
        season_type: 'regular',
        date: null,
        status: 'status_suspended',
        home_team: {},
        away_team: {},
      },
      {
        game_id: '401770006',
        week: 7,
        season: 2025,
        season_type: 'regular',
        date: null,
        status: 'status_weather_delay',
        home_team: {},
        away_team: {},
      },
      {
        game_id: '401770007',
        week: 7,
        season: 2025,
        season_type: 'regular',
        date: null,
        status: 'status_time_tbd',
        home_team: {},
        away_team: {},
      },
      {
        game_id: '401770008',
        week: 7,
        season: 2025,
        season_type: 'regular',
        date: null,
        status: 'post',
        home_team: {},
        away_team: {},
      },
      {
        game_id: '401770009',
        week: 7,
        season: 2025,
        season_type: 'regular',
        date: null,
        status: 'STATUS_CANCELED',
        home_team: {},
        away_team: {},
      },
      {
        game_id: '401770010',
        week: 7,
        season: 2025,
        season_type: 'regular',
        date: null,
        status: 'ppd',
        home_team: {},
        away_team: {},
      },
      {
        game_id: '401770011',
        week: 7,
        season: 2025,
        season_type: 'regular',
        date: null,
        status: 'rescheduled',
        home_team: {},
        away_team: {},
      },
      {
        game_id: '401770012',
        week: 7,
        season: 2025,
        season_type: 'regular',
        date: null,
        status: 'awaiting_start',
        home_team: {},
        away_team: {},
      },
      {
        game_id: '401770013',
        week: 7,
        season: 2025,
        season_type: 'regular',
        date: null,
        status: 'awaiting_resumption',
        home_team: {},
        away_team: {},
      },
      {
        game_id: '401770014',
        week: 7,
        season: 2025,
        season_type: 'regular',
        date: null,
        status: 'status_end_of_game',
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

    expect(result[3]).toMatchObject({
      game_id: '401770004',
      status: 'in_progress',
      status_label: 'Live',
    });

    expect(result[4]).toMatchObject({
      game_id: '401770005',
      status: 'delayed',
      status_label: 'Delayed',
    });

    expect(result[5]).toMatchObject({
      game_id: '401770006',
      status: 'delayed',
      status_label: 'Delayed',
    });

    expect(result[6]).toMatchObject({
      game_id: '401770007',
      status: 'pre_game',
      status_label: 'Scheduled',
    });

    expect(result[7]).toMatchObject({
      game_id: '401770008',
      status: 'complete',
      status_label: 'Final',
    });

    expect(result[8]).toMatchObject({
      game_id: '401770009',
      status: 'canceled',
      status_label: 'Canceled',
    });

    expect(result[9]).toMatchObject({
      game_id: '401770010',
      status: 'postponed',
      status_label: 'Postponed',
    });

    expect(result[10]).toMatchObject({
      game_id: '401770011',
      status: 'postponed',
      status_label: 'Postponed',
    });

    expect(result[11]).toMatchObject({
      game_id: '401770012',
      status: 'pre_game',
      status_label: 'Scheduled',
    });

    expect(result[12]).toMatchObject({
      game_id: '401770013',
      status: 'delayed',
      status_label: 'Delayed',
    });

    expect(result[13]).toMatchObject({
      game_id: '401770014',
      status: 'complete',
      status_label: 'Final',
    });
  });
});
