import argparse, json
from collections import defaultdict
from pyespn import PYESPN

def type_name(v):
    if v is None: return "null"
    if isinstance(v, bool): return "bool"
    if isinstance(v, int): return "int"
    if isinstance(v, float): return "float"
    if isinstance(v, str): return "str"
    if isinstance(v, list): return "list"
    if isinstance(v, dict): return "dict"
    return v.__class__.__name__

def add_schema(x, prefix, schema, max_list=100):
    if isinstance(x, dict):
        for k, v in x.items():
            key = f"{prefix}.{k}" if prefix else k
            schema[key].add(type_name(v))
            add_schema(v, key, schema, max_list)
    elif isinstance(x, list):
        key = f"{prefix}[]" if prefix else "[]"
        schema[key].add("list")
        for i, item in enumerate(x):
            if i >= max_list: break
            add_schema(item, prefix + "[]", schema, max_list)

def to_dict_safe(obj):
    if hasattr(obj, "to_dict"):
        return obj.to_dict()
    if hasattr(obj, "__dict__"):
        d = {k: v for k, v in obj.__dict__.items() if not k.startswith("_")}
        return d
    return obj

def merge_schema_from_objects(objs):
    schema = defaultdict(set)
    for o in objs:
        add_schema(to_dict_safe(o), "", schema)
    return schema

def dump_schema(title, schema):
    print(f"## {title}")
    for k in sorted(schema.keys()):
        print(f"{k}: {','.join(sorted(schema[k]))}")
    print()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--season", type=int, default=2025)
    ap.add_argument("--event-id", type=str, default=None)
    ap.add_argument("--league", type=str, default="nfl")
    args = ap.parse_args()

    espn = PYESPN(args.league)

    league_schema = merge_schema_from_objects([espn.league])
    dump_schema("League", league_schema)

    team_schema = merge_schema_from_objects(espn.teams)
    dump_schema("Team", team_schema)

    espn.load_season_rosters(args.season)
    players = []
    for t in espn.teams:
        r = t.roster.get(args.season) or t.roster.get(str(args.season)) or []
        players.extend(r)
    if players:
        player_schema = merge_schema_from_objects(players)
        dump_schema("Player (roster)", player_schema)

    espn.load_season_team_stats(args.season)
    team_stats = []
    for t in espn.teams:
        stats = t.stats.get(args.season) or t.stats.get(str(args.season)) or []
        team_stats.extend(stats)
    if team_stats:
        stats_schema = merge_schema_from_objects(team_stats)
        dump_schema("Team Stats", stats_schema)

    espn.load_standings(args.season)
    if getattr(espn, "standings", None):
        standings_schema = merge_schema_from_objects([espn.standings.get(args.season) or espn.standings.get(str(args.season)) or {}])
        dump_schema("Standings", standings_schema)

    if args.event_id:
        event = espn.get_game_info(event_id=args.event_id)
        if hasattr(event, "load_play_by_play"):
            event.load_play_by_play()
        event_schema = merge_schema_from_objects([event])
        dump_schema("Event", event_schema)
        drives = getattr(event, "drives", []) or []
        if drives:
            drive_schema = merge_schema_from_objects(drives)
            dump_schema("Drive", drive_schema)
            plays = []
            for d in drives:
                plays.extend(getattr(d, "plays", []) or [])
            if plays:
                play_schema = merge_schema_from_objects(plays)
                dump_schema("Play", play_schema)

if __name__ == "__main__":
    main()
