# Redundant File Audit – 2025-11-09

## Scope and Approach
- Traversed all top-level directories (`src`, `tests`, `py`, `scripts`, `public`, `assets`, `docs`, `extensions`, and root configuration files).
- Verified runtime imports and package scripts with ripgrep to ensure no orphaned modules remain wired into builds or tooling.
- Compared asset pipelines (downloaders, splitters, sync scripts) against generated folders to detect duplicated or stale outputs.

## Confirmed Redundancies
| Path | Type | Recommended Action | Notes |
| --- | --- | --- | --- |
| `sleeper_ff_helper.tsx` | Legacy React entrypoint | Remove | Hard-coded user/league identifiers and direct Sleeper REST calls remain, but no source imports reference the file after the PyESPN migration (`rg "sleeper_ff_helper"` only hits documentation). 【F:sleeper_ff_helper.tsx†L1-L160】 |
| `assets/uniforms/2025/ARZ` | Uniform image directory | Remove | Duplicate of `assets/uniforms/2025/ARI`. Uniform fetcher writes canonical team codes (`ARI`) while mapping only the request URL to GUD codes. 【F:scripts/fetch-uniforms.ts†L16-L24】【F:scripts/fetch-uniforms.ts†L100-L132】 |
| `assets/uniform_parts/2025/ARZ` | Helmet/Jersey slices | Remove | Generated from the redundant `assets/uniforms/2025/ARZ` tree; runtime code normalizes ARZ→ARI before resolving assets so this folder is never read. 【F:src/constants/uniforms.ts†L6-L64】 |
| `public/uniform_parts/2025/ARZ` | Published helmet slices | Remove | `scripts/sync-helmets.ts` mirrors `assets/uniform_parts`, so the redundant ARZ tree also exists in the public bundle and can be deleted once the source folder is removed. |

## Items Requiring Follow-up Decision
- `src/utils/playDirection.ts` – Provides directional heuristics but is not imported by runtime code; only the `docs/NFLFASTR_IMPLEMENTATION_GUIDE.md` reference remains. Decide whether to wire it into the live view or delete the helper. 【F:src/utils/playDirection.ts†L1-L69】【F:docs/NFLFASTR_IMPLEMENTATION_GUIDE.md†L345-L359】

## Areas with No Redundant Files Detected
- **Application code** (`src/`), **tests** (`tests/`), **backend scripts** (`py/`, `espn-api-server.cjs`), and **uniform automation scripts** (`scripts/`) align with current imports and package.json tasks.
- **Documentation** (`docs/`) and **browser extensions** (`extensions/`) remain referenced by operational guides and setup steps.
- Generated datasets in `public/uniforms/weekly` are actively consumed by `src/lib/uniforms.ts` and retained.

## Next Steps
1. Schedule deletion of the confirmed redundant files/directories above.
2. Align the removal with the uniform asset sync to avoid regenerating ARZ folders.
3. Decide on `src/utils/playDirection.ts` ownership before the next visualization update.
