import json
import sys
from pyespn import PYESPN


def main():
    if len(sys.argv) < 2:
        print("{}")
        return
    try:
        player_id = int(sys.argv[1])
    except ValueError:
        print("{}")
        return
    espn = PYESPN('nfl')
    player = espn.get_player_info(player_id=player_id)
    print(json.dumps(player.to_dict(), ensure_ascii=False))


if __name__ == "__main__":
    main()
