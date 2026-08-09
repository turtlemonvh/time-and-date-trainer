# Working in this repo

Concrete gotchas hit during development, kept here so they don't have to be rediscovered —
especially by a fresh subagent with no prior context on this repo.

## Date/time correctness

- **Always construct dates as `new Date(year, monthIndex, day)` (local time), never by parsing an
  ISO string.** Parsing caused a real DST bug in `randomDate` (M1a) — a UTC/local mismatch made the
  last day of a range unreachable across a spring-forward transition. `vite.config.ts` pins
  `test.env.TZ: 'America/New_York'` specifically so DST edge cases are exercised in CI, not masked
  by a UTC test runner.
- **`date-fns`'s `addMonths` clamps at month-end** (e.g. "1 month after Aug 31" → Sep 30). Any code
  that adds a whole month to a date drawn with an unconstrained day-of-month can silently produce an
  answer with no correct arithmetic inverse. `offsetDate.ts` works around this by clamping the start
  day to ≤28 whenever `unit === 'month'` — follow the same pattern for any new month-arithmetic code.
- **A wrongly-graded question is the worst bug class in this project.** When adding or changing a
  question generator, re-derive the correct answer independently from the question's own display
  data (not from the generator's internal state) in at least one test — see
  `src/engine/questions/contract.test.ts` for the pattern.

## Question engine

- **No generator currently reads `ctx.peak`.** Only `registry.ts`'s `selectGenerator` consumes
  `peak.emphasis` (for the eventual weighted-by-peak selection in the real game). Any UI that
  iterates `BUILT_IN_QUESTION_TYPES` directly (bypassing `selectGenerator`) will see _no_ change in
  which question types appear when the peak changes — only `generateQuestionBatch`'s internal
  peak-derived seed mixing makes the _sampled values_ vary by peak. Don't assume changing peak ID
  alone does anything; if you need genuine per-peak variation, mix `peakId` into the RNG seed
  explicitly (see `peakSeed` in `src/engine/questions/preview.ts`).
- Always import from the `src/engine/questions` barrel (`./index`), never `./registry` directly —
  the barrel is what actually registers the built-in generators as a side effect of being imported.

## TypeScript project split

- `tsconfig.app.json` (covers `src/`) uses `moduleResolution: "bundler"` — relative imports have no
  extension (`from '../peaks'`).
- `tsconfig.node.json` (covers `vite.config.ts` and `scripts/`) uses `module: "nodenext"`, which
  _requires_ explicit `.js` extensions on relative imports.
- **A file under `scripts/` that imports directly from `src/` pulls the entire reachable import
  graph into the nodenext-resolution program**, and `tsc -b` will then demand `.js` extensions on
  every file in that graph — cascading far beyond the one file you touched. Don't "fix" this by
  adding extensions throughout `src/`; instead keep the script excluded from `tsconfig.node.json`
  (see the `exclude` entry there) and let `tsx` run it unchecked, same as the other scripts in that
  directory.

## GitHub / CI quirks

- **Dependabot PRs always show a `claude-review` check failure.** This is the Claude Code GitHub
  Action intentionally declining to run for a bot-triggered PR, not a real problem — check `test`
  instead, and merge once that's green.
- **The Claude Code GitHub App (the one triggered by `@claude` in issue/PR comments) cannot
  currently push _any_ branch in this repo.** `main` contains `.github/workflows/*` files, and
  pushing a new branch ref that contains workflow files (even byte-identical ones) requires a
  `workflows` permission scope the app installation doesn't have. Every branch here is created off
  `main`, so this blocks all `@claude`-triggered PRs, not just ones that edit workflows. Until an
  org/repo admin grants that permission, treat `@claude`-triggered issue work as producing a
  spec/diff to review and apply by hand (via a normal `gh`-authenticated session) rather than
  expecting a PR to actually land.
- GitHub Pages deploys (`deploy.yml`) share a single `concurrency: { group: pages }` — pushing
  several commits to `main` in quick succession (e.g. merging several small PRs back to back) causes
  earlier queued deploy runs to show `cancelled`; only the latest one actually goes live. Check the
  _last_ run in the sequence, not an earlier one, when verifying a deploy.

## Working in a worktree-isolated session

- Merging a PR from a worktree whose sibling worktree has `main` checked out: `gh pr merge` performs
  the merge server-side via the API, but if you also pass `--delete-branch`, the _local_
  branch-deletion step tries to switch this checkout to `main` and fails with `fatal: 'main' is
already used by worktree` — the merge itself still succeeds despite the command exiting non-zero.
  Verify with `gh pr view --json state,mergedAt` rather than trusting the exit code; delete the
  remote branch separately with `git push origin --delete <branch>` if `--delete-branch` failed.
- A squash-merged branch will always show "not fully merged" from `git branch -d` (squash merges
  don't preserve the original commits as ancestors of the merge commit) — this is expected, not a
  sign something went wrong; use `git branch -D` once the PR is confirmed merged.
- Complex multi-line bash (process substitution `<()`, `for` loops combined with git commands,
  chained `&&`/`;` sequences with redirects) is sometimes rejected by the sandbox as "too complex to
  verify stays inside worktree" even when logically safe. Prefer simple sequential commands, or use
  the `Monitor` tool for polling loops instead of a raw bash `while` loop with git/gh calls inside.
- Never run bare `git stash` — the stash stack is shared across worktrees and other sessions may be
  using it concurrently.

## Before opening a PR

Run the full local check suite — see [CONTRIBUTING.md](./CONTRIBUTING.md). `pnpm format:check`
covers root-level Markdown and JSON config files too, not just source under `src/`.
