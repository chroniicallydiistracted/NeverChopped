# PyESPN Live View Visualization Implementation Plan

This document describes the end-to-end work required to evolve the current PyESPN live view into the fully animated experience requested by the product stakeholder. Each section details the motivating problem, required data or asset work, and concrete implementation steps spanning the TypeScript data pipeline through the React visualization layer.

## 1. Model Multi-Step Play Events and Team Branding Metadata

### Objective
Expand the normalized PyESPN payload so the UI can position every participant, render team-specific branding, and drive granular play animations.

### Required Work
1. **Data Ingestion Enhancements**
   - Update `src/features/live-view-pyespn/data/loadPyEspnGame.ts` to extract ESPN's raw event timelines (`drives[].plays[].events` or equivalent arrays).
   - Project these raw event objects into a typed `PlayEvent` structure containing:
     - `timestamp` (milliseconds from play start),
     - `type` (snap, dropback, passAttempt, catch, tackle, etc.),
     - `participants` (offense/defense IDs with role tags),
     - `ball` coordinates (if supplied), and
     - `playerPositions` mapping of participant IDs to field coordinates.
   - Preserve the original play-level attributes (yard line, yards to go) while linking each `PlayEvent` back to the source participants and coordinates.

2. **Type System Updates**
   - Extend `PyEspnPlay` in `src/features/live-view-pyespn/data/pyespn-types.ts` with:
     - `events: PlayEvent[]` and `ballTrajectory: TrajectoryPoint[]` for animation,
     - `fieldSide: 'left' | 'right'` to track offensive direction per play,
     - `homeFranchise` and `awayFranchise` fields referencing a new `PyEspnFranchise` interface (team id, display name, asset keys).
   - Ensure the new types integrate with existing discriminated unions or enums to keep TypeScript strictness.

3. **Hook and Selector Propagation**
   - Modify `usePyEspnGame` and any memoized selectors inside `src/features/live-view-pyespn/components/PyEspnLiveView.tsx` so the richer play objects flow to consumers.
   - Add backward-compatible fallbacks: playlist and stats components should still render even if they ignore the new `events` field.

4. **Testing and Validation**
   - Write unit tests covering the normalization of multi-step events, verifying that timestamps and coordinates survive the transformation.
   - Include snapshot fixtures to ensure team branding metadata is delivered for both home and away perspectives.

## 2. Provision Helmet and Field Art Assets

### Objective
Bundle local assets for team helmets and home-field surfaces so the field visualization can render team-specific branding without external network requests.

### Required Work
1. **Asset Collection and Optimization**
   - Curate helmet SVGs/PNGs and field textures for every supported franchise from /assets/ folder.
   - 
2. **Asset Mapping Helper**
   - Implement `src/features/live-view-pyespn/lib/team-assets.ts` exporting a function `getTeamAssets(teamId: string): TeamAssets` that returns:
     - `homeHelmet`, `awayHelmet` (if variants exist),
     - `fieldTexture`, and
     - fallback values for unknown teams.
   - Include TypeScript definitions (`TeamAssets`) matching the consumer expectations in the visualization components.

3. **Integration into Live View**
   - Update `PyEspnLiveView` to resolve home/away asset bundles when a game loads and pass those URLs into `FieldAnimationCanvas`.
   - Ensure lazy-loading or preloading strategies (e.g., `useEffect` with `Image` preloads) to avoid rendering flickers when games switch.

4. **Verification**
   - Add a lightweight smoke test (React Testing Library) to confirm the component renders the correct helmet image `src` given mocked franchise data.

## 3. Rebuild `FieldAnimationCanvas` as a Layered Scene

### Objective
Refactor the existing single-ball animation into a composable scene graph that supports the field background, yard markers, first-down line, player sprites, and overlays.

### Required Work
1. **Shared Layout Mathematics**
   - Extract field geometry constants (total yards, end zone depth, hash mark spacing) into `src/features/live-view-pyespn/animation/field-layout.ts`.
   - Export helper functions to convert yard-line values and sideline offsets into normalized 0–1 coordinates used across all rendering layers.

2. **Component Architecture**
   - Replace the Tailwind-only layout with an SVG-based scene in `FieldAnimationCanvas.tsx` containing:
     - `<image>` element for the team-specific field texture,
     - vector layers for yard lines, numbers, and the first-down marker,
     - `<g>` groups representing offensive and defensive players, each containing a helmet `<image>` and `<text>` label for the player name or number,
     - overlay layer for active ball marker and event effects.
   - Adopt React refs or context to coordinate animation state across subcomponents (e.g., `FieldBackground`, `PlayerLayer`, `BallLayer`).

