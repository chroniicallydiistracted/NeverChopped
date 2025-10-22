# Changelog

## 2025-10-22
- Normalized PyESPN season-type handling across the Python schedule script, front-end API helpers, and Sleeper helper so NFL requests always use the documented `pre`/`regular`/`post`/`playin` keys.
- Simplified the PyESPN CLI scripts to accept validated arguments and return canonical JSON directly from the official library.
- Replaced the legacy temporary-file workflow in `scripts/fetch-espn-data.ts` with direct calls to the new PyESPN entrypoints for play-by-play and schedule data.
- Added command-line affordances to the developer script for fetching schedules via the new endpoints.

## 2025-10-23
- Updated `py/espn_schedule.py` to emit the canonical PyESPN season type in every schedule item, keeping downstream NFL views aligned with the documented `pre`/`regular`/`post`/`playin` values.
