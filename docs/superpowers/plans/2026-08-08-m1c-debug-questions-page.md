# M1c — Debug Questions Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the M1 verification surface the spec asks for — "`/debug/questions` lists generated questions for any difficulty" — a dev-only page that renders a fresh batch of questions from every registered generator at a chosen difficulty and peak, in plain readable text, so a human can eyeball what the M1b generators actually produce.

**Architecture:** No routing library. The spec's UI architecture manages screens with internal app state (`ui/screens/`), not URLs, so a router for one debug page would be scope creep. Instead `src/main.tsx` gains a two-line gate: when `import.meta.env.DEV` **and** the pathname starts with `/debug/`, it renders `<DebugRouter pathname={...} />` instead of `<App />`. `DebugRouter` is a plain component that switches on the path suffix — extensible to `/debug/sprites` (M2) and `/debug/widgets` (M3) by adding a `case`, but only `questions` exists today. `DebugQuestionsPage` is exported and tested directly, so no test ever has to fake `window.location`.

**Tech Stack:** React 19, `@testing-library/react` + `@testing-library/user-event` + Vitest with the existing jsdom environment and `src/setupTests.ts`. No new dependencies.

## Global Constraints

- **This plan touches React and the DOM.** That is expected and correct — unlike M1a and M1b, this is UI code. The engine-purity rule applies to `src/engine/`, not here. Nothing in this plan may add code under `src/engine/`.
- **The debug page must never be reachable in a production build.** The `import.meta.env.DEV` gate in `main.tsx` is the mechanism: Vite statically replaces `import.meta.env.DEV` with `false` when building, so Rollup eliminates the branch and tree-shakes the whole debug module out. Task 3 verifies this by grepping `dist/`. This page is a developer tool, not part of the shipped game.
- Import the question registry through the barrel `src/engine/questions` (never `src/engine/questions/registry` directly) — the barrel is what registers the built-in generators (M1b Task 8).
- The page must be reproducible: every batch comes from an explicit seeded `Rng`, and the page accepts an `initialSeed` prop so tests are deterministic rather than time-dependent.
- Formatting/lint: 2-space indent, single quotes, semicolons, trailing commas, 100-column print width. `verbatimModuleSyntax` is on, so type-only imports must use `import type`. `noUnusedLocals`/`noUnusedParameters` are on.
- Keep the rendering deliberately plain — headings, lists, and a `<pre>` JSON dump. The polished widget system (`AnalogClock`, `CalendarMonth`, `ChoiceGrid`) is M3's job; duplicating it here would be work thrown away.
- After M1b, `AnswerSpec` has exactly one member (`ChoiceAnswer`), so `question.answer.options` type-checks with no narrowing. When a later milestone adds `setHands` / `pickDate` / `number` answer kinds, this page will need a `switch (question.answer.kind)` — that is expected, and the compiler will point at the exact line.

**Depends on:** M1a (`src/engine/rng.ts`, `src/engine/peaks.ts`) and M1b (`src/engine/questions/`). Both must be merged before this plan starts. The exact M1b exports consumed are `BUILT_IN_QUESTION_TYPES`, `type Question`, `type DisplaySpec`, and `type GeneratorContext` from `src/engine/questions`.

---

## Task 1: The debug questions page (`src/ui/debug/DebugQuestionsPage.tsx`)

**Files:**
- Create: `src/ui/debug/DebugQuestionsPage.tsx`
- Test: `src/ui/debug/DebugQuestionsPage.test.tsx`

**Interfaces:**
- Consumes: `PEAKS`, `getPeak` from `../../engine/peaks` (M1a Task 5); `mulberry32` from `../../engine/rng` (M1a Task 1); `BUILT_IN_QUESTION_TYPES`, `type DisplaySpec`, `type Question` from `../../engine/questions` (M1b Task 8).
- Produces: `export default function DebugQuestionsPage(props: { initialSeed?: number }): ReactElement`. `initialSeed` exists so tests get a fixed batch; in the browser it defaults to `Date.now()` so a reload shows new questions.

