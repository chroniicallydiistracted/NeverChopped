import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Trophy, Calendar, AlertCircle, RefreshCw, BarChart3, Target, Award, Activity, UserPlus, Zap, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const SleeperFFHelper = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshing, setRefreshing] = useState(false);
  
  // Core data stat.log has the data you need
  
  const [leagueData, setLeagueData] = useState(null);
  const [rosters, setRosters] = useState([]);
  const [users, setUsers] = useState([]);
  const [myRoster, setMyRoster] = useState(null);
  const [matchups, setMatchups] = useState([]);
  const [nflState, setNflState] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [players, setPlayers] = useState({});
  const [trendingAdds, setTrendingAdds] = useState([]);
  const [trendingDrops, setTrendingDrops] = useState([]);
  
  // User config
  const USER_ID = '1268309493943373825';
  const LEAGUE_ID = '1265326608424648704';
  const USERNAME = 'CHRONiiC';
  const TEAM_NAME = 'Gods Gift to Girth';
  
  // Fetch all data
  const fetchAllData = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      // Fetch NFL state first
      const nflStateRes = await fetch('https://api.sleeper.app/v1/state/nfl');
      const nflStateData = await nflStateRes.json();
      setNflState(nflStateData);
      
      // Fetch all players (this is a large file)
      const playersRes = await fetch('https://api.sleeper.app/v1/players/nfl');
      const playersData = await playersRes.json();
      setPlayers(playersData);
      
      // Fetch trending players
      const trendingAddsRes = await fetch('https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours=24&limit=50');
      const trendingAddsData = await trendingAddsRes.json();
      setTrendingAdds(trendingAddsData);
      
      const trendingDropsRes = await fetch('https://api.sleeper.app/v1/players/nfl/trending/drop?lookback_hours=24&limit=50');
      const trendingDropsData = await trendingDropsRes.json();
      setTrendingDrops(trendingDropsData);
      
      // Fetch league data
      const leagueRes = await fetch(`https://api.sleeper.app/v1/league/${LEAGUE_ID}`);
      const leagueDataRes = await leagueRes.json();
      setLeagueData(leagueDataRes);
      
      // Fetch rosters
      const rostersRes = await fetch(`https://api.sleeper.app/v1/league/${LEAGUE_ID}/rosters`);
      const rostersData = await rostersRes.json();
      setRosters(rostersData);
      
      // Find my roster
      const myRosterData = rostersData.find(r => r.owner_id === USER_ID);
      setMyRoster(myRosterData);
      
      // Fetch users
      const usersRes = await fetch(`https://api.sleeper.app/v1/league/${LEAGUE_ID}/users`);
      const usersData = await usersRes.json();
      setUsers(usersData);
      
      // Fetch current week matchups
      if (nflStateData.week) {
        const matchupsRes = await fetch(`https://api.sleeper.app/v1/league/${LEAGUE_ID}/matchups/${nflStateData.week}`);
        const matchupsData = await matchupsRes.json();
        setMatchups(matchupsData);
      }
      
      // Fetch recent transactions
      if (nflStateData.week) {
        const transRes = await fetch(`https://api.sleeper.app/v1/league/${LEAGUE_ID}/transactions/${nflStateData.week}`);
        const transData = await transRes.json();
        setTransactions(transData || []);
      }
      
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      setError('Failed to fetch data: ' + err.message);
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    fetchAllData();
  }, []);
  
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
    
    // Check for injured or inactive starters
    starters.forEach(playerId => {
      const player = players[playerId];
      if (player) {
        if (player.injury_status && player.injury_status !== 'Healthy') {
          recommendations.push({
            type: 'INJURY_ALERT',
            player: player,
            playerId: playerId,
            severity: player.injury_status === 'Out' ? 'CRITICAL' : 'WARNING',
            message: `${player.first_name} ${player.last_name} (${player.position}) is ${player.injury_status}`,
            action: player.injury_status === 'Out' ? 'MUST SIT' : 'MONITOR CLOSELY'
          });
        }
        
        if (player.status === 'Inactive' || player.status === 'Injured Reserve') {
          recommendations.push({
            type: 'INACTIVE_ALERT',
            player: player,
            playerId: playerId,
            severity: 'CRITICAL',
            message: `${player.first_name} ${player.last_name} (${player.position}) is ${player.status}`,
            action: 'BENCH IMMEDIATELY'
          });
        }
      }
    });
    
    return recommendations;
  };
  
  const getSurvivalAnalysis = () => {
    if (!matchups.length || !myRoster) return null;
    
    const standings = getStandings();
    const myRank = getMyRank();
    const totalTeams = rosters.length;
    
    // Calculate current week scores
    const scores = matchups
      .map(m => ({
        rosterId: m.roster_id,
        points: m.points || 0,
        teamName: getTeamNameByRosterId(m.roster_id)
      }))
      .sort((a, b) => a.points - b.points);
    
    const lowestScore = scores[0];
    const myMatchup = matchups.find(m => m.roster_id === myRoster.roster_id);
    const myScore = myMatchup?.points || 0;
    
    // Calculate margin from elimination
    const marginFromElimination = myScore - lowestScore.points;
    const myPositionThisWeek = scores.findIndex(s => s.rosterId === myRoster.roster_id) + 1;
    
    // Risk assessment
    let riskLevel = 'LOW';
    let riskMessage = '';
    
    if (myPositionThisWeek === 1) {
      riskLevel = 'CRITICAL';
      riskMessage = 'YOU ARE CURRENTLY THE LOWEST SCORER! You will be eliminated if scores hold.';
    } else if (myPositionThisWeek <= 3) {
      riskLevel = 'HIGH';
      riskMessage = `You're ${myPositionThisWeek} of ${totalTeams}. Only ${marginFromElimination.toFixed(2)} points above elimination.`;
    } else if (myPositionThisWeek <= totalTeams / 2) {
      riskLevel = 'MEDIUM';
      riskMessage = `You're ${myPositionThisWeek} of ${totalTeams}. ${marginFromElimination.toFixed(2)} points above elimination. Stay alert.`;
    } else {
      riskLevel = 'LOW';
      riskMessage = `You're ${myPositionThisWeek} of ${totalTeams}. ${marginFromElimination.toFixed(2)} points above elimination. Looking safe.`;
    }
    
    return {
      riskLevel,
      riskMessage,
      myScore,
      lowestScore: lowestScore.points,
      lowestTeam: lowestScore.teamName,
      marginFromElimination,
      myPositionThisWeek,
      totalTeams,
      scores
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
            onClick={fetchAllData}
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
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <div className="bg-black/30 border-b border-purple-500/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                {TEAM_NAME}
              </h1>
              <p className="text-gray-400 mt-1">
                {leagueData?.name} • Week {nflState?.week} • Rank #{myRank}
              </p>
            </div>
            <button
              onClick={fetchAllData}
              disabled={refreshing}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>
      
      {/* Navigation Tabs */}
      <div className="bg-black/20 border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Activity },
              { id: 'waiver', label: 'Waiver Wire', icon: UserPlus },
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
                    <p className="text-gray-400 text-sm">Record</p>
                    <p className="text-3xl font-bold text-green-400">
                      {myRoster?.settings.wins}-{myRoster?.settings.losses}
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
                      {myRoster?.settings.wins + myRoster?.settings.losses > 0
                        ? ((myRoster?.settings.fpts || 0) / (myRoster.settings.wins + myRoster.settings.losses)).toFixed(1)
                        : '0.0'}
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
                        'bg-yellow-500/10 border-yellow-500'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {rec.severity === 'CRITICAL' ? (
                          <XCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className={`font-bold text-lg ${
                            rec.severity === 'CRITICAL' ? 'text-red-400' : 'text-yellow-400'
                          }`}>
                            {rec.message}
                          </p>
                          <p className="text-sm text-gray-300 mt-1">
                            <span className="font-semibold">Recommended Action:</span> {rec.action}
                          </p>
                          {rec.player && (
                            <div className="mt-2 p-2 bg-black/40 rounded">
                              <p className="text-xs text-gray-400">
                                Team: {rec.player.team || 'FA'} • 
                                Status: {rec.player.status || 'Unknown'}
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
            
            {/* Current Starters */}
            <div className="bg-black/40 border border-blue-500/30 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-400">
                <Users className="w-5 h-5" />
                Your Current Starters (Week {nflState?.week})
              </h3>
              <div className="space-y-2">
                {myRoster?.starters?.map((playerId, idx) => {
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
                  <p className="text-3xl font-bold">{survivalAnalysis.myScore.toFixed(2)}</p>
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
            
            {/* Weekly Scoreboard */}
            <div className="bg-black/40 border border-purple-500/30 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">Live Week {nflState?.week} Scoreboard</h3>
              <div className="space-y-2">
                {survivalAnalysis.scores.map((score, idx) => {
                  const isMyTeam = score.rosterId === myRoster.roster_id;
                  const isLowest = idx === 0;
                  
                  return (
                    <div 
                      key={idx}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isLowest ? 'bg-red-500/20 border-red-500 animate-pulse' :
                        isMyTeam ? 'bg-green-500/20 border-green-500' :
                        'bg-white/5 border-purple-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`font-bold w-8 text-center ${
                          isLowest ? 'text-red-400' :
                          idx < 3 ? 'text-orange-400' :
                          'text-gray-400'
                        }`}>
                          #{idx + 1}
                        </span>
                        <div>
                          <p className={`font-semibold ${isMyTeam ? 'text-green-400' : ''}`}>
                            {score.teamName}
                          </p>
                          {isLowest && (
                            <p className="text-xs text-red-400">🚨 ELIMINATION ZONE</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">{score.points.toFixed(2)}</p>
                        {idx > 0 && (
                          <p className="text-xs text-gray-400">
                            +{(score.points - survivalAnalysis.lowestScore).toFixed(2)} safe
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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