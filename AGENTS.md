# Hajun Plane 3D agent orientation

Hajun Plane 3D (하준 비행 시뮬레이터 3D) is a realistic jet airliner 3D flight simulator
built with Three.js for Web and Flutter WebView. It uses modern ES modules and a
13-subsystem modular architecture under `web/js/` to maximize coding agent token efficiency.
Source code and executable configurations take precedence over historical descriptions.

## User shorthand

Treat these acronyms as instructions when used as commands in a task or PR context:

- **`arc` — address review comments:** run `npm run pr:arc` to inspect the PR's
  current review comments, checks, and threads in one call, validate feedback,
  implement actionable fixes, run relevant checks, push updates, and reply to comments
  and resolve threads (`npm run pr:arc -- --resolve <threadId>`).
- **`mac` — merge (PR) and clean up (worktree and directory):** run `npm run pr:mac`
  to verify required CI and checks, merge the intended PR (`--merge --delete-branch`),
  remove its task worktree and directory, and fast-forward the clean shared checkout.
- **`wt:new` — create task worktree:** run `npm run wt:new -- <branch>` to fetch
  `origin/main` and create an isolated worktree before editing.

## Start here

Workflow rules that apply to every agent:

1. Create a new git worktree for each task (`npm run wt:new -- <branch>` or `git fetch origin && git worktree add -b <branch> <path> origin/main`) BEFORE reading or modifying files so you always inspect `origin/main` rather than a stale checkout. Never edit directly in the shared checkout and never blindly copy whole files across checkouts (apply focused edits to prevent clobbering concurrent work).
2. Before committing or opening a PR, inspect `git diff origin/main` to verify that only intentional scoped changes are present and that no unrelated code or recent features from other PRs were accidentally deleted (`-` lines).
3. Open a pull request when the work is ready: commit to a focused branch, push, and open a PR — unless the user explicitly requests local-only work.
4. Multiple agents may work in this repository at the same time. Inspect git status before editing, never assume exclusive access, and leave other agents' and the user's edits untouched.

- Read the relevant row in [the task map](docs/development/agent-task-map.md).
- Follow [working rules](docs/development/agent-working-rules.md). Load only
  references relevant to the change; exclude `node_modules`, `build`, Flutter cache,
  and worktrees from routine searches.

## Commands

Use Node 22 (`.node-version`) and npm from the repository root:

```sh
npm ci
npm run check
npm test
```

- `npm run check` verifies JavaScript syntax (`scripts/check-syntax.mjs`) across `web/js`,
  `scripts`, `tests` and enforces full 40-character commit SHA pins in all GitHub Actions
  (`scripts/check-workflow-actions.mjs`).
- `npm test` runs Node test suite across `tests/**/*.test.js`.
- `npm run audio:departure` synthesizes ATC radio communications using Gemini TTS.

## Simulation & Architecture Principles

- **Modular Subsystem Boundary (`web/js/`)**:
  Do NOT read or rewrite entire 12,000-line files. Edit only the relevant subsystem
  module (e.g. `physics.js`, `airports.js`, `config.js`, `ui.js`) to preserve token efficiency.
- **Continuous Aerodynamics**:
  Derive visible behavior (lift, drag, stall, slip, spool) from continuous physical states,
  never arbitrary behavior-switch conditionals.
- **Coordinate Frames & Units**:
  - Distance/Altitudes: meters ($m$). Speed: $km/h$ or $m/s$ ($1\text{ kt} \approx 1.852\text{ km/h}$).
  - Angles: radians in physics calculations; degrees in UI displays.
  - Forward: $-Z$, Up: $+Y$, Right: $+X$.
- **Early-Z & 60 FPS Budget**:
  - `logarithmicDepthBuffer: false` is maintained for hardware Early-Z culling.
  - Near camera clipping is $1.2\text{m}$, Far clipping is $70,000\text{m}$.
  - Zero-GC particle pooling and 2-frame HUD update throttling must be preserved.
- **Flutter WebView & Offline Bundle Compatibility**:
  - `web/glb_bundle.js` enables zero-CORS local `file://` playback on mobile WebView.
  - Never add external network CDN dependencies without fallback.
