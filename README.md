# Timescaler

A local-storage-only, installable browser game that teaches telling time and working with
calendars by climbing ten mountain peaks.

**🚧 Work in progress.** The question-generating engine is built and unit-tested, but the real
game (widgets, art, playable levels) hasn't landed yet. The live site currently shows a
work-in-progress preview of the question engine's output, not the finished game. Pixel art
(characters, mountain themes) is further along than what's shown on the live site — it's only
viewable by running the app locally for now; see [CONTRIBUTING.md](./CONTRIBUTING.md#debug-pages).

**Live:** <https://turtlemonvh.github.io/timescaler/>

## Setup

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Design

See [docs/superpowers/specs/2026-08-08-summit-clock-design.md](./docs/superpowers/specs/2026-08-08-summit-clock-design.md)
for the full design — game mechanics, architecture, and the milestone roadmap.
[docs/superpowers/plans/](./docs/superpowers/plans/) holds the implementation plan for each
milestone, and tracks which are done.

## Stack

TypeScript, Vite, React, Vitest, Playwright, pnpm. Installable as a PWA; no backend, no accounts —
all progress is local-storage only.

## License

[MIT](./LICENSE)
