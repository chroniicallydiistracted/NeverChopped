
import os
import sys
import json
from datetime import datetime
import pyespn

def fetch_week_games(week, year):
    """
    Fetch all games for a specific week using pyespn
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
    if len(sys.argv) < 3:
        print("Usage: python fetch_espn_schedule.py <week> <year> [output_file]")
        sys.exit(1)

    week = int(sys.argv[1])
    year = int(sys.argv[2])
    output_file = sys.argv[3] if len(sys.argv) > 3 else None

    data = fetch_week_games(week, year)

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
