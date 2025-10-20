# Session Summary

## Uniform Asset Pipeline
- Removed legacy uniform slices/composites and re-fetched every 2025 GUD uniform (`npm run fetch:uniforms:2025`).
- Iteratively refined `py scripts/split_uniforms.py`:
  - Output now limited to helmet_left/right and jersey_front/back with style-prefixed filenames (e.g. `A_helmet_right.png`).
  - Border flood-fill respects the grey #959595 outline so only background whites connected to edges are cleared.
  - Grey-outline detection adjusts jersey top/bottom bounds with ~5 px padding to preserve shoulder stripes.
- Regenerated `assets/uniform_parts/2025/**` after each refinement and captured raw crops in `tmp/splice_debug/` (e.g. `ATL_B_jersey_front_raw.png`, `DEN_B_jersey_front_test.png`) for visual validation.

## LiveGameVisualizer Updates
- Added `src/constants/uniforms.ts` to glob sliced assets and supply `getHelmetAsset`, selecting helm orientation by drive direction.
- Replaced player badge initials with team helmets and removed the fallback to surface missing assets.
- Calibrated field overlays via `mapFieldX/mapFieldY` so LOS, chains, ball beam, and pass arcs align with the photographic field; LOS fallback handles missing metadata.
- Pass animation now derives from LOS/ball positions rather than badge heuristics.

## Supporting Tooling & Checks
- Reviewed `dev.sh` (noted `clean_ports` order) and cleaned scratch directories during iterations.
- Re-ran `npm run build` after major changes to confirm the stack stays healthy.
- Key assets/scripts: `scripts/fetch-uniforms.ts`, `py scripts/split_uniforms.py`, `assets/uniforms/2025/**`, `assets/uniform_parts/2025/**`.
