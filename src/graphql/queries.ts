// GraphQL query definitions for Sleeper API

/**
 * Get all leagues for the authenticated user
 */
export const MY_LEAGUES_QUERY = `
  query MyLeagues {
    my_leagues {
      league_id
      name
      avatar
      sport
      season
      season_type
      status
      settings
      scoring_settings
      roster_positions
      total_rosters
      metadata
    }
  }
`;

/**
 * Get current authenticated user
 */
export const ME_QUERY = `
  query Me {
    me {
      user_id
      username
      display_name
      avatar
      created
      metadata
    }
  }
`;

/**
 * Get user rosters across all leagues
 */
export const USER_ROSTERS_QUERY = `
  query UserRosters {
    user_rosters {
      roster_id
      league_id
      owner_id
      players
      starters
      reserve
      taxi
      settings
      metadata
    }
  }
`;

/**
 * Get rosters by specific user ID
 */
export const ROSTERS_BY_USER_QUERY = `
  query RostersByUser($userId: Snowflake!) {
    rosters_by_user(user_id: $userId) {
      roster_id
      league_id
      owner_id
      players
      starters
      reserve
      taxi
      settings
      metadata
    }
  }
`;

/**
 * Get league users
 */
export const LEAGUE_USERS_QUERY = `
  query LeagueUsers($leagueId: Snowflake!) {
    league_users(league_id: $leagueId) {
      user_id
      display_name
      avatar
      metadata
      is_owner
      is_bot
    }
  }
`;

/**
 * Get roster standings
 */
export const ROSTER_STANDINGS_QUERY = `
  query RosterStandings($leagueId: Snowflake!, $round: Int!) {
    roster_standings(league_id: $leagueId, round: $round) {
      roster_id
      rank
      wins
      losses
      ties
      points_for
      points_against
      total_moves
    }
  }
`;

/**
 * Get matchup legs (matchup data)
 */
export const MATCHUP_LEGS_QUERY = `
  query MatchupLegs($leagueId: Snowflake!, $round: Int!) {
    matchup_legs(league_id: $leagueId, round: $round) {
      matchup_id
      roster_id
      points
      custom_points
      players_points
      starters_points
    }
  }
`;

/**
 * Get matchup legs raw (faster, without full context)
 */
export const MATCHUP_LEGS_RAW_QUERY = `
  query MatchupLegsRaw($leagueId: Snowflake!, $round: Int!) {
    matchup_legs_raw(league_id: $leagueId, round: $round) {
      matchup_id
      roster_id
      points
      players_points
    }
  }
`;

/**
 * Get rosters for a league (GraphQL equivalent to /league/{id}/rosters)
 */
export const LEAGUE_ROSTERS_QUERY = `
  query LeagueRosters($leagueId: Snowflake!) {
    league_rosters(league_id: $leagueId) {
      roster_id
      league_id
      owner_id
      players
      starters
      reserve
      taxi
      settings
      metadata
    }
  }
`;

/**
 * Get league details with settings metadata
 */
export const LEAGUE_DETAILS_QUERY = `
  query LeagueDetails($leagueId: Snowflake!) {
    get_league(league_id: $leagueId) {
      league_id
      name
      avatar
      sport
      season
      season_type
      status
      total_rosters
      roster_positions
      settings
      metadata
      scoring_settings
    }
  }
`;

/**
 * Get high-level sport info (includes week/season)
 */
export const SPORT_INFO_QUERY = `
  query SportInfo($sport: String!) {
    sport_info(sport: $sport)
  }
`;

/**
 * Fetch full play-by-play for a specific NFL game
 */
export const PLAYS_BY_GAME_QUERY = `
  query PlaysByGame(
    $sport: String!
    $season: String!
    $season_type: String!
    $gameId: String!
  ) {
    plays(
      sport: $sport
      season: $season
      season_type: $season_type
      game_id: $gameId
    ) {
      game_id
      play_id
      sequence
      date
      metadata
      play_stats {
        player_id
        stats
        player
      }
    }
  }
`;

/**
 * Fetch active players for a sport
 */
