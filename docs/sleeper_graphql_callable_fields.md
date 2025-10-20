# Sleeper GraphQL — All callable root fields

_Generated: 2025-10-17T22:19:56.032574Z_

## Query root (219)

| Field | Arguments | Returns | Deprecated | Reason |
|---|---|---|---|---|
| `league_groups` | season: String!, season_type: String!, sport: String!, company_id: Snowflake! | `[LeagueGroup]` | no |  |
| `active_channel_topics` | limit: Int, channel_id: Snowflake! | `[Topic]` | no |  |
| `season_stats` | category: String!, order_by: String!, season: String!, season_type: String!, sport: String!, positions: [String] | `[Stat]` | no |  |
| `get_player` | sport: String!, player_id: String! | `Player` | no |  |
| `recently_contacted_friends` | — | `[Friend]` | no |  |
| `mentions` | before: Snowflake, unread: Boolean | `[Mention]` | no |  |
| `search_channel_bans` | prefix: String!, channel_id: Snowflake! | `[ChannelBan]` | no |  |
| `pushed_topics` | channel_id: Snowflake! | `[Topic]` | no |  |
| `matchup_legs` | round: Int!, league_id: Snowflake! | `[MatchupLeg]` | no |  |
| `reactions` | message_id: Snowflake!, parent_id: Snowflake!, reaction: String! | `[Reaction]` | no |  |
| `my_parlays` | offset: Int, limit: Int, league_id: Snowflake, include_pick_counts: Boolean, status_filter: [String] | `[Parlay]` | no |  |
| `roster_draft_picks` | season: String, league_id: Snowflake! | `[RosterDraftPick]` | no |  |
| `parlay` | parlay_id: Snowflake!, include_pick_counts: Boolean | `Parlay` | no |  |
| `my_friends` | limit: Int, after_username: String | `[Friend]` | no |  |
| `get_daily_draft_team` | team_id: Snowflake! | `DailyDraftTeam` | no |  |
| `blocked_users` | — | `[BlockedUser]` | no |  |
| `roles_by_type` | type_id: Snowflake! | `[Role]` | no |  |
| `league_dues_config` | league_id: Snowflake! | `LeagueDuesConfig` | no |  |
| `get_referral_promo_code` | — | `String` | no |  |
| `check_responsible_gaming_limits` | limits_to_test: [CheckResponsibleGamingLimitInput] | `List` | no |  |
| `league_transactions_filtered` | limit: Int, league_id: Snowflake!, type_filters: [String], status_filters: [String], leg_filters: [Int], roster_id_filters: [Int] | `[LeagueTransaction]` | no |  |
| `get_daily_draft_contest` | contest_id: Snowflake! | `DailyDraftContest` | no |  |
| `list_promo_claims_by_type` | user_id: Snowflake!, promo_type: String! | `[PromoClaim]` | no |  |
| `game_stats` | category: String!, order_by: String!, season: String!, season_type: String!, sport: String!, game_id: String!, positions: [String] | `[Stat]` | no |  |
| `league_rosters` | league_id: Snowflake! | `[Roster]` | no |  |
| `read_receipts` | parent_type: String!, parent_id: Snowflake! | `[ReadReceipt]` | no |  |
| `search_matchmaking_league_users` | size: Int, from: Int, league_id: Snowflake! | `[MatchmakingUser]` | no |  |
| `leagues_by_group` | limit: Int, group_id: Snowflake! | `[League]` | no |  |
| `create_read_receipt` | parent_type: String!, channel_id: Snowflake, message_id: Snowflake, topic_id: Snowflake, parent_id: Snowflake! | `Boolean` | no |  |
| `item_types` | — | `[ItemType]` | no |  |
| `weekly_meter_by_id` | league_id: Snowflake!, reward_tracker_id: Snowflake! | `FullRewardTracker` | no |  |
| `my_closed_positions` | offset: Int, limit: Int | `[Position]` | no |  |
| `user_by_email_phone_or_username` | email_or_phone_or_username: String! | `User` | no |  |
| `matchup_legs_raw` | round: Int!, league_id: Snowflake! | `[MatchupLeg]` | no |  |
| `promo_by_id` | promo_id: String! | `Promo` | no |  |
| `my_currency_transaction_by_reference` | reference_action: String, reference_id: String, reference_type: String | `CurrencyTransaction` | no |  |
| `find_friends` | my_contact_info: ContactInfo!, contact_infos: [ContactInfo] | `[DiscoveredContact]` | no |  |
| `list_all_active_promos` | — | `[Promo]` | no |  |
| `draft_offers` | sport: String!, draft_id: Snowflake!, pick_no: Int! | `[DraftOffer]` | no |  |
| `mark_mention_as_read` | message_id: Snowflake! | `Boolean` | no |  |
| `league_parlays` | offset: Int, limit: Int, league_id: Snowflake, include_pick_counts: Boolean, status_filter: [String], user_id_filter: [Snowflake], filter_self: Boolean | `[Parlay]` | no |  |
| `recommended_categorized_channels` | — | `List` | no |  |
| `my_winnings` | — | `Winnings` | no |  |
| `campaigns_by_email` | — | `[Map]` | no |  |
| `companies` | — | `[Company]` | no |  |
| `give_get_referral_claims` | — | `[Map]` | no |  |
| `download_cftc_monthly_statement` | month: Int!, year: Int! | `String` | no |  |
| `login_context_by_email_or_phone_or_username` | email_or_phone_or_username: String! | `Map` | no |  |
| `user_drafts` | before: Snowflake, season: String!, season_type: String!, sport: String! | `[UserDraft]` | no |  |
| `my_channel_bans` | ban_id: String! | `[ChannelBan]` | no |  |
| `my_profile` | — | `UserProfile` | no |  |
| `get_user_matchmaking_preferences` | — | `[MatchmakingUser]` | no |  |
| `tax_forms` | — | `Map` | no |  |
| `roster_draft_picks_by_draft` | draft_id: Snowflake! | `[RosterDraftPick]` | no |  |
| `user_roster` | user_id: Snowflake!, season: String!, season_type: String!, sport: String!, roster_id: Snowflake! | `[UserRoster]` | no |  |
| `previous_squad_weekly_meter` | league_id: Snowflake! | `FullRewardTracker` | no |  |
| `download_cftc_daily_statement` | month: Int!, day: Int!, year: Int! | `String` | no |  |
| `search_leagues` | term: String! | `[League]` | no |  |
| `search_channel_users` | prefix: String!, channel_id: Snowflake! | `[ChannelUser]` | no |  |
| `pinned_topics` | channel_id: Snowflake! | `[Topic]` | no |  |
| `league_dues_user` | user_id: Snowflake!, league_id: Snowflake! | `LeagueDuesUser` | no |  |
| `get_player_news` | limit: Int, sport: String!, player_id: String! | `[PlayerNews]` | no |  |
| `get_daily_draft_teams_by_draft` | draft_id: Snowflake! | `[DailyDraftTeam]` | no |  |
| `top_squad_banks` | league_id: Snowflake!, num_banks: Int! | `[FullRewardTracker]` | no |  |
| `list_eligible_promos` | flags: Map, location: Location, user_id: Snowflake! | `[Promo]` | no |  |
| `events` | parent_type: String!, parent_id: Snowflake! | `[Event]` | no |  |
| `inbound_requests` | request_type: String! | `[Request]` | no |  |
| `get_team` | sport: String!, team: String! | `Team` | no |  |
| `get_player_news_by_id` | source: String!, sport: String!, player_id: String!, source_key: String! | `PlayerNews` | no |  |
| `view_shared_promo` | user_id: Snowflake!, share_id: Snowflake! | `SharedPromo` | no |  |
| `get_pickem_picks_for_league` | league_id: String!, leg_id: String!, include_tiebreaker: Boolean | `Map` | no |  |
| `watched_players` | season: String, season_type: String, sport: String! | `[Player]` | no |  |
| `roster_draft_picks_by_owner` | league_id: Snowflake!, owner_roster_id: Snowflake! | `[RosterDraftPick]` | no |  |
| `search_matchmaking_leagues` | size: Int, tags: Map, from: Int, season: String!, season_type: String!, sport: String!, custom_tags: [String], commitment_high: Float, commitment_low: Float, player_count: [Int] | `[MatchmakingLobby]` | no |  |
| `channels_for_user` | user_id: Snowflake! | `[Channel]` | no |  |
| `get_promos_shared_to_you` | — | `[SharedPromo]` | no |  |
| `my_currencies` | wallet_type: String, withdrawable_only: Boolean | `Map` | no |  |
| `get_league_manual_history` | league_id: Snowflake! | `[LeagueManualHistory]` | no |  |
| `messages_by_reaction` | limit: Int, parent_id: Snowflake!, reaction: String! | `[Message]` | no |  |
| `get_pickem_leg` | league_id: String!, roster_id: Int!, leg_id: String! | `PickemLeg` | no |  |
| `promo_transactions_by_parent_reference` | reference_action: String, reference_id: String, reference_type: String | `[CurrencyTransaction]` | no |  |
| `generate_parlay_transactions_report` | start_time: Int!, end_time: Int!, verification_code: String!, email_or_phone: String! | `String` | no |  |
| `rosters_by_user` | user_id: Snowflake!, season: String!, season_type: String!, sport: String! | `[Roster]` | no |  |
| `sweepstakes_entries_count_total` | — | `Int` | no |  |
| `scores` | date: String, week: Int, season: String!, season_type: String!, sport: String!, game_id: String | `[Score]` | no |  |
| `blockers` | — | `[BlockedUser]` | no |  |
| `league_dues_users` | league_id: Snowflake! | `LeagueDueUsersWithHash` | no |  |
| `top_tab_content` | version: String! | `[TopTabContentGroup]` | no |  |
| `my_currencies_detailed` | wallet_type: String | `Map` | no |  |
| `event_queue_count` | event_id: Snowflake! | `Int` | no |  |
| `league_sync_list_leagues` | cookie: String, provider: String!, swid: String, s2: String | `[Map]` | no |  |
| `get_matchmaking_league` | league_id: Snowflake! | `MatchmakingLobby` | no |  |
| `list_promos_by_type` | type: String! | `[Promo]` | no |  |
| `user_drafts_by_draft` | draft_id: Snowflake! | `[UserDraft]` | no |  |
| `preferences_for_type_id` | type_id: Snowflake! | `[Preference]` | no |  |
| `message` | message_id: Snowflake!, parent_id: Snowflake! | `Message` | no |  |
| `legal_agreements` | — | `[String]` | no |  |
| `get_code` | code: String! | `Code` | no |  |
| `owned_leagues` | user_id: Snowflake!, season: String!, season_type: String!, sport: String! | `[League]` | no |  |
| `league_users` | league_id: Snowflake! | `[LeagueUser]` | no |  |
| `stats_for_players_in_week` | category: String!, week: Int!, season: String!, season_type: String!, sport: String!, player_ids: [String] | `[Stat]` | no |  |
| `my_events` | type: String! | `[Event]` | no |  |
| `activities` | type: String!, before: Snowflake, user_id: Snowflake | `[Activity]` | no |  |
| `topic` | channel_id: Snowflake!, topic_id: Snowflake! | `Topic` | no |  |
| `search_users` | prefix: String! | `[User]` | no |  |
| `purchasable_item_refresh` | — | `Map` | no |  |
| `get_player_outlook` | season: String!, sport: String!, player_id: String! | `PlayerNews` | no |  |
| `channel_members` | channel_id: Snowflake!, after_username: String | `[ChannelUser]` | no |  |
| `user_roles_for_type` | user_id: Snowflake, type_id: Snowflake! | `[Role]` | no |  |
| `recent_weekly_meters` | league_id: Snowflake! | `[RewardTrackerInfo]` | no |  |
| `app_info` | — | `Map` | no |  |
| `league_transactions_by_player` | offset: Int, limit: Int, player_id: String!, league_id: Snowflake! | `[LeagueTransaction]` | no |  |
| `squad_bank_by_id` | league_id: Snowflake!, reward_tracker_id: Snowflake! | `FullRewardTracker` | no |  |
| `my_preferences` | — | `[Preference]` | no |  |
| `current_squad_weekly_meter` | league_id: Snowflake! | `FullRewardTracker` | no |  |
| `user` | user_id: Snowflake! | `User` | no |  |
| `my_orders` | offset: Int, filter: ContractOrderFilter, limit: Int | `[ContractOrder]` | no |  |
| `recent_squad_banks` | league_id: Snowflake! | `[RewardTrackerInfo]` | no |  |
| `my_leagues` | season: String, season_type: String, sport: String, exclude_previous: Boolean, exclude_archived: Boolean | `[League]` | no |  |
| `league_user` | league_id: Snowflake! | `LeagueUser` | no |  |
| `friend_by_id` | friend_id: Snowflake! | `Friend` | no |  |
| `get_poll` | poll_id: Snowflake! | `Poll` | no |  |
| `search_players` | prefix: String!, limit: Int, sport: String! | `[Player]` | no |  |
| `active_topics` | limit: Int, channel_ids: [Snowflake] | `[Topic]` | no |  |
| `dm` | dm_id: Snowflake! | `Dm` | no |  |
| `channel_tags` | channel_id: Snowflake! | `[ChannelTag]` | no |  |
| `my_purchasable_mascots` | — | `[ItemType]` | no |  |
| `is_friend` | friend_id: Snowflake! | `Boolean` | no |  |
| `login` | password: String, captcha: String, email_or_phone_or_username: String! | `User` | no |  |
| `company_users` | company_id: Snowflake! | `[CompanyUser]` | no |  |
| `tournament_picks` | round: Int, league_id: Snowflake!, roster_id: Int | `[TournamentPick]` | no |  |
| `trending_channels` | limit: Int | `[Channel]` | no |  |
| `metadata` | type: String!, key: String! | `Metadata` | no |  |
| `achievements` | user_id: Snowflake! | `[Achievement]` | no |  |
| `existing_contacts` | emails: [String], phone_numbers: [String] | `[User]` | no |  |
| `recommended_channels` | limit: Int | `[Channel]` | no |  |
| `draft_picks` | draft_id: Snowflake! | `[DraftPick]` | no |  |
| `is_eligible_for_promo` | location: Location, league_id: Snowflake, promo_id: String! | `Boolean` | no |  |
| `search_players_in_text` | text: String!, sport: String! | `Map` | no |  |
| `get_promos_page` | flags: Map | `PromoPage` | no |  |
| `mutual_friends` | friend_id: Snowflake! | `[Friend]` | no |  |
| `num_pending_parlays` | — | `Int` | no |  |
| `pinned_messages` | parent_id: Snowflake! | `[Message]` | no |  |
| `roster_standings` | round: Int!, league_id: Snowflake! | `[RosterStanding]` | no |  |
| `league_transactions_by_status` | status: String!, leg: Int!, league_id: Snowflake! | `[LeagueTransaction]` | no |  |
| `player_performance_topic` | season: String!, season_type: String!, sport: String!, player_id: String!, game_id: String! | `Topic` | no |  |
| `teams` | sport: String! | `[Team]` | no |  |
| `get_user_pool_by_id` | pool_id: Snowflake | `UserPool` | no |  |
| `get_player_stats` | category: String!, week: Int, season: String!, season_type: String!, sport: String!, player_id: String!, game_id: String | `[Stat]` | no |  |
| `my_squad_parlays` | limit: Int, include_pick_counts: Boolean | `[Parlay]` | no |  |
| `user_drafts_by_league_mock` | league_id: Snowflake! | `[UserDraft]` | no |  |
| `me` | — | `User` | no |  |
| `my_items` | — | `[Item]` | no |  |
| `list_poll_votes` | limit: Int, poll_id: Snowflake! | `[PollVote]` | no |  |
| `trending_players` | sort: String!, sport: String! | `[Player]` | no |  |
| `my_active_positions` | — | `[Position]` | no |  |
| `search_dms` | term: String! | `[Dm]` | no |  |
| `my_dms` | limit: Int, unread: Boolean | `[Dm]` | no |  |
| `get_matchmaking_user` | user_id: Snowflake!, game: String!, game_bucket: String! | `MatchmakingUser` | no |  |
| `league_users_metadata` | league_id: Snowflake! | `[Map]` | no |  |
| `my_channels` | — | `[Channel]` | no |  |
| `weekly_stats` | category: String!, week: Int!, order_by: String!, season: String!, season_type: String!, sport: String!, positions: [String] | `[Stat]` | no |  |
| `get_featured_mascots` | — | `[ItemType]` | no |  |
| `my_currency_transactions` | offset: Int, limit: Int, wallet_type: String | `[CurrencyTransaction]` | no |  |
| `latest_topics` | limit: Int, channel_ids: [Snowflake] | `[Topic]` | no |  |
| `my_currencies_and_transactions` | wallet_type: String, transactions_limit: Int, transactions_offset: Int | `CurrenciesAndTransactions` | no |  |
| `get_league` | league_id: Snowflake! | `League` | no |  |
| `my_payment_methods` | — | `[PaymentMethod]` | no |  |
| `requests` | type_id: Snowflake!, request_type: String! | `[Request]` | no |  |
| `get_active_players` | sport: String! | `[Player]` | no |  |
| `my_purchases` | — | `[Purchase]` | no |  |
| `plays` | date: String, week: Int, season: String!, season_type: String!, sport: String!, game_id: String | `[Play]` | no |  |
| `get_user_draft_settings` | draft_id: String! | `UserDraft` | no |  |
| `topics` | before: Snowflake, order_by: String, channel_id: Snowflake!, channel_tags: [String], show_hidden: Boolean, show_shadowed: Boolean | `[Topic]` | no |  |
| `channel_bans` | channel_id: Snowflake!, after_username: String | `[ChannelBan]` | no |  |
| `my_ip_location` | — | `IpLocation` | no |  |
| `download_tax_form` | tax_year: String!, form_type: String! | `String` | no |  |
| `get_async_bundles` | — | `[String]` | no |  |
| `topic_feed` | limit: Int, before: Snowflake, channel_ids: [Snowflake] | `[Topic]` | no |  |
| `trending_topics` | limit: Int, channel_ids: [Snowflake] | `[Topic]` | no |  |
| `channels` | channel_ids: [Snowflake] | `[Channel]` | no |  |
| `draft_queue` | draft_id: Snowflake! | `[String]` | no |  |
| `get_pickem_scoring_settings` | league_id: Snowflake! | `Map` | no |  |
| `is_subscribed` | type_id: Snowflake! | `Boolean` | no |  |
| `messages` | before: Snowflake, order_by: String, parent_id: Snowflake!, show_hidden: Boolean | `[Message]` | no |  |
| `league_user_by_user` | season: String!, season_type: String!, sport: String! | `[LeagueUser]` | no |  |
| `draft_autopickers` | sport: String!, draft_id: Snowflake! | `[Snowflake]` | no |  |
| `sport_info` | sport: String! | `Map` | no |  |
| `previous_squad_bank` | league_id: Snowflake! | `FullRewardTracker` | no |  |
| `league_transactions` | status: String, type: String, limit: Int, leg: Int, league_id: Snowflake!, roster_id: Int | `[LeagueTransaction]` | no |  |
| `get_draft` | sport: String!, draft_id: Snowflake! | `Draft` | no |  |
| `all_tournament_picks` | league_id: Snowflake! | `[TournamentPick]` | no |  |
| `drafts_by_league_id` | league_id: Snowflake! | `[Draft]` | no |  |
| `get_dm_by_members` | members: [Snowflake] | `Dm` | no |  |
| `get_dismissals` | — | `Map` | no |  |
| `trending_channel_topics` | limit: Int, channel_id: Snowflake! | `[Topic]` | no |  |
| `get_favorite_teams` | user_id: Snowflake, sport: String | `[Team]` | no |  |
| `league_playoff_bracket` | league_id: Snowflake! | `[Map]` | no |  |
| `get_dm_settings` | dm_id: Snowflake! | `DmUser` | no |  |
| `get_pickem_legs` | league_id: String!, roster_id: Int! | `[PickemLeg]` | no |  |
| `get_matchmaking_league_activity` | league_id: Snowflake! | `MatchmakingLeagueActivity` | no |  |
| `user_rosters` | user_id: Snowflake!, season: String!, season_type: String!, sport: String! | `[UserRoster]` | no |  |
| `available_line_promotions` | include_boosts: Boolean | `[LinePromotion]` | no |  |
| `get_onboarding_rewards` | sport: String! | `OnboardingReward` | no |  |
| `get_responsible_gaming_limit_identifiers` | — | `[String]` | no |  |
| `codes_by_type` | type: String!, type_id: Snowflake! | `[Code]` | no |  |
| `get_in_progress_user_pools` | offset: Int, limit: Int | `[UserPool]` | no |  |
| `all_friends` | — | `[Friend]` | no |  |
| `get_user_pools` | offset: Int, status: [String], limit: Int, sport: String, pool_type: String | `[UserPool]` | no |  |
| `matchup_legs_related_to_roster` | league_id: Snowflake!, roster_id: Int!, start_round: Int!, end_round: Int! | `[MatchupLeg]` | no |  |
| `league_players` | league_id: Snowflake! | `[LeaguePlayer]` | no |  |
| `outbound_requests` | request_type: String! | `[Request]` | no |  |
| `sweepstakes_entries_count_today` | — | `Int` | no |  |
| `league_playoff_loser_bracket` | league_id: Snowflake! | `[Map]` | no |  |
| `user_drafts_by_status` | status: String!, before: Snowflake, season: String!, season_type: String!, sport: String! | `[UserDraft]` | no |  |
| `dm_members` | dm_id: Snowflake! | `[DmUser]` | no |  |
| `channels_by_parent` | parent_id: Snowflake! | `[Channel]` | no |  |
| `current_squad_bank` | league_id: Snowflake! | `FullRewardTracker` | no |  |
| `league_note` | league_id: Snowflake! | `LeagueNote` | no |  |

