# Contributing to Summit Clock

## Setup

1. `corepack enable`
2. `pnpm install`
3. `pnpm dev`

## Before opening a PR

Run the full local check suite (this is what CI runs):

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
pnpm test:e2e
```

`pnpm test:e2e` requires a build to exist first (`pnpm build`), since Playwright serves the built
app via `vite preview`.

## Project layout

See `docs/superpowers/specs/2026-08-08-summit-clock-design.md` for the full design — architecture,
game mechanics, and the milestone roadmap. `docs/superpowers/plans/` holds the implementation plan
for each milestone.
