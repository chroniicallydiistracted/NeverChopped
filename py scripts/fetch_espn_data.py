
import os
import sys
import json
from datetime import datetime
import pyespn

def fetch_game_data(game_id):
    """
    Fetch detailed game data using pyespn including play data for animation
    """
    try:
        # Initialize the ESPN API client for NFL
        espn = pyespn.PYESPN('nfl')

        # Get game data with play-by-play data
        game_data = espn.get_game_info(game_id, load_play_by_play=True)

        # Extract play data from drives
        plays = []
        if game_data.drives:
            for drive in game_data.drives:
                if drive.plays:
                    for play in drive.plays:
                        # Extract relevant animation data
                        play_data = {
                            "id": play.id,
                            "sequence": play.sequence_number,
                            "type": play.type,
                            "text": play.text,
                            "shortText": play.short_text,
                            "altText": play.alt_text,
                            "quarter": play.period.number if play.period else 1,
                            "clock": {
                                "minutes": play.clock.displayValue.split(':')[0] if play.clock and ':' in play.clock.displayValue else 0,
                                "seconds": play.clock.displayValue.split(':')[1] if play.clock and ':' in play.clock.displayValue else 0,
                            },
                            "homeScore": play.home_score,
                            "awayScore": play.away_score,
                            "scoringPlay": play.scoring_play,
                            "scoreValue": play.score_value,
                            "statYardage": play.stat_yardage,
                            "start": play.start,
                            "end": play.end,
                            "team": {
                                "id": play.team.team_id if play.team else None,
                                "name": play.team.name if play.team else None,
                                "abbreviation": play.team.abbreviation if play.team else None
                            },
                            "participants": []
                        }

                        # Process participants
                        if play.participants:
                            for participant in play.participants:
                                athlete_data = {
                                    "id": participant.get("athlete", {}).get("id"),
                                    "name": participant.get("athlete", {}).get("displayName"),
                                    "position": participant.get("position", {}).get("abbreviation"),
                                    "team": participant.get("team", {}).get("abbreviation"),
                                    "stats": {}
                                }

                                # Extract relevant stats
                                if participant.get("stats"):
                                    for stat in participant["stats"]:
                                        athlete_data["stats"][stat["name"]] = stat["value"]

                                play_data["participants"].append(athlete_data)

                        # Extract coordinate data if available
                        if play.coordinate:
                            play_data["coordinate"] = {
                                "x": play.coordinate.get("x"),
                                "y": play.coordinate.get("y")
                            }

                        plays.append(play_data)

        # Combine the data
        combined_data = {
            "game": {
                "id": game_data.event_id,
                "date": game_data.date,
                "homeTeam": {
                    "id": game_data.home_team.team_id if game_data.home_team else None,
                    "name": game_data.home_team.name if game_data.home_team else None,
                    "abbreviation": game_data.home_team.abbreviation if game_data.home_team else None
                },
                "awayTeam": {
                    "id": game_data.away_team.team_id if game_data.away_team else None,
                    "name": game_data.away_team.name if game_data.away_team else None,
                    "abbreviation": game_data.away_team.abbreviation if game_data.away_team else None
                },
                "status": game_data.status,
                "quarter": game_data.situation.period if game_data.situation else None,
                "clock": game_data.situation.clock if game_data.situation else None
            },
            "plays": plays
        }

        return combined_data
    except Exception as e:
        print(f"Error fetching data for game {game_id}: {str(e)}")
        return None

def fetch_week_games(week, year):
    """
    Fetch all games for a specific week
    """
    try:
        # Initialize the ESPN API client for NFL
        espn = pyespn.PYESPN('nfl')

        # Load season schedule
        espn.load_season_schedule(season=year)

        # Extract games for the specific week
        week_games = []

        # Check each team's schedule for the specified week
        for team in espn.teams:
            # Access team's schedule through the schedule attribute
            if hasattr(team, 'schedule') and year in team.schedule:
                for game in team.schedule[year]:
                    # Check if this game is in the requested week
                    if hasattr(game, 'week') and game.week == week:
                        # Add to week games if not already added
                        if not any(g['id'] == game.id for g in week_games):
                            week_games.append({
                                'id': game.id,
                                'week': game.week,
                                'date': str(game.date) if hasattr(game, 'date') else None,
                                'home_team': game.home_team.name if hasattr(game, 'home_team') else None,
                                'away_team': game.away_team.name if hasattr(game, 'away_team') else None,
                                'home_score': game.home_score if hasattr(game, 'home_score') else None,
                                'away_score': game.away_score if hasattr(game, 'away_score') else None,
                                'status': game.status if hasattr(game, 'status') else None
                            })

        return week_games
    except Exception as e:
        print(f"Error fetching week {week} data: {str(e)}")
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python fetch_espn_data.py <game_id> [output_file]")
        sys.exit(1)

    game_id = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None

    data = fetch_game_data(game_id)

    if data:
        if output_file:
            with open(output_file, 'w') as f:
                json.dump(data, f, indent=2)
            print(f"Data saved to {output_file}")
        else:
            print(json.dumps(data, indent=2))
    else:
        print("Failed to fetch data")
        sys.exit(1)
