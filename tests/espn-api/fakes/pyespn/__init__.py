from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

_CUSTOM_STATE_PATH = os.environ.get("PYESPN_FAKE_STATE_PATH")
_STATE_PATH = (
    Path(_CUSTOM_STATE_PATH).expanduser().resolve()
    if _CUSTOM_STATE_PATH
    else Path(__file__).resolve().with_name("_state.json")
)

_DEFAULT_STATE: Dict[str, Any] = {
    "events": {
        "regular": {
            "7": [
                {
                    "event_id": 401770001,
                    "date": "2025-10-26T17:00Z",
                    "status": "in-progress",
                    "week": 7,
                    "home_team": {
                        "id": 1,
                        "displayName": "Mockington Home",
                        "name": "Mockington Home",
                        "abbreviation": "MH",
                    },
                    "away_team": {
                        "id": 2,
                        "displayName": "Sample City Away",
                        "name": "Sample City Away",
                        "abbreviation": "SA",
                    },
                    "drives": [
                        {
                            "id": "drive-1",
                            "team": "MH",
                            "displayResult": "TD",
                        }
                    ],
                    "plays": [
                        {
                            "id": "play-1",
                            "sequence": 1,
                            "text": "Sample kickoff returned to the 25",
                            "clock": {"displayValue": "15:00"},
                        },
                        {
                            "id": "play-2",
                            "sequence": 2,
                            "text": "Quarterback pass complete",
                            "clock": {"displayValue": "14:45"},
                        },
                    ],
                },
                {
                    "event_id": 401770002,
                    "date": "2025-10-26T20:25Z",
                    "status": "scheduled",
                    "week": 7,
                    "home_team": {
                        "id": 3,
                        "displayName": "Example Home",
                        "name": "Example Home",
                        "abbreviation": "EH",
                    },
                    "away_team": {
                        "id": 4,
                        "displayName": "Example Away",
                        "name": "Example Away",
                        "abbreviation": "EA",
                    },
                    "drives": [],
                    "plays": [],
                },
            ]
        },
        "pre": {
            "1": [
                {
                    "event_id": 401770101,
                    "date": "2025-08-10T00:00Z",
                    "status": "final",
                    "week": 1,
                    "home_team": {
                        "id": 5,
                        "displayName": "Preseason Home",
                        "name": "Preseason Home",
                        "abbreviation": "PH",
                    },
                    "away_team": {
                        "id": 6,
                        "displayName": "Preseason Away",
                        "name": "Preseason Away",
                        "abbreviation": "PA",
                    },
                    "drives": [],
                    "plays": [],
                }
            ]
        },
        "post": {
            "1": [
                {
                    "event_id": 401770201,
                    "date": "2026-01-10T18:30Z",
                    "status": "scheduled",
                    "week": 1,
                    "home_team": {
                        "id": 7,
                        "displayName": "Playoff Home",
                        "name": "Playoff Home",
                        "abbreviation": "PLH",
                    },
                    "away_team": {
                        "id": 8,
                        "displayName": "Playoff Away",
                        "name": "Playoff Away",
                        "abbreviation": "PLA",
                    },
                    "drives": [],
                    "plays": [],
                }
            ]
        },
        "playin": {
            "1": [
                {
                    "event_id": 401770301,
                    "date": "2026-01-05T01:00Z",
                    "status": "scheduled",
                    "week": 1,
                    "home_team": {
                        "id": 9,
                        "displayName": "Play-In Home",
                        "name": "Play-In Home",
                        "abbreviation": "PIH",
                    },
                    "away_team": {
                        "id": 10,
                        "displayName": "Play-In Away",
                        "name": "Play-In Away",
                        "abbreviation": "PIA",
                    },
                    "drives": [],
                    "plays": [],
                }
            ]
        },
    },
    "players": {
        "15847": {
            "id": "15847",
            "fullName": "Mock Quarterback",
            "displayName": "Mock QB",
            "position": "QB",
            "team": {"id": 1, "abbreviation": "MH"},
        }
    },
}


def _deep_copy(value: Any) -> Any:
    return json.loads(json.dumps(value))


def _ensure_state_file() -> None:
    _STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not _STATE_PATH.exists():
        _STATE_PATH.write_text(json.dumps(_DEFAULT_STATE, indent=2), encoding="utf-8")


def _load_state() -> Dict[str, Any]:
    _ensure_state_file()
    try:
        with _STATE_PATH.open("r", encoding="utf-8") as handle:
            loaded = json.load(handle)
            return loaded
    except Exception:
        return _deep_copy(_DEFAULT_STATE)


