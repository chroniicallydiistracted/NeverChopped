import importlib
import importlib.util
import inspect
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

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

SEASON_TYPE_LABELS = {
    "pre": "Preseason",
    "regular": "Regular Season",
    "post": "Postseason",
    "playin": "Play-In",
}

CACHE_DIR = Path(os.environ.get("PYESPN_CACHE_DIR", Path(__file__).resolve().parent / ".cache"))
CACHE_FILE = CACHE_DIR / "espn_schedule_cache.json"
CACHE_TTL_SECONDS = int(os.environ.get("PYESPN_SCHEDULE_CACHE_TTL", "300"))
_CACHE_DISABLED_ENV = os.environ.get("PYESPN_SCHEDULE_CACHE_DISABLED", "")
_CACHE_DISABLED = CACHE_TTL_SECONDS <= 0 or _CACHE_DISABLED_ENV.lower() in {"1", "true", "yes", "on"}
if os.environ.get("PYESPN_FAKE_STATE_PATH"):
    _CACHE_DISABLED = True
CACHE_ENABLED = not _CACHE_DISABLED
if not CACHE_ENABLED:
    CACHE_TTL_SECONDS = 0

_CACHE_STATE: Optional[Dict[str, Any]] = None

_SCHEDULE_CLASS = None
_FETCH_ESPN_DATA = None
_LOOKUP_LEAGUE_API_INFO = None
_API_VERSION = None
_DEPENDENCIES_CHECKED = False


def _ensure_cache_loaded() -> Dict[str, Any]:
    global _CACHE_STATE
    if not CACHE_ENABLED:
        _CACHE_STATE = {}
        return _CACHE_STATE
    if _CACHE_STATE is not None:
        return _CACHE_STATE
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass
    try:
        with CACHE_FILE.open("r", encoding="utf-8") as handle:
            _CACHE_STATE = json.load(handle)
    except Exception:
        _CACHE_STATE = {}
    return _CACHE_STATE


def _read_cache(key: str) -> Optional[Dict[str, Any]]:
    if not CACHE_ENABLED:
        return None
    cache = _ensure_cache_loaded()
    entry = cache.get(key)
    if not isinstance(entry, dict):
        return None
    ts = entry.get("ts")
    if not isinstance(ts, (int, float)):
        return None
    if CACHE_TTL_SECONDS > 0 and time.time() - ts > CACHE_TTL_SECONDS:
        return None
    data = entry.get("data")
    if not isinstance(data, dict):
        return None
    return data


def _write_cache(key: str, value: Dict[str, Any]) -> None:
    if not CACHE_ENABLED:
        return
    cache = _ensure_cache_loaded()
    cache[key] = {"data": value, "ts": time.time()}
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        with CACHE_FILE.open("w", encoding="utf-8") as handle:
            json.dump(cache, handle, ensure_ascii=False)
    except Exception:
        pass


def normalize_season_type(raw: str) -> str:
    key = raw.lower()
    return SEASON_TYPE_ALIASES.get(key, key)


def _hydrate_core_dependencies():
    global _SCHEDULE_CLASS, _FETCH_ESPN_DATA, _LOOKUP_LEAGUE_API_INFO, _API_VERSION, _DEPENDENCIES_CHECKED
    if _DEPENDENCIES_CHECKED:
        return
    try:
        schedule_spec = importlib.util.find_spec("pyespn.classes.schedule")
    except ModuleNotFoundError:
        schedule_spec = None
    if schedule_spec is not None:
        schedule_module = importlib.import_module("pyespn.classes.schedule")
        _SCHEDULE_CLASS = getattr(schedule_module, "Schedule", None)
    try:
        utilities_spec = importlib.util.find_spec("pyespn.utilities")
    except ModuleNotFoundError:
        utilities_spec = None
    if utilities_spec is not None:
        utilities_module = importlib.import_module("pyespn.utilities")
        _FETCH_ESPN_DATA = getattr(utilities_module, "fetch_espn_data", None)
        _LOOKUP_LEAGUE_API_INFO = getattr(utilities_module, "lookup_league_api_info", None)
    try:
        version_spec = importlib.util.find_spec("pyespn.data.version")
    except ModuleNotFoundError:
        version_spec = None
    if version_spec is not None:
        version_module = importlib.import_module("pyespn.data.version")
        _API_VERSION = getattr(version_module, "espn_api_version", None)
    _DEPENDENCIES_CHECKED = True


