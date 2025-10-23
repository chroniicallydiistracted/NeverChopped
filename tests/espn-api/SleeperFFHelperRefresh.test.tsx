// @vitest-environment jsdom
import React from 'react';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

let fetchEspnScheduleSpy: vi.SpyInstance<any, any> | null = null;

let intervalCallback: (() => Promise<void> | void) | null = null;
let setIntervalSpy: vi.SpyInstance<ReturnType<typeof setInterval>, Parameters<typeof setInterval>> | null = null;

const queryMock = vi.fn<
  (document: unknown, variables?: Record<string, unknown>) => Promise<Record<string, unknown>>
>();

const originalFetch = global.fetch;

vi.mock('../../src/auth/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: {
      user_id: 'user-1',
      username: 'TestUser',
      display_name: 'Test User',
    },
  }),
}));

vi.mock('../../src/config', () => ({
  getConfig: () => ({
    userId: 'user-1',
    leagueId: 'league-1',
    username: 'TestUser',
    teamName: 'Test Team',
  }),
}));

vi.mock('../../src/features/live-view-pyespn/components/PyEspnLiveView', () => ({
  default: () => <div data-testid="pyespn-live-view" />,
}));

vi.mock('../../src/graphql/client', () => ({
  query: (document: unknown, variables?: Record<string, unknown>) => queryMock(document, variables),
}));

vi.mock('../../src/graphql/queries', () => ({
  SPORT_INFO_QUERY: 'SPORT_INFO_QUERY',
  LEAGUE_DETAILS_QUERY: 'LEAGUE_DETAILS_QUERY',
  LEAGUE_ROSTERS_QUERY: 'LEAGUE_ROSTERS_QUERY',
  LEAGUE_USERS_QUERY: 'LEAGUE_USERS_QUERY',
  MATCHUP_LEGS_QUERY: 'MATCHUP_LEGS_QUERY',
  MY_LEAGUES_QUERY: 'MY_LEAGUES_QUERY',
  ACTIVE_PLAYERS_QUERY: 'ACTIVE_PLAYERS_QUERY',
  LEAGUE_TRANSACTIONS_QUERY: 'LEAGUE_TRANSACTIONS_QUERY',
}));

const mockSchedule = [
  {
    game_id: '401770001',
    status: 'in_progress',
    status_label: 'Live',
    status_raw: 'in_progress',
    week: 7,
    date: '2025-10-15T00:00:00Z',
    home_team: { displayName: 'Mockington Home' },
    away_team: { displayName: 'Sample City Away' },
  },
];

const createJsonResponse = (data: unknown) =>
  ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => data,
  }) as Response;

