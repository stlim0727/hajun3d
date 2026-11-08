# CI and Verification Guide

## Local Verification Gate

Run the local verification gate before pushing commits or creating pull requests:

```sh
npm run check
npm test
```

### Checks (`npm run check`)

1. **Syntax Check (`scripts/check-syntax.mjs`)**:
   Runs `node --check` against all JavaScript files in `web/js`, `web/game.js`, `scripts/`, and `tests/`.
   Ensures zero syntax regressions without needing to boot a WebGL browser context.

2. **Workflow Actions Commit SHA Pin Check (`scripts/check-workflow-actions.mjs`)**:
   Parses all YAML workflow files under `.github/workflows/`.
   Enforces that every `uses:` clause points to a full 40-character commit SHA (e.g. `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1`) rather than mutable version tags, eliminating third-party action supply chain security risks.

### Tests (`npm test`)

Runs Node's built-in test runner (`node --test tests/**/*.test.js`).
Validates:
- Aircraft specs in `web/js/config.js` (mass, wingspan, thrust, stall speeds, aerodynamic coefficients).
- Workflow actions validator functionality.
- PR feedback sanitizer, XSS neutralizer, and snapshot logic.
- Subsystems existence and structure.

## Remote CI Workflows

- **`ci.yml`**: Runs on every pull request and push to `main`/`master`. Executes `npm run check` and `npm test`.
- **`deploy-pages.yml`**: Builds and publishes `./web` directly to GitHub Pages upon successful check on `main`.
- **`pr-feedback.yml`**: Runs automated AI review on open PRs from the configured author.
- **`generate-departure-audio.yml`**: Dispatches Gemini TTS synthesis of ATC departure radio communications.
