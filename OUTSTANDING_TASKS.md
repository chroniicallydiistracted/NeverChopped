# Outstanding Tasks

- [x] Add automated smoke tests that cover the `/api/espn` routes and their backing Python scripts to verify PyESPN responses stay within expected contracts.
- [x] Introduce caching or memoization in `espn-api-server.cjs` so repeated PyESPN schedule/play-by-play requests do not hammer the upstream service.
- [x] Plumb the `/api/espn/player/:playerId` endpoint into the live view participant UI so official ESPN player metadata is displayed alongside play-by-play participants.
- [x] Validate the expanded ESPN status normalization against live PyESPN responses to ensure postponed, delayed, and canceled mappings cover every upstream variant.
- [x] Implement a periodic PyESPN schedule refresh inside `src/components/SleeperFFHelper.tsx` so NFL statuses stay current without requiring users to click Refresh.
- [x] Add a front-end integration test that exercises the manual Refresh flow in `SleeperFFHelper` and asserts the `force=refresh` schedule query is issued.
- [x] Confirm all pyESPN scripts are formatted correctly and will succeed in production **URGENT**

- [ ] Add failure-handling coverage for the SleeperFFHelper auto-refresh loop (e.g., repeated PyESPN errors, overlapping timer guards, and console warnings).
- [x] Complete a full repository audit for redundant or deprecated files so we can document and remove any leftovers after the PyESPN migration. (See `docs/redundant-file-audit-2025-11-09.md`.)

All previously tracked migration tasks remain complete; the 2025-11-05 audit confirmed the above follow-ups are the only
remaining gaps.

2025-11-09 validation reran the PyESPN script, server, and full-stack Vitest suites after repairing the adapters. The redundant-
file audit still needs to cover the entire repository tree so we can prune any deprecated assets.
