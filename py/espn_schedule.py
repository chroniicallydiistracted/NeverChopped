import json
import sys
from pyespn import PYESPN

SEASON_TYPE_ALIASES = {
    "preseason": "pre",
    "pre-season": "pre",
    "pre": "pre",
    "regular": "regular",
    "regularseason": "regular",
    "regular_season": "regular",
    "post": "post",
    "postseason": "post",
    "post-season": "post",
    "playoff": "post",
    "playoffs": "post",
    "playin": "playin",
    "play_in": "playin",
    "play-in": "playin",
}


def normalize_season_type(raw: str) -> str:
    key = raw.lower()
    return SEASON_TYPE_ALIASES.get(key, key)


def load_schedule(espn: PYESPN, season_type: str, season: int):
    normalized = normalize_season_type(season_type)
    if normalized == "pre":
        espn.load_season_schedule(
            season=season,
            load_regular_season=False,
            load_preseason=True,
        )
        return espn.league.preseason_schedules.get(season)
    if normalized == "post":
        espn.load_season_schedule(
            season=season,
            load_regular_season=False,
            load_postseason=True,
        )
        return espn.league.postseason_schedules.get(season)
    if normalized == "playin":
        espn.load_season_schedule(
            season=season,
            load_regular_season=False,
            load_play_in=True,
        )
        return espn.league.play_in_schedules.get(season)
    espn.load_season_schedule(season=season)
    return espn.league.schedules.get(season)


def pick_competitor(competitors, side):
    for competitor in competitors:
        if competitor.get("homeAway") == side:
            return competitor
    return {}


def extract_status(status):
    if not isinstance(status, dict):
        return status if isinstance(status, str) else None
    status_type = status.get("type")
    if isinstance(status_type, dict):
        state = status_type.get("state")
        if state:
            return state
        description = status_type.get("description")
        if description:
            return description
    if isinstance(status_type, str):
        return status_type
    return status.get("type")


def main():
    if len(sys.argv) < 4:
        print("[]")
        return
    season_type = sys.argv[1]
    normalized_type = normalize_season_type(season_type)
    try:
        season = int(sys.argv[2])
        week = int(sys.argv[3])
    except ValueError:
        print("[]")
        return

    espn = PYESPN('nfl')
    schedule = load_schedule(espn, normalized_type, season)
    if schedule is None:
        print("[]")
        return

    try:
        events = schedule.get_events(week)
    except Exception:
        events = []

    payload = []
    for event in events:
        event_dict = event.to_dict()
        competitions = event_dict.get("competitions") or []
        competition = competitions[0] if competitions else {}
        competitors = competition.get("competitors") or []
        home = pick_competitor(competitors, "home")
        away = pick_competitor(competitors, "away")
        home_team = home.get("team") or {}
        away_team = away.get("team") or {}
        status = extract_status(competition.get("status"))
        game_id = getattr(event, "event_id", None) or event_dict.get("id")
        payload.append({
            "game_id": str(game_id) if game_id is not None else None,
            "week": week,
            "season": season,
            "season_type": normalized_type,
            "date": event_dict.get("date"),
            "status": status,
            "home_team": home_team,
            "away_team": away_team,
        })

    print(json.dumps(payload, ensure_ascii=False))


if __name__ == "__main__":
    main()
