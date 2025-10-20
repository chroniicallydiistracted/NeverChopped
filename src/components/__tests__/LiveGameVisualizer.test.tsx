import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import LiveGameVisualizer from '../LiveGameVisualizer';
import type { StandardPlay } from '../../lib/play-data/types';
import type { SportsDataPlay } from '../../lib/play-data/adapters/sportsdataio-adapter';

const mocks = vi.hoisted(() => ({
  loadPlaysForGame: vi.fn<[], Promise<StandardPlay[]>>(),
  fetchWeeklyUniforms: vi.fn<
    [],
    Promise<{
      game_id: string;
      year: string;
      week: string;
      uniforms: Record<string, { year: string; style: string; url: string }>;
    } | null>
  >(),
  getHelmetUrls: vi.fn<[string, string, string], { left: string; right: string }>(),
}));

vi.mock('../../lib/play-data/orchestrator', () => ({
  loadPlaysForGame: mocks.loadPlaysForGame,
}));

vi.mock('../../lib/uniforms', () => ({
  fetchWeeklyUniforms: mocks.fetchWeeklyUniforms,
  getHelmetUrls: mocks.getHelmetUrls,
  DEFAULT_UNIFORM_SEASON: '2023',
}));

const loadPlaysForGameMock = mocks.loadPlaysForGame;
const fetchWeeklyUniformsMock = mocks.fetchWeeklyUniforms;
const getHelmetUrlsMock = mocks.getHelmetUrls;

const createSamplePlays = (): StandardPlay[] => {
  const touchdownRaw: SportsDataPlay = {
    PlayID: 101,
    QuarterName: '1',
    Sequence: 200,
    TimeRemainingMinutes: 14,
    TimeRemainingSeconds: 0,
    Team: 'CHI',
    Opponent: 'GB',
    Down: 1,
    Distance: 10,
    YardLine: 20,
    YardLineTerritory: 'CHI',
    YardsToEndZone: 80,
    Type: 'PassCompleted',
    YardsGained: 20,
    Description: '(Shotgun) J.Fields pass short left to D.Moore for 20 yards, TOUCHDOWN.',
    IsScoringPlay: true,
    PlayStats: [
      {
        PlayerID: 1,
        Name: 'Justin Fields',
        Team: 'CHI',
        Opponent: 'GB',
        PassingAttempts: 1,
        PassingCompletions: 1,
        PassingYards: 20,
      },
      {
        PlayerID: 2,
        Name: 'DJ Moore',
        Team: 'CHI',
        Opponent: 'GB',
        Receptions: 1,
        ReceivingYards: 20,
      },
    ],
  };

  const touchdownPass: StandardPlay = {
    id: 'espn_2',
    gameId: 'game1',
    sequence: 200,
    quarter: 1,
    gameClockSeconds: 840,
    homeTeam: 'CHI',
    awayTeam: 'GB',
    possession: 'CHI',
    playType: 'pass',
    description: '(Shotgun) J.Fields pass short left to D.Moore for 20 yards, TOUCHDOWN.',
    startFieldPosition: 20,
    endFieldPosition: 40,
    yardsGained: 20,
    down: 1,
    yardsToGo: 10,
    yardsToEndzone: 80,
    direction: { category: 'left', isDeep: false, isShort: true },
    homeScore: 7,
    awayScore: 7,
    isTouchdown: true,
    isFieldGoal: false,
    isSafety: false,
    pass: {
      isComplete: true,
      isInterception: false,
      airYards: 20,
      yardsAfterCatch: 0,
      location: 'left',
      depth: 'short',
    },
    rush: undefined,
    players: {
      passer: {
        id: 'QB1',
        name: 'Justin Fields',
        position: 'QB',
        team: 'CHI',
      },
      receiver: {
        id: 'WR1',
        name: 'DJ Moore',
        position: 'WR',
        team: 'CHI',
      },
    },
    penalties: [],
    playerPositions: undefined,
    metrics: undefined,
    dataSource: 'sportsdataio',
    rawData: touchdownRaw,
  };

  return [touchdownPass];
};

const schedule = [
  {
    game_id: 'game1',
    week: 1,
    status: 'in_progress',
    date: '2023-09-10T17:00:00Z',
    home: 'CHI',
    away: 'GB',
  },
];

const playersById = {
  QB1: {
    first_name: 'Justin',
    last_name: 'Fields',
    full_name: 'Justin Fields',
    position: 'QB',
    team: 'CHI',
  },
  WR1: {
    first_name: 'DJ',
    last_name: 'Moore',
    full_name: 'DJ Moore',
    position: 'WR',
    team: 'CHI',
  },
};

describe('LiveGameVisualizer rendering', () => {
  beforeEach(() => {
    loadPlaysForGameMock.mockResolvedValue(createSamplePlays());
    fetchWeeklyUniformsMock.mockResolvedValue({
      game_id: 'game1',
      year: '2023',
      week: '1',
      uniforms: {
        CHI: { year: '2023', style: 'A', url: '' },
        GB: { year: '2023', style: 'A', url: '' },
      },
    });
    getHelmetUrlsMock.mockImplementation((year: string, team: string, style: string) => ({
      left: `/uniform_parts/${year}/${team}/${style}/${style}_helmet_left.png`,
      right: `/uniform_parts/${year}/${team}/${style}/${style}_helmet_right.png`,
    }));
  });

  afterEach(() => {
    cleanup();
    loadPlaysForGameMock.mockReset();
    fetchWeeklyUniformsMock.mockReset();
    getHelmetUrlsMock.mockReset();
  });

  const renderVisualizer = () =>
    render(
      <LiveGameVisualizer
        season="2023"
        seasonType="regular"
        week={1}
        schedule={schedule}
        playersById={playersById}
      />,
    );

  it('loads plays and renders the scoreboard with latest score', async () => {
    renderVisualizer();

    await waitFor(() => expect(loadPlaysForGameMock).toHaveBeenCalled());

    const scoreLine = await screen.findByTestId('scoreboard-line');
    const scoreText = scoreLine.textContent ?? '';
    expect(scoreText).toContain('GB');
    expect(scoreText).toContain('CHI');
    expect(scoreText).toMatch(/7/);
  });

  it('displays key player names once data loads', async () => {
    renderVisualizer();

    await screen.findByText('Justin Fields');
    await screen.findByText('DJ Moore');
  });

  it('renders helmet images using the resolved uniform assets', async () => {
    renderVisualizer();

    const helmetImages = await screen.findAllByAltText(/helmet/i);
    expect(helmetImages.length).toBeGreaterThan(0);
    helmetImages.forEach(image => {
      const src = image.getAttribute('src') ?? '';
      expect(src).toContain('/uniform_parts/2023/');
    });

    const requestedTeams = getHelmetUrlsMock.mock.calls.map(([, team]) => team);
    expect(requestedTeams).toEqual(expect.arrayContaining(['CHI']));
  });
});