beforeEach(async () => {
  queryMock.mockReset();
  queryMock.mockImplementation(async (document) => {
    switch (document) {
      case 'SPORT_INFO_QUERY':
        return { sport_info: { season: 2025, season_type: 'regular', week: 7 } };
      case 'MY_LEAGUES_QUERY':
        return {
          my_leagues: [
            { league_id: 'league-1', name: 'Mock League', season: 2025, season_type: 'regular' },
          ],
        };
      case 'LEAGUE_DETAILS_QUERY':
        return { get_league: { league_id: 'league-1', name: 'Mock League', season: 2025, season_type: 'regular' } };
      case 'LEAGUE_ROSTERS_QUERY':
        return {
          league_rosters: [
            { roster_id: 1, owner_id: 'user-1', settings: { eliminated: null } },
            { roster_id: 2, owner_id: 'user-2', settings: { eliminated: null } },
          ],
        };
      case 'LEAGUE_USERS_QUERY':
        return {
          league_users: [
            { user_id: 'user-1', display_name: 'Test User' },
            { user_id: 'user-2', display_name: 'Other User' },
          ],
        };
      case 'MATCHUP_LEGS_QUERY':
        return {
          matchup_legs: [
            { roster_id: 1, points: 110 },
            { roster_id: 2, points: 95 },
          ],
        };
      case 'ACTIVE_PLAYERS_QUERY':
        return { get_active_players: [{ player_id: '15847' }] };
      case 'LEAGUE_TRANSACTIONS_QUERY':
        return { league_transactions: [] };
      default:
        return {};
    }
  });

  const fetchStub = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes('/players/nfl/trending')) {
      return createJsonResponse([]);
    }
    if (url.includes('/players/nfl')) {
      return createJsonResponse({});
    }
    if (url.includes('/projections/')) {
      return createJsonResponse({ '15847': 12.4 });
    }
    if (url.includes('/state/nfl')) {
      return createJsonResponse({ season: 2025, season_type: 'regular', week: 7 });
    }
    return createJsonResponse([]);
  });

  global.fetch = fetchStub as unknown as typeof global.fetch;

  if (fetchEspnScheduleSpy) {
    fetchEspnScheduleSpy.mockRestore();
  }
  const apiModule = await import('../../src/lib/api/espn-data');
  fetchEspnScheduleSpy = vi
    .spyOn(apiModule, 'fetchEspnSchedule')
    .mockImplementation(async (seasonType: string, season: number, week: number, opts?: Record<string, unknown>) => {
      if (opts && typeof opts === 'object' && opts.includeMeta) {
        return {
          entries: mockSchedule,
          meta: {
            season,
            requested_season_type: seasonType,
            resolved_season_type: seasonType,
            requested_week: week,
            default_week: week,
            default_season_type: seasonType,
            season_types: [
              {
                id: seasonType,
                label: 'Regular Season',
                weeks: [week],
                current_week: week,
              },
            ],
            week_to_season_type: { [String(week)]: seasonType },
            generated_at: new Date().toISOString(),
          },
        };
      }
      return mockSchedule;
    });

  intervalCallback = null;
  if (setIntervalSpy) {
    setIntervalSpy.mockRestore();
  }
  setIntervalSpy = vi.spyOn(global, 'setInterval').mockImplementation((handler: TimerHandler) => {
    if (typeof handler === 'function') {
      intervalCallback = handler as () => Promise<void> | void;
    }
    return 0 as unknown as ReturnType<typeof setInterval>;
  });
});

afterEach(() => {
  setIntervalSpy?.mockRestore();
  setIntervalSpy = null;
  intervalCallback = null;
  fetchEspnScheduleSpy?.mockRestore();
  fetchEspnScheduleSpy = null;
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe('SleeperFFHelper PyESPN schedule refresh', () => {
  it('issues a force refresh request when the Refresh button is clicked', async () => {
    const SleeperFFHelper = (await import('../../src/components/SleeperFFHelper')).default;
    render(<SleeperFFHelper />);

    await waitFor(() => {
      expect(fetchEspnScheduleSpy).not.toBeNull();
      expect(fetchEspnScheduleSpy!.mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    fetchEspnScheduleSpy?.mockClear();

    const refreshButton = await screen.findByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(fetchEspnScheduleSpy).not.toBeNull();
      expect(fetchEspnScheduleSpy).toHaveBeenCalledWith(
        'regular',
        2025,
        7,
        expect.objectContaining({ forceRefresh: true }),
      );
    });
  }, 20000);

  it('automatically refreshes the schedule on an interval with forceRefresh enabled', async () => {
    const SleeperFFHelper = (await import('../../src/components/SleeperFFHelper')).default;

    render(<SleeperFFHelper />);

    await waitFor(() => {
      expect(fetchEspnScheduleSpy).not.toBeNull();
      expect(fetchEspnScheduleSpy!.mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    const baselineCalls = fetchEspnScheduleSpy?.mock.calls.length ?? 0;
    expect(intervalCallback).not.toBeNull();

    await act(async () => {
      await intervalCallback?.();
    });

    await waitFor(() => {
      expect(fetchEspnScheduleSpy).not.toBeNull();
      const spy = fetchEspnScheduleSpy!;
      expect(spy.mock.calls.length).toBeGreaterThan(baselineCalls);
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      expect(lastCall?.[0]).toBe('regular');
      expect(lastCall?.[1]).toBe(2025);
      expect(lastCall?.[2]).toBe(7);
      expect(lastCall?.[3]).toEqual(expect.objectContaining({ forceRefresh: true }));
    });
  }, 20000);
});