export const ACTIVE_PLAYERS_QUERY = `
  query ActivePlayers($sport: String!) {
    get_active_players(sport: $sport) {
      player_id
      first_name
      last_name
      position
      team
      team_abbr
      status
      active
      injury_status
      injury_notes
      injury_start_date
      practice_participation
      practice_description
      depth_chart_order
      depth_chart_position
      fantasy_positions
      years_exp
      number
      age
      metadata
    }
  }
`;

/**
 * Filtered league transactions (more control than basic query)
 */
export const LEAGUE_TRANSACTIONS_FILTERED_QUERY = `
  query LeagueTransactionsFiltered(
    $leagueId: Snowflake!
    $limit: Int
    $typeFilters: [String]
    $statusFilters: [String]
    $legFilters: [Int]
    $rosterIdFilters: [Int]
  ) {
    league_transactions_filtered(
      league_id: $leagueId
      limit: $limit
      type_filters: $typeFilters
      status_filters: $statusFilters
      leg_filters: $legFilters
      roster_id_filters: $rosterIdFilters
    ) {
      transaction_id
      type
      status
      roster_ids
      consenter_ids
      settings
      metadata
      leg
      created
      creator
      adds
      drops
      draft_picks
    }
  }
`;

/**
 * Scores for a given week/season
 */
export const SCORES_QUERY = `
  query Scores($season: String!, $seasonType: String!, $sport: String!, $week: Int) {
    scores(season: $season, season_type: $seasonType, sport: $sport, week: $week) {
      game_id
      season
      season_type
      week
      status
      start_time
      away_team
      home_team
      away_points
      home_points
    }
  }
`;

/**
 * Stats for specific players in a week
 */
export const STATS_FOR_PLAYERS_IN_WEEK_QUERY = `
  query StatsForPlayersInWeek(
    $category: String!
    $week: Int!
    $season: String!
    $seasonType: String!
    $sport: String!
    $playerIds: [String]
  ) {
    stats_for_players_in_week(
      category: $category
      week: $week
      season: $season
      season_type: $seasonType
      sport: $sport
      player_ids: $playerIds
    ) {
      player_id
      game_id
      stats
    }
  }
`;

/**
 * Get league transactions
 */
export const LEAGUE_TRANSACTIONS_QUERY = `
  query LeagueTransactions($leagueId: Snowflake!, $round: Int!) {
    league_transactions(league_id: $leagueId, round: $round) {
      transaction_id
      type
      status
      roster_ids
      consenter_ids
      settings
      metadata
      leg
      created
      creator
      adds
      drops
      draft_picks
    }
  }
`;

/**
 * Get league players (players with metadata in league)
 */
export const LEAGUE_PLAYERS_QUERY = `
  query LeaguePlayers($leagueId: Snowflake!) {
    league_players(league_id: $leagueId) {
      player_id
      metadata
    }
  }
`;

/**
 * Get league playoff bracket
 */
export const LEAGUE_PLAYOFF_BRACKET_QUERY = `
  query LeaguePlayoffBracket($leagueId: Snowflake!) {
    league_playoff_bracket(league_id: $leagueId)
  }
`;

/**
 * Get drafts by league ID
 */
export const DRAFTS_BY_LEAGUE_QUERY = `
  query DraftsByLeague($leagueId: Snowflake!) {
    drafts_by_league_id(league_id: $leagueId) {
      draft_id
      type
      status
      sport
      season
      season_type
      settings
      metadata
      start_time
      draft_order
      slot_to_roster_id
      created
      last_picked
    }
  }
`;

/**
 * Get user's friends
 */
export const MY_FRIENDS_QUERY = `
  query MyFriends {
    my_friends {
      user_id
      display_name
      avatar
      created
    }
  }
`;

/**
 * Get user by username, email, or phone
 */
export const USER_BY_IDENTIFIER_QUERY = `
  query UserByIdentifier($identifier: String!) {
    user_by_email_phone_or_username(identifier: $identifier) {
      user_id
      username
      display_name
      avatar
      created
      metadata
    }
  }
`;

/**
 * Get roster draft picks
 */
export const ROSTER_DRAFT_PICKS_QUERY = `
  query RosterDraftPicks($leagueId: Snowflake!) {
    roster_draft_picks(league_id: $leagueId) {
      season
      round
      roster_id
      previous_owner_id
      owner_id
    }
  }
`;