def _instantiate_modern_schedule(espn: PYESPN, season_type: str, season: int):
    _hydrate_core_dependencies()
    schedule_cls = _SCHEDULE_CLASS
    if schedule_cls is None:
        return None
    try:
        signature = inspect.signature(schedule_cls)
    except (TypeError, ValueError):
        signature = None
    if not signature:
        return None
    parameters = signature.parameters
    required = {"espn_instance", "season", "schedule_type"}
    if not required.issubset(parameters.keys()):
        return None
    kwargs = {
        "espn_instance": espn,
        "season": season,
        "schedule_type": season_type,
    }
    optional_flags = {"load_current_week_only", "load_odds", "load_plays"}
    for key in optional_flags.intersection(parameters.keys()):
        kwargs[key] = False
    try:
        return schedule_cls(**kwargs)
    except TypeError:
        return None
    except Exception:
        return None


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
    modern_schedule = _instantiate_modern_schedule(espn, season_type, season)
    if modern_schedule is not None:
        return modern_schedule
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


def ensure_plain_team(value: Any) -> Dict[str, Any]:
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    if hasattr(value, "to_dict") and callable(getattr(value, "to_dict")):
        try:
            data = value.to_dict()
            if isinstance(data, dict):
                return data
        except Exception:
            return {}
    return {}


def resolve_competitor_team(event: Any, event_dict: Dict[str, Any], competitor: Dict[str, Any], attr_name: str) -> Dict[str, Any]:
    team_value = competitor.get("team") if isinstance(competitor, dict) else None
    if isinstance(team_value, dict) and "$ref" not in team_value:
        return team_value
    event_attr = ensure_plain_team(getattr(event, attr_name, None))
    if event_attr:
        return event_attr
    if isinstance(team_value, dict):
        ref = team_value.get("$ref")
        teams_payload = event_dict.get("teams")
        if isinstance(ref, str) and isinstance(teams_payload, dict):
            deref = teams_payload.get(ref)
            if isinstance(deref, dict):
                return deref
    if isinstance(team_value, dict):
        return team_value
    return {}


def pick_competitor(competitors: Iterable[Dict[str, Any]], side: str) -> Dict[str, Any]:
    for competitor in competitors:
        if competitor.get("homeAway") == side:
            return competitor
    return {}


def extract_status(status: Any) -> Optional[str]:
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
        detail = status_type.get("detail")
        if detail:
            return detail
    if isinstance(status_type, str):
        return status_type
    return status.get("type") if isinstance(status.get("type"), str) else None


def gather_week_numbers(schedule: Any) -> List[int]:
    weeks: List[int] = []
    week_iterable = getattr(schedule, "weeks", None)
    if not week_iterable:
        return weeks
    for week_obj in week_iterable:
        number = getattr(week_obj, "week_number", None)
        if number is None:
            continue
        try:
            value = int(str(number))
        except (TypeError, ValueError):
            continue
        if value not in weeks:
            weeks.append(value)
    weeks.sort()
    return weeks


def detect_current_week(schedule: Any) -> Optional[int]:
    current = getattr(schedule, "current_week", None)
    if current is None:
        return None
    number = getattr(current, "week_number", None)
    if number is None:
        return None
    try:
        return int(str(number))
    except (TypeError, ValueError):
        return None


