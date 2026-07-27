<!--
northsky: PR template. See AGENTS.md for the full fork model, commit format,
and upstream sync strategy.
-->

## What & why

<!-- Briefly describe the change and the reason for it. -->

## Checklist

- [ ] Commit messages follow Conventional Commits (a `(northsky)` scope is
      optional). Fork vs upstream is tracked by git ancestry, not message text.
- [ ] Custom code is **isolated** in owned dirs (`src/brand/`, `src/features/*`,
      `src/lib/slingshot/`) where possible; any unavoidable edit to an upstream
      file is minimal and marked with a `// northsky:` comment.
- [ ] Tests added/adjusted for logic changes (asset/branding swaps verified
      visually).
- [ ] Gates pass locally: `pnpm typecheck`, `pnpm lint`, `pnpm prettier`,
      `pnpm test`.
- [ ] AI assisted code has been reviewed by a human

<!--
Upstream sync PRs are opened automatically by
.github/workflows/sync-upstream.yml and don't need this checklist.
-->
