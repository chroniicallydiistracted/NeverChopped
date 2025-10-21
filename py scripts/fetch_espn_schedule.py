
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

        # Load season schedule using the documented helper
        espn.load_season_schedule(season=year)

        # Extract games for the specific week from the cached league schedule
        week_games = []
        schedule = espn.league.schedules.get(year) if hasattr(espn, 'league') else None

        if schedule:
            for week_schedule in schedule.weeks:
                if week_schedule.week_number == week:
                    for event in week_schedule.events:
                        if not any(g['id'] == event.event_id for g in week_games):
                            home_competitor = next((c for c in event.competitors if getattr(c, 'home_away', None) == 'home'), None)
                            away_competitor = next((c for c in event.competitors if getattr(c, 'home_away', None) == 'away'), None)

                            week_games.append({
                                'id': event.event_id,
                                'week': week_schedule.week_number,
                                'date': event.date,
                                'home_team': home_competitor.team.name if home_competitor and home_competitor.team else None,
                                'away_team': away_competitor.team.name if away_competitor and away_competitor.team else None,
                                'home_score': home_competitor.score.value if home_competitor and getattr(home_competitor, 'score', None) else None,
                                'away_score': away_competitor.score.value if away_competitor and getattr(away_competitor, 'score', None) else None,
                                'status': event.status
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
