import json
import sys
from pyespn import PYESPN


def main():
    if len(sys.argv) < 2:
        print("{}")
        return
    try:
        event_id = int(sys.argv[1])
    except ValueError:
        print("{}")
        return
    espn = PYESPN("nfl")
    event = espn.get_game_info(event_id=event_id)
    event.load_play_by_play()
    payload = event.to_dict(load_play_by_play=True)
    drives = event.drives or []
    plays = event.plays or []
    if drives:
        payload["drives"] = [drive.to_dict() for drive in drives]
    if plays:
        payload["plays"] = [play.to_dict() for play in plays]
    print(json.dumps(payload, ensure_ascii=False))


if __name__ == "__main__":
    main()
