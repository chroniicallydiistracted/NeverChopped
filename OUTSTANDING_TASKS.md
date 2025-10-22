# Outstanding Tasks

- [x] Add automated smoke tests that cover the `/api/espn` routes and their backing Python scripts to verify PyESPN responses stay within expected contracts.
- [x] Introduce caching or memoization in `espn-api-server.cjs` so repeated PyESPN schedule/play-by-play requests do not hammer the upstream service.
- [x] Plumb the `/api/espn/player/:playerId` endpoint into the live view participant UI so official ESPN player metadata is displayed alongside play-by-play participants.
- [x] Validate the expanded ESPN status normalization against live PyESPN responses to ensure postponed, delayed, and canceled mappings cover every upstream variant.
- [ ] Implement a periodic PyESPN schedule refresh inside `src/components/SleeperFFHelper.tsx` so NFL statuses stay current without requiring users to click Refresh.
- [ ] Add a front-end integration test that exercises the manual Refresh flow in `SleeperFFHelper` and asserts the `force=refresh` schedule query is issued.
- [ ] Confirm all pyESPN scripts are formatted correctly and will succeed in production **URGENT**
