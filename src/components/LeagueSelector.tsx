// League selector component for choosing which league to analyze

import { useState, useEffect } from 'react';
import { query } from '../graphql/client';
import { MY_LEAGUES_QUERY } from '../graphql/queries';
import { MyLeaguesResponse, SleeperLeague } from '../graphql/types';

interface LeagueSelectorProps {
  selectedLeagueId: string | null;
  onSelectLeague: (leagueId: string) => void;
}

export default function LeagueSelector({ selectedLeagueId, onSelectLeague }: LeagueSelectorProps) {
  const [leagues, setLeagues] = useState<SleeperLeague[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLeagues();
  }, []);

  const loadLeagues = async () => {
    try {
      setLoading(true);
      const data = await query<MyLeaguesResponse>(MY_LEAGUES_QUERY);
      setLeagues(data.my_leagues || []);

      // Auto-select first league if none selected
      if (!selectedLeagueId && data.my_leagues && data.my_leagues.length > 0) {
        onSelectLeague(data.my_leagues[0].league_id);
      }
    } catch (err) {
      console.error('Failed to load leagues:', err);
      setError('Failed to load leagues. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg">
        <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm text-gray-400">Loading leagues...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
        <p className="text-sm text-red-300">{error}</p>
      </div>
    );
  }

  if (leagues.length === 0) {
    return (
      <div className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <p className="text-sm text-yellow-300">No leagues found</p>
      </div>
    );
  }

  const selectedLeague = leagues.find(l => l.league_id === selectedLeagueId);

  return (
    <div className="relative">
      <label htmlFor="league-select" className="block text-sm font-medium text-gray-400 mb-1">
        Select League
      </label>
      <select
        id="league-select"
        value={selectedLeagueId || ''}
        onChange={(e) => onSelectLeague(e.target.value)}
        className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none cursor-pointer"
      >
        {leagues.map((league) => (
          <option key={league.league_id} value={league.league_id}>
            {league.name} ({league.season} {league.season_type})
          </option>
        ))}
      </select>

      {selectedLeague && (
        <div className="mt-2 px-3 py-2 bg-gray-800/30 rounded-lg text-xs text-gray-400">
          <div className="flex justify-between">
            <span>Sport: {selectedLeague.sport.toUpperCase()}</span>
            <span>Teams: {selectedLeague.total_rosters}</span>
            <span>Status: <span className={selectedLeague.status === 'in_season' ? 'text-green-400' : 'text-gray-500'}>{selectedLeague.status}</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
