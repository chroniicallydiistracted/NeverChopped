// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Trophy, AlertCircle, RefreshCw, BarChart3, Target, Award, Activity, UserPlus, Zap, AlertTriangle, CheckCircle, XCircle, Brain, Sparkles, Shield, TrendingDown, RadioTower } from 'lucide-react';
import { getConfig } from '../config';
import { useAuth } from '../auth/AuthContext';
import { query } from '../graphql/client';
import {
  ACTIVE_PLAYERS_QUERY,
  LEAGUE_DETAILS_QUERY,
  LEAGUE_ROSTERS_QUERY,
  LEAGUE_TRANSACTIONS_QUERY,
  LEAGUE_USERS_QUERY,
  MATCHUP_LEGS_QUERY,
  MY_LEAGUES_QUERY,
  SPORT_INFO_QUERY,
} from '../graphql/queries';
import PyEspnLiveView from '../features/live-view-pyespn/components/PyEspnLiveView';
import { fetchEspnSchedule } from '../lib/api/espn-data';

const SleeperFFHelper = () => {
  const auth = useAuth();
  const config = getConfig();
  const defaultLeagueId = config.leagueId ? String(config.leagueId) : null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshing, setRefreshing] = useState(false);
  const [myLeagues, setMyLeagues] = useState<any[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(defaultLeagueId);
  
  // Core data states
  const [leagueData, setLeagueData] = useState<any>(null);
  const [rosters, setRosters] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [myRoster, setMyRoster] = useState<any>(null);
  const [matchups, setMatchups] = useState<any[]>([]);
  const [nflState, setNflState] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [players, setPlayers] = useState<any>({});
  const [trendingAdds, setTrendingAdds] = useState<any[]>([]);
  const [trendingDrops, setTrendingDrops] = useState<any[]>([]);
  const [activeTeamsCount, setActiveTeamsCount] = useState<number | null>(null); // Smart-detected active teams
  const [eliminatedTeams, setEliminatedTeams] = useState<number[]>([]); // List of eliminated roster IDs
  const [projections, setProjections] = useState<any>({}); // Weekly player projections
  const [nflSchedule, setNflSchedule] = useState<any[]>([]); // NFL game schedule with status
  const AUTH_USER_ID = auth.user?.user_id ? String(auth.user.user_id) : null;
  const USERNAME = auth.user?.username || config.username;
  const TEAM_NAME = auth.user?.display_name || config.teamName;
  const activeLeagueId = selectedLeagueId || defaultLeagueId;

  const normalizeSportInfo = (info: any) => {
    if (!info || typeof info !== 'object') {
      return null;
    }
    const season =
      info.season ??
      info.current_season ??
      info.currentSeason ??
      null;
    const seasonType =
      info.season_type ??
      info.seasonType ??
      info.currentSeasonType ??
      null;
    const rawWeek =
      info.week ??
      info.current_leg ??
      info.currentLeg ??
      info.display_leg ??
      info.display_week ??
      info.leg ??
      null;
    const week = rawWeek !== null && rawWeek !== undefined ? Number(rawWeek) : null;
    return {
      ...info,
      season,
      season_type: seasonType,
      week,
      display_week: info.display_week ?? info.display_leg ?? week ?? null,
    };
  };

  const fetchSleeperJson = async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Request failed (${response.status}): ${response.statusText}`);
    }
    return response.json();
  };

  const fetchNflStateData = async (): Promise<any> => {
    try {
      const gqlState = await query<{ sport_info: any }>(SPORT_INFO_QUERY, { sport: 'nfl' });
      const normalized = normalizeSportInfo(gqlState?.sport_info);
      if (normalized) {
        return normalized;
      }
    } catch (err) {
      console.warn('GraphQL sport_info unavailable, falling back to REST:', err);
    }
    const restState = await fetchSleeperJson('https://api.sleeper.app/v1/state/nfl');
    return restState;
  };

  const fetchActivePlayersData = async (): Promise<Record<string, any>> => {
    try {
      const result = await query<{ get_active_players: any[] }>(ACTIVE_PLAYERS_QUERY, { sport: 'nfl' });
      const list = result?.get_active_players || [];
      const map: Record<string, any> = {};
      list.forEach(player => {
        if (player && player.player_id) {
          const key = String(player.player_id);
          map[key] = {
            ...player,
            player_id: key,
          };
        }
      });
      if (Object.keys(map).length > 0) {
        return map;
      }
    } catch (err) {
      console.warn('GraphQL get_active_players failed, falling back to REST:', err);
    }
    const restPlayers = await fetchSleeperJson('https://api.sleeper.app/v1/players/nfl');
    return restPlayers;
  };

  const fetchMatchupsForWeek = async (leagueId: string, round: number): Promise<any[]> => {
    try {
      const matchupResult = await query<{ matchup_legs: any[] }>(MATCHUP_LEGS_QUERY, {
        leagueId,
        round,
      });
      if (matchupResult?.matchup_legs) {
        return matchupResult.matchup_legs;
      }
    } catch (err) {
      console.warn(`GraphQL matchup_legs failed for round ${round}, falling back to REST:`, err);
    }
    try {
      const restMatchups = await fetchSleeperJson(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${round}`);
      return restMatchups;
    } catch (restErr) {
      console.error(`Failed to fetch matchups for round ${round}:`, restErr);
      return [];
    }
  };

  const fetchTransactionsForWeek = async (leagueId: string, round: number): Promise<any[]> => {
    try {
      const txResult = await query<{ league_transactions: any[] }>(LEAGUE_TRANSACTIONS_QUERY, {
        leagueId,
        round,
      });
      if (txResult?.league_transactions) {
        return txResult.league_transactions;
      }
    } catch (err) {
      console.warn(`GraphQL league_transactions failed for round ${round}, falling back to REST:`, err);
    }
    try {
      const restTransactions = await fetchSleeperJson(`https://api.sleeper.app/v1/league/${leagueId}/transactions/${round}`);
      return restTransactions;
    } catch (restErr) {
      console.error(`Failed to fetch transactions for round ${round}:`, restErr);
      return [];
    }
  };

  const loadTrendingPlayers = async () => {
    try {
      const [adds, drops] = await Promise.all([
        fetchSleeperJson('https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours=24&limit=50'),
        fetchSleeperJson('https://api.sleeper.app/v1/players/nfl/trending/drop?lookback_hours=24&limit=50'),
      ]);
      setTrendingAdds(adds || []);
      setTrendingDrops(drops || []);
    } catch (err) {
      console.warn('Failed to load trending player data:', err);
      setTrendingAdds([]);
      setTrendingDrops([]);
    }
  };

  const loadNflScheduleFromEspn = async (
    seasonType: string,
    week: number,
    year: number,
  ) => {
    try {
      const normalizedSeasonType = seasonType && seasonType.length > 0 ? seasonType : 'regular';
      const schedule = await fetchEspnSchedule(normalizedSeasonType, year, week);
      if (Array.isArray(schedule) && schedule.length > 0) {
        const transformedSchedule = schedule
          .map(game => {
            const gameId = game?.game_id ? String(game.game_id) : null;
            if (!gameId) {
              return null;
            }
            const homeTeam = game?.home_team ?? null;
            const awayTeam = game?.away_team ?? null;
            const homeName =
              homeTeam?.displayName ?? homeTeam?.name ?? homeTeam?.abbreviation ?? 'TBD';
            const awayName =
              awayTeam?.displayName ?? awayTeam?.name ?? awayTeam?.abbreviation ?? 'TBD';
            return {
              game_id: gameId,
              week: game?.week ?? week,
              status: game?.status ?? 'unknown',
              date: game?.date ?? null,
              home: homeName,
              away: awayName,
            };
          })
          .filter(Boolean);
        setNflSchedule(transformedSchedule);
      } else {
        setNflSchedule([]);
      }
    } catch (err) {
      console.warn('Failed to load NFL schedule from ESPN:', err);
      // Fall back to empty schedule if ESPN fails
      setNflSchedule([]);
    }
  };
  
  // Fetch all data for the active league
  const fetchAllData = async (targetLeagueId?: string) => {
    const leagueIdToLoad = targetLeagueId || activeLeagueId;
    if (!leagueIdToLoad) {
      setError('No league selected. Please choose a league to load data.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setRefreshing(true);
      setError(null);

      const [stateData, leagueDetails, rostersResult, usersResult, playersData] = await Promise.all([
        fetchNflStateData(),
        query<{ get_league: any }>(LEAGUE_DETAILS_QUERY, { leagueId: leagueIdToLoad }).catch(err => {
          console.warn('Failed to fetch league details via GraphQL:', err);
          return { get_league: null } as { get_league: any };
        }),
        query<{ league_rosters: any[] }>(LEAGUE_ROSTERS_QUERY, { leagueId: leagueIdToLoad }),
        query<{ league_users: any[] }>(LEAGUE_USERS_QUERY, { leagueId: leagueIdToLoad }),
        fetchActivePlayersData(),
      ]);

      setNflState(stateData);
      setLeagueData(leagueDetails?.get_league || null);

      const rostersDataLocal = rostersResult?.league_rosters || [];
      setRosters(rostersDataLocal);

      setUsers(usersResult?.league_users || []);

      setPlayers(playersData);

      const effectiveUserId = AUTH_USER_ID || config.userId;
      const myRosterData = rostersDataLocal.find((r: any) => String(r.owner_id) === String(effectiveUserId));
      setMyRoster(myRosterData);

      await loadTrendingPlayers();

      if (stateData?.week) {
        const round = Number(stateData.week);
        const [matchupsData, transactionsData] = await Promise.all([
          fetchMatchupsForWeek(leagueIdToLoad, round),
          fetchTransactionsForWeek(leagueIdToLoad, round),
        ]);
        setMatchups(matchupsData || []);
        setTransactions(Array.isArray(transactionsData) ? transactionsData : []);
      } else {
        setMatchups([]);
        setTransactions([]);
      }

      if (stateData?.season && stateData?.week) {
        try {
          const projectionsRes = await fetchSleeperJson(
            `https://api.sleeper.app/projections/nfl/scoring_type/ppr?season_type=regular&season=${stateData.season}&week=${stateData.week}`
          );
          const transformedProjections: Record<string, any> = {};
          Object.keys(projectionsRes || {}).forEach(playerId => {
            const projectedScore = projectionsRes[playerId];
            transformedProjections[playerId] = {
              pts_half_ppr: projectedScore,
              stats: { pts_half_ppr: projectedScore },
            };
          });

          setProjections(transformedProjections);
          console.log(`✅ Loaded projections for ${Object.keys(transformedProjections).length} players (Week ${stateData.week})`);
        } catch (projErr) {
          console.warn('⚠️ Could not load projections:', projErr);
          setProjections({});
        }
      } else {
        setProjections({});
      }

      if (stateData?.season && stateData?.season_type && stateData?.week) {
        await loadNflScheduleFromEspn(
          String(stateData.season_type),
          Number(stateData.week),
          Number(stateData.season),
        );
      } else {
        setNflSchedule([]);
      }

      const activeResult = await calculateActiveTeams(leagueIdToLoad, stateData, rostersDataLocal);
      setActiveTeamsCount(activeResult.count);
      setEliminatedTeams(activeResult.eliminated);

      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError('Failed to fetch data: ' + msg);
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 🎯 SMART ACTIVE TEAMS CALCULATION
  const calculateActiveTeams = async (leagueId: string, nflStateData: any, rostersData: any[]): Promise<{ count: number, eliminated: number[] }> => {
    // Tier 1: Check roster.settings.eliminated field
    // This is THE OFFICIAL way Sleeper marks eliminated teams!
    try {
      const eliminatedTeamsSet = new Set<number>();
      
      rostersData.forEach((roster: any) => {
        // If settings.eliminated exists and has a value, this team is eliminated
        if (roster.settings?.eliminated) {
          eliminatedTeamsSet.add(roster.roster_id);
          console.log(`  ❌ Team eliminated (roster ${roster.roster_id}): Eliminated in week ${roster.settings.eliminated}`);
        }
      });
      
      const eliminatedList = Array.from(eliminatedTeamsSet);
      const activeCount = rostersData.length - eliminatedList.length;
      
      console.log('✅ Official Sleeper API detection:', activeCount, 'active teams, eliminated:', eliminatedList);
      
      if (eliminatedList.length > 0) {
        return { count: activeCount, eliminated: eliminatedList };
      }
    } catch (err) {
      console.warn('⚠️ Elimination detection failed:', err);
    }
    
    // Tier 2: Manual list of eliminated teams (fallback)
    if (config.eliminatedRosterIds && config.eliminatedRosterIds.length > 0) {
      console.log('✅ Using manual eliminated list:', config.eliminatedRosterIds);
      const activeCount = rostersData.length - config.eliminatedRosterIds.length;
      return { count: activeCount, eliminated: config.eliminatedRosterIds };
    }
    
    // Tier 3: Manual override from config (if set)
    if (config.teamsRemaining) {
      console.log('✅ Using manual config:', config.teamsRemaining, 'teams remaining');
      
      // Even with manual config, we need to identify which teams are eliminated
      // Check current week matchups - teams with 0 points are likely eliminated
      try {
        if (nflStateData?.week) {
          const currentWeek = Number(nflStateData.week);
          const currentMatchups = await fetchMatchupsForWeek(leagueId, currentWeek);
          
          // Get teams that have 0 points (likely eliminated)
          const potentiallyEliminated = currentMatchups
            .filter((m: any) => m.points === 0)
            .map((m: any) => m.roster_id);
          
          const expectedEliminated = rostersData.length - config.teamsRemaining;
          
          // If we have the right number of 0-point teams, use them
          if (potentiallyEliminated.length === expectedEliminated) {
            console.log('  📋 Identified eliminated teams from current week:', potentiallyEliminated);
            return { count: config.teamsRemaining, eliminated: potentiallyEliminated };
          }
          
          // Otherwise, use historical data to find eliminated teams
          if (nflStateData.week > 1) {
            const eliminatedTeamsSet = new Set<number>();
            const weeksToCheck = Math.min(3, nflStateData.week - 1);
            const startWeek = Math.max(1, nflStateData.week - weeksToCheck);
            
            const historicalMatchups = await Promise.all(
              Array.from({ length: weeksToCheck }, (_, i) => startWeek + i).map(async (week) => {
                try {
                  const data = await fetchMatchupsForWeek(leagueId, week);
                  return data;
                } catch {
                  return [];
                }
              })
            );
            
            const teamScoreHistory = new Map<number, number[]>();
            
            historicalMatchups.forEach((weekMatchups) => {
              weekMatchups.forEach((matchup: any) => {
                if (!teamScoreHistory.has(matchup.roster_id)) {
                  teamScoreHistory.set(matchup.roster_id, []);
                }
                teamScoreHistory.get(matchup.roster_id)!.push(matchup.points || 0);
              });
            });
            
            // Mark teams as eliminated if they had 0 points for 2+ consecutive weeks
            teamScoreHistory.forEach((scores, rosterId) => {
              if (scores.length >= 2) {
                const lastTwoWeeks = scores.slice(-2);
                if (lastTwoWeeks.every(score => score === 0)) {
                  eliminatedTeamsSet.add(rosterId);
                }
              }
            });
            
            const eliminatedList = Array.from(eliminatedTeamsSet);
            console.log('  📋 Identified eliminated teams from history:', eliminatedList);
            return { count: config.teamsRemaining, eliminated: eliminatedList };
          }
        }
      } catch (err) {
        console.warn('  ⚠️ Could not identify eliminated teams:', err);
      }
      
      return { count: config.teamsRemaining, eliminated: [] };
    }
    
    // Tier 2: Historical analysis - check last 3 weeks for eliminated teams
    try {
      if (nflStateData?.week && nflStateData.week > 2) {
        const eliminatedTeamsSet = new Set<number>();
        const weeksToCheck = 3; // Check last 3 weeks
        const startWeek = Math.max(1, nflStateData.week - weeksToCheck);
        
        console.log('📊 Checking weeks', startWeek, 'to', nflStateData.week - 1, 'for eliminated teams...');
        
        // Fetch last 3 weeks of matchups
        const historicalMatchups = await Promise.all(
          Array.from({ length: weeksToCheck }, (_, i) => startWeek + i).map(async (week) => {
            try {
              const data = await fetchMatchupsForWeek(leagueId, week);
              console.log(`  Week ${week}: ${data.length} matchups fetched`);
              return data;
            } catch {
              return [];
            }
          })
        );
        
        // Find teams that scored 0 for multiple consecutive weeks
        const teamScoreHistory = new Map<number, number[]>();
        
        historicalMatchups.forEach((weekMatchups, weekIndex) => {
          weekMatchups.forEach((matchup: any) => {
            if (!teamScoreHistory.has(matchup.roster_id)) {
              teamScoreHistory.set(matchup.roster_id, []);
            }
            teamScoreHistory.get(matchup.roster_id)!.push(matchup.points || 0);
          });
        });
        
        console.log('📈 Team score history:', Object.fromEntries(teamScoreHistory));
        
        // Mark teams as eliminated if they had 0 points for 2+ consecutive weeks
        teamScoreHistory.forEach((scores, rosterId) => {
          if (scores.length >= 2) {
            const lastTwoWeeks = scores.slice(-2);
            if (lastTwoWeeks.every(score => score === 0)) {
              console.log(`  ❌ Team ${rosterId} eliminated: ${scores.join(', ')}`);
              eliminatedTeamsSet.add(rosterId);
            }
          }
        });
        
        const activeTeams = rostersData.length - eliminatedTeamsSet.size;
        const eliminatedList = Array.from(eliminatedTeamsSet);
        console.log('🔍 Historical detection:', activeTeams, 'active teams (eliminated:', eliminatedList, ')');
        
        if (activeTeams > 0 && activeTeams < rostersData.length) {
          return { count: activeTeams, eliminated: eliminatedList };
        }
      } else {
        console.warn('⚠️ Week', nflStateData?.week, 'is too early for historical detection (need week 3+)');
      }
    } catch (err) {
      console.warn('⚠️ Historical detection failed:', err);
    }
    
    // Tier 3: Fallback to roster count (show warning)
    console.warn('⚠️ Using fallback: counting all rosters. Set config.teamsRemaining for accuracy.');
    return { count: rostersData.length, eliminated: [] };
  };

  useEffect(() => {
    if (!auth.isAuthenticated) {
      return;
    }

    let cancelled = false;

    const loadLeagues = async () => {
      try {
        const result = await query<{ my_leagues: any[] }>(MY_LEAGUES_QUERY);
        if (cancelled) return;

        const leagues = (result?.my_leagues || []).map((league) => ({
          ...league,
          league_id: String(league.league_id),
        }));

        setMyLeagues(leagues);

        if (leagues.length === 0 && !defaultLeagueId) {
          if (!error) {
            setError('No Sleeper leagues found for this account.');
          }
          setLoading(false);
        } else if (error === 'No Sleeper leagues found for this account.') {
          setError(null);
        }

        const hasCurrentSelection =
          selectedLeagueId && leagues.some(l => String(l.league_id) === String(selectedLeagueId));

        if (!selectedLeagueId || !hasCurrentSelection) {
          const preferred = leagues.find(l => defaultLeagueId && String(l.league_id) === String(defaultLeagueId));
          const fallbackLeagueId = preferred?.league_id || leagues[0]?.league_id || null;
          if (fallbackLeagueId) {
            setSelectedLeagueId(String(fallbackLeagueId));
          }
        }
      } catch (err) {
        console.warn('Failed to load leagues via GraphQL:', err);
      }
    };

    loadLeagues();

    return () => {
      cancelled = true;
    };
  }, [auth.isAuthenticated, selectedLeagueId, defaultLeagueId, error]);

  useEffect(() => {
    if (!activeLeagueId) {
      return;
    }
    fetchAllData(activeLeagueId);
    // refetch when auth user changes (multi-user support)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLeagueId, AUTH_USER_ID]);
  
  const handleLeagueChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    if ((value || null) === (selectedLeagueId || null)) {
      return;
    }
    setLoading(true);
    setSelectedLeagueId(value || null);
  };

  const formatLeagueLabel = (league: any): string => {
    if (!league) return 'League';
    const seasonPart = league.season ? ` • ${league.season}${league.season_type ? ` ${league.season_type}` : ''}` : '';
    return `${league.name || 'League'}${seasonPart}`;
  };

  // Helper functions
  const getPlayerName = (playerId) => {
    if (!playerId) return 'Unknown';
    const player = players[playerId];
    if (!player) return `Player ${playerId}`;
    return `${player.first_name} ${player.last_name}`;
  };
  
  const getPlayerInfo = (playerId) => {
    return players[playerId] || null;
  };
  
  const getUserByRosterId = (rosterId) => {
    const roster = rosters.find(r => r.roster_id === rosterId);
    if (!roster) return null;
    return users.find(u => u.user_id === roster.owner_id);
  };
  
  const getTeamNameByRosterId = (rosterId) => {
    const user = getUserByRosterId(rosterId);
    return user?.metadata?.team_name || user?.display_name || 'Unknown';
  };
  
  const getRosterWithUser = (roster) => {
    const user = users.find(u => u.user_id === roster.owner_id);
    return {
      ...roster,
      user,
      teamName: user?.metadata?.team_name || user?.display_name || 'Unknown'
    };
  };
  
  // 🏈 Get NFL game status for current week
  const getGameStatus = () => {
    if (!nflSchedule.length || !nflState) return null;
    
    const currentWeekGames = nflSchedule.filter(game => game.week === nflState.week);
    const complete = currentWeekGames.filter(g => g.status === 'complete').length;
    const inProgress = currentWeekGames.filter(g => g.status === 'in_progress').length;
    const notStarted = currentWeekGames.filter(g => g.status === 'pre_game').length;
    
    return {
      total: currentWeekGames.length,
      complete,
      inProgress,
      notStarted,
      games: currentWeekGames.sort((a, b) => {
        // Sort by: complete first, then in_progress, then pre_game
        const statusOrder = { 'complete': 0, 'in_progress': 1, 'pre_game': 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      })
    };
  };
  
  // 🎯 Get player's game status (has game started?)
  const getPlayerGameStatus = (playerId: string) => {
    if (!nflSchedule.length || !nflState || !players[playerId]) return 'unknown';
    
    const player = players[playerId];
    const playerTeam = player.team;
    
    if (!playerTeam) return 'unknown';
    
    // Find the game this player's team is in this week
    const game = nflSchedule.find(g => 
      g.week === nflState.week && 
      (g.home === playerTeam || g.away === playerTeam)
    );
    
    if (!game) return 'unknown';
    
    // Return the game status: 'pre_game', 'in_progress', or 'complete'
    return game.status;
  };
  
  // 🏈 Get enhanced game details for display
  const getGameDetails = (game: any) => {
    if (!game) return null;
    
    const status = game.status;
    const gameDate = new Date(game.date);
    const now = new Date();
    
    // Format start time
    const startTime = gameDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      timeZoneName: 'short'
    });
    
    const dayName = gameDate.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    
    return {
      status,
      startTime,
      dayName,
      homeTeam: game.home,
      awayTeam: game.away,
      gameId: game.game_id,
      // We'll add more details like scores and top players if available in the API
      // For now, just the basic info
    };
  };
  
  const getMyMatchup = () => {
    if (!myRoster || !matchups.length) return null;
    const myMatchup = matchups.find(m => m.roster_id === myRoster.roster_id);
    if (!myMatchup) return null;
    
    const opponent = matchups.find(m => 
      m.matchup_id === myMatchup.matchup_id && 
      m.roster_id !== myRoster.roster_id
    );
    
    return { myMatchup, opponent };
  };
  
  const getStandings = () => {
    return rosters
      .map(r => getRosterWithUser(r))
      .sort((a, b) => {
        if (b.settings.wins !== a.settings.wins) {
          return b.settings.wins - a.settings.wins;
        }
        return (b.settings.fpts || 0) - (a.settings.fpts || 0);
      });
  };
  
  const getMyRank = () => {
    const standings = getStandings();
    return standings.findIndex(r => r.roster_id === myRoster?.roster_id) + 1;
  };
  
  const isPlayerOnMyRoster = (playerId) => {
    if (!myRoster) return false;
    return myRoster.players?.includes(playerId) || false;
  };
  
  const isPlayerRostered = (playerId) => {
    return rosters.some(r => r.players?.includes(playerId));
  };
  
  // ANALYTICAL FUNCTIONS
  
  const analyzeRosterStrength = () => {
    if (!myRoster || !players) return null;
    
    const starters = myRoster.starters || [];
    const bench = (myRoster.players || []).filter(p => !starters.includes(p));
    
    let qbCount = 0, rbCount = 0, wrCount = 0, teCount = 0, kCount = 0, defCount = 0;
    let injuredCount = 0, activeStarters = 0;
    
    starters.forEach(playerId => {
      const player = players[playerId];
      if (player) {
        if (player.position === 'QB') qbCount++;
        if (player.position === 'RB') rbCount++;
        if (player.position === 'WR') wrCount++;
        if (player.position === 'TE') teCount++;
        if (player.position === 'K') kCount++;
        if (player.position === 'DEF') defCount++;
        
        if (player.injury_status && player.injury_status !== 'Healthy') {
          injuredCount++;
        } else if (player.status === 'Active' || player.position === 'DEF') {
          activeStarters++;
        }
      }
    });
    
    const positionDepth = {
      QB: (myRoster.players || []).filter(p => players[p]?.position === 'QB').length,
      RB: (myRoster.players || []).filter(p => players[p]?.position === 'RB').length,
      WR: (myRoster.players || []).filter(p => players[p]?.position === 'WR').length,
      TE: (myRoster.players || []).filter(p => players[p]?.position === 'TE').length,
    };
    
    return {
      starters: starters.length,
      bench: bench.length,
      injuredCount,
      activeStarters,
      positionDepth,
      depthScore: positionDepth.RB >= 4 && positionDepth.WR >= 5 && positionDepth.TE >= 2 ? 'Good' : 'Needs Work'
    };
  };
  
  const getWaiverRecommendations = () => {
    if (!players || !myRoster) return [];
    
    const recommendations = [];
    const myPlayers = myRoster.players || [];
    const rosterAnalysis = analyzeRosterStrength();
    
    // Get top trending adds that are available
    const availableTrending = trendingAdds
      .filter(t => !isPlayerRostered(t.player_id))
      .slice(0, 20)
      .map(t => {
        const player = players[t.player_id];
        return { ...t, player };
      })
      .filter(t => t.player && t.player.position !== 'K'); // Filter out kickers from trending
    
    // Position need analysis
    const positionNeeds = [];
    if (rosterAnalysis) {
      if (rosterAnalysis.positionDepth.RB < 4) positionNeeds.push('RB');
      if (rosterAnalysis.positionDepth.WR < 5) positionNeeds.push('WR');
      if (rosterAnalysis.positionDepth.TE < 2) positionNeeds.push('TE');
    }
    
    // HIGH PRIORITY: Trending players in positions of need
    availableTrending.forEach(t => {
      if (positionNeeds.includes(t.player.position)) {
        recommendations.push({
          player: t.player,
          playerId: t.player_id,
          priority: 'HIGH',
          reason: `Trending add (${t.count} adds) at position of need (${t.player.position})`,
          addCount: t.count,
          action: 'ADD'
        });
      }
    });
    
    // MEDIUM PRIORITY: Other trending players
    availableTrending.slice(0, 10).forEach(t => {
      if (!positionNeeds.includes(t.player.position) && t.player.position !== 'DEF') {
        recommendations.push({
          player: t.player,
          playerId: t.player_id,
          priority: 'MEDIUM',
          reason: `High waiver activity (${t.count} adds in 24hrs) - emerging option`,
          addCount: t.count,
          action: 'WATCH'
        });
      }
    });
    
    // Check for injured starters that need replacement
    const starters = myRoster.starters || [];
    starters.forEach(playerId => {
      const player = players[playerId];
      if (player && player.injury_status && player.injury_status !== 'Healthy') {
        recommendations.push({
          player: player,
          playerId: playerId,
          priority: 'CRITICAL',
          reason: `Starting player is ${player.injury_status} - find immediate replacement`,
          action: 'REPLACE',
          injuryStatus: player.injury_status
        });
      }
    });
    
    // Sort by priority
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  };
  
  const getStartSitRecommendations = () => {
    if (!myRoster || !players) return [];
    
    const recommendations = [];
    const starters = myRoster.starters || [];
    const bench = (myRoster.players || []).filter(p => !starters.includes(p) && p !== 'DEF');
    const hasProjections = Object.keys(projections).length > 0;
    
    // Check for injured or inactive starters
    starters.forEach(playerId => {
      const player = players[playerId];
      if (player) {
        const playerProjection = projections[playerId];
        const projectedPoints = playerProjection?.stats?.pts_half_ppr || 0;
        
        // CRITICAL: Injury Alerts with projections
        if (player.injury_status && player.injury_status !== 'Healthy') {
          const benchAlternatives = bench
            .map(benchId => {
              const benchPlayer = players[benchId];
              const benchProj = projections[benchId];
              return benchPlayer && benchPlayer.position === player.position
                ? {
                    player: benchPlayer,
                    projected: benchProj?.stats?.pts_half_ppr || 0,
                    id: benchId
                  }
                : null;
            })
            .filter(Boolean)
            .sort((a, b) => (b?.projected || 0) - (a?.projected || 0));
          
          const bestAlternative = benchAlternatives[0];
          
          recommendations.push({
            type: 'INJURY_ALERT',
            player: player,
            playerId: playerId,
            severity: player.injury_status === 'Out' ? 'CRITICAL' : 'WARNING',
            message: `${player.first_name} ${player.last_name} (${player.position}) is ${player.injury_status}`,
            action: player.injury_status === 'Out' ? 'MUST SIT' : 'MONITOR CLOSELY',
            projected: projectedPoints,
            reasoning: hasProjections 
              ? `Projected: ${projectedPoints.toFixed(1)} pts. ${player.injury_status === 'Out' ? 'Will score 0 if inactive.' : 'Game-time decision risk.'}`
              : `${player.injury_status} status confirmed`,
            alternative: bestAlternative 
              ? `Consider ${bestAlternative.player.first_name} ${bestAlternative.player.last_name} (proj: ${bestAlternative.projected.toFixed(1)} pts)`
              : 'Check waivers for replacement',
            confidence: player.injury_status === 'Out' ? 100 : 75
          });
        }
        
        // CRITICAL: Inactive/IR
        if (player.status === 'Inactive' || player.status === 'Injured Reserve') {
          recommendations.push({
            type: 'INACTIVE_ALERT',
            player: player,
            playerId: playerId,
            severity: 'CRITICAL',
            message: `${player.first_name} ${player.last_name} (${player.position}) is ${player.status}`,
            action: 'BENCH IMMEDIATELY',
            projected: 0,
            reasoning: `${player.status} - will score 0 points this week`,
            confidence: 100
          });
        }
        
        // HIGH: Low Projection Warning
        if (hasProjections && projectedPoints < 5 && !player.injury_status) {
          recommendations.push({
            type: 'LOW_PROJECTION',
            player: player,
            playerId: playerId,
            severity: 'WARNING',
            message: `${player.first_name} ${player.last_name} (${player.position}) has very low projection`,
            action: 'CONSIDER BENCHING',
            projected: projectedPoints,
            reasoning: `Projected only ${projectedPoints.toFixed(1)} pts - tough matchup or reduced role expected`,
            confidence: 70
          });
        }
      }
    });
    
    // MEDIUM: Bench players with higher projections than starters
    if (hasProjections) {
      bench.forEach(benchId => {
        const benchPlayer = players[benchId];
        if (!benchPlayer) return;
        
        const benchProj = projections[benchId]?.stats?.pts_half_ppr || 0;
        if (benchProj < 8) return; // Only suggest if decent projection
        
        // Find starter at same position with lower projection
        const matchingStarter = starters.find(starterId => {
          const starter = players[starterId];
          if (!starter || starter.position !== benchPlayer.position) return false;
          const starterProj = projections[starterId]?.stats?.pts_half_ppr || 0;
          return benchProj > starterProj + 3; // Bench player projected 3+ pts higher
        });
        
        if (matchingStarter) {
          const starterPlayer = players[matchingStarter];
          const starterProj = projections[matchingStarter]?.stats?.pts_half_ppr || 0;
          
          recommendations.push({
            type: 'BETTER_BENCH_OPTION',
            player: benchPlayer,
            playerId: benchId,
            severity: 'INFO',
            message: `${benchPlayer.first_name} ${benchPlayer.last_name} projected higher than starter`,
            action: `START OVER ${starterPlayer.first_name} ${starterPlayer.last_name}`,
            projected: benchProj,
            reasoning: `${benchPlayer.first_name} ${benchPlayer.last_name}: ${benchProj.toFixed(1)} pts vs ${starterPlayer.first_name} ${starterPlayer.last_name}: ${starterProj.toFixed(1)} pts (${(benchProj - starterProj).toFixed(1)} pt advantage)`,
            confidence: 65
          });
        }
      });
    }
    
    return recommendations.sort((a, b) => {
      const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  };
  
  const getSurvivalAnalysis = () => {
    // Safety checks: ensure all required data is loaded
    if (!matchups.length || !myRoster || !rosters.length) return null;
    
    const standings = getStandings();
    const myRank = getMyRank();
    
    // 🎯 HYBRID SCORING: Use actual points for started games, projected for upcoming games
    // This gives real-time accuracy as games progress!
    const hasProjectionsData = projections && Object.keys(projections).length > 0;
    const hasScheduleData = nflSchedule && nflSchedule.length > 0;
    
    // Calculate current week scores - SORT HIGH TO LOW (best to worst)
    // Position #1 = BEST (highest score, safest)
    // Last position = WORST (lowest score, CHOPPED!)
    const scores = matchups
      .map(m => {
        const rosterId = m.roster_id;
        const actualPoints = m.points || 0;
        const teamName = getTeamNameByRosterId(rosterId);
        const roster = rosters.find((r: any) => r.roster_id === rosterId);
        
        // 🔮 Calculate HYBRID score using game status
        let hybridScore = 0;
        let fullyProjected = 0; // For comparison
        let playersStarted = 0;
        let playersNotStarted = 0;
        
        if (roster && roster.starters && hasProjectionsData && hasScheduleData) {
          roster.starters.forEach((playerId: string) => {
            if (!playerId || playerId === '0') return;
            
            const projection = projections[playerId];
            const projectedPoints = projection?.stats?.pts_half_ppr || projection?.pts_half_ppr || 0;
            fullyProjected += projectedPoints;
            
            // Check if this player's game has started
            const gameStatus = getPlayerGameStatus(playerId);
            
            if (gameStatus === 'pre_game') {
              // Game hasn't started - use projection
              hybridScore += projectedPoints;
              playersNotStarted++;
            } else {
              // Game started or complete - use actual points from matchup.players_points
              const actualPlayerPoints = m.players_points?.[playerId] || 0;
              hybridScore += actualPlayerPoints;
              playersStarted++;
            }
          });
        }
        
        // If we have hybrid data, use it; otherwise fall back to actual points
        const scoreToUse = (playersStarted > 0 || playersNotStarted > 0) ? hybridScore : actualPoints;
        
        return {
          rosterId,
          points: scoreToUse,
          actualPoints: actualPoints,
          projected: fullyProjected > 0 ? fullyProjected : undefined,
          hybridScore: hybridScore > 0 ? hybridScore : undefined,
          playersStarted,
          playersNotStarted,
          teamName,
          isHybrid: (playersStarted > 0 || playersNotStarted > 0)
        };
      })
      .sort((a, b) => b.points - a.points); // FIXED: Descending order (high to low)
    
    // 🎯 USE SMART-DETECTED ACTIVE TEAMS COUNT
    // Falls back to matchups.length if detection hasn't run yet
    const totalTeams = activeTeamsCount || matchups.length;
    const totalRosters = rosters.length;
    const eliminatedCount = totalRosters - totalTeams;
    
    // DEBUG: Log what we're working with
    console.log('🔍 SURVIVAL DEBUG:', {
      activeTeamsCount,
      matchupsCount: matchups.length,
      rostersCount: rosters.length,
      totalTeams,
      eliminatedCount,
      scoresLength: scores.length,
      detectionMethod: activeTeamsCount 
        ? (config.teamsRemaining ? 'Manual Config' : 'Historical Analysis')
        : 'Fallback (matchups.length)'
    });
    
    // 🎯 FILTER TO ONLY ACTIVE TEAMS FOR ACCURATE RANKINGS
    const activeScores = scores.filter(score => !eliminatedTeams.includes(score.rosterId));
    
    // Note: We're now using hybrid scoring above, so we don't need separate projected scores
    // The scores already contain the best available data (actual for started, projected for upcoming)
    
    // Use hybrid/actual scores for display
    const displayScores = activeScores;
    
    const lowestScore = displayScores[displayScores.length - 1]; // Last position is worst
    const highestScore = displayScores[0]; // First position is best
    const myMatchup = matchups.find(m => m.roster_id === myRoster.roster_id);
    const myScore = displayScores.find(s => s?.rosterId === myRoster.roster_id)?.points || 0;
    
    // Check if we're using hybrid scoring (any player games have started)
    const myScoreData = scores.find(s => s.rosterId === myRoster.roster_id);
    const isUsingHybrid = myScoreData?.isHybrid || false;
    
    // Calculate margin from elimination (using only active teams)
    const marginFromElimination = lowestScore ? myScore - lowestScore.points : 0;
    const myPositionThisWeek = displayScores.findIndex(s => s?.rosterId === myRoster.roster_id) + 1;
    
    // Risk assessment - FIXED LOGIC
    // Position 1 = BEST (safest)
    // Last position = WORST (chopped)
    let riskLevel = 'LOW';
    let riskMessage = '';
    
    if (myPositionThisWeek === totalTeams) {
      riskLevel = 'CRITICAL';
      riskMessage = '🚨 YOU ARE CURRENTLY THE LOWEST SCORER! You will be CHOPPED if scores hold!';
    } else if (myPositionThisWeek >= totalTeams - 2) {
      riskLevel = 'HIGH';
      riskMessage = `⚠️ You're ranked ${myPositionThisWeek} of ${totalTeams}. Only ${marginFromElimination.toFixed(2)} points above the CHOP ZONE!`;
    } else if (myPositionThisWeek >= totalTeams / 2) {
      riskLevel = 'MEDIUM';
      riskMessage = `📊 You're ${myPositionThisWeek} of ${totalTeams}. ${marginFromElimination.toFixed(2)} points above elimination. Stay alert.`;
    } else {
      riskLevel = 'LOW';
      riskMessage = `✅ You're ${myPositionThisWeek} of ${totalTeams}. ${marginFromElimination.toFixed(2)} points above the CHOP ZONE. Looking safe!`;
    }
    
    // eliminatedCount already calculated above
    
    // Get actual and hybrid scores for display
    const myActualScore = myScoreData?.actualPoints || 0;
    const myHybridScore = myScoreData?.hybridScore || myScore;
    
    return {
      riskLevel,
      riskMessage,
      myScore, // This is the hybrid score used for rankings
      myActualScore, // Pure actual points (big display)
      myHybridScore, // Hybrid score (projected, small display)
      highestScore: highestScore?.points || 0,
      highestTeam: highestScore?.teamName || 'Unknown',
      lowestScore: lowestScore?.points || 0,
      lowestTeam: lowestScore?.teamName || 'Unknown',
      marginFromElimination,
      myPositionThisWeek,
      totalTeams, // Active teams still playing
      totalRosters, // Total teams that started
      eliminatedCount, // How many have been chopped
      scores: displayScores.filter(Boolean), // Return only active team scores (hybrid/actual)
      isUsingHybrid, // Are we using hybrid scoring?
      playersStarted: myScoreData?.playersStarted || 0,
      playersNotStarted: myScoreData?.playersNotStarted || 0
    };
  };
  
  const getWeeklyStrategy = () => {
    const survival = getSurvivalAnalysis();
    if (!survival) return [];
    
    const strategies = [];
    
    if (survival.riskLevel === 'CRITICAL') {
      strategies.push({
        priority: 'CRITICAL',
        title: 'EMERGENCY MODE',
        actions: [
          'Review ALL remaining players with games left',
          'Consider high-ceiling boom/bust plays over safe floors',
          'Check if any league mates are close to you - if they have players left, they might pass you',
          'If you have Monday night players, start the highest upside option available'
        ]
      });
    } else if (survival.riskLevel === 'HIGH') {
      strategies.push({
        priority: 'HIGH',
        title: 'High Alert - Protect Your Position',
        actions: [
          'Monitor scores throughout Sunday - know where you stand',
          'Have backup plans if a starter underperforms',
          'Balance floor and ceiling - you need points but also safety',
          'Check weather reports for remaining games'
        ]
      });
    } else if (survival.riskLevel === 'MEDIUM') {
      strategies.push({
        priority: 'MEDIUM',
        title: 'Stay Vigilant',
        actions: [
          'Stick with your planned starters unless injury news breaks',
          'Monitor the lowest scorers - if they have players left, stay alert',
          'Play your normal game - you have cushion but don\'t get complacent'
        ]
      });
    } else {
      strategies.push({
        priority: 'LOW',
        title: 'Comfortable Position',
        actions: [
          'You have significant breathing room this week',
          'Use this time to plan ahead - scout the waiver wire',
          'Don\'t take unnecessary risks with your lineup',
          'Focus on next week\'s preparation'
        ]
      });
    }
    
    return strategies;
  };
  
  // ============================================
  // ADVANCED ANALYTICAL ALGORITHMS
  // ============================================
  
  /**
   * Analyze "Sleeper" players - emerging players with upward trending stats
   * Identifies breakout candidates based on recent performance
   */
  const getSleeperPlayerAnalysis = () => {
    if (!players || !trendingAdds.length) return [];
    
    const sleepers = [];
    
    // Look at trending adds for potential breakouts
    trendingAdds.slice(0, 30).forEach(trend => {
      const player = players[trend.player_id];
      if (!player || isPlayerRostered(trend.player_id)) return;
      
      // Criteria for "sleeper" status
      let score = 0;
      let reasons = [];
      
      // High add count = community interest
      if (trend.count > 500) {
        score += 3;
        reasons.push(`🔥 Extremely hot waiver target (${trend.count} adds)`);
      } else if (trend.count > 200) {
        score += 2;
        reasons.push(`📈 High waiver interest (${trend.count} adds)`);
      }
      
      // Rookie detection
      if (player.years_exp === 0 || player.years_exp === 1) {
        score += 2;
        reasons.push('🌟 Rookie/2nd year - high upside potential');
      }
      
      // Position scarcity (RB/TE more valuable)
      if (player.position === 'RB') {
        score += 1;
        reasons.push('💎 RB position (scarce commodity)');
      } else if (player.position === 'TE') {
        score += 1;
        reasons.push('💎 TE position (scarce commodity)');
      }
      
      // Injury replacement opportunity
      if (player.depth_chart_order === 1 || player.depth_chart_order === 2) {
        score += 1;
        reasons.push(`📊 High on depth chart (#${player.depth_chart_order})`);
      }
      
      // Only include if score is high enough
      if (score >= 3) {
        sleepers.push({
          player,
          playerId: trend.player_id,
          sleeperScore: score,
          reasons,
          addCount: trend.count,
          category: score >= 5 ? 'MUST_ADD' : score >= 4 ? 'STRONG_ADD' : 'WATCH'
        });
      }
    });
    
    return sleepers.sort((a, b) => b.sleeperScore - a.sleeperScore);
  };
  
  /**
   * Analyze injury situations and backup player opportunities
   * Identifies handcuffs and injury replacements
   */
  const getInjuryBackupAnalysis = () => {
    if (!myRoster || !players) return [];
    
    const analysis = [];
    const myPlayers = myRoster.players || [];
    
    // Check each of your players
    myPlayers.forEach(playerId => {
      const player = players[playerId];
      if (!player) return;
      
      // If player is injured, find their backup
      if (player.injury_status && player.injury_status !== 'Healthy') {
        const backup = Object.values(players).find((p: any) => 
          p.team === player.team && 
          p.position === player.position && 
          p.player_id !== player.player_id &&
          p.depth_chart_order === (player.depth_chart_order || 0) + 1
        );
        
        if (backup) {
          analysis.push({
            type: 'BACKUP_OPPORTUNITY',
            injuredPlayer: player,
            backupPlayer: backup,
            severity: player.injury_status === 'Out' ? 'HIGH' : 'MEDIUM',
            recommendation: isPlayerRostered(backup.player_id) 
              ? `${backup.first_name} ${backup.last_name} is rostered - they're the ${player.team} ${player.position} now`
              : `🚨 ADD ${backup.first_name} ${backup.last_name} - direct backup to your injured ${player.first_name} ${player.last_name}`,
            available: !isPlayerRostered(backup.player_id)
          });
        }
      }
    });
    
    // Look for league-wide injury situations creating opportunities
    const injuredStarters = Object.values(players).filter((p: any) => 
      p.injury_status === 'Out' && 
      p.depth_chart_order === 1 &&
      ['RB', 'WR', 'TE', 'QB'].includes(p.position)
    );
    
    injuredStarters.slice(0, 10).forEach((injured: any) => {
      const backup = Object.values(players).find((p: any) => 
        p.team === injured.team && 
        p.position === injured.position && 
        p.player_id !== injured.player_id &&
        !isPlayerRostered(p.player_id) &&
        p.depth_chart_order === 2
      );
      
      if (backup) {
        analysis.push({
          type: 'LEAGUE_WIDE_OPPORTUNITY',
          injuredPlayer: injured,
          backupPlayer: backup,
          severity: 'MEDIUM',
          recommendation: `${backup.first_name} ${backup.last_name} (${backup.team} ${backup.position}) stepping in for injured ${injured.first_name} ${injured.last_name}`,
          available: true
        });
      }
    });
    
    return analysis;
  };
  
  /**
   * Analyze rookie standout performance
   * Identifies rookies outperforming expectations
   */
  const getRookieStandoutAnalysis = () => {
    if (!players || !trendingAdds.length) return [];
    
    const rookieStandouts = [];
    
    // Find rookies in trending adds
    trendingAdds.forEach(trend => {
      const player = players[trend.player_id];
      if (!player || player.years_exp > 1) return;
      
      if (player.years_exp === 0 || player.years_exp === 1) {
        let potential = 'MEDIUM';
        let insights = [];
        
        if (trend.count > 300) {
          potential = 'HIGH';
          insights.push(`🚀 Explosive waiver interest (${trend.count} adds)`);
        } else if (trend.count > 150) {
          potential = 'MEDIUM';
          insights.push(`📈 Growing interest (${trend.count} adds)`);
        }
        
        if (player.position === 'RB') {
          insights.push('💪 RB - Immediate fantasy value if given touches');
        } else if (player.position === 'WR') {
          insights.push('⚡ WR - High ceiling if breakout continues');
        } else if (player.position === 'TE') {
          insights.push('🎯 TE - Rare rookie TE production');
        }
        
        if (player.depth_chart_order === 1) {
          insights.push('🥇 Listed as #1 on depth chart');
          potential = 'HIGH';
        }
        
        rookieStandouts.push({
          player,
          playerId: trend.player_id,
          potential,
          insights,
          addCount: trend.count,
          available: !isPlayerRostered(trend.player_id)
        });
      }
    });
    
    return rookieStandouts
      .sort((a, b) => b.addCount - a.addCount)
      .slice(0, 10);
  };
  
  /**
   * Defense vs Position Matchup Analysis
   * Identifies favorable/unfavorable matchups for your players
   */
  const getDefenseVsPositionAnalysis = () => {
    if (!myRoster || !players) return [];
    
    const matchupAnalysis = [];
    const starters = myRoster.starters || [];
    
    // NFL team defense ratings (simplified - in production, fetch from API)
    // Higher = tougher defense, Lower = easier matchup
    const defenseRatings: any = {
      // These would ideally come from a stats API
      'SF': { RB: 2, WR: 3, TE: 2, QB: 2 },
      'BAL': { RB: 1, WR: 2, TE: 1, QB: 2 },
      'BUF': { RB: 2, WR: 3, TE: 2, QB: 3 },
      'KC': { RB: 3, WR: 2, TE: 3, QB: 2 },
      'DAL': { RB: 3, WR: 4, TE: 3, QB: 3 },
      'PHI': { RB: 2, WR: 3, TE: 2, QB: 2 },
      'MIA': { RB: 4, WR: 3, TE: 4, QB: 3 },
      'DET': { RB: 3, WR: 4, TE: 3, QB: 4 },
      'CLE': { RB: 3, WR: 2, TE: 2, QB: 1 },
      'NYJ': { RB: 3, WR: 2, TE: 3, QB: 1 }
    };
    
    starters.forEach(playerId => {
      const player = players[playerId];
      if (!player || player.position === 'DEF' || player.position === 'K') return;
      
      // This is simplified - in production, you'd fetch opponent from schedule API
      // For now, provide general analysis
      const playerTeam = player.team;
      
      matchupAnalysis.push({
        player,
        playerId,
        position: player.position,
        team: playerTeam,
        analysis: {
          note: 'Matchup data available during game weeks with opponent info',
          tip: `Monitor ${player.first_name} ${player.last_name}'s opponent this week for favorable/tough matchups`
        }
      });
    });
    
    return matchupAnalysis;
  };
  
  /**
   * Advanced waiver wire strategy based on league trends
   */
  const getAdvancedWaiverStrategy = () => {
    if (!trendingAdds.length || !trendingDrops.length) return null;
    
    // Analyze what the league is doing
    const topAdds = trendingAdds.slice(0, 5).map(t => {
      const p = players[t.player_id];
      return p ? { name: `${p.first_name} ${p.last_name}`, position: p.position, count: t.count } : null;
    }).filter(Boolean);
    
    const topDrops = trendingDrops.slice(0, 5).map(t => {
      const p = players[t.player_id];
      return p ? { name: `${p.first_name} ${p.last_name}`, position: p.position, count: t.count } : null;
    }).filter(Boolean);
    
    // Identify position trends
    const positionAddTrends: any = {};
    trendingAdds.slice(0, 20).forEach(t => {
      const p = players[t.player_id];
      if (p && p.position) {
        positionAddTrends[p.position] = (positionAddTrends[p.position] || 0) + 1;
      }
    });
    
    const hotPosition = Object.entries(positionAddTrends)
      .sort(([,a]: any, [,b]: any) => b - a)[0];
    
    return {
      topAdds,
      topDrops,
      hotPosition: hotPosition ? hotPosition[0] : null,
      leagueStrategy: hotPosition ? 
        `🔥 League is heavily targeting ${hotPosition[0]}s - consider why` : 
        'Balanced waiver activity across positions',
      contrarian: `💡 Contrarian play: Look for value at positions being overlooked`,
      timing: `⏰ Best time to add: Right before games start (no waivers) or Wed/Thu waiver claims`
    };
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading comprehensive analytics...</p>
          <p className="text-gray-400 text-sm mt-2">Fetching players, trends, and matchup data</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-6 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Error Loading Data</h2>
          <p className="text-red-200">{error}</p>
          <button 
            onClick={() => fetchAllData(activeLeagueId)}
            className="mt-4 w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  const matchupData = getMyMatchup();
  const standings = getStandings();
  const myRank = getMyRank();
  const rosterAnalysis = analyzeRosterStrength();
  const waiverRecs = getWaiverRecommendations();
  const startSitRecs = getStartSitRecommendations();
  const survivalAnalysis = getSurvivalAnalysis();
  const weeklyStrategy = getWeeklyStrategy();
  
  // Advanced Analytics
  const sleeperPlayers = getSleeperPlayerAnalysis();
  const injuryBackupAnalysis = getInjuryBackupAnalysis();
  const rookieStandouts = getRookieStandoutAnalysis();
  const defenseMatchups = getDefenseVsPositionAnalysis();
  const advancedWaiverStrategy = getAdvancedWaiverStrategy();
  const leagueOptions = myLeagues.length > 0
    ? myLeagues
    : leagueData
      ? [{
          league_id: String(leagueData.league_id || activeLeagueId || defaultLeagueId || ''),
          name: leagueData.name || 'Selected League',
          season: leagueData.season,
          season_type: leagueData.season_type,
        }]
      : (defaultLeagueId
          ? [{
              league_id: defaultLeagueId,
              name: 'Configured League',
              season: undefined,
              season_type: undefined,
            }]
          : []);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <div className="bg-black/30 border-b border-purple-500/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                {TEAM_NAME}
              </h1>
              <p className="text-gray-400 mt-1">
                {leagueData?.name || 'Loading league...'} • Week {nflState?.week || '?'} • Rank #{myRank || '—'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
              <div className="w-full sm:w-64">
                <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">
                  Active League
                </label>
                <select
                  value={selectedLeagueId ?? ''}
                  onChange={handleLeagueChange}
                  disabled={leagueOptions.length === 0 || refreshing}
                  className="w-full bg-black/40 border border-purple-500/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/60"
                >
                  {leagueOptions.length === 0 && (
                    <option value="">No leagues found</option>
                  )}
                  {leagueOptions.map(league => (
                    <option key={league.league_id} value={league.league_id}>
                      {formatLeagueLabel(league)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => fetchAllData(activeLeagueId)}
                disabled={refreshing || !activeLeagueId}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Navigation Tabs */}
      <div className="bg-black/20 border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Activity },
              { id: 'livegame', label: 'Live Game', icon: RadioTower },
              { id: 'waiver', label: 'Waiver Wire', icon: UserPlus },
              { id: 'deepanalytics', label: 'Deep Analytics', icon: Brain },
              { id: 'lineup', label: 'Lineup Alerts', icon: AlertTriangle },
              { id: 'survival', label: 'Survival Mode', icon: Zap },
              { id: 'standings', label: 'Standings', icon: Trophy },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-green-400 text-green-400 bg-green-400/10'
                      : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">

        {activeTab === 'livegame' && (
          <PyEspnLiveView
            season={nflState?.season}
            seasonType={nflState?.season_type || nflState?.seasonType}
            week={nflState?.week}
            schedule={Array.isArray(nflSchedule) ? nflSchedule : []}
          />
        )}
        
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Survival Status Banner */}
            {survivalAnalysis && (
              <div className={`border-2 rounded-lg p-6 ${
                survivalAnalysis.riskLevel === 'CRITICAL' ? 'bg-red-500/20 border-red-500' :
                survivalAnalysis.riskLevel === 'HIGH' ? 'bg-orange-500/20 border-orange-500' :
                survivalAnalysis.riskLevel === 'MEDIUM' ? 'bg-yellow-500/20 border-yellow-500' :
                'bg-green-500/20 border-green-500'
              }`}>
                <div className="flex items-start gap-4">
                  <Zap className={`w-12 h-12 flex-shrink-0 ${
                    survivalAnalysis.riskLevel === 'CRITICAL' ? 'text-red-400' :
                    survivalAnalysis.riskLevel === 'HIGH' ? 'text-orange-400' :
                    survivalAnalysis.riskLevel === 'MEDIUM' ? 'text-yellow-400' :
                    'text-green-400'
                  }`} />
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2">
                      Week {nflState?.week} Survival Status: {survivalAnalysis.riskLevel}
                    </h2>
                    <p className="text-lg mb-3">{survivalAnalysis.riskMessage}</p>
                    
                    {/* League Status Bar */}
                    {survivalAnalysis.eliminatedCount > 0 && (
                      <div className="mb-3 p-2 bg-black/30 rounded-lg border border-purple-500/30">
                        <p className="text-sm text-gray-300">
                          🏈 <span className="font-bold text-green-400">{survivalAnalysis.totalTeams}</span> teams still alive • 
                          <span className="font-bold text-red-400 ml-2">{survivalAnalysis.eliminatedCount}</span> teams chopped • 
                          <span className="text-gray-400 ml-2">(Started with {survivalAnalysis.totalRosters})</span>
                        </p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-300">Your Score</p>
                        <p className="text-2xl font-bold">{survivalAnalysis.myScore.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-300">Lowest Score</p>
                        <p className="text-2xl font-bold">{survivalAnalysis.lowestScore.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-300">Your Margin</p>
                        <p className="text-2xl font-bold">+{survivalAnalysis.marginFromElimination.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Critical Alerts */}
            {startSitRecs.filter(r => r.severity === 'CRITICAL').length > 0 && (
              <div className="bg-red-500/20 border-2 border-red-500 rounded-lg p-6">
                <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6" />
                  CRITICAL LINEUP ALERTS
                </h3>
                <div className="space-y-3">
                  {startSitRecs.filter(r => r.severity === 'CRITICAL').map((rec, idx) => (
                    <div key={idx} className="bg-black/40 rounded-lg p-4 border border-red-500/50">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-red-400">{rec.message}</p>
                          <p className="text-sm text-gray-300 mt-1">Action: {rec.action}</p>
                        </div>
                        <XCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Survival Status</p>
                    <p className="text-3xl font-bold text-green-400">
                      {myRoster?.settings.eliminated ? `❌ Week ${myRoster.settings.eliminated}` : '✅ ALIVE'}
                    </p>
                  </div>
                  <Trophy className="w-10 h-10 text-green-400 opacity-50" />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">League Rank</p>
                    <p className="text-3xl font-bold text-blue-400">
                      #{myRank} / {rosters.length}
                    </p>
                  </div>
                  <Award className="w-10 h-10 text-blue-400 opacity-50" />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Avg PPG</p>
                    <p className="text-3xl font-bold text-purple-400">
                      {nflState?.week && nflState.week > 1
                        ? ((myRoster?.settings.fpts || 0) / (nflState.week - 1)).toFixed(1)
                        : myRoster?.settings.fpts?.toFixed(1) || '0.0'}
                    </p>
                  </div>
                  <TrendingUp className="w-10 h-10 text-purple-400 opacity-50" />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Roster Health</p>
                    <p className="text-3xl font-bold text-orange-400">
                      {rosterAnalysis ? Math.round((rosterAnalysis.activeStarters / rosterAnalysis.starters) * 100) : 0}%
                    </p>
                  </div>
                  <Activity className="w-10 h-10 text-orange-400 opacity-50" />
                </div>
              </div>
            </div>
            
            {/* Roster Analysis */}
            {rosterAnalysis && (
              <div className="bg-black/40 border border-purple-500/30 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Roster Composition Analysis
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">QB Depth</p>
                    <p className="text-2xl font-bold">{rosterAnalysis.positionDepth.QB}</p>
                    <p className={`text-xs mt-1 ${rosterAnalysis.positionDepth.QB >= 2 ? 'text-green-400' : 'text-red-400'}`}>
                      {rosterAnalysis.positionDepth.QB >= 2 ? 'Good' : 'Need backup'}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">RB Depth</p>
                    <p className="text-2xl font-bold">{rosterAnalysis.positionDepth.RB}</p>
                    <p className={`text-xs mt-1 ${rosterAnalysis.positionDepth.RB >= 4 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {rosterAnalysis.positionDepth.RB >= 4 ? 'Excellent' : 'Add depth'}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">WR Depth</p>
                    <p className="text-2xl font-bold">{rosterAnalysis.positionDepth.WR}</p>
                    <p className={`text-xs mt-1 ${rosterAnalysis.positionDepth.WR >= 5 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {rosterAnalysis.positionDepth.WR >= 5 ? 'Excellent' : 'Add depth'}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <p className="text-gray-400 text-sm">TE Depth</p>
                    <p className="text-2xl font-bold">{rosterAnalysis.positionDepth.TE}</p>
                    <p className={`text-xs mt-1 ${rosterAnalysis.positionDepth.TE >= 2 ? 'text-green-400' : 'text-red-400'}`}>
                      {rosterAnalysis.positionDepth.TE >= 2 ? 'Good' : 'Need backup'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-sm">
                    <span className="font-semibold">Overall Depth Rating:</span> {rosterAnalysis.depthScore}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Healthy starters: {rosterAnalysis.activeStarters}/{rosterAnalysis.starters}
                    {rosterAnalysis.injuredCount > 0 && ` • ⚠️ ${rosterAnalysis.injuredCount} injured`}
                  </p>
                </div>
              </div>
            )}
            
            {/* This Week's Strategy */}
            {weeklyStrategy.length > 0 && (
              <div className="bg-black/40 border border-green-500/30 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-green-400">
                  <Target className="w-5 h-5" />
                  This Week's Recommended Actions
                </h3>
                {weeklyStrategy.map((strat, idx) => (
                  <div key={idx} className="mb-4 last:mb-0">
                    <div className={`inline-block px-3 py-1 rounded text-xs font-bold mb-3 ${
                      strat.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                      strat.priority === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                      strat.priority === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {strat.title}
                    </div>
                    <ul className="space-y-2 ml-4">
                      {strat.actions.map((action, aidx) => (
                        <li key={aidx} className="flex items-start gap-2 text-sm text-gray-300">
                          <span className="text-green-400 mt-1">→</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Waiver Wire Tab */}
        {activeTab === 'waiver' && (
          <div className="space-y-6">
            <div className="bg-black/40 border border-purple-500/30 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <UserPlus className="w-6 h-6" />
                Personalized Waiver Wire Recommendations
              </h2>
              <p className="text-gray-400 mb-6">
                Based on your roster needs, trending players, and league availability. 
                Updated in real-time from the last 24 hours of activity.
              </p>
              
              {waiverRecs.length > 0 ? (
                <div className="space-y-3">
                  {waiverRecs.map((rec, idx) => {
                    const player = rec.player;
                    return (
                      <div 
                        key={idx}
                        className={`border rounded-lg p-4 ${
                          rec.priority === 'CRITICAL' ? 'bg-red-500/10 border-red-500/50' :
                          rec.priority === 'HIGH' ? 'bg-orange-500/10 border-orange-500/50' :
                          rec.priority === 'MEDIUM' ? 'bg-blue-500/10 border-blue-500/50' :
                          'bg-gray-500/10 border-gray-500/50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                rec.priority === 'CRITICAL' ? 'bg-red-500 text-white' :
                                rec.priority === 'HIGH' ? 'bg-orange-500 text-white' :
                                rec.priority === 'MEDIUM' ? 'bg-blue-500 text-white' :
                                'bg-gray-500 text-white'
                              }`}>
                                {rec.priority}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                rec.action === 'ADD' ? 'bg-green-500/20 text-green-400' :
                                rec.action === 'REPLACE' ? 'bg-red-500/20 text-red-400' :
                                'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                {rec.action}
                              </span>
                            </div>
                            <h4 className="text-lg font-bold">
                              {player.first_name} {player.last_name}
                            </h4>
                            <p className="text-sm text-gray-400">
                              {player.position} • {player.team || 'FA'}
                              {player.injury_status && player.injury_status !== 'Healthy' && (
                                <span className="text-red-400 ml-2">({player.injury_status})</span>
                              )}
                            </p>
                          </div>
                          {rec.addCount && (
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-400">↑{rec.addCount}</p>
                              <p className="text-xs text-gray-400">adds/24h</p>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-300 mt-2">{rec.reason}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <UserPlus className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No immediate waiver recommendations</p>
                  <p className="text-sm text-gray-500 mt-2">Your roster looks solid for now</p>
                </div>
              )}
            </div>
            
            {/* Top Trending Adds */}
            <div className="bg-black/40 border border-green-500/30 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-green-400">
                <TrendingUp className="w-5 h-5" />
                League-Wide Trending Adds (Last 24h)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {trendingAdds.slice(0, 10).map((t, idx) => {
                  const player = players[t.player_id];
                  const isRostered = isPlayerRostered(t.player_id);
                  const isOnMyTeam = isPlayerOnMyRoster(t.player_id);
                  
                  if (!player) return null;
                  
                  return (
                    <div key={idx} className={`rounded-lg p-3 border ${
                      isOnMyTeam ? 'bg-green-500/20 border-green-500/50' :
                      isRostered ? 'bg-gray-500/10 border-gray-500/30' :
                      'bg-blue-500/10 border-blue-500/30'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">
                            {player.first_name} {player.last_name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {player.position} • {player.team || 'FA'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-400">+{t.count}</p>
                          {isOnMyTeam && (
                            <p className="text-xs text-green-400">Your Team</p>
                          )}
                          {isRostered && !isOnMyTeam && (
                            <p className="text-xs text-gray-400">Rostered</p>
                          )}
                          {!isRostered && (
                            <p className="text-xs text-blue-400">Available</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        {/* Deep Analytics Tab */}
        {activeTab === 'deepanalytics' && (
          <div className="space-y-6">
            
            {/* Sleeper Players Section */}
            {sleeperPlayers.length > 0 && (
              <div className="bg-black/40 border border-purple-500/30 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                  "Sleeper" Player Detection - Breakout Candidates
                </h2>
                <p className="text-gray-400 mb-6">
                  Advanced algorithm identifying emerging players with high upside potential based on waiver activity, depth chart position, and experience level.
                </p>
                
                <div className="space-y-3">
                  {sleeperPlayers.map((sleeper, idx) => (
                    <div key={idx} className={`border rounded-lg p-4 ${
                      sleeper.category === 'MUST_ADD' ? 'bg-green-500/10 border-green-500/50' :
                      sleeper.category === 'STRONG_ADD' ? 'bg-blue-500/10 border-blue-500/50' :
                      'bg-purple-500/10 border-purple-500/50'
                    }`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-3 py-1 rounded text-xs font-bold ${
                              sleeper.category === 'MUST_ADD' ? 'bg-green-500 text-white' :
                              sleeper.category === 'STRONG_ADD' ? 'bg-blue-500 text-white' :
                              'bg-purple-500 text-white'
                            }`}>
                              {sleeper.category.replace('_', ' ')}
                            </span>
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-bold">
                              Sleeper Score: {sleeper.sleeperScore}/10
                            </span>
                          </div>
                          <h3 className="text-xl font-bold">
                            {sleeper.player.first_name} {sleeper.player.last_name}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {sleeper.player.position} • {sleeper.player.team || 'FA'} • 
                            {sleeper.player.years_exp === 0 ? ' Rookie' : ` Year ${sleeper.player.years_exp}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-green-400">↑{sleeper.addCount}</p>
                          <p className="text-xs text-gray-400">adds/24h</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-yellow-400 mb-2">Why This Player:</p>
                        {sleeper.reasons.map((reason, ridx) => (
                          <p key={ridx} className="text-sm text-gray-300 ml-4">• {reason}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Injury/Backup Analysis */}
            {injuryBackupAnalysis.length > 0 && (
              <div className="bg-black/40 border border-orange-500/30 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Shield className="w-6 h-6 text-orange-400" />
                  Injury & Backup Opportunity Analysis
                </h2>
                <p className="text-gray-400 mb-6">
                  Identifies handcuff opportunities and backup players stepping into expanded roles due to injuries.
                </p>
                
                <div className="space-y-3">
                  {injuryBackupAnalysis.map((analysis, idx) => (
                    <div key={idx} className={`border rounded-lg p-4 ${
                      analysis.severity === 'HIGH' && analysis.available ? 'bg-red-500/10 border-red-500/50' :
                      analysis.available ? 'bg-orange-500/10 border-orange-500/50' :
                      'bg-gray-500/10 border-gray-500/50'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded ${
                          analysis.severity === 'HIGH' ? 'bg-red-500/20' : 'bg-orange-500/20'
                        }`}>
                          <AlertCircle className={`w-5 h-5 ${
                            analysis.severity === 'HIGH' ? 'text-red-400' : 'text-orange-400'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              analysis.severity === 'HIGH' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
                            }`}>
                              {analysis.type === 'BACKUP_OPPORTUNITY' ? 'YOUR PLAYER INJURED' : 'LEAGUE OPPORTUNITY'}
                            </span>
                            {analysis.available && (
                              <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-bold">
                                AVAILABLE TO ADD
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold mb-1">
                            Injured: {analysis.injuredPlayer.first_name} {analysis.injuredPlayer.last_name} ({analysis.injuredPlayer.injury_status})
                          </p>
                          <p className="text-sm text-gray-300 mb-2">
                            Backup: {analysis.backupPlayer.first_name} {analysis.backupPlayer.last_name} ({analysis.backupPlayer.team} {analysis.backupPlayer.position})
                          </p>
                          <p className="text-sm text-gray-400 bg-black/40 p-2 rounded">
                            💡 {analysis.recommendation}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Rookie Standouts */}
            {rookieStandouts.length > 0 && (
              <div className="bg-black/40 border border-blue-500/30 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-blue-400" />
                  Rookie Standout Analysis
                </h2>
                <p className="text-gray-400 mb-6">
                  Rookies generating significant waiver interest - potential league winners if they break out.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rookieStandouts.map((rookie, idx) => (
                    <div key={idx} className={`border rounded-lg p-4 ${
                      rookie.potential === 'HIGH' ? 'bg-blue-500/10 border-blue-500/50' :
                      'bg-purple-500/10 border-purple-500/50'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              rookie.potential === 'HIGH' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'
                            }`}>
                              {rookie.potential} POTENTIAL
                            </span>
                            {rookie.available && (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            )}
                          </div>
                          <p className="font-bold">
                            {rookie.player.first_name} {rookie.player.last_name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {rookie.player.position} • {rookie.player.team}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-blue-400">+{rookie.addCount}</p>
                          <p className="text-xs text-gray-400">adds</p>
                        </div>
                      </div>
                      <div className="mt-2 space-y-1">
                        {rookie.insights.map((insight, iidx) => (
                          <p key={iidx} className="text-xs text-gray-300">• {insight}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Advanced Waiver Strategy */}
            {advancedWaiverStrategy && (
              <div className="bg-black/40 border border-green-500/30 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Brain className="w-6 h-6 text-green-400" />
                  Advanced Waiver Wire Strategy Intelligence
                </h2>
                <p className="text-gray-400 mb-6">
                  League-wide trend analysis to help you stay ahead of the competition.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <h3 className="font-bold text-green-400 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Top 5 Adds League-Wide
                    </h3>
                    <div className="space-y-2">
                      {advancedWaiverStrategy.topAdds.map((add: any, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-gray-300">{add.name} ({add.position})</span>
                          <span className="text-green-400 font-bold">+{add.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <h3 className="font-bold text-red-400 mb-3 flex items-center gap-2">
                      <TrendingDown className="w-5 h-5" />
                      Top 5 Drops League-Wide
                    </h3>
                    <div className="space-y-2">
                      {advancedWaiverStrategy.topDrops.map((drop: any, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-gray-300">{drop.name} ({drop.position})</span>
                          <span className="text-red-400 font-bold">-{drop.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-sm"><span className="font-bold">📊 League Strategy:</span> {advancedWaiverStrategy.leagueStrategy}</p>
                  </div>
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                    <p className="text-sm">{advancedWaiverStrategy.contrarian}</p>
                  </div>
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                    <p className="text-sm">{advancedWaiverStrategy.timing}</p>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        )}
        
        {/* Lineup Alerts Tab */}
        {activeTab === 'lineup' && (
          <div className="space-y-6">
            <div className="bg-black/40 border border-purple-500/30 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6" />
                Start/Sit Recommendations
              </h2>
              
              {startSitRecs.length > 0 ? (
                <div className="space-y-4">
                  {startSitRecs.map((rec, idx) => (
                    <div 
                      key={idx}
                      className={`border-l-4 rounded-lg p-4 ${
                        rec.severity === 'CRITICAL' ? 'bg-red-500/10 border-red-500' :
                        rec.severity === 'WARNING' ? 'bg-yellow-500/10 border-yellow-500' :
                        'bg-blue-500/10 border-blue-500'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {rec.severity === 'CRITICAL' ? (
                          <XCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                        ) : rec.severity === 'WARNING' ? (
                          <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0" />
                        ) : (
                          <CheckCircle className="w-6 h-6 text-blue-400 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className={`font-bold text-lg ${
                            rec.severity === 'CRITICAL' ? 'text-red-400' : 
                            rec.severity === 'WARNING' ? 'text-yellow-400' :
                            'text-blue-400'
                          }`}>
                            {rec.message}
                          </p>
                          <p className="text-sm text-gray-300 mt-1">
                            <span className="font-semibold">Action:</span> {rec.action}
                          </p>
                          
                          {/* NEW: Show projection */}
                          {rec.projected !== undefined && (
                            <p className="text-sm text-purple-300 mt-1">
                              <span className="font-semibold">Projected:</span> {rec.projected.toFixed(1)} pts
                            </p>
                          )}
                          
                          {/* NEW: Show reasoning */}
                          {rec.reasoning && (
                            <p className="text-sm text-gray-400 mt-2 italic">
                              💡 {rec.reasoning}
                            </p>
                          )}
                          
                          {/* NEW: Show alternative */}
                          {rec.alternative && (
                            <p className="text-sm text-green-300 mt-2">
                              <span className="font-semibold">Alternative:</span> {rec.alternative}
                            </p>
                          )}
                          
                          {/* NEW: Show confidence */}
                          {rec.confidence && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 mb-1">Confidence: {rec.confidence}%</p>
                              <div className="w-full bg-gray-700 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    rec.confidence >= 80 ? 'bg-green-500' :
                                    rec.confidence >= 60 ? 'bg-yellow-500' :
                                    'bg-orange-500'
                                  }`}
                                  style={{ width: `${rec.confidence}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                          
                          {rec.player && (
                            <div className="mt-3 p-3 bg-black/40 rounded border border-gray-700">
                              <p className="text-xs text-gray-400">
                                <span className="font-semibold">{rec.player.first_name} {rec.player.last_name}</span> ({rec.player.position}) • 
                                Team: {rec.player.team || 'FA'}
                                {rec.player.injury_status && ` • Injury: ${rec.player.injury_status}`}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <p className="text-green-400 text-lg font-semibold">All Clear!</p>
                  <p className="text-gray-400 mt-2">No immediate lineup concerns detected</p>
                </div>
              )}
            </div>

            {/* NEW: Projected vs Actual Section */}
            {myRoster && matchups && matchups.length > 0 && (
              <div className="bg-black/40 border border-cyan-500/30 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-cyan-400">
                  <TrendingUp className="w-5 h-5" />
                  Projected vs Actual Performance (Week {nflState?.week})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-2 px-2">Player</th>
                        <th className="text-left py-2 px-2">Pos</th>
                        <th className="text-right py-2 px-2">Projected</th>
                        <th className="text-right py-2 px-2">Actual</th>
                        <th className="text-right py-2 px-2">Diff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myRoster.starters.map((playerId: string, idx: number) => {
                        const player = players[playerId];
                        if (!player) return null;
                        
                        const projected = projections[playerId]?.pts_half_ppr || 0;
                        const myMatchup = matchups.find(m => m.roster_id === myRoster.roster_id);
                        const actual = (myMatchup?.players_points?.[playerId] || 0);
                        const diff = actual - projected;
                        
                        return (
                          <tr key={idx} className="border-b border-gray-800 hover:bg-white/5">
                            <td className="py-2 px-2 font-semibold">
                              {player.first_name} {player.last_name}
                            </td>
                            <td className="py-2 px-2 text-gray-400">{player.position}</td>
                            <td className="py-2 px-2 text-right text-purple-300">
                              {projected > 0 ? projected.toFixed(1) : '-'}
                            </td>
                            <td className="py-2 px-2 text-right font-bold">
                              {actual > 0 ? actual.toFixed(1) : '0.0'}
                            </td>
                            <td className={`py-2 px-2 text-right font-bold ${
                              diff > 0 ? 'text-green-400' : 
                              diff < 0 ? 'text-red-400' : 
                              'text-gray-400'
                            }`}>
                              {projected > 0 ? (diff >= 0 ? '+' : '') + diff.toFixed(1) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-gray-600">
                      <tr className="font-bold">
                        <td className="py-2 px-2" colSpan={2}>TOTAL</td>
                        <td className="py-2 px-2 text-right text-purple-300">
                          {myRoster.starters.reduce((sum: number, playerId: string) => 
                            sum + (projections[playerId]?.pts_half_ppr || 0), 0
                          ).toFixed(1)}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {(() => {
                            const myMatchup = matchups.find(m => m.roster_id === myRoster.roster_id);
                            return (myMatchup?.points || 0).toFixed(1);
                          })()}
                        </td>
                        <td className={`py-2 px-2 text-right ${
                          (() => {
                            const myMatchup = matchups.find(m => m.roster_id === myRoster.roster_id);
                            const totalProjected = myRoster.starters.reduce((sum: number, playerId: string) => 
                              sum + (projections[playerId]?.pts_half_ppr || 0), 0
                            );
                            const totalActual = myMatchup?.points || 0;
                            const totalDiff = totalActual - totalProjected;
                            return totalDiff > 0 ? 'text-green-400' : 
                                   totalDiff < 0 ? 'text-red-400' : 
                                   'text-gray-400';
                          })()
                        }`}>
                          {(() => {
                            const myMatchup = matchups.find(m => m.roster_id === myRoster.roster_id);
                            const totalProjected = myRoster.starters.reduce((sum: number, playerId: string) => 
                              sum + (projections[playerId]?.pts_half_ppr || 0), 0
                            );
                            const totalActual = myMatchup?.points || 0;
                            const totalDiff = totalActual - totalProjected;
                            return totalDiff > 0 ? '+' + totalDiff.toFixed(1) : totalDiff.toFixed(1);
                          })()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* NEW: Benched Points Section */}
            {myRoster && matchups && matchups.length > 0 && (
              <div className="bg-black/40 border border-orange-500/30 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-orange-400">
                  <XCircle className="w-5 h-5" />
                  Points Left on Bench (Week {nflState?.week})
                </h3>
                <div className="space-y-2">
                  {(() => {
                    const myMatchup = matchups.find(m => m.roster_id === myRoster.roster_id);
                    const benchPlayers = myRoster.players.filter(
                      (playerId: string) => !myRoster.starters.includes(playerId)
                    );
                    
                    const benchWithPoints = benchPlayers
                      .map((playerId: string) => ({
                        player: players[playerId],
                        points: myMatchup?.players_points?.[playerId] || 0,
                        playerId
                      }))
                      .filter((item: any) => item.player)
                      .sort((a: any, b: any) => b.points - a.points);
                    
                    const totalBenchedPoints = benchWithPoints.reduce(
                      (sum: number, item: any) => sum + item.points, 0
                    );
                    
                    if (benchWithPoints.length === 0) {
                      return (
                        <p className="text-gray-400 text-center py-4">
                          No bench players with points this week
                        </p>
                      );
                    }
                    
                    return (
                      <>
                        {benchWithPoints.map((item: any, idx: number) => (
                          <div 
                            key={idx}
                            className={`rounded-lg p-3 border ${
                              item.points >= 10 ? 'bg-orange-500/10 border-orange-500/50' :
                              item.points >= 5 ? 'bg-yellow-500/10 border-yellow-500/50' :
                              'bg-gray-500/10 border-gray-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold">
                                  {item.player.first_name} {item.player.last_name}
                                </p>
                                <p className="text-sm text-gray-400">
                                  {item.player.position} • {item.player.team || 'FA'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className={`text-lg font-bold ${
                                  item.points >= 10 ? 'text-orange-400' :
                                  item.points >= 5 ? 'text-yellow-400' :
                                  'text-gray-400'
                                }`}>
                                  {item.points.toFixed(1)} pts
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="mt-4 p-4 bg-orange-500/20 border border-orange-500 rounded-lg">
                          <div className="flex items-center justify-between">
                            <p className="font-bold text-lg">Total Points Benched:</p>
                            <p className="font-bold text-2xl text-orange-400">
                              {totalBenchedPoints.toFixed(1)} pts
                            </p>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
            
            {/* Current Starters */}
            <div className="bg-black/40 border border-blue-500/30 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-400">
                <Users className="w-5 h-5" />
                Your Current Starters (Week {nflState?.week})
              </h3>
              <div className="space-y-2">
                {myRoster?.starters?.map((playerId: string, idx: number) => {
                  const player = players[playerId];
                  if (!player) return (
                    <div key={idx} className="bg-white/5 rounded-lg p-3">
                      <p className="text-gray-500">Position Slot {idx + 1}</p>
                    </div>
                  );
                  
                  const hasInjury = player.injury_status && player.injury_status !== 'Healthy';
                  const isInactive = player.status === 'Inactive' || player.status === 'Injured Reserve';
                  
                  return (
                    <div 
                      key={idx} 
                      className={`rounded-lg p-3 border ${
                        isInactive ? 'bg-red-500/10 border-red-500/50' :
                        hasInjury ? 'bg-yellow-500/10 border-yellow-500/50' :
                        'bg-green-500/10 border-green-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">
                            {player.first_name} {player.last_name}
                          </p>
                          <p className="text-sm text-gray-400">
                            {player.position} • {player.team || 'FA'}
                          </p>
                        </div>
                        <div className="text-right">
                          {isInactive && (
                            <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                              INACTIVE
                            </span>
                          )}
                          {!isInactive && hasInjury && (
                            <span className="px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded">
                              {player.injury_status}
                            </span>
                          )}
                          {!isInactive && !hasInjury && (
                            <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded">
                              ACTIVE
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        {/* Survival Mode Tab */}
        {activeTab === 'survival' && survivalAnalysis && (
          <div className="space-y-6">
            {/* NFL Game Status */}
            {(() => {
              const gameStatus = getGameStatus();
              if (gameStatus) {
                return (
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Week {nflState.week} NFL Games
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-green-500/20 border border-green-500 rounded p-3">
                        <p className="text-sm text-gray-400">Complete</p>
                        <p className="text-2xl font-bold text-green-400">{gameStatus.complete}</p>
                      </div>
                      <div className="bg-yellow-500/20 border border-yellow-500 rounded p-3">
                        <p className="text-sm text-gray-400">In Progress</p>
                        <p className="text-2xl font-bold text-yellow-400">{gameStatus.inProgress}</p>
                      </div>
                      <div className="bg-gray-500/20 border border-gray-500 rounded p-3">
                        <p className="text-sm text-gray-400">Not Started</p>
                        <p className="text-2xl font-bold text-gray-400">{gameStatus.notStarted}</p>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {gameStatus.games.map((game: any) => {
                        const details = getGameDetails(game);
                        if (!details) return null;
                        
                        return (
                          <div key={game.game_id} className={`p-3 rounded-lg border ${
                            game.status === 'complete' ? 'bg-green-900/20 border-green-500/30' :
                            game.status === 'in_progress' ? 'bg-yellow-900/20 border-yellow-500/30' :
                            'bg-gray-900/20 border-gray-500/30'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-base">
                                {details.awayTeam} @ {details.homeTeam}
                              </span>
                              <span className={`px-3 py-1 rounded text-xs font-bold ${
                                game.status === 'complete' ? 'bg-green-500/40 text-green-200' :
                                game.status === 'in_progress' ? 'bg-yellow-500/40 text-yellow-200 animate-pulse' :
                                'bg-gray-500/40 text-gray-200'
                              }`}>
                                {game.status === 'complete' ? '✓ FINAL' :
                                 game.status === 'in_progress' ? '▶ LIVE' :
                                 'UPCOMING'}
                              </span>
                            </div>
                            
                            {/* Game details based on status */}
                            {game.status === 'pre_game' && (
                              <div className="text-sm text-gray-400 space-y-1">
                                <p>📅 {details.dayName}</p>
                                <p>🕐 {details.startTime}</p>
                                <p className="text-xs text-gray-500">Check back for live updates</p>
                              </div>
                            )}
                            
                            {game.status === 'in_progress' && (
                              <div className="text-sm text-yellow-300">
                                <p>⚡ Game in progress - scores updating...</p>
                                <p className="text-xs text-gray-400 mt-1">Refresh page for latest</p>
                              </div>
                            )}
                            
                            {game.status === 'complete' && (
                              <div className="text-sm text-green-300">
                                <p>✓ Game finished</p>
                                <p className="text-xs text-gray-400">All player scores final</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            
            {/* Real-Time Elimination Tracker */}
            <div className={`border-2 rounded-lg p-6 ${
              survivalAnalysis.riskLevel === 'CRITICAL' ? 'bg-red-500/20 border-red-500 animate-pulse' :
              survivalAnalysis.riskLevel === 'HIGH' ? 'bg-orange-500/20 border-orange-500' :
              survivalAnalysis.riskLevel === 'MEDIUM' ? 'bg-yellow-500/20 border-yellow-500' :
              'bg-green-500/20 border-green-500'
            }`}>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Zap className="w-6 h-6" />
                Elimination Risk: {survivalAnalysis.riskLevel}
              </h2>
              <p className="text-lg mb-4">{survivalAnalysis.riskMessage}</p>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-black/40 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm">Your Position</p>
                  <p className="text-3xl font-bold">{survivalAnalysis.myPositionThisWeek}</p>
                  <p className="text-gray-400 text-xs">of {survivalAnalysis.totalTeams}</p>
                </div>
                <div className="bg-black/40 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm">Your Score</p>
                  <p className="text-3xl font-bold">{survivalAnalysis.myActualScore.toFixed(2)}</p>
                  {survivalAnalysis.isUsingHybrid && survivalAnalysis.myHybridScore !== survivalAnalysis.myActualScore && (
                    <p className="text-sm text-purple-400 mt-1">
                      ({survivalAnalysis.myHybridScore.toFixed(2)} projected)
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {survivalAnalysis.isUsingHybrid ? 'Actual (w/ projections)' : 'Final'}
                  </p>
                </div>
                <div className="bg-black/40 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm">Margin</p>
                  <p className={`text-3xl font-bold ${
                    survivalAnalysis.marginFromElimination > 10 ? 'text-green-400' :
                    survivalAnalysis.marginFromElimination > 5 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    +{survivalAnalysis.marginFromElimination.toFixed(2)}
                  </p>
                </div>
              </div>
              
              {survivalAnalysis.riskLevel === 'CRITICAL' && (
                <div className="bg-red-500/20 border border-red-500 rounded-lg p-4">
                  <p className="font-bold text-red-400 mb-2">⚠️ EMERGENCY ACTIONS REQUIRED:</p>
                  <ul className="text-sm space-y-1 text-gray-300">
                    <li>• Check if you have any players left to play</li>
                    <li>• If yes, consider highest ceiling options over safe floors</li>
                    <li>• Monitor other low scorers - they may pass you</li>
                    <li>• Prepare roster moves for next week immediately</li>
                  </ul>
                </div>
              )}
            </div>
            
            {/* Weekly Scoreboard - FIXED: Shows high to low (best to worst) - ONLY ACTIVE TEAMS */}
            <div className="bg-black/40 border border-purple-500/30 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                {survivalAnalysis.isUsingHybrid ? '⚡' : '📊'} Week {nflState?.week} Scoreboard - CHOP WATCH
                {survivalAnalysis.isUsingHybrid && (
                  <span className="text-xs bg-blue-500/20 px-2 py-1 rounded text-blue-300">
                    LIVE: {survivalAnalysis.playersStarted} started, {survivalAnalysis.playersNotStarted} projected
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                📊 {survivalAnalysis.totalTeams} Teams Alive (Ranked Best to Worst) • 
                #{survivalAnalysis.totalTeams} = CHOPPED
                {survivalAnalysis.eliminatedCount > 0 && (
                  <span className="ml-2">• 
                    <span className="text-red-400 font-bold"> {survivalAnalysis.eliminatedCount} Already Eliminated</span>
                  </span>
                )}
                {survivalAnalysis.isUsingHybrid && (
                  <span className="ml-2 text-blue-300">• 
                    <span className="font-bold">⚡ Live Scoring</span> (actual + projected)
                  </span>
                )}
              </p>
              <div className="space-y-2">
                {survivalAnalysis.scores
                  .filter(score => score && !eliminatedTeams.includes(score.rosterId)) // FILTER OUT ELIMINATED TEAMS
                  .map((score, idx) => {
                  if (!score) return null;
                  const isMyTeam = score.rosterId === myRoster.roster_id;
                  const isLowest = idx === survivalAnalysis.scores.length - 1; // FIXED: Last position is worst
                  const isTop3 = idx < 3; // Top 3 positions are safe
                  const isDangerZone = idx >= survivalAnalysis.scores.length - 3; // Bottom 3 are in danger
                  
                  return (
                    <div 
                      key={idx}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isLowest ? 'bg-red-500/20 border-red-500 animate-pulse' :
                        isDangerZone ? 'bg-orange-500/10 border-orange-500/50' :
                        isMyTeam ? 'bg-green-500/20 border-green-500' :
                        isTop3 ? 'bg-blue-500/10 border-blue-500/30' :
                        'bg-white/5 border-purple-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`font-bold w-8 text-center ${
                          isLowest ? 'text-red-400' :
                          isDangerZone ? 'text-orange-400' :
                          isTop3 ? 'text-green-400' :
                          'text-gray-400'
                        }`}>
                          #{idx + 1}
                        </span>
                        <div>
                          <p className={`font-semibold ${isMyTeam ? 'text-green-400' : ''}`}>
                            {score.teamName}
                          </p>
                          {isLowest && (
                            <p className="text-xs text-red-400">� CHOP ZONE - GETTING ELIMINATED!</p>
                          )}
                          {isDangerZone && !isLowest && (
                            <p className="text-xs text-orange-400">⚠️ Danger Zone</p>
                          )}
                          {isTop3 && (
                            <p className="text-xs text-green-400">✅ Safe Zone</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-4">
                          {/* Player breakdown */}
                          {score.isHybrid && (score.playersNotStarted > 0 || score.playersStarted > 0) && (
                            <div className="text-right text-xs">
                              {score.playersStarted > 0 && (
                                <p className="text-green-400">✓ {score.playersStarted} playing</p>
                              )}
                              {score.playersNotStarted > 0 && (
                                <p className="text-blue-400">◷ {score.playersNotStarted} upcoming</p>
                              )}
                            </div>
                          )}
                          
                          {/* Main score display: Actual (big) with Projected (small) underneath */}
                          <div className="text-right">
                            <p className="text-2xl font-bold">{score.actualPoints?.toFixed(2) || score.points.toFixed(2)}</p>
                            {score.hybridScore && score.hybridScore !== score.actualPoints && (
                              <p className="text-sm text-purple-400">
                                ({score.hybridScore.toFixed(2)} projected)
                              </p>
                            )}
                            <p className="text-xs text-gray-400">
                              {score.isHybrid ? 'Hybrid Score' : 'Actual'}
                            </p>
                          </div>
                        </div>
                        
                        {!isLowest && (
                          <p className="text-xs text-gray-400 mt-1">
                            +{(score.points - survivalAnalysis.lowestScore).toFixed(2)} safe
                          </p>
                        )}
                        {isLowest && (
                          <p className="text-xs text-red-400">LOWEST SCORE</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Eliminated Teams Section */}
            {eliminatedTeams.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4 text-red-400 flex items-center gap-2">
                  <XCircle className="w-6 h-6" />
                  🪦 CHOPPED - Eliminated Teams ({eliminatedTeams.length})
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  These teams have been officially eliminated from the survival league
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {eliminatedTeams.map((rosterId) => {
                    const roster = rosters.find(r => r.roster_id === rosterId);
                    const teamName = getTeamNameByRosterId(rosterId);
                    return (
                      <div 
                        key={rosterId}
                        className="bg-black/40 border border-red-500/30 rounded-lg p-4 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-gray-300">{teamName}</p>
                          <p className="text-xs text-gray-500">Roster ID: {rosterId}</p>
                          {roster && (
                            <p className="text-xs text-gray-500">
                              Record: {roster.settings?.wins || 0}-{roster.settings?.losses || 0}
                            </p>
                          )}
                        </div>
                        <div className="text-red-400 text-2xl">☠️</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Standings Tab */}
        {activeTab === 'standings' && (
          <div className="bg-black/40 border border-purple-500/30 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-purple-500/30">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Trophy className="w-6 h-6" />
                League Standings
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-purple-500/10">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Rank</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Team</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Record</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">PF</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">PA</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">PPG</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((roster, idx) => {
                    const isMyTeam = roster.roster_id === myRoster?.roster_id;
                    const gamesPlayed = roster.settings.wins + roster.settings.losses;
                    const ppg = gamesPlayed > 0 ? ((roster.settings.fpts || 0) / gamesPlayed).toFixed(2) : '0.00';
                    
                    return (
                      <tr 
                        key={roster.roster_id}
                        className={`border-t border-purple-500/20 ${
                          isMyTeam ? 'bg-green-500/10' : 'hover:bg-white/5'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span className={`font-bold ${
                            idx === 0 ? 'text-yellow-400' :
                            idx === 1 ? 'text-gray-300' :
                            idx === 2 ? 'text-orange-400' :
                            'text-gray-400'
                          }`}>
                            #{idx + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className={`font-semibold ${isMyTeam ? 'text-green-400' : ''}`}>
                              {roster.teamName}
                            </p>
                            <p className="text-xs text-gray-500">{roster.user?.username}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-mono">
                          {roster.settings.wins}-{roster.settings.losses}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {roster.settings.fpts || 0}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {roster.settings.fpts_against || 0}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {ppg}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="bg-black/30 border-t border-purple-500/30 mt-8 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 text-sm">
          <p>Advanced Analytics Powered by Sleeper API • {TEAM_NAME} • Week {nflState?.week}</p>
          <p className="mt-2">🏆 Survival Mode Active: Stay sharp, stay alive 🏆</p>
        </div>
      </div>
    </div>
  );
};

export default SleeperFFHelper;
