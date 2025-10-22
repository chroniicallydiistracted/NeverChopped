# Outstanding Tasks

- [ ] Add automated smoke tests that cover the `/api/espn` routes and their backing Python scripts to verify PyESPN responses stay within expected contracts.
- [ ] Introduce caching or memoization in `espn-api-server.cjs` so repeated PyESPN schedule/play-by-play requests do not hammer the upstream service.