The batch is `SAMPLES_PER_TYPE` (3) questions from each of the 4 registered generators, in registration order — 12 cards, every type represented, which is the whole point of the page.

- [ ] **Step 1: Write the failing tests**

Create `src/ui/debug/DebugQuestionsPage.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DebugQuestionsPage from './DebugQuestionsPage';

function questionIds(): string[] {
  return screen.getAllByTestId('question-id').map((el) => el.textContent ?? '');
}

describe('DebugQuestionsPage', () => {
  it('renders three questions for each of the four generators', () => {
    render(<DebugQuestionsPage initialSeed={1} />);
    expect(screen.getAllByTestId('question-card')).toHaveLength(12);
  });

  it('shows every registered question type', () => {
    render(<DebugQuestionsPage initialSeed={1} />);
    for (const typeId of ['readAnalog', 'describeTime', 'readCalendar', 'offsetDate']) {
      expect(screen.getAllByText(typeId).length).toBe(3);
    }
  });

  it('marks exactly one option correct on every card', () => {
    render(<DebugQuestionsPage initialSeed={1} />);
    for (const card of screen.getAllByTestId('question-card')) {
      expect(within(card).getAllByTestId('correct-option')).toHaveLength(1);
      expect(within(card).getAllByTestId('option')).toHaveLength(3);
    }
  });

  it('shows the prompt, the display summary, and the explanation on every card', () => {
    render(<DebugQuestionsPage initialSeed={1} />);
    for (const card of screen.getAllByTestId('question-card')) {
      expect(within(card).getByTestId('question-prompt').textContent).not.toBe('');
      expect(within(card).getByTestId('question-display').textContent).not.toBe('');
      expect(within(card).getByTestId('question-explain').textContent).not.toBe('');
      expect(within(card).getByTestId('question-time-limit').textContent).toMatch(/\d+ ms/);
    }
  });

  it('dumps the raw display spec as JSON for inspection', () => {
    render(<DebugQuestionsPage initialSeed={1} />);
    const dumps = screen.getAllByTestId('display-json');
    expect(dumps).toHaveLength(12);
    for (const dump of dumps) {
      expect(() => JSON.parse(dump.textContent ?? '')).not.toThrow();
    }
  });

  it('generates a different batch when Regenerate is clicked', async () => {
    const user = userEvent.setup();
    render(<DebugQuestionsPage initialSeed={1} />);
    const before = questionIds();
    await user.click(screen.getByRole('button', { name: 'Regenerate' }));
    const after = questionIds();
    expect(after).toHaveLength(12);
    expect(after).not.toEqual(before);
  });

  it('regenerates when the difficulty changes', async () => {
    const user = userEvent.setup();
    render(<DebugQuestionsPage initialSeed={1} />);
    const before = questionIds();
    await user.selectOptions(screen.getByLabelText('Difficulty'), '9');
    expect(screen.getByLabelText('Difficulty')).toHaveValue('9');
    expect(questionIds()).not.toEqual(before);
  });

  it('offers all ten difficulties and all ten peaks', () => {
    render(<DebugQuestionsPage initialSeed={1} />);
    expect(within(screen.getByLabelText('Difficulty')).getAllByRole('option')).toHaveLength(10);
    expect(within(screen.getByLabelText('Peak')).getAllByRole('option')).toHaveLength(10);
  });

  it('regenerates when the peak changes', async () => {
    const user = userEvent.setup();
    render(<DebugQuestionsPage initialSeed={1} />);
    const before = questionIds();
    await user.selectOptions(screen.getByLabelText('Peak'), '3');
    expect(screen.getByLabelText('Peak')).toHaveValue('3');
    expect(questionIds()).not.toEqual(before);
  });

  it('shows the seed so a batch can be reproduced', () => {
    render(<DebugQuestionsPage initialSeed={4242} />);
    expect(screen.getByTestId('seed').textContent).toBe('4242');
  });
});
```