def _find_event(event_id: int | str) -> Optional[Dict[str, Any]]:
    state = _load_state()
    target = str(event_id)
    events = state.get("events", {})
    for buckets in events.values():
        if not isinstance(buckets, dict):
            continue
        for week_events in buckets.values():
            if not isinstance(week_events, list):
                continue
            for event in week_events:
                if str(event.get("event_id")) == target:
                    return _deep_copy(event)
    return None


def _find_player(player_id: int | str) -> Optional[Dict[str, Any]]:
    state = _load_state()
    players = state.get("players", {})
    data = players.get(str(player_id)) or players.get(int(player_id))
    if data:
        return _deep_copy(data)
    return None


@dataclass
class _FakeDrive:
    data: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return _deep_copy(self.data)


@dataclass
class _FakePlay:
    data: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return _deep_copy(self.data)


class _FakeEvent:
    def __init__(self, payload: Dict[str, Any]):
        self._payload = _deep_copy(payload)
        self.event_id = self._payload.get("event_id")
        self._date = self._payload.get("date")
        self.status = self._payload.get("status")
        self.home_team = _deep_copy(self._payload.get("home_team"))
        self.away_team = _deep_copy(self._payload.get("away_team"))
        self.drives: List[_FakeDrive] = [
            _FakeDrive(_deep_copy(drive)) for drive in self._payload.get("drives", [])
        ]
        self.plays: List[_FakePlay] = [
            _FakePlay(_deep_copy(play)) for play in self._payload.get("plays", [])
        ]

    def to_dict(self, load_play_by_play: bool = False, load_game_odds: bool = False) -> Dict[str, Any]:  # noqa: ARG002
        home = self.home_team or {}
        away = self.away_team or {}
        competitions = [
            {
                "id": str(self.event_id),
                "status": {
                    "type": {
                        "state": self.status,
                        "description": self.status,
                        "detail": self.status,
                    }
                },
                "competitors": [
                    {"homeAway": "home", "team": home},
                    {"homeAway": "away", "team": away},
                ],
            }
        ]
        return {
            "id": str(self.event_id),
            "event_id": str(self.event_id),
            "date": self._date,
            "competitions": competitions,
            "name": f"{away.get('displayName')} at {home.get('displayName')}",
            "shortName": f"{away.get('abbreviation')}@{home.get('abbreviation')}",
        }

    def load_play_by_play(self) -> None:
        return None


@dataclass
class _FakePlayer:
    payload: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return _deep_copy(self.payload)


class _FakeSchedule:
    def __init__(self, season_type: str):
        self._season_type = season_type

    def get_events(self, week_num: int) -> List[_FakeEvent]:
        state = _load_state()
        season_bucket = state.get("events", {}).get(self._season_type, {})
        events = season_bucket.get(str(week_num), [])
        return [_FakeEvent(event) for event in events]


class _FakeLeague:
    def __init__(self) -> None:
        self.schedules: Dict[int, _FakeSchedule] = {}
        self.preseason_schedules: Dict[int, _FakeSchedule] = {}
        self.postseason_schedules: Dict[int, _FakeSchedule] = {}
        self.play_in_schedules: Dict[int, _FakeSchedule] = {}


class PYESPN:
    def __init__(self, league_abbv: str = "nfl", load_teams: bool = True):  # noqa: ARG002
        if league_abbv.lower() != "nfl":
            raise ValueError("Stub PYESPN only supports the NFL league")
        self.league_abbv = league_abbv.lower()
        self.league = _FakeLeague()

    def load_season_schedule(
        self,
        season: int,
        load_regular_season: bool = True,
        load_preseason: bool = False,
        load_postseason: bool = False,
        load_play_in: bool = False,
    ) -> None:
        if load_regular_season:
            self.league.schedules[season] = _FakeSchedule("regular")
        if load_preseason:
            self.league.preseason_schedules[season] = _FakeSchedule("pre")
        if load_postseason:
            self.league.postseason_schedules[season] = _FakeSchedule("post")
        if load_play_in:
            self.league.play_in_schedules[season] = _FakeSchedule("playin")

    def get_game_info(self, event_id: int | str) -> _FakeEvent:
        event = _find_event(event_id)
        if not event:
            raise ValueError(f"Unknown event id {event_id}")
        return _FakeEvent(event)

    def get_player_info(self, player_id: int | str) -> _FakePlayer:
        data = _find_player(player_id)
        if not data:
            raise ValueError(f"Unknown player id {player_id}")
        return _FakePlayer(data)


__all__ = ["PYESPN"]