## Mutation root (329)

| Field | Arguments | Returns | Deprecated | Reason |
|---|---|---|---|---|
| `assign_roster_draft_pick` | league_id: Snowflake!, draft_pick: String! | `RosterDraftPick` | no |  |
| `unpin_message` | message_id: Snowflake!, parent_id: Snowflake! | `Boolean` | no |  |
| `roster_update_taxi` | force: Boolean, league_id: Snowflake!, roster_id: Int!, taxi: [String] | `Roster` | no |  |
| `enter_daily_draft` | group: String, location: Location!, sport: String! | `UserPool` | no |  |
| `draft_clear_afk_rounds` | sport: String!, draft_id: Snowflake! | `Draft` | no |  |
| `create_parlay` | type: String, location: Location!, currency_type: String!, currency_amount: Float!, league_id: Snowflake, line_ids: [Snowflake], promo_id: String, entry_name: String, payout_version: String, boost_adjustment_version: String, client_metadata: Map, client_possible_multipliers: ClientPossibleMultipliers, vs_group: String, client_max_payout: String, prototype_parlay_id: Snowflake, pv: Int, league_public: Boolean! | `Parlay` | no |  |
| `remove_favorite_team` | sport: String!, team: String! | `Boolean` | no |  |
| `create_invite_link` | code: String, type: String!, expires_at: Int, type_id: Snowflake!, uses_remaining: Int | `Code` | no |  |
| `update_user_flairs` | user_flair: [UserFlair] | `User` | no |  |
| `create_dm` | title: String, members: [Snowflake], attachment_type: String, dm_type: String!, client_id: String, client_context: String, message_text: String, attachment_id: Snowflake, k_attachment_data: [String], v_attachment_data: [String] | `Dm` | no |  |
| `save_tournament_pick` | round: Int!, team: String, game_id: String!, league_id: Snowflake!, roster_id: Int!, team_bracket: String, team_seed: Int | `[TournamentPick]` | no |  |
| `leave_draft` | sport: String!, draft_id: Snowflake! | `Draft` | no |  |
| `delete_async_bundles` | bundle_names: [String] | `[String]` | no |  |
| `consent_to_electronic_delivery` | consent: Boolean! | `Boolean` | no |  |
| `use_code` | code: String, ref_code: String | `Code` | no |  |
| `remove_player_tag` | sport: String!, channel_id: Snowflake!, topic_id: Snowflake!, player_id: String! | `Topic` | no |  |
| `roster_update_reserve` | league_id: Snowflake!, roster_id: Int!, reserve: [String] | `Roster` | no |  |
| `register_aeropay_user` | — | `Map` | no |  |
| `poll_edit_prompt` | type: String, prompt: String!, type_id: Snowflake, parent_id: Snowflake, poll_id: Snowflake! | `Poll` | no |  |
| `poll_set_closes_at` | type: String, type_id: Snowflake, parent_id: Snowflake, poll_id: Snowflake!, closes_at: Int! | `Poll` | no |  |
| `clear_unread_mentions` | — | `Boolean` | no |  |
| `skip_startup_draft` | league_id: Snowflake! | `League` | no |  |
| `draft_hover_player` | slot: Int!, sport: String!, player_id: String!, draft_id: Snowflake!, pick_no: Int | `Boolean` | no |  |
| `roster_update_starters` | league_id: Snowflake!, roster_id: Int!, starters: [String] | `Roster` | no |  |
| `tag_braze_user` | type: String | `Boolean` | no |  |
| `claim_promo_v2` | promo_id: String! | `Promo` | no |  |
| `create_topic_reaction` | channel_id: Snowflake!, topic_id: Snowflake!, reaction: String! | `TopicReaction` | no |  |
| `unwatch_player` | season: String, season_type: String, sport: String!, player_id: String! | `Boolean` | no |  |
| `update_league_group` | name: String!, description: String, season: String!, season_type: String!, sport: String!, company_id: Snowflake!, group_id: Snowflake!, avatar_url: String | `LeagueGroup` | no |  |
| `get_aeropay_aggregator_credentials` | — | `Map` | no |  |
| `update_user_display_name` | display_name: String! | `User` | no |  |
| `interactive_bank_deposit` | location: Location!, currency_type: String!, wallet_type: String, currency_amount: Float!, payment_method: PaymentMethodInput, client_ip: String, promos: [String], return_url: String! | `InteractiveBankDepositResult` | no |  |
| `leave_channels` | channel_ids: [Snowflake] | `[Channel]` | no |  |
| `accept_trade` | leg: Int!, league_id: Snowflake!, transaction_id: Snowflake! | `LeagueTransaction` | no |  |
| `update_waiver_claim` | leg: Int!, league_id: Snowflake!, transaction_id: Snowflake!, k_metadata: [String], v_metadata: [String], k_settings: [String], v_settings: [Int] | `LeagueTransaction` | no |  |
| `channel_update_favorite` | channel_id: Snowflake!, is_favorite: Boolean! | `Channel` | no |  |
| `add_role` | name: String!, type: String!, type_id: Snowflake! | `Role` | no |  |
| `track_score_view` | season: String!, season_type: String!, sport: String!, game_id: String! | `Boolean` | no |  |
| `league_update_avatar` | league_id: Snowflake!, avatar_url: String! | `League` | no |  |
| `update_draft_order` | sport: String!, draft_id: Snowflake!, draft_order: [Snowflake] | `Draft` | no |  |
| `update_channel_tag` | name: String!, tag: String!, description: String!, color: String!, channel_id: Snowflake!, is_default: Boolean!, sound: String! | `ChannelTag` | no |  |
| `update_user_avatar_url` | avatar_url: String! | `User` | no |  |
| `update_league_user_metadata` | league_id: Snowflake!, k_metadata: [String], v_metadata: [String] | `LeagueUser` | no |  |
| `set_league_mascot_message` | message: String!, leg: Int!, league_id: Snowflake!, emotion: String | `LeagueUser` | no |  |
| `delete_channel_tag` | tag: String!, channel_id: Snowflake! | `ChannelTag` | no |  |
| `remove_channel_tag` | channel_id: Snowflake!, topic_id: Snowflake!, channel_tag: String! | `Topic` | no |  |
| `league_update_owners` | league_id: Snowflake!, owner_ids: [Snowflake] | `[LeagueUser]` | no |  |
| `pickem_commish_revive` | league_id: Snowflake!, roster_id: Int! | `Roster` | no |  |
| `verify_contact_update` | code: String! | `User` | no |  |
| `create_user_roster` | season: String!, season_type: String!, sport: String!, players: [String], roster_positions: [String], starters: [String], k_metadata: [String], v_metadata: [String], k_settings: [String], v_settings: [Int], k_scoring_settings: [String], v_scoring_settings: [Float] | `UserRoster` | no |  |
| `verify_bank_payment_method` | location: Location!, client_ip: String!, return_url: String! | `Boolean` | no |  |
| `league_sync_create_league` | type: Int, cookie: String, provider: String!, roster_id: Int, provider_league_id: String!, swid: String, s2: String | `League` | no |  |
| `league_update_custom_standings` | league_id: Snowflake!, v_rank_map: [Int], k_rank_map: [Int] | `[Roster]` | no |  |
| `put_user_on_autopick` | draft_id: Snowflake! | `Boolean` | no |  |
| `leave_channel` | channel_id: Snowflake! | `Channel` | no |  |
| `sync_aeropay_accounts` | — | `[PaymentMethod]` | no |  |
| `change_password` | password: String!, old_password: String | `Boolean` | no |  |
| `decline_request` | type_id: Snowflake!, requester_id: Snowflake!, request_type: String! | `Boolean` | no |  |
| `league_update_settings` | league_id: Snowflake!, k_settings: [String], v_settings: [Int] | `League` | no |  |
| `roster_set_keepers` | league_id: Snowflake!, keepers: [String], roster_id: Int! | `Roster` | no |  |
| `update_company` | name: String!, description: String!, company_id: Snowflake!, shortcode: String!, avatar_url: String | `Company` | no |  |
| `socure_documents_request` | city: String!, first_name: String!, last_name: String!, region: String!, date_of_birth: String!, country_code: String!, address1: String!, address2: String, postal_code: String! | `String` | no |  |
| `unassign_roster_draft_pick` | round: Int!, season: String!, league_id: Snowflake!, roster_id: Int! | `RosterDraftPick` | no |  |
| `reset_password` | code: String!, password: String! | `Boolean` | no |  |
| `watch_player` | season: String, season_type: String, sport: String!, player_id: String! | `Player` | no |  |
| `update_user_roster_scoring_settings` | season: String!, season_type: String!, sport: String!, roster_id: Snowflake!, k_scoring_settings: [String], v_scoring_settings: [Float] | `UserRoster` | no |  |
| `league_update_metadata` | league_id: Snowflake!, k_metadata: [String], v_metadata: [String] | `League` | no |  |
| `create_channel_tag` | name: String!, tag: String!, description: String!, color: String!, channel_id: Snowflake!, is_default: Boolean!, sound: String! | `ChannelTag` | no |  |
| `delete_league` | league_id: Snowflake! | `League` | no |  |
| `push_topic` | tag: String!, channel_id: Snowflake!, topic_id: Snowflake! | `Topic` | no |  |
| `draft_end_phase` | phase: String!, sport: String!, draft_id: Snowflake! | `Draft` | no |  |
| `signal` | item: String!, parent_type: String!, channel_id: Snowflake, parent_id: Snowflake!, item_count: Int | `Boolean` | no |  |
| `typing` | parent_type: String!, channel_id: Snowflake, parent_id: Snowflake! | `Boolean` | no |  |
| `remove_friend` | friend_id: Snowflake! | `Boolean` | no |  |
| `ban_channel_user` | channel_id: Snowflake!, expire_days: Int, ban_user_id: Snowflake! | `ChannelBan` | no |  |
| `update_draft_queue` | draft_id: Snowflake!, player_ids: [String] | `[String]` | no |  |
| `change_topic_title` | title: String!, channel_id: Snowflake!, topic_id: Snowflake! | `Topic` | no |  |
| `create_company` | name: String!, description: String, shortcode: String!, avatar_url: String | `Company` | no |  |
| `delete_reaction` | message_id: Snowflake!, parent_id: Snowflake!, reaction: String! | `Reaction` | no |  |
| `create_reaction` | message_id: Snowflake!, parent_id: Snowflake!, reaction: String!, enable_multi: Boolean | `Reaction` | no |  |
| `create_topic_subscriptions` | channel_id: Snowflake!, topic_id: Snowflake!, user_ids: [Snowflake] | `Boolean` | no |  |
| `enter_event_queue` | priority: Int, type: String!, event_id: Snowflake, type_id: Snowflake! | `Boolean` | no |  |
| `tip_topic_author` | channel_id: Snowflake!, topic_id: Snowflake!, currency_type: String!, currency_amount: Float! | `UserTipTransactionLog` | no |  |
| `reorder_channels` | channel_ids: [Snowflake] | `[Channel]` | no |  |
| `continue_league` | type: Int!, league_id: Snowflake!, owner_ids: [Snowflake] | `League` | no |  |
| `roster_update_metadata` | league_id: Snowflake!, roster_id: Int!, k_metadata: [String], v_metadata: [String] | `Roster` | no |  |
| `create_league_group` | name: String!, description: String, season: String!, season_type: String!, sport: String!, company_id: Snowflake!, roster_positions: [String], avatar_url: String, k_metadata: [String], v_metadata: [String], k_settings: [String], v_settings: [Int], k_scoring_settings: [String], v_scoring_settings: [Float], k_group_settings: [String], v_group_settings: [Int], k_draft_settings: [String], v_draft_settings: [Int] | `LeagueGroup` | no |  |
| `recalculate_matchup_scoring` | round: Int!, league_id: Snowflake! | `Boolean` | no |  |
| `clear_responsible_gaming_limit` | identifier: String!, limit_scope: String | `Boolean` | no |  |
| `track_channel_join` | channel_id: Snowflake! | `Boolean` | no |  |
| `update_league_group_metadata` | season: String!, season_type: String!, sport: String!, company_id: Snowflake!, group_id: Snowflake!, k_metadata: [String], v_metadata: [String] | `LeagueGroup` | no |  |
| `import_draft` | draft_id: Snowflake!, league_id: Snowflake! | `League` | no |  |
| `update_referral_promo_code` | promo_id: String! | `String` | no |  |
| `delete_dm` | dm_id: Snowflake! | `Dm` | no |  |
| `delete_event` | parent_type: String!, event_id: Snowflake!, parent_id: Snowflake! | `Event` | no |  |
| `cancel_verification` | — | `Boolean` | no |  |
| `upsert_league_manual_history` | season: String!, league_id: Snowflake!, league_notes: List, season_standings: List, top_standings: Map | `[LeagueManualHistory]` | no |  |
| `remove_pickem_pick` | pick: InputPickemPick!, league_id: Snowflake!, roster_id: Int!, leg_id: String! | `PickemLeg` | no |  |
| `unhide_topic` | channel_id: Snowflake!, topic_id: Snowflake! | `Boolean` | no |  |
| `leave_dm` | dm_id: Snowflake! | `Dm` | no |  |
| `update_dm_member` | dm_id: Snowflake!, allow_pn: Boolean!, mention_pn: Boolean! | `DmUser` | no |  |
| `claim_promo` | location: Location, league_id: Snowflake, promo_id: String! | `Boolean` | no |  |
| `tip_user` | source: String, currency_type: String!, currency_amount: Float!, receiver_user_id: Snowflake! | `UserTipTransactionLog` | no |  |
| `create_file` | filename: String!, width: Int, parent_type: String!, url: String!, channel_id: Snowflake, parent_id: Snowflake!, filesize: Int!, height: Int, mimetype: String, url_original: String | `File` | no |  |
| `make_pickem_pick` | pick: InputPickemPick!, league_id: Snowflake!, roster_id: Int!, leg_id: String!, pick_to_replace: InputPickemPick | `PickemLeg` | no |  |
| `sync_push_token` | token: String!, device_id: String, token_type: String!, bundle_id: String, has_permission: Boolean! | `String` | no |  |
| `rescore_pickem_league` | league_id: Snowflake!, clear_roster_metadata: Boolean, make_random_picks: Boolean | `String` | no |  |
| `link_aeropay_account` | password: String!, user_id: String! | `PaymentMethod` | no |  |
| `update_user_roster_players` | season: String!, season_type: String!, sport: String!, players: [String], roster_id: Snowflake!, starters: [String] | `UserRoster` | no |  |
| `update_matchup_leg` | round: Int!, leg: Int!, league_id: Snowflake!, roster_id: Int!, starters: [String], starters_games: Map, subs: Map | `MatchupLeg` | no |  |
| `unlike_league_player` | player_id: String!, league_id: Snowflake! | `LeaguePlayer` | no |  |
| `create_message` | text: String, parent_type: String!, attachment_type: String, channel_id: Snowflake, parent_id: Snowflake!, role_id: Snowflake, author_achievement: String, pinned: Boolean, shard_max: Int, shard_min: Int, client_id: String, client_context: String, attachment_id: Snowflake, k_attachment_data: [String], v_attachment_data: [String] | `Message` | no |  |
| `create_topic` | title: String!, attachment_type: String, channel_id: Snowflake!, channel_tags: [String], client_id: String, attachment_id: Snowflake, k_attachment_data: [String], v_attachment_data: [String] | `Topic` | no |  |
| `report_user` | user_id: Snowflake! | `Boolean` | no |  |
| `league_sync_send_recovery_code` | type: String, mask: String, cookie: String, marker: String, display_name: String, provider: String!, acrumb: String, crumb: String, session_index: String, masked_value: String, email_or_phone: String | `Map` | no |  |
| `update_squad_waitlist_eligibility` | location: Location! | `Boolean` | no |  |
| `remove_payment_method` | payment_method: PaymentMethodInput! | `Boolean` | no |  |
| `unlock_chopped_roster` | league_id: Snowflake!, roster_id: Int! | `Roster` | no |  |
| `update_user_roster_settings` | season: String!, season_type: String!, sport: String!, roster_id: Snowflake!, k_settings: [String], v_settings: [Int] | `UserRoster` | no |  |
| `join_draft` | sport: String!, draft_id: Snowflake! | `Draft` | no |  |
| `gift_item_to_league` | item_id: Snowflake!, receiver_league_id: Snowflake! | `Item` | no |  |
| `remove_role_permission` | type: String!, type_id: Snowflake!, role_id: Snowflake!, permission: String! | `Boolean` | no |  |
| `assign_role` | type: String!, user_id: Snowflake!, type_id: Snowflake!, role_id: Snowflake! | `Boolean` | no |  |
| `create_supplemental_draft` | league_id: Snowflake! | `League` | no |  |
| `roster_update_settings` | league_id: Snowflake!, roster_id: Int!, k_settings: [String], v_settings: [Int] | `Roster` | no |  |
| `join_public_league` | season: String!, season_type: String!, sport: String! | `League` | no |  |
| `poll_remove_choice` | type: String, type_id: Snowflake, parent_id: Snowflake, poll_id: Snowflake!, choice_id: String! | `Poll` | no |  |
| `update_league_group_scoring_settings` | season: String!, season_type: String!, sport: String!, company_id: Snowflake!, group_id: Snowflake!, k_scoring_settings: [String], v_scoring_settings: [Float] | `LeagueGroup` | no |  |
| `league_update_note` | text: String, league_id: Snowflake! | `LeagueNote` | no |  |
| `clone_to_chopped` | league_id: Snowflake!, copy_draft_results: Boolean | `League` | no |  |
| `delete_user_roster` | season: String!, season_type: String!, sport: String!, roster_id: Snowflake! | `UserRoster` | no |  |
| `randomize_opponents` | league_id: Snowflake! | `[MatchupLeg]` | no |  |
| `create_roster` | league_id: Snowflake! | `Roster` | no |  |
| `sync_app_information` | app_instance_id: String!, app_type: String! | `String` | no |  |
| `pin_topic` | channel_id: Snowflake!, topic_id: Snowflake! | `Boolean` | no |  |
| `delete_channel` | channel_id: Snowflake! | `Channel` | no |  |
| `set_user_exclusion` | limit_scope: String, num_days: Int | `ResponsibleGamingLimit` | no |  |
| `send_league_dues_reminder` | league_id: Snowflake! | `String` | no |  |
| `cc_deposit` | location: Location!, currency_type: String!, wallet_type: String, currency_amount: Float!, payment_method: PaymentMethodInput, promos: [String], theme: String | `CcDepositResult` | no |  |
| `unblock_user` | blocked_user_id: Snowflake! | `BlockedUser` | no |  |
| `unshadow_topic` | channel_id: Snowflake!, topic_id: Snowflake! | `Boolean` | no |  |
| `update_parlay` | league_id: Snowflake, parlay_id: Snowflake! | `Parlay` | no |  |
| `draft_resume_offering` | sport: String!, draft_id: Snowflake! | `Draft` | no |  |
| `change_message_text` | text: String!, message_id: Snowflake!, parent_id: Snowflake! | `Message` | no |  |
| `send_download_link` | phone: String! | `Boolean` | no |  |
| `create_channel` | name: String!, description: String, sort_order: String!, sport: String!, is_private: Boolean!, sharding_enabled: Boolean!, parent_id: Snowflake, avatar_url: String, default_moderator_role: Boolean | `Channel` | no |  |
| `confirm_aeropay_user` | code: String! | `[PaymentMethod]` | no |  |
| `process_transaction` | leg: Int!, league_id: Snowflake!, transaction_id: Snowflake! | `LeagueTransaction` | no |  |
| `create_league` | name: String!, season: String!, season_type: String!, sport: String!, draft_id: Snowflake, roster_positions: [String], avatar_url: String, k_metadata: [String], v_metadata: [String], k_settings: [String], v_settings: [Int], k_scoring_settings: [String], v_scoring_settings: [Float] | `League` | no |  |
| `join_channels` | channel_ids: [Snowflake] | `[Channel]` | no |  |
| `create_tutorial_message` | text: String, parent_type: String!, attachment_type: String, parent_id: Snowflake!, attachment_id: Snowflake, k_attachment_data: [String], v_attachment_data: [String], bot_id: Snowflake! | `Message` | no |  |
| `league_create_transaction` | type: String!, league_id: Snowflake!, k_adds: [String], v_adds: [Int], k_drops: [String], v_drops: [Int] | `LeagueTransaction` | no |  |
| `join_matchmaking_league` | lobby_id: Snowflake!, game: String!, game_bucket: String! | `League` | no |  |
| `migrate_league_note` | league_id: Snowflake! | `LeagueNote` | no |  |
| `clone_tournament_picks` | league_id: Snowflake!, dest_league_id: Snowflake, src_roster_id: Int!, dest_roster_id: Int! | `[TournamentPick]` | no |  |
| `user` | code: String, password: String, real_name: String, display_name: String, promo: String, avatar_url: String, captcha: String, impact_click_id: String, email_or_phone: String, ref_code: String | `User` | no |  |
| `unban_channel_user` | channel_id: Snowflake!, unban_user_id: Snowflake! | `ChannelBan` | no |  |
| `redeem_receipt_for_cookies` | product_id: String!, store_type: String!, proof_of_purchase: String! | `Int` | no |  |
| `cancel_request` | type_id: Snowflake!, request_type: String!, requestee_id: Snowflake! | `Boolean` | no |  |
| `create_shared_promo` | promo_id: String!, giftee_user_id: Snowflake | `SharedPromo` | no |  |
| `remove_league_player_trade_block` | player_id: String!, league_id: Snowflake! | `LeaguePlayer` | no |  |
| `hide_dm` | dm_id: Snowflake! | `Dm` | no |  |
| `update_league_group_group_settings` | season: String!, season_type: String!, sport: String!, company_id: Snowflake!, group_id: Snowflake!, k_group_settings: [String], v_group_settings: [Int] | `LeagueGroup` | no |  |
| `clear_unread_dms` | — | `Boolean` | no |  |
| `like_league_player` | player_id: String!, league_id: Snowflake! | `LeaguePlayer` | no |  |
| `request_verification` | version: String, captcha: String, email_or_phone: String! | `Boolean` | no |  |
| `remove_role` | type: String!, type_id: Snowflake!, role_id: Snowflake! | `Role` | no |  |
| `pin_message` | message_id: Snowflake!, parent_id: Snowflake! | `Boolean` | no |  |
| `draft_nominate_player` | slot: Int!, amount: Int!, sport: String!, player_id: String!, draft_id: Snowflake!, pick_no: Int | `DraftOffer` | no |  |
| `send_request` | type_id: Snowflake!, request_type: String!, requestee_id: Snowflake! | `Request` | no |  |
| `save_cftc_questionnaire` | has_futures_experience: Boolean, occupation: String, income: String, net_worth: String | `Boolean` | no |  |
| `verify_start_one_click` | birthdate: String, ssn4: String | `UserProfile` | no |  |
| `force_update_matchup_leg` | round: Int!, leg: Int!, league_id: Snowflake!, roster_id: Int!, starters: [String], starters_games: Map, subs: Map | `MatchupLeg` | no |  |
| `hide_topic` | channel_id: Snowflake!, topic_id: Snowflake! | `Boolean` | no |  |
| `force_cancel_transaction` | leg: Int!, league_id: Snowflake!, transaction_id: Snowflake! | `LeagueTransaction` | no |  |
| `remove_user_from_autopick` | draft_id: Snowflake! | `Boolean` | no |  |
| `draft_force_auction_pick` | slot: Int!, amount: Int, sport: String!, player_id: String!, draft_id: Snowflake!, pick_no: Int, is_keeper: Boolean | `DraftPick` | no |  |
| `create_league_group_league` | name: String!, group_id: Snowflake!, avatar_url: String, draft_time: Int! | `League` | no |  |
| `submit_waiver_claim` | league_id: Snowflake!, k_metadata: [String], v_metadata: [String], k_settings: [String], v_settings: [Int], k_adds: [String], v_adds: [Int], k_drops: [String], v_drops: [Int] | `LeagueTransaction` | no |  |
| `add_player_tag` | sport: String!, channel_id: Snowflake!, topic_id: Snowflake!, player_id: String! | `Topic` | no |  |
| `verify_verification_code` | code: String!, email_or_phone: String! | `Boolean` | no |  |
| `rotate_purchasable_mascots` | — | `[ItemType]` | no |  |
| `invite_friends` | contact_infos: [ContactInfo], my_name: String! | `Boolean` | no |  |
| `verify_change_info` | location: Location, city: String!, first_name: String!, last_name: String!, region: String!, date_of_birth: String!, country_code: String!, address1: String!, address2: String, national_id: String, postal_code: String! | `UserProfile` | no |  |
| `accept_request` | type_id: Snowflake!, requester_id: Snowflake!, request_type: String! | `Boolean` | no |  |
| `purchase_gift_for_user` | item_type_id: String!, receiver_user_id: Snowflake! | `Item` | no |  |
| `invite_to_dm` | members: [Snowflake], dm_id: Snowflake! | `Dm` | no |  |
| `create_verification_code` | version: String, captcha: String, email_or_phone: String! | `Map` | no |  |
| `verify_bank_payment_and_withdraw` | location: Location!, currency_type: String!, currency_amount: Float!, client_ip: String!, return_url: String! | `Map` | no |  |
| `reset_to_startup_draft` | league_id: Snowflake! | `League` | no |  |
| `cancel_parlay` | parlay_id: Snowflake! | `Parlay` | no |  |
| `update_dismissals` | type: String!, value: String! | `Map` | no |  |
| `set_league_mascot_emotion` | leg: Int!, league_id: Snowflake!, emotion: String! | `LeagueUser` | no |  |
| `delete_league_group` | season: String!, season_type: String!, sport: String!, company_id: Snowflake!, group_id: Snowflake! | `LeagueGroup` | no |  |
| `update_draft_start_time` | start_time: Int!, sport: String!, draft_id: Snowflake! | `Draft` | no |  |
| `leave_league` | league_id: Snowflake! | `League` | no |  |
| `update_draft_metadata` | sport: String!, draft_id: Snowflake!, k_metadata: [String], v_metadata: [String] | `Draft` | no |  |
| `cc_withdrawal` | location: Location!, currency_type: String!, wallet_type: String, currency_amount: Float!, payment_method: PaymentMethodInput! | `CurrencyTransaction` | no |  |
| `override_league_playoff_brackets` | league_id: Snowflake!, bracket_overrides: [PlayoffMatchOverride], loser_bracket_overrides: [PlayoffMatchOverride] | `Map` | no |  |
| `delete_topic` | channel_id: Snowflake!, topic_id: Snowflake! | `Boolean` | no |  |
| `add_async_bundles` | bundle_names: [String] | `[String]` | no |  |
| `configure_divisions` | league_id: Snowflake!, roster_ids: [Int], roster_divisions: [Int] | `[Roster]` | no |  |
| `unsubscribe_from_topic` | topic_id: Snowflake! | `Boolean` | no |  |
| `poll_edit_choice` | type: String, choice: String!, type_id: Snowflake, parent_id: Snowflake, poll_id: Snowflake!, choice_id: String! | `Poll` | no |  |
| `shadow_topic` | channel_id: Snowflake!, topic_id: Snowflake! | `Boolean` | no |  |
| `remove_matchup_leg_pick` | position: String!, round: Int!, leg: Int!, league_id: Snowflake!, roster_id: Int! | `MatchupLeg` | no |  |
| `deposit` | type: String, location: Location!, currency_type: String!, wallet_type: String, currency_amount: Float!, payment_method: PaymentMethodInput, promos: [String], theme: String | `CcDepositResult` | no |  |
| `poll_unvote` | type: String, type_id: Snowflake, parent_id: Snowflake, poll_id: Snowflake!, choice_id: String! | `Poll` | no |  |
| `push_notify_join_voice_lounge` | league_id: Snowflake! | `Boolean` | no |  |
| `offline_withdrawal` | reason: String!, location: Location!, email: String!, currency_type: String!, currency_amount: Float!, paper_check_info: OfflineWithdrawalPaperCheckInfo, ach_info: OfflineWithdrawalAchInfo | `CurrencyTransaction` | no |  |
| `purchase_item_with_cookies` | item_type_id: String! | `Item` | no |  |
| `set_pickem_tiebreaker` | league_id: Snowflake!, roster_id: Int!, tiebreaker: InputPickemTiebreaker!, leg_id: String! | `PickemLeg` | no |  |
| `draft_pass_offering` | sport: String!, draft_id: Snowflake! | `Draft` | no |  |
| `set_favorite_teams` | sport: String!, teams: [String] | `Boolean` | no |  |
| `send_matchmaking_request` | type_id: Snowflake!, lobby_id: Snowflake!, game: String!, game_bucket: String!, request_type: String!, requestee_id: Snowflake! | `Request` | no |  |
| `delete_roster` | league_id: Snowflake!, roster_id: Int! | `Boolean` | no |  |
| `propose_trade` | expires_at: Int, league_id: Snowflake!, draft_picks: [String], waiver_budget: [String], reject_transaction_id: Snowflake, reject_transaction_leg: Int, k_adds: [String], v_adds: [Int], k_drops: [String], v_drops: [Int] | `LeagueTransaction` | no |  |
| `add_league_player_trade_block` | player_id: String!, league_id: Snowflake! | `LeaguePlayer` | no |  |
| `update_user_real_name` | real_name: String! | `User` | no |  |
| `create_draft` | type: String!, season: String!, season_type: String!, sport: String!, league_id: Snowflake, k_metadata: [String], v_metadata: [String], k_settings: [String], v_settings: [Int], reset_league_draft: Boolean | `Draft` | no |  |
| `update_user_roster_metadata` | season: String!, season_type: String!, sport: String!, roster_id: Snowflake!, k_metadata: [String], v_metadata: [String] | `UserRoster` | no |  |
| `migrate_pinned_messages` | league_id: Snowflake! | `Int` | no |  |
| `poll_add_choice` | type: String, choice: String!, type_id: Snowflake, parent_id: Snowflake, poll_id: Snowflake! | `Poll` | no |  |
| `set_user_league_matchmaking_preferences` | message: String, tags: Map, is_open: Boolean, season: String!, season_type: String!, sport: String!, custom_tags: [String], commitment_high: Float, commitment_low: Float, player_count: [Int] | `MatchmakingUser` | no |  |
| `remove_league_player_note` | player_id: String!, league_id: Snowflake! | `LeaguePlayer` | no |  |
| `request_password_reset` | captcha: String, email_or_phone: String! | `Boolean` | no |  |
| `change_password2` | password: String!, logout_all: Boolean, old_password: String | `User` | no |  |
| `change_dm_title` | title: String!, dm_id: Snowflake! | `Dm` | no |  |
| `reward_onboarding` | step: String!, platform: String!, sport: String! | `OnboardingReward` | no |  |
| `league_sync_get_mask` | provider: String!, login_value: String! | `Map` | no |  |
| `aeropay_deposit` | location: Location!, currency_type: String!, wallet_type: String, currency_amount: Float!, payment_method: PaymentMethodInput! | `CurrencyTransaction` | no |  |
| `draft_set_nominator` | slot: Int!, sport: String!, draft_id: Snowflake! | `Draft` | no |  |
| `randomize_draft_order` | sport: String!, draft_id: Snowflake! | `Draft` | no |  |
| `revoke_role` | type: String!, user_id: Snowflake!, type_id: Snowflake!, role_id: Snowflake! | `Boolean` | no |  |
| `remove_dismissals` | type: String! | `Map` | no |  |
| `cancel_waiver_claim` | leg: Int!, league_id: Snowflake!, transaction_id: Snowflake! | `LeagueTransaction` | no |  |
| `applepay_deposit` | location: Location!, currency_type: String!, wallet_type: String, currency_amount: Float!, promos: [String], theme: String | `CcDepositResult` | no |  |
| `set_league_mascot` | leg: Int!, league_id: Snowflake!, mascot_item_id: Snowflake, mascot_item_type_id: String, emotion: String | `LeagueUser` | no |  |
| `reorder_channel_tags` | tags: [String], channel_id: Snowflake! | `[String]` | no |  |
| `add_channel_tag` | channel_id: Snowflake!, topic_id: Snowflake!, channel_tag: String! | `Topic` | no |  |
| `update_opponents` | round: Int!, leg: Int!, league_id: Snowflake!, roster_ids: [Int], matchup_ids: [Int] | `[MatchupLeg]` | no |  |
| `update_tiebreaker` | league_id: Snowflake!, roster_id: Int!, tiebreaker: Int, Tiebreaker: Int | `Roster` | no |  |
| `update_user_draft_settings` | draft_id: Snowflake!, allow_pn: Boolean!, mention_pn: Boolean! | `UserDraft` | no |  |
| `league_update_roster_positions` | league_id: Snowflake!, roster_positions: [String] | `League` | no |  |
| `sync_push_tags` | k_tags: [String], push_id: String!, v_tags: [String] | `Boolean` | no |  |
| `interac_set_security_question` | payment_method: PaymentMethodInput!, security_question: String!, security_answer: String! | `PaymentMethod` | no |  |
| `league_sync_use_recovery_code` | code: String, type: String, mask: String, cookie: String, session_id: String, api_key: String, display_name: String, provider: String!, reference_id: String, acrumb: String, crumb: String, session_index: String, att_remaining: String | `Map` | no |  |
| `clear_notifications` | notification_types: [String] | `Boolean` | no |  |
| `draft_pick_player` | sport: String!, player_id: String!, draft_id: Snowflake!, pick_no: Int! | `DraftPick` | no |  |
| `purchase_gift_for_league` | item_type_id: String!, receiver_league_id: Snowflake! | `Item` | no |  |
| `update_matchup_leg_custom_points` | round: Int!, leg: Int!, league_id: Snowflake!, roster_id: Int!, custom_points: Float | `Boolean` | no |  |
| `update_draft_status` | status: String!, sport: String!, draft_id: Snowflake! | `Draft` | no |  |
| `draft_set_keeper` | sport: String!, player_id: String!, draft_id: Snowflake!, pick_no: Int! | `DraftPick` | no |  |
| `block_user` | blocked_user_id: Snowflake! | `BlockedUser` | no |  |
| `remove_matchup_leg_ban` | position: String!, round: Int!, leg: Int!, league_id: Snowflake!, roster_id: Int! | `MatchupLeg` | no |  |
| `verify_update_one_click` | birthdate: String, ssn4: String | `UserProfile` | no |  |
| `league_sync_login` | password: String!, provider: String!, login_value: String! | `Map` | no |  |
| `remove_co_owner` | league_id: Snowflake!, co_owner_id: Snowflake! | `Roster` | no |  |
| `bank_withdrawal` | location: Location!, currency_type: String!, wallet_type: String, currency_amount: Float!, payment_method: PaymentMethodInput!, client_ip: String | `CurrencyTransaction` | no |  |
| `draft_remove_pick` | sport: String!, draft_id: Snowflake!, pick_no: Int! | `DraftPick` | no |  |
| `delete_topic_reaction` | channel_id: Snowflake!, topic_id: Snowflake!, reaction: String! | `TopicReaction` | no |  |
| `clear_tournament_picks` | league_id: Snowflake!, roster_id: Int! | `Boolean` | no |  |
| `set_contest_entry_name` | entry_name: String, parlay_id: Snowflake! | `Boolean` | no |  |
| `delete_message` | message_id: Snowflake!, parent_id: Snowflake! | `Boolean` | no |  |
| `league_update_name` | name: String!, league_id: Snowflake! | `League` | no |  |
| `set_league_matchmaking` | message: String, is_open: Boolean, league_id: Snowflake!, commitment: Float, custom_tags: [String], join_type: Int | `MatchmakingLobby` | no |  |
| `unpin_topic` | channel_id: Snowflake!, topic_id: Snowflake! | `Boolean` | no |  |
| `clear_pending_withdrawal` | reference_action: String!, reference_id: String!, reference_type: String! | `CurrencyTransaction` | no |  |
| `draft_cpu_pick_player` | sport: String!, draft_id: Snowflake!, pick_no: Int! | `DraftPick` | no |  |
| `draft_remove_user` | user_id: Snowflake!, sport: String!, draft_id: Snowflake! | `Draft` | no |  |
| `delete_league_manual_history` | season: String!, league_id: Snowflake! | `[LeagueManualHistory]` | no |  |
| `join_channel` | channel_id: Snowflake!, display_order: Int | `Channel` | no |  |
| `update_preferences` | values: [String], names: [String], type_id: Snowflake! | `Boolean` | no |  |
| `delete_user` | password: String, email_or_phone_or_username: String! | `User` | no |  |
| `create_event` | name: String!, description: String, start_time: Int, parent_type: String!, end_time: Int, parent_id: Snowflake! | `Event` | no |  |
| `reject_trade` | leg: Int!, league_id: Snowflake!, transaction_id: Snowflake! | `LeagueTransaction` | no |  |
| `poll_vote` | type: String, type_id: Snowflake, parent_id: Snowflake, poll_id: Snowflake!, choice_id: String! | `Poll` | no |  |
| `leave_event_queue` | type: String!, type_id: Snowflake! | `Boolean` | no |  |
| `suggest_matchmaking_user` | league_id: Snowflake!, game: String!, game_bucket: String!, requestee_id: Snowflake! | `Message` | no |  |
| `delete_company` | company_id: Snowflake! | `Company` | no |  |
| `verify_confirm_one_click` | location: Location | `UserProfile` | no |  |
| `reset_password_with_code` | code: String!, password: String!, email_or_phone: String! | `Boolean` | no |  |
| `league_update_display_order` | v_display_order: [Int], k_display_order: [Snowflake] | `Boolean` | no |  |
| `import_league_users` | user_ids: [Snowflake], src_league_id: Snowflake!, dest_league_id: Snowflake! | `Boolean` | no |  |
| `claim_gift` | message_id: Snowflake!, parent_id: Snowflake!, item_id: Snowflake! | `Item` | no |  |
| `league_update_scoring_settings` | league_id: Snowflake!, k_scoring_settings: [String], v_scoring_settings: [Float] | `League` | no |  |
| `order_contract` | event_id: Snowflake!, market_id: Snowflake!, ask_quantity: Int!, expected_provider_fee: String!, expected_sleeper_fee: String!, side: String!, slippage_buffer_cents: Int, ask_price_cents: Int! | `ContractOrder` | no |  |
| `update_channel_tags` | channel_id: Snowflake!, topic_id: Snowflake!, channel_tags: [String] | `Topic` | no |  |
| `remove_divisions` | league_id: Snowflake! | `[Roster]` | no |  |
| `verify_user_profile` | location: Location, city: String!, first_name: String!, last_name: String!, region: String!, date_of_birth: String!, country_code: String!, address1: String!, address2: String, national_id: String, postal_code: String!, document_uuid: String, docv_transaction_token: String | `UserProfile` | no |  |
| `add_matchup_leg_ban` | position: String!, round: Int!, leg: Int!, league_id: Snowflake!, hero_id: String!, roster_id: Int! | `MatchupLeg` | no |  |
| `chop_roster` | league_id: Snowflake!, roster_id: Int! | `Roster` | no |  |
| `unwatch_all_players` | season: String, season_type: String, sport: String! | `Boolean` | no |  |
| `batch_upsert_league_dues_users` | league_id: Snowflake!, league_dues_users: [LeagueDuesUserInput]!, expected_hash: String! | `LeagueDueUsersWithHash` | no |  |
| `update_league_group_draft_settings` | season: String!, season_type: String!, sport: String!, company_id: Snowflake!, group_id: Snowflake!, k_draft_settings: [String], v_draft_settings: [Int] | `LeagueGroup` | no |  |
| `create_post` | text: String, attachment: Map, attachment_type: String, channel_tags: [String], player_tags: [String], attachment_id: Snowflake, sport_tags: [String], team_tags: [String], mod_post: Boolean | `Topic` | no |  |
| `gift_item_to_user` | item_id: Snowflake!, receiver_user_id: Snowflake! | `Item` | no |  |
| `accept_legal_agreement` | agreement_type: String! | `Boolean` | no |  |
| `aeropay_withdraw` | location: Location!, currency_type: String!, wallet_type: String, currency_amount: Float!, payment_method: PaymentMethodInput! | `CurrencyTransaction` | no |  |
| `claim_draft_slot` | slot: Int!, sport: String!, draft_id: Snowflake! | `Draft` | no |  |
| `confirm_payment_methods` | national_id: String! | `Boolean` | no |  |
| `roster_change_owner` | league_id: Snowflake!, roster_id: Int!, owner_id: Snowflake | `Roster` | no |  |
| `update_channel` | name: String!, description: String, sort_order: String!, sport: String!, channel_id: Snowflake!, is_private: Boolean!, sharding_enabled: Boolean!, max_message_length: Int, max_topic_length: Int, message_create_amount: Int, message_create_ban: Int, message_create_delay: Int, message_create_period: Int, reaction_create_delay: Int, topic_create_delay: Int, avatar_url: String | `Channel` | no |  |
| `reorder_roles` | type: String!, type_id: Snowflake!, role_ids: [Snowflake] | `Boolean` | no |  |
| `add_role_permission` | type: String!, type_id: Snowflake!, role_id: Snowflake!, permission: String! | `Boolean` | no |  |
| `update_draft_type` | type: String!, sport: String!, draft_id: Snowflake! | `Draft` | no |  |
| `add_matchup_leg_pick` | position: String!, round: Int!, leg: Int!, league_id: Snowflake!, hero_id: String!, roster_id: Int! | `MatchupLeg` | no |  |
| `add_favorite_team` | sport: String!, team: String! | `Boolean` | no |  |
| `dm_unpaid_league_dues` | league_id: Snowflake! | `String` | no |  |
| `update_league_group_roster_positions` | season: String!, season_type: String!, sport: String!, company_id: Snowflake!, roster_positions: [String], group_id: Snowflake! | `LeagueGroup` | no |  |
| `claim_shared_promo` | share_id: Snowflake!, gifter_user_id: Snowflake! | `Promo` | no |  |
| `delete_draft` | sport: String!, draft_id: Snowflake! | `Draft` | no |  |
| `set_responsible_gaming_limit` | identifier: String!, amount: Int!, frequency: String!, limit_scope: String | `ResponsibleGamingLimit` | no |  |
| `create_pending_user` | real_name: String!, email_or_phone: String! | `User` | no |  |
| `enter_daily_draft_bonuses` | location: Location!, sport: String!, source_pool_id: Snowflake!, bonuses: Map! | `[UserPool]` | no |  |
| `sync_badge_count` | count: Int! | `String` | no |  |
| `clone_draft` | sport: String!, draft_id: Snowflake! | `Draft` | no |  |
| `create_poll` | prompt: String, choices: [String], k_metadata: [String], v_metadata: [String] | `Poll` | no |  |
| `update_user_summoner_name` | region: String!, summoner_name: String! | `User` | no |  |
| `use_item` | item_id: Snowflake! | `Item` | no |  |
| `league_remove_user` | user_id: Snowflake!, league_id: Snowflake! | `League` | no |  |
| `update_draft_settings` | sport: String!, draft_id: Snowflake!, k_settings: [String], v_settings: [Int] | `Draft` | no |  |
| `add_league_player_note` | player_id: String!, league_id: Snowflake!, note: String! | `LeaguePlayer` | no |  |
| `update_user_roster_positions` | season: String!, season_type: String!, sport: String!, roster_positions: [String], roster_id: Snowflake! | `UserRoster` | no |  |
| `upsert_league_dues_config` | enabled: Boolean, amount: Int!, league_id: Snowflake!, notes: String, reminders_enabled: Boolean | `LeagueDuesConfig` | no |  |
| `react_to_draft_pick` | sport: String!, draft_id: Snowflake!, pick_no: Int!, reaction: String | `DraftPick` | no |  |
| `tip_message_author` | message_id: Snowflake!, parent_id: Snowflake!, currency_type: String!, currency_amount: Float! | `UserTipTransactionLog` | no |  |
| `draft_make_offer` | slot: Int!, amount: Int!, sport: String!, player_id: String!, draft_id: Snowflake!, pick_no: Int | `DraftOffer` | no |  |
| `update_league_group_settings` | season: String!, season_type: String!, sport: String!, company_id: Snowflake!, group_id: Snowflake!, k_settings: [String], v_settings: [Int] | `LeagueGroup` | no |  |

## Subscription root (0)

_None exposed in this schema._