Note for the implementer: `toHaveValue` on a `<select>` comes from `@testing-library/jest-dom`, already wired up in `src/setupTests.ts`. If the installed version returns a number rather than a string for a numeric-looking option value, change the two assertions to `toHaveValue(9)` / `toHaveValue(3)` — verify against the actual failure message rather than guessing.

These tests are deterministic, not statistical: seed 1 and seed 2 produce fixed, different batches, so "the ids changed" cannot flake in CI.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/ui/debug/DebugQuestionsPage.test.tsx`
Expected: FAIL — `Cannot find module './DebugQuestionsPage'`.

- [ ] **Step 3: Implement**

Create `src/ui/debug/DebugQuestionsPage.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { getPeak, PEAKS } from '../../engine/peaks';
import { BUILT_IN_QUESTION_TYPES, type DisplaySpec, type Question } from '../../engine/questions';
import { mulberry32 } from '../../engine/rng';

const SAMPLES_PER_TYPE = 3;
const DIFFICULTIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * A one-line, human-readable gloss of a display spec. Intentionally text only —
 * the real widgets (AnalogClock, CalendarMonth) arrive in M3; this page just
 * needs to make the data legible.
 */
function describeDisplay(display: DisplaySpec): string {
  switch (display.kind) {
    case 'analogClock': {
      const { hour, minute, second } = display.time;
      const seconds = display.showSeconds ? ', second hand shown' : '';
      return `analog clock at ${pad(hour)}:${pad(minute)}:${pad(second)} (24h internal)${seconds}`;
    }
    case 'calendar':
      return `calendar for ${MONTH_NAMES[display.monthIndex]} ${display.year}, day ${display.highlightDay} highlighted`;
    case 'none':
      return 'no visual — the prompt carries everything';
  }
}

function generateBatch(seed: number, difficulty: number, peakId: number): Question[] {
  const rng = mulberry32(seed);
  const peak = getPeak(peakId);
  const batch: Question[] = [];
  for (const type of BUILT_IN_QUESTION_TYPES) {
    for (let i = 0; i < SAMPLES_PER_TYPE; i++) {
      batch.push(type.generate(rng, { difficulty, peak }));
    }
  }
  return batch;
}

