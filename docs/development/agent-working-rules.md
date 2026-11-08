# Agent Working Rules

- **State material assumptions and resolve ambiguity**: Resolve ambiguity that changes
  the deliverable; continue independent work while waiting for clarification.
- **Prefer the simplest scoped implementation**: Avoid speculative dependencies,
  abstractions, adjacent cleanup, and unrelated formatting changes.
- **Define observable success before editing**: Diagnose failures with a small reproducer
  and evidence before applying guessed fixes.
- **Preserve existing edits and modular structure**: Never copy whole files across worktrees
  or checkouts — apply only targeted diffs so that intermediate commits from other PRs
  are never clobbered. Inspect `git diff origin/main` before committing to verify zero accidental deletions.
- **Multi-agent safety**: Multiple agents may be active. Always create a task worktree
  using `npm run wt:new -- <branch>` before starting work. Never reset a shared worktree.
- **Physics and Simulation consistency**:
  - Test multi-step sequences (e.g. gate → taxi → takeoff roll → rotation → climb → gear retraction).
  - Verify that coordinate frames, force signs, and aerodynamic formulas remain consistent with existing DB in `web/js/config.js`.
- **Token efficiency discipline**:
  - Read only the relevant module in `web/js/` identified from `docs/development/agent-task-map.md`.
  - Do not load monolithic historical dumps unless strictly necessary.
- **Verification & CI delegation**:
  - Avoid running long local test suites that are almost identical to CI tests. Boldly push directly to `origin main` to let CI test verify it, running fast syntax checks (`npm run check`) locally when needed.
