// TypeScript types for GraphQL responses

export interface SleeperLeague {
  league_id: string;
  name: string;
  avatar?: string;
  sport: string;
  season: string;
  season_type: string;
  status: string;
  settings: Record<string, any>;
  scoring_settings: Record<string, number>;
  roster_positions: string[];
  total_rosters: number;
  metadata?: Record<string, any>;
}

export interface RosterSettings {
  wins: number;
  losses: number;
  ties: number;
  fpts: number;
  fpts_decimal: number;
  fpts_against: number;
  fpts_against_decimal: number;
}

export interface SleeperRoster {
  roster_id: number;
  league_id: string;
  owner_id: string;
  players: string[];
  starters: string[];
  reserve?: string[];
  taxi?: string[];
  settings: RosterSettings;
  metadata?: Record<string, any>;
}

export interface LeagueUser {
  user_id: string;
  display_name: string;
  avatar?: string;
  metadata?: Record<string, any>;
  is_owner?: boolean;
  is_bot?: boolean;
}

export interface RosterStanding {
  roster_id: number;
  rank: number;
  wins: number;
  losses: number;
  ties: number;
  points_for: number;
  points_against: number;
  total_moves: number;
}

export interface MatchupLeg {
  matchup_id: number;
  roster_id: number;
  points: number;
  custom_points?: number;
  players_points: Record<string, number>;
  starters_points?: number[];
}

export interface LeagueTransaction {
  transaction_id: string;
  type: string;
  status: string;
  roster_ids: number[];
  consenter_ids?: number[];
  settings?: {
    waiver_bid?: number;
  };
  metadata?: Record<string, any>;
  leg: number;
  created: number;
  creator: string;
  adds?: Record<string, number>;
  drops?: Record<string, number>;
  draft_picks?: Array<{
    season: string;
    round: number;
    roster_id: number;
    previous_owner_id?: number;
    owner_id: number;
  }>;
}

export interface LeaguePlayer {
  player_id: string;
  metadata?: Record<string, any>;
}

export interface Draft {
  draft_id: string;
  type: string;
  status: string;
  sport: string;
  season: string;
  season_type: string;
  settings: Record<string, any>;
  metadata?: Record<string, any>;
  start_time?: number;
  draft_order?: Record<string, number>;
  slot_to_roster_id?: Record<string, number>;
  created: number;
  last_picked?: number;
}

export interface Friend {
  user_id: string;
  display_name: string;
  avatar?: string;
  created: number;
}

export interface SleeperUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar?: string;
  created: number;
  metadata?: Record<string, any>;
}

export interface DraftPick {
  season: string;
  round: number;
  roster_id: number;
  previous_owner_id?: number;
  owner_id: number;
}

// Response types for queries
export interface MyLeaguesResponse {
  my_leagues: SleeperLeague[];
}

export interface UserRostersResponse {
  user_rosters: SleeperRoster[];
}

export interface RostersByUserResponse {
  rosters_by_user: SleeperRoster[];
}

export interface LeagueUsersResponse {
  league_users: LeagueUser[];
}

export interface RosterStandingsResponse {
  roster_standings: RosterStanding[];
}

export interface MatchupLegsResponse {
  matchup_legs: MatchupLeg[];
}

export interface LeagueTransactionsResponse {
  league_transactions: LeagueTransaction[];
}

export interface LeaguePlayersResponse {
  league_players: LeaguePlayer[];
}

export interface DraftsByLeagueResponse {
  drafts_by_league_id: Draft[];
}

export interface MyFriendsResponse {
  my_friends: Friend[];
}

export interface UserByIdentifierResponse {
  user_by_email_phone_or_username: SleeperUser;
}

export interface RosterDraftPicksResponse {
  roster_draft_picks: DraftPick[];
}
