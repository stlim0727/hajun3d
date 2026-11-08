# PR Feedback and Review Automation

This repository includes an automated, security-hardened PR self-feedback system powered by OpenAI Codex and GitHub Actions.

## How it works

1. When a PR is opened or synchronized, `.github/workflows/pr-feedback.yml` triggers via `pull_request_target`.
2. **Security isolation**:
   - The workflow checks out the trusted base branch code (`origin/main`).
   - The untrusted PR branch code is **never executed or checked out with secrets**.
   - The PR changes are inspected strictly as diff text via `git show` and `git diff`.
3. Codex evaluates the diff against `.agents/skills/hajun-pr-feedback/SKILL.md` using the strict JSON schema in `.github/codex/review-schema.json`.
4. `scripts/pr-feedback.mjs` parses and validates the schema, sanitizes any HTML/mentions, and posts/updates a single structured Korean feedback comment on the PR.

## Required Repository Secrets & Variables

To enable automated PR feedback on GitHub:

- **Secret**: `OPENAI_API_KEY`: API key for Codex review.
- **Variable**: `CODEX_PR_FEEDBACK_ENABLED`: Set to `'true'` to activate.
- **Variable**: `CODEX_REVIEW_AUTHOR`: GitHub username whose PRs trigger reviews (defaults to `stlim0727`).
- **Variable (optional)**: `CODEX_REVIEW_MODEL`: Specific model identifier (e.g. `gpt-4o`).

## Local / Interactive Usage

You can also ask the coding agent in your IDE chat:
> "Use `$hajun-pr-feedback` to review changes and post Korean feedback."
