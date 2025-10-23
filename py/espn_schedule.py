import importlib
import importlib.util
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

SEASON_TYPE_IDS = {
    "pre": "1",
    "regular": "2",
    "post": "3",
    "playin": "4",
}

_SCHEDULE_CLASS = None
_FETCH_ESPN_DATA = None
_LOOKUP_LEAGUE_API_INFO = None
_API_VERSION = None
_DEPENDENCIES_CHECKED = False


def normalize_season_type(raw: str) -> str:
    key = raw.lower()
    return SEASON_TYPE_ALIASES.get(key, key)


def _hydrate_core_dependencies():
    global _SCHEDULE_CLASS, _FETCH_ESPN_DATA, _LOOKUP_LEAGUE_API_INFO, _API_VERSION, _DEPENDENCIES_CHECKED
    if _DEPENDENCIES_CHECKED:
        return
    schedule_spec = importlib.util.find_spec("pyespn.classes.schedule")
    if schedule_spec is not None:
        schedule_module = importlib.import_module("pyespn.classes.schedule")
        _SCHEDULE_CLASS = getattr(schedule_module, "Schedule", None)
    utilities_spec = importlib.util.find_spec("pyespn.utilities")
    if utilities_spec is not None:
        utilities_module = importlib.import_module("pyespn.utilities")
        _FETCH_ESPN_DATA = getattr(utilities_module, "fetch_espn_data", None)
        _LOOKUP_LEAGUE_API_INFO = getattr(utilities_module, "lookup_league_api_info", None)
    version_spec = importlib.util.find_spec("pyespn.data.version")
    if version_spec is not None:
        version_module = importlib.import_module("pyespn.data.version")
        _API_VERSION = getattr(version_module, "espn_api_version", None)
    _DEPENDENCIES_CHECKED = True


def _build_schedule_from_core(espn: PYESPN, season_type: str, season: int):
    _hydrate_core_dependencies()
    if not all([_SCHEDULE_CLASS, _FETCH_ESPN_DATA, _API_VERSION]):
        return None
    season_type_id = SEASON_TYPE_IDS.get(season_type)
    if not season_type_id:
        return None
    api_info = getattr(espn, "api_mapping", None)
    if not api_info and _LOOKUP_LEAGUE_API_INFO and hasattr(espn, "league_abbv"):
        try:
            api_info = _LOOKUP_LEAGUE_API_INFO(league_abbv=espn.league_abbv)
        except Exception:
            api_info = None
    if not api_info:
        return None
    base_url = (
        f"http://sports.core.api.espn.com/{_API_VERSION}/sports/"
        f"{api_info.get('sport')}/leagues/{api_info.get('league')}/"
        f"seasons/{season}/types/{season_type_id}/weeks"
    )
    try:
        content = _FETCH_ESPN_DATA(base_url)
    except Exception:
        return None
    page_count = content.get("pageCount") or 0
    week_refs = []
    for page in range(1, page_count + 1):
        page_url = f"{base_url}?page={page}"
        try:
            page_content = _FETCH_ESPN_DATA(page_url)
        except Exception:
            continue
        for item in page_content.get("items", []):
            ref = item.get("$ref")
            if ref:
                week_refs.append(ref)
    if not week_refs:
        return None
    try:
        return _SCHEDULE_CLASS(schedule_list=week_refs, espn_instance=espn)
    except Exception:
        return None


def load_schedule_for_type(espn: PYESPN, season_type: str, season: int):
    if hasattr(espn, "load_season_schedule"):
        if season_type == "pre":
            espn.load_season_schedule(
                season=season,
                load_regular_season=False,
                load_preseason=True,
            )
            return getattr(espn.league, "preseason_schedules", {}).get(season)
        if season_type == "post":
            espn.load_season_schedule(
                season=season,
                load_regular_season=False,
                load_postseason=True,
            )
            return getattr(espn.league, "postseason_schedules", {}).get(season)
        if season_type == "playin":
            espn.load_season_schedule(
                season=season,
                load_regular_season=False,
                load_play_in=True,
            )
            return getattr(espn.league, "play_in_schedules", {}).get(season)
        espn.load_season_schedule(season=season)
        return getattr(espn.league, "schedules", {}).get(season)
    return _build_schedule_from_core(espn, season_type, season)


def load_schedule(espn: PYESPN, season_type: str, season: int):
    return load_schedule_for_type(espn, season_type, season)


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