3. **State Management**
   - Introduce hooks (e.g., `usePlayTimeline`) to track the active event index, derived participant positions, and which players should be highlighted.
   - Ensure the component responds to play changes by resetting internal state and smoothly transitioning to the next scene.

4. **Performance Considerations**
   - Memoize expensive calculations (layout transforms, player grouping) and leverage `requestAnimationFrame` for smooth updates.
   - Provide a virtualized approach if play events include large participant sets (e.g., special teams formations) to avoid DOM bloat.

5. **Testing**
   - Write storybook stories or component tests demonstrating offense/defense setups, ensuring layout math places elements correctly near goal lines and midfield.

## 4. Animate Plays with Event Timelines

### Objective
Create a timeline-driven animation system that visualizes every intra-play event, including pass arcs, run trails, and defensive interactions.

### Required Work
1. **Timeline Scheduler**
   - Implement `src/features/live-view-pyespn/animation/timeline.ts` providing a `useTimeline` hook that:
     - Accepts `PlayEvent[]` and converts their timestamps into durations,
     - Exposes controls for play/pause, seek, loop, and playback speed,
     - Emits the current event index and interpolation progress to subscribed layers (ball, players, overlays).

2. **Pass Visualization**
   - For events tagged as pass attempts, derive a quadratic Bézier path using start/end coordinates and an inferred apex height based on throw distance.
   - Render an animated SVG `<path>` for the arc and move the ball marker along the path using the timeline progress.
   - Handle incompletions/interceptions by terminating the arc at the corresponding event and updating ball ownership.

3. **Run Visualization**
   - Build a polyline trail for rushing plays using sequential coordinates from runner-related events.
   - Animate the trail reveal in sync with the runner’s movement while keeping defenders stationary until engagement events trigger.

4. **Contact and Special Events**
   - Animate tackles, sacks, and turnovers by pulsing the involved defenders’ sprites, shaking the ball marker, or rendering brief highlight glows.
   - Support special cases such as penalties (pause timeline, overlay flag icon), kicks (adjust ball trajectory height), and celebrations (post-play animations).

5. **Audio/Accessibility Hooks**
   - Emit timeline events through an optional callback so screen readers or audio cues can describe the action in parallel with the visuals.

6. **Testing**
   - Unit test trajectory math (Bézier control points, trail interpolation) under `src/features/live-view-pyespn/animation/__tests__/`.
   - Add integration tests that mount the timeline within the React component and assert the correct DOM changes occur at specific timestamps.

## 5. Finalize UX Controls and Regression Coverage

### Objective
Integrate comprehensive playback controls, ensure accessibility, and add test coverage to prevent regressions.

### Required Work
1. **Control Panel Enhancements**
   - Extend the controls in `src/features/live-view-pyespn/components/PyEspnLiveView.tsx` with play/pause toggles, frame-step buttons, and playback speed selectors linked to `useTimeline`.
   - Add tooltips or labels describing keyboard shortcuts (e.g., spacebar to toggle play, arrow keys to step).

2. **Cross-Component Integration**
   - Update `PlayList` and `ParticipantStats` components so selecting a play or player highlights them on the field visualization via shared state.
   - Ensure the live view gracefully handles asset loading failures by providing fallback visuals and logging.

3. **Accessibility and Responsiveness**
   - Provide ARIA roles and descriptions for the interactive canvas, including announcing play transitions and key events.
   - Verify the layout scales for large displays (draft party projector) and tablets, adjusting font sizes and sprite scaling as needed.

4. **Testing Strategy**
   - Expand React Testing Library coverage to simulate user interactions with controls and verify the timeline responds.
   - Maintain fixtures representing at least two complete drives to guard against regressions in event sequencing and asset selection.

## Deliverables Summary
- Enriched data layer with per-event timelines and franchise metadata.
- Local asset library and helper utilities for helmets and field textures.
- Reengineered `FieldAnimationCanvas` supporting layered, brand-aware rendering.
- Timeline-based animation system covering passes, runs, tackles, and special cases.
- Enhanced UX controls, accessibility improvements, and comprehensive test coverage.

Following these steps will transform the current ball-only animation into an immersive, data-rich visualization that aligns with the requested stakeholder vision.