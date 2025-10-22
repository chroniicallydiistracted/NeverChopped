import pyespn

def fetch_schedule(week, year):
    schedule = pyespn.get_schedule(year)
    week_schedule = [
        {
            "game_id": event["event_id"],
            "week": event["week"],
            "status": event["status"]["type"]["name"],
            "date": event["date"],
            "home": event["competitions"][0]["competitors"][0]["team"]["abbreviation"],
            "away": event["competitions"][0]["competitors"][1]["team"]["abbreviation"],
        }
        for event in schedule
        if event["week"] == week
    ]
    return week_schedule