def build_season_summary(espn: PYESPN, season: int) -> Tuple[Dict[str, Any], Dict[str, str], Dict[str, Any], Optional[int], Optional[str]]:
    summaries: Dict[str, Any] = {}
    schedules: Dict[str, Any] = {}
    for season_type in ("pre", "regular", "post", "playin"):
        schedule = load_schedule_for_type(espn, season_type, season)
        schedules[season_type] = schedule
        weeks = gather_week_numbers(schedule)
        current_week = detect_current_week(schedule)
        summaries[season_type] = {
            "id": season_type,
            "label": SEASON_TYPE_LABELS.get(season_type, season_type.title()),
            "weeks": weeks,
            "current_week": current_week,
        }
    week_to_type: Dict[str, str] = {}
    for season_type, info in summaries.items():
        for week_number in info.get("weeks", []):
            key = str(week_number)
            if key not in week_to_type:
                week_to_type[key] = season_type
    default_week = None
    default_type = None
    regular = summaries.get("regular", {})
    if regular.get("current_week"):
        default_week = regular["current_week"]
        default_type = "regular"
    elif regular.get("weeks"):
        default_week = regular["weeks"][0]
        default_type = "regular"
    else:
        for candidate in ("post", "pre", "playin"):
            weeks = summaries.get(candidate, {}).get("weeks") or []
            if weeks:
                default_week = weeks[0]
                default_type = candidate
                break
    return summaries, week_to_type, schedules, default_week, default_type


def build_payload(events: Iterable[Any], week: int, season: int, season_type: str) -> List[Dict[str, Any]]:
    payload: List[Dict[str, Any]] = []
    for event in events:
        try:
            event_dict = event.to_dict(load_play_by_play=False)
        except TypeError:
            event_dict = event.to_dict()
        competitions = event_dict.get("competitions") or []
        competition = competitions[0] if competitions else {}
        competitors = competition.get("competitors") or []
        home_competitor = pick_competitor(competitors, "home")
        away_competitor = pick_competitor(competitors, "away")
        home_team = resolve_competitor_team(event, event_dict, home_competitor, "home_team")
        away_team = resolve_competitor_team(event, event_dict, away_competitor, "away_team")
        status_value = extract_status(competition.get("status"))
        game_id = getattr(event, "event_id", None) or event_dict.get("id")
        entry = {
            "game_id": str(game_id) if game_id is not None else None,
            "week": week,
            "season": season,
            "season_type": season_type,
            "date": event_dict.get("date"),
            "status": status_value,
            "home_team": home_team,
            "away_team": away_team,
        }
        payload.append(entry)
    return payload


def main():
    if len(sys.argv) < 4:
        print(json.dumps({"entries": [], "meta": None}, ensure_ascii=False))
        return
    season_type = sys.argv[1]
    normalized_type = normalize_season_type(season_type)
    try:
        season = int(sys.argv[2])
        week = int(sys.argv[3])
    except ValueError:
        print(json.dumps({"entries": [], "meta": None}, ensure_ascii=False))
        return
    extra_args = sys.argv[4:]
    force_refresh = False
    for arg in extra_args:
        lowered = arg.lower()
        if lowered in {"--force", "force", "refresh", "--refresh", "true"}:
            force_refresh = True
    cache_key = f"{season}:{normalized_type}:{week}"
    if not force_refresh:
        cached = _read_cache(cache_key)
        if cached is not None:
            print(json.dumps(cached, ensure_ascii=False))
            return
    espn = PYESPN("nfl")
    summaries, week_to_type, schedules, default_week, default_type = build_season_summary(espn, season)
    resolved_type = normalized_type
    if normalized_type == "regular":
        resolved_type = week_to_type.get(str(week), normalized_type)
    elif normalized_type not in {"pre", "post", "playin"}:
        fallback_type = week_to_type.get(str(week))
        if fallback_type in {"pre", "regular", "post", "playin"}:
            resolved_type = fallback_type
        else:
            resolved_type = "regular"
    schedule = schedules.get(resolved_type)
    if schedule is None:
        schedule = load_schedule(espn, resolved_type, season)
    events: List[Any] = []
    if schedule is not None:
        try:
            events = schedule.get_events(week_num=week)
        except Exception:
            events = []
    entries = build_payload(events, week, season, resolved_type)
    generated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    meta = {
        "season": season,
        "requested_season_type": normalized_type,
        "resolved_season_type": resolved_type,
        "requested_week": week,
        "default_week": default_week,
        "default_season_type": default_type,
        "season_types": list(summaries.values()),
        "week_to_season_type": week_to_type,
        "generated_at": generated_at,
    }
    response = {"entries": entries, "meta": meta}
    _write_cache(cache_key, response)
    print(json.dumps(response, ensure_ascii=False))


if __name__ == "__main__":
    main()
