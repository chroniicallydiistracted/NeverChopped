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
    espn = PYESPN('nfl')
    event = espn.get_game_info(event_id=event_id)
    print(json.dumps(event.to_dict(load_play_by_play=False), ensure_ascii=False))


if __name__ == "__main__":
    main()