export default function DebugQuestionsPage({ initialSeed }: { initialSeed?: number }) {
  const [difficulty, setDifficulty] = useState(3);
  const [peakId, setPeakId] = useState(PEAKS[0].id);
  const [seed, setSeed] = useState(() => initialSeed ?? Date.now());

  const questions = useMemo(
    () => generateBatch(seed, difficulty, peakId),
    [seed, difficulty, peakId],
  );

  return (
    <main>
      <h1>Debug: questions</h1>
      <p>
        Dev-only. {SAMPLES_PER_TYPE} freshly generated questions from each of the{' '}
        {BUILT_IN_QUESTION_TYPES.length} registered generators.
      </p>

      <p>
        <label htmlFor="debug-difficulty">Difficulty</label>{' '}
        <select
          id="debug-difficulty"
          value={difficulty}
          onChange={(event) => setDifficulty(Number(event.target.value))}
        >
          {DIFFICULTIES.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>{' '}
        <label htmlFor="debug-peak">Peak</label>{' '}
        <select
          id="debug-peak"
          value={peakId}
          onChange={(event) => setPeakId(Number(event.target.value))}
        >
          {PEAKS.map((peak) => (
            <option key={peak.id} value={peak.id}>
              {peak.id}. {peak.name} — {peak.emphasis}
            </option>
          ))}
        </select>{' '}
        <button type="button" onClick={() => setSeed((current) => current + 1)}>
          Regenerate
        </button>
      </p>

      <p>
        Seed <code data-testid="seed">{seed}</code> · {questions.length} questions
      </p>

      <ol>
        {questions.map((question, index) => (
          <li key={`${question.typeId}-${index}`} data-testid="question-card">
            <h2>{question.typeId}</h2>
            <p>
              <code data-testid="question-id">{question.id}</code>
            </p>
            <p data-testid="question-prompt">{question.prompt}</p>
            <p data-testid="question-display">{describeDisplay(question.display)}</p>
            <details>
              <summary>Raw display spec</summary>
              <pre data-testid="display-json">{JSON.stringify(question.display, null, 2)}</pre>
            </details>
            <ul>
              {question.answer.options.map((option, optionIndex) => {
                const correct = optionIndex === question.answer.correctIndex;
                return (
                  <li key={option} data-testid={correct ? 'correct-option' : 'option'}>
                    {correct ? `${option} (correct)` : option}
                  </li>
                );
              })}
            </ul>
            <p data-testid="question-explain">{question.explainCorrect}</p>
            <p data-testid="question-time-limit">Time limit: {question.timeLimitMs} ms</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/ui/debug/DebugQuestionsPage.test.tsx`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/debug/DebugQuestionsPage.tsx src/ui/debug/DebugQuestionsPage.test.tsx
git commit -m "Add dev-only debug questions page"
```

---

## Task 2: The debug route switch (`src/ui/debug/DebugRouter.tsx`)

**Files:**
- Create: `src/ui/debug/DebugRouter.tsx`
- Test: `src/ui/debug/DebugRouter.test.tsx`

**Interfaces:**
- Consumes: `DebugQuestionsPage` (default export) from `./DebugQuestionsPage` (Task 1).
- Produces: `export default function DebugRouter(props: { pathname: string }): ReactElement`. Takes the pathname as a prop rather than reading `window.location` itself, so it is trivially testable and `main.tsx` owns the only reference to browser globals.

Only `/debug/questions` is implemented. `/debug/sprites` (M2) and `/debug/widgets` (M3) each become one extra `case` when those milestones land — until then an unknown path renders a short index rather than a blank screen.

- [ ] **Step 1: Write the failing tests**

Create `src/ui/debug/DebugRouter.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import DebugRouter from './DebugRouter';

describe('DebugRouter', () => {
  it('renders the questions page at /debug/questions', () => {
    render(<DebugRouter pathname="/debug/questions" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Debug: questions' })).toBeInTheDocument();
  });

  it('tolerates a trailing slash', () => {
    render(<DebugRouter pathname="/debug/questions/" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Debug: questions' })).toBeInTheDocument();
  });

  it('shows an index for a debug route that does not exist yet', () => {
    render(<DebugRouter pathname="/debug/sprites" />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Unknown debug route' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '/debug/questions' })).toBeInTheDocument();
  });

  it('shows the index for a path outside /debug/ entirely', () => {
    render(<DebugRouter pathname="/" />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Unknown debug route' }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/ui/debug/DebugRouter.test.tsx`
Expected: FAIL — `Cannot find module './DebugRouter'`.

- [ ] **Step 3: Implement**

Create `src/ui/debug/DebugRouter.tsx`:

```tsx
import DebugQuestionsPage from './DebugQuestionsPage';

export const DEBUG_PREFIX = '/debug/';

/**
 * Dev-only screen switch. The game itself has no URL routing — screens are
 * driven by app state — so this deliberately is not a router library, just a
 * `switch` over the path suffix. Add a `case` per debug screen:
 * `sprites` in M2, `widgets` in M3.
 *
 * Rendered only from `main.tsx`, and only behind `import.meta.env.DEV`.
 */
export default function DebugRouter({ pathname }: { pathname: string }) {
  const route = pathname.startsWith(DEBUG_PREFIX)
    ? pathname.slice(DEBUG_PREFIX.length).replace(/\/+$/, '')
    : '';

  switch (route) {
    case 'questions':
      return <DebugQuestionsPage />;
    default:
      return (
        <main>
          <h1>Unknown debug route</h1>
          <p>
            No debug screen is registered for <code>{pathname}</code>.
          </p>
          <ul>
            <li>
              <a href="/debug/questions">/debug/questions</a>
            </li>
          </ul>
        </main>
      );
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/ui/debug/DebugRouter.test.tsx`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/debug/DebugRouter.tsx src/ui/debug/DebugRouter.test.tsx
git commit -m "Add dev-only debug route switch"
```

---

## Task 3: Wire the dev-only gate into `src/main.tsx`

**Files:**
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `DebugRouter` from `./ui/debug/DebugRouter.tsx` (Task 2).
- Produces: no exports. This is the five-line conditional the plan deliberately does not unit-test — its behaviour is covered by Task 2's tests plus the manual and build checks below.

- [ ] **Step 1: Edit `src/main.tsx`**

Replace the whole file with:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import DebugRouter from './ui/debug/DebugRouter.tsx';
import { registerSW } from 'virtual:pwa-register';

registerSW({ immediate: true });

const root = createRoot(document.getElementById('root')!);

// Dev-only debug screens. `import.meta.env.DEV` is replaced with `false` at
// build time, so this branch — and DebugRouter with it — is eliminated from
// production bundles. The dev server's SPA history fallback is what serves
// index.html for /debug/* in the first place; a production build has no such
// fallback, which is a second reason these pages never ship.
if (import.meta.env.DEV && window.location.pathname.startsWith('/debug/')) {
  root.render(
    <StrictMode>
      <DebugRouter pathname={window.location.pathname} />
    </StrictMode>,
  );
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
```

- [ ] **Step 2: Verify the app still renders normally**

Run: `pnpm exec vitest run src/App.test.tsx`
Expected: PASS — the existing App test is unaffected.

- [ ] **Step 3: Verify the debug page in the dev server by hand**

```bash
pnpm dev
```

Open `http://localhost:5173/debug/questions`. Expected: the page lists 12 questions; changing Difficulty to 10 changes the batch (times gain seconds, dates cross years); clicking Regenerate produces a new batch. Then open `http://localhost:5173/` and confirm the normal "Summit Clock" app still renders. Stop the dev server.

Note: if Vite is configured onto a different port, use whatever URL `pnpm dev` prints.

- [ ] **Step 4: Verify the debug page is absent from a production build**

```bash
pnpm build
grep -r "Debug: questions" dist/ ; echo "exit=$?"
grep -r "Unknown debug route" dist/ ; echo "exit=$?"
```

Expected: both greps print nothing and report `exit=1` (no matches) — the debug module was tree-shaken out. If either string appears in `dist/`, the dead-code elimination did not fire; make the gate a plain `if (import.meta.env.DEV && ...)` at the top level (not inside a callback or a ternary expression) and rebuild before continuing.

- [ ] **Step 5: Commit**

```bash
git add src/main.tsx
git commit -m "Render debug screens at /debug/* in dev builds only"
```

---

## Task 4: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full local check suite**

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
```

Expected: all pass. `pnpm test` should now include `src/ui/debug/DebugQuestionsPage.test.tsx` and `src/ui/debug/DebugRouter.test.tsx` on top of everything from M1a and M1b.

If `pnpm format:check` reports differences, run `pnpm format`, re-run `pnpm test`, and amend the relevant commit.

- [ ] **Step 2: Confirm the engine stayed untouched**

Run: `git diff --name-only main -- src/engine`
Expected: no output. M1c adds UI only; if an engine file changed, that change belongs in M1a or M1b.

- [ ] **Step 3: Confirm no routing library crept in**

Run: `grep -n "react-router\|wouter\|@tanstack/router" package.json`
Expected: no matches. Screens are driven by app state, not URLs.

---

## Post-M1c

M1 is complete: the engine generates and grades questions, and `/debug/questions` proves it at any difficulty and peak. `pnpm test` green plus that page rendering is exactly the spec's M1 verification criterion.

M2 adds `PixelCanvas`, the sprite format, and `/debug/sprites` — one new `case 'sprites'` in `DebugRouter`, no other change to the gate. M3 adds the real widgets and `/debug/widgets` the same way, and is the point at which `describeDisplay`'s text gloss can be replaced with an actual `<AnalogClock>` / `<CalendarMonth>` render on this page, if that turns out to be useful. M4 wires the registry into the real Climb screen, at which point `generateQuestion` from `src/engine/questions` (rather than the per-type sampling this page does) becomes the production entry point.
