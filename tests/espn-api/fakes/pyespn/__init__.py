"""Deterministic PyESPN stub used exclusively for automated tests.

The public surface mirrors the documented classes under
``docs/pyespn-source-code`` so the project can exercise the Python entry
points without contacting live ESPN services. Only the NFL league is
implemented because PyESPN usage in this repository is NFL-specific.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional


@dataclass
class _FakeDrive:
    data: Dict[str, object]

    def to_dict(self) -> Dict[str, object]:
        return dict(self.data)


@dataclass
class _FakePlay:
    data: Dict[str, object]

    def to_dict(self) -> Dict[str, object]:
        return dict(self.data)


class _FakeEvent:
    def __init__(self, payload: Dict[str, object]):
        self._payload = dict(payload)
        self.event_id = payload.get("event_id")
        self._date = payload.get("date")
        self.status = payload.get("status")
        self.home_team = payload.get("home_team")
        self.away_team = payload.get("away_team")
        self.drives: List[_FakeDrive] = [
            _FakeDrive(drive) for drive in payload.get("drives", [])
        ]
        self.plays: List[_FakePlay] = [
            _FakePlay(play) for play in payload.get("plays", [])
        ]

    def to_dict(self) -> Dict[str, object]:
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
    payload: Dict[str, object]

    def to_dict(self) -> Dict[str, object]:
        return dict(self.payload)


class _FakeSchedule:
    def __init__(self, season_type: str):
        self._season_type = season_type

    def get_events(self, week_num: int) -> List[_FakeEvent]:
        events = []
        for event in _FAKE_EVENTS.get(self._season_type, {}).get(week_num, []):
            events.append(_FakeEvent(event))
        return events


class _FakeLeague:
    def __init__(self) -> None:
        self.schedules: Dict[int, _FakeSchedule] = {}
        self.preseason_schedules: Dict[int, _FakeSchedule] = {}
        self.postseason_schedules: Dict[int, _FakeSchedule] = {}
        self.play_in_schedules: Dict[int, _FakeSchedule] = {}


def _collect_events() -> Dict[str, Dict[int, List[Dict[str, object]]]]:
    return {
        "regular": {
            7: [
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
            1: [
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
            1: [
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
            1: [
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
    }


_FAKE_EVENTS = _collect_events()
_FAKE_PLAYERS: Dict[int, Dict[str, object]] = {
    15847: {
        "id": "15847",
        "fullName": "Mock Quarterback",
        "displayName": "Mock QB",
        "position": "QB",
        "team": {"id": 1, "abbreviation": "MH"},
    }
}


def _find_event(event_id: int | str) -> Optional[Dict[str, object]]:
    target = str(event_id)
    for buckets in _FAKE_EVENTS.values():
        for events in buckets.values():
            for event in events:
                if str(event.get("event_id")) == target:
                    return event
    return None


class PYESPN:
    def __init__(self, league_abbv: str = "nfl", load_teams: bool = True):
        if league_abbv.lower() != "nfl":
            raise ValueError("Stub PYESPN only supports the NFL league")
        self.league_abbv = league_abbv.lower()
        self.league = _FakeLeague()
        self._load_teams = load_teams

    def load_season_schedule(
        self,
        season: int,
        load_regular_season: bool = True,
        load_preseason: bool = False,
        load_postseason: bool = False,
        load_play_in: bool = False,
    ) -> None:
        if load_preseason:
            self.league.preseason_schedules[season] = _FakeSchedule("pre")
        if load_postseason:
            self.league.postseason_schedules[season] = _FakeSchedule("post")
        if load_play_in:
            self.league.play_in_schedules[season] = _FakeSchedule("playin")
        if load_regular_season:
            self.league.schedules[season] = _FakeSchedule("regular")

    def get_game_info(self, event_id: int | str) -> _FakeEvent:
        event = _find_event(event_id)
        if not event:
            raise ValueError(f"Unknown event id {event_id}")
        return _FakeEvent(event)

    def get_player_info(self, player_id: int | str) -> _FakePlayer:
        data = _FAKE_PLAYERS.get(int(player_id))
        if not data:
            raise ValueError(f"Unknown player id {player_id}")
        return _FakePlayer(data)


__all__ = ["PYESPN"]
