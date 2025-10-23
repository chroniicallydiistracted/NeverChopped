import json
import sys
from pyespn import PYESPN


def _normalize_sequence(items):
    normalized = []
    for item in items:
        if hasattr(item, "to_dict"):
            normalized.append(item.to_dict())
        elif isinstance(item, dict):
            normalized.append(item)
        elif hasattr(item, "__dict__"):
            normalized.append({key: value for key, value in vars(item).items() if not key.startswith("_")})
        else:
            normalized.append(item)
    return normalized


def main():
    if len(sys.argv) < 2:
        print("{}")
        return
    try:
        event_id = int(sys.argv[1])
    except ValueError:
        print("{}")
        return
    espn = PYESPN('nfl')
    event = espn.get_game_info(event_id=event_id)
    event.load_play_by_play()
    try:
        payload = event.to_dict(load_play_by_play=True)
    except TypeError:
        payload = event.to_dict()
    drives = getattr(event, "drives", []) or []
    plays = getattr(event, "plays", []) or []
    if drives:
        payload["drives"] = _normalize_sequence(drives)
    if plays:
        payload["plays"] = _normalize_sequence(plays)
    print(json.dumps(payload, ensure_ascii=False))


if __name__ == "__main__":
    main()
