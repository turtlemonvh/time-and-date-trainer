# M0 — Scaffold & CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Summit Clock project skeleton — a buildable, lintable, testable, installable-as-a-PWA React/TypeScript app with GitHub Actions CI, Pages deploy, and the Claude Code GitHub Action — with nothing game-specific yet beyond a placeholder screen.

**Architecture:** Vite + React + TypeScript app scaffolded with `pnpm create vite`. Vitest (via `vitest/config`, merged into `vite.config.ts`) for unit tests, Playwright for browser/e2e tests including an offline-reload check. `vite-plugin-pwa` generates the manifest and service worker; app icons are produced at build time from a small code-defined pixel grid (the same grid+palette shape the full sprite system will use from M2 onward) rasterized to PNG with `sharp`, so no binary art is committed to the repo.

**Tech Stack:** TypeScript, React 19, Vite 6+, pnpm (via corepack), ESLint (flat config) + Prettier, Vitest + @testing-library/react, Playwright, vite-plugin-pwa, sharp, tsx.

## Global Constraints

- Local-storage only, fully offline-capable once installed — no required network calls at runtime (from spec).
- No binary art or audio assets committed to the repo; anything visual is code-generated (from spec's "Art" and "Repo & automation setup" decisions).
- US conventions: this milestone has no user-facing time/date content yet, so this constraint doesn't apply to M0's deliverables directly — carried forward for later milestones.
- Repo is public; nothing in commits should assume private infra.
- Two setup actions require the repo owner and must NOT be run autonomously: creating the GitHub repo, and adding the `ANTHROPIC_API_KEY` secret (from spec's "Repo & automation setup"). Task 10 below is written for the owner, not for autonomous execution.

---

## Task 1: Scaffold the Vite + React + TypeScript project with pnpm

**Files:**

- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `.gitignore` (all from the Vite scaffold)

**Interfaces:**

- Produces: a `pnpm build` / `pnpm dev` toolchain every later task builds on. `App.tsx` default-exports a `App` React component — later tasks (5, 6) assume it renders an `<h1>` with the text `Summit Clock`.

- [ ] **Step 1: Enable corepack so `pnpm` is available**

Run: `corepack enable`

- [ ] **Step 2: Scaffold the project in place**

The directory currently contains only `README.md`, `docs/`, and `.git` — `create-vite`'s emptiness check whitelists `README.md` and dotfiles, so this runs without prompting:

Run: `pnpm create vite@latest . --template react-ts`

- [ ] **Step 3: Install dependencies**

Run: `pnpm install`

- [ ] **Step 4: Pin the pnpm version used by this project**

This writes a `packageManager` field to `package.json` so CI (`pnpm/action-setup`) and every future contributor resolve the exact same pnpm version.

Run: `corepack use pnpm@latest`

- [ ] **Step 5: Set a minimum Node version**

Edit `package.json`, add an `engines` field:

```json
{
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 6: Replace the placeholder App content**

Edit `src/App.tsx` to a minimal placeholder that later tasks' tests target:

```tsx
function App() {
  return (
    <main>
      <h1>Summit Clock</h1>
      <p>Under construction.</p>
    </main>
  );
}

export default App;
```

- [ ] **Step 7: Verify the toolchain builds**

Run: `pnpm build`
Expected: completes with no errors, producing a `dist/` directory.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Scaffold Vite + React + TypeScript project"
```

---

## Task 2: Strict TypeScript config

**Files:**

- Modify: `tsconfig.app.json`, `tsconfig.node.json`

**Interfaces:**

- Consumes: the tsconfig files created in Task 1.
- Produces: a `pnpm typecheck` script other tasks' CI step relies on.

- [ ] **Step 1: Confirm strict mode is on**

Open `tsconfig.app.json` — the Vite react-ts template already sets `"strict": true` and `"noEmit": true`. Leave `noEmit` as `true` in both `tsconfig.app.json` and `tsconfig.node.json` — Vite/esbuild does the actual transpilation, `tsc` is only used here for type-checking.

- [ ] **Step 2: Include the future `scripts/` directory in the node tsconfig**

Edit `tsconfig.node.json`'s `include` array to add `"scripts"`:

```json
{
  "include": ["vite.config.ts", "scripts"]
}
```

(Keep any existing entries already in that array — just add `"scripts"` to it.)

- [ ] **Step 3: Add a `typecheck` script**

Edit `package.json`'s `"scripts"` block, add:

```json
"typecheck": "tsc -b"
```

- [ ] **Step 4: Verify**

Run: `pnpm typecheck`
Expected: exits 0 with no output (or only incremental build info written).

- [ ] **Step 5: Commit**

```bash
git add tsconfig.node.json package.json
git commit -m "Add typecheck script and include scripts/ in node tsconfig"
```

---

## Task 3: ESLint + Prettier

**Files:**

- Modify: `eslint.config.js` (already created by the Vite template)
- Create: `.prettierrc.json`, `.prettierignore`

**Interfaces:**

- Produces: `pnpm lint`, `pnpm lint:fix`, `pnpm format`, `pnpm format:check` scripts.

- [ ] **Step 1: Add Prettier and the ESLint/Prettier bridge**

Run: `pnpm add -D prettier eslint-config-prettier`

- [ ] **Step 2: Create the Prettier config**

Create `.prettierrc.json`:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

Create `.prettierignore`:

```
dist
dev-dist
node_modules
pnpm-lock.yaml
coverage
playwright-report
test-results
public/icons
```

- [ ] **Step 3: Wire Prettier into the ESLint flat config**

Open `eslint.config.js`. It should already look like the standard Vite react-ts template output (a `tseslint.config(...)` call with an `ignores` entry and a config object using `files: ['**/*.{ts,tsx}']`). Make two edits:

1. Add `import eslintConfigPrettier from 'eslint-config-prettier';` at the top.
2. Append `eslintConfigPrettier` as the last entry in the `tseslint.config(...)` argument list, and extend the `ignores` array to also cover build/script output:

```js
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'public/icons'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['scripts/**/*.ts', 'vite.config.ts', 'playwright.config.ts'],
    languageOptions: { globals: globals.node },
  },
  eslintConfigPrettier,
);
```

- [ ] **Step 4: Add scripts**

Edit `package.json`'s `"scripts"` block:

```json
"lint": "eslint .",
"lint:fix": "eslint . --fix",
"format": "prettier --write .",
"format:check": "prettier --check ."
```

- [ ] **Step 5: Verify**

Run: `pnpm lint`
Expected: exits 0, no errors.

Run: `pnpm format:check`
Expected: exits 0 (run `pnpm format` first if it reports unformatted files, then re-check).

- [ ] **Step 6: Commit**

```bash
git add eslint.config.js .prettierrc.json .prettierignore package.json pnpm-lock.yaml
git commit -m "Add Prettier and wire it into ESLint"
```

---

## Task 4: Vitest + Testing Library

**Files:**

- Modify: `vite.config.ts`
- Create: `src/setupTests.ts`, `src/App.test.tsx`

**Interfaces:**

- Consumes: `App` from `src/App.tsx` (Task 1).
- Produces: `pnpm test` / `pnpm test:watch` scripts; establishes the `vitest/config` + `test` block pattern later engine unit tests (M1+) will use.

- [ ] **Step 1: Add test dependencies**

Run: `pnpm add -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom`

- [ ] **Step 2: Write the failing test**

Create `src/App.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the app name', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Summit Clock' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Create the test setup file**

Create `src/setupTests.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Merge Vitest config into `vite.config.ts`**

Open `vite.config.ts`. Change the `defineConfig` import to come from `vitest/config` (it re-exports Vite's `defineConfig` plus adds `test` typing) and add a `test` block:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    globals: false,
  },
});
```

(Keep whatever else is already in the file — this shows the parts to change/add, not a full replacement.)

- [ ] **Step 5: Run the test to verify it fails first**

Temporarily, this step is informational only since the App already renders the heading from Task 1 — run it anyway to confirm the pipeline itself works end to end:

Run: `pnpm exec vitest run --reporter=verbose`
Expected: 1 test file, 1 test, PASS (since `App.tsx` already renders the right heading). If it fails, fix `App.tsx` or the test until it passes before moving on.

- [ ] **Step 6: Add scripts**

Edit `package.json`'s `"scripts"` block:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 7: Verify via the script**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add vite.config.ts src/setupTests.ts src/App.test.tsx package.json pnpm-lock.yaml
git commit -m "Add Vitest and Testing Library with a sample test"
```

---

## Task 5: Playwright smoke test

**Files:**

- Create: `playwright.config.ts`, `e2e/smoke.spec.ts`
- Modify: `.gitignore`

**Interfaces:**

- Consumes: `pnpm build` (Task 1) and `pnpm preview` (built into Vite).
- Produces: `pnpm test:e2e` script; the `e2e/` directory Task 6 appends more tests to.

- [ ] **Step 1: Add Playwright**

Run: `pnpm add -D @playwright/test`

Run: `pnpm exec playwright install --with-deps chromium`

- [ ] **Step 2: Write the Playwright config**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm preview --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

- [ ] **Step 3: Write the smoke test**

Create `e2e/smoke.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('loads the app shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Summit Clock' })).toBeVisible();
});
```

- [ ] **Step 4: Add the e2e script**

Edit `package.json`'s `"scripts"` block:

```json
"test:e2e": "playwright test"
```

- [ ] **Step 5: Build the app so the preview server has something to serve**

Run: `pnpm build`

- [ ] **Step 6: Run the test**

Run: `pnpm test:e2e`
Expected: 1 passed.

- [ ] **Step 7: Ignore Playwright output**

Append to `.gitignore`:

```
playwright-report/
test-results/
```

- [ ] **Step 8: Commit**

```bash
git add playwright.config.ts e2e/smoke.spec.ts package.json pnpm-lock.yaml .gitignore
git commit -m "Add Playwright with a smoke test"
```

---

## Task 6: PWA manifest, code-generated icons, and service worker

**Files:**

- Create: `app.config.ts`, `scripts/pixelIcon.ts`, `scripts/pixelIcon.test.ts`, `scripts/generate-icons.ts`
- Modify: `vite.config.ts`, `package.json`, `index.html`, `src/main.tsx`, `.gitignore`, `e2e/smoke.spec.ts`

**Interfaces:**

- Produces: `app.config.ts` exports `APP_NAME`, `APP_SHORT_NAME`, `APP_DESCRIPTION`, `THEME_COLOR`, `BACKGROUND_COLOR` (all `string`) — the single source of truth both the manifest and the icon generator read from. `scripts/pixelIcon.ts` exports `buildMountainGlyphSvg(sizePx: number, opts?: { maskable?: boolean }): string`.

- [ ] **Step 1: Add the PWA plugin and icon-generation dependencies**

Run: `pnpm add -D vite-plugin-pwa sharp tsx`

- [ ] **Step 2: Create the shared branding config**

Create `app.config.ts`:

```ts
export const APP_NAME = 'Summit Clock';
export const APP_SHORT_NAME = 'Summit Clock';
export const APP_DESCRIPTION = 'Climb ten peaks by mastering time and calendars.';
export const THEME_COLOR = '#0f172a';
export const BACKGROUND_COLOR = '#0f172a';
```

- [ ] **Step 3: Write the failing test for the icon glyph**

Create `scripts/pixelIcon.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildMountainGlyphSvg } from './pixelIcon';

describe('buildMountainGlyphSvg', () => {
  it('renders an SVG at the requested pixel size', () => {
    const svg = buildMountainGlyphSvg(192);
    expect(svg).toContain('width="192"');
    expect(svg).toContain('height="192"');
    expect(svg).toContain('viewBox="0 0 16 16"');
  });

  it('draws exactly the filled cells of the mountain glyph', () => {
    const svg = buildMountainGlyphSvg(64);
    const rectCount = (svg.match(/<rect /g) ?? []).length;
    // 1 background rect + 184 glyph cells (the isoceles triangle + snow cap, see grid below)
    expect(rectCount).toBe(1 + 184);
  });

  it('shrinks the glyph into a safe zone when maskable', () => {
    const standard = buildMountainGlyphSvg(64);
    const maskable = buildMountainGlyphSvg(64, { maskable: true });
    expect(maskable).toContain('scale(');
    expect(maskable).not.toBe(standard);
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `pnpm exec vitest run scripts/pixelIcon.test.ts`
Expected: FAIL — `Cannot find module './pixelIcon'`.

- [ ] **Step 5: Implement the glyph**

Create `scripts/pixelIcon.ts`:

```ts
import { BACKGROUND_COLOR } from '../app.config';

const ROCK = '#57606f';
const SNOW = '#f1f5f9';

// 16x16 grid: '.' transparent, 'W' snow cap, 'R' rock. An isoceles mountain
// silhouette, widening by 2 columns per row until it fills the full width.
const GRID = [
  '................',
  '.......WW.......',
  '......WWWW......',
  '.....RRRRRR.....',
  '....RRRRRRRR....',
  '...RRRRRRRRRR...',
  '..RRRRRRRRRRRR..',
  '.RRRRRRRRRRRRRR.',
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR',
  'RRRRRRRRRRRRRRRR',
];

const PALETTE: Record<string, string> = { R: ROCK, W: SNOW };

function glyphRects(): string {
  const rects: string[] = [];
  GRID.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell === '.') return;
      rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${PALETTE[cell]}"/>`);
    });
  });
  return rects.join('');
}

export function buildMountainGlyphSvg(sizePx: number, opts: { maskable?: boolean } = {}): string {
  const bg = `<rect width="16" height="16" fill="${BACKGROUND_COLOR}"/>`;
  const glyph = opts.maskable
    ? `<g transform="translate(2.4 2.4) scale(0.7)">${glyphRects()}</g>`
    : glyphRects();
  return (
    `<svg width="${sizePx}" height="${sizePx}" viewBox="0 0 16 16" ` +
    `xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">` +
    `${bg}${glyph}</svg>`
  );
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm exec vitest run scripts/pixelIcon.test.ts`
Expected: 3 passed. If the rect count assertion fails, count the non-`.` characters in `GRID` and correct the expected number in the test (it must equal `2+4+6+8+10+12+14+16+16*7 = 184`).

- [ ] **Step 7: Write the icon generation script**

Create `scripts/generate-icons.ts`:

```ts
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { buildMountainGlyphSvg } from './pixelIcon';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(scriptDir, '../public');
const iconsDir = path.join(outDir, 'icons');

async function renderPng(svg: string, filePath: string) {
  await sharp(Buffer.from(svg)).png().toFile(filePath);
}

async function main() {
  await mkdir(iconsDir, { recursive: true });

  await writeFile(path.join(outDir, 'favicon.svg'), buildMountainGlyphSvg(64));
  await renderPng(buildMountainGlyphSvg(32), path.join(outDir, 'favicon-32x32.png'));
  await renderPng(buildMountainGlyphSvg(180), path.join(outDir, 'apple-touch-icon.png'));
  await renderPng(buildMountainGlyphSvg(192), path.join(iconsDir, 'icon-192.png'));
  await renderPng(buildMountainGlyphSvg(512), path.join(iconsDir, 'icon-512.png'));
  await renderPng(
    buildMountainGlyphSvg(512, { maskable: true }),
    path.join(iconsDir, 'icon-512-maskable.png'),
  );

  console.log('Generated icons in public/ and public/icons/');
}

main();
```

- [ ] **Step 8: Run it and inspect the output**

Run: `pnpm exec tsx scripts/generate-icons.ts`
Expected: creates `public/favicon.svg`, `public/favicon-32x32.png`, `public/apple-touch-icon.png`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-512-maskable.png`. Open `public/icons/icon-512.png` to confirm it's a visible navy square with a light mountain silhouette (not blank/corrupt).

- [ ] **Step 9: Configure `vite-plugin-pwa`**

Edit `vite.config.ts`, adding the plugin and reading the base path from the environment (needed for the GitHub Pages subpath deploy in Task 8):

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_SHORT_NAME,
  BACKGROUND_COLOR,
  THEME_COLOR,
} from './app.config';

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon-32x32.png', 'apple-touch-icon.png'],
      manifest: {
        name: APP_NAME,
        short_name: APP_SHORT_NAME,
        description: APP_DESCRIPTION,
        theme_color: THEME_COLOR,
        background_color: BACKGROUND_COLOR,
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    globals: false,
  },
});
```

- [ ] **Step 10: Reference the icons from `index.html`**

Edit `index.html`, replacing the default Vite favicon `<link>` and adding the Apple touch icon, and updating the title:

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<title>Summit Clock</title>
```

- [ ] **Step 11: Register the service worker**

Edit `src/main.tsx`, adding the auto-registration import from the plugin's virtual module:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import 'virtual:pwa-register';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 12: Chain icon generation into `dev` and `build`**

Edit `package.json`'s `"scripts"` block so both entry points regenerate icons first (deliberately not using pnpm's pre/post-script hooks, which are off by default — chaining explicitly is portable):

```json
"dev": "tsx scripts/generate-icons.ts && vite",
"build": "tsc -b && tsx scripts/generate-icons.ts && vite build",
"icons": "tsx scripts/generate-icons.ts"
```

- [ ] **Step 13: Ignore generated icon output**

Append to `.gitignore`:

```
public/icons/
public/favicon.svg
public/favicon-32x32.png
public/apple-touch-icon.png
dev-dist/
```

Remove the old default `public/vite.svg` if the template left it (`rm -f public/vite.svg`) — it's unused now that the manifest points at generated icons.

- [ ] **Step 14: Rebuild and re-run the unit suite**

Run: `pnpm build`
Expected: succeeds; `dist/` now contains a `manifest.webmanifest` and a service worker file (`sw.js`).

- [ ] **Step 15: Extend the e2e suite with service-worker and offline checks**

Edit `e2e/smoke.spec.ts`, appending two tests:

```ts
test('registers a service worker', async ({ page }) => {
  await page.goto('/');
  const active = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const registration = await navigator.serviceWorker.ready;
    return !!registration.active;
  });
  expect(active).toBe(true);
});

test('still loads after going offline', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Summit Clock' })).toBeVisible();
  await context.setOffline(false);
});
```

- [ ] **Step 16: Verify**

Run: `pnpm build && pnpm test:e2e`
Expected: 3 passed (the original smoke test plus these two).

- [ ] **Step 17: Commit**

```bash
git add app.config.ts scripts/ vite.config.ts package.json pnpm-lock.yaml index.html src/main.tsx .gitignore e2e/smoke.spec.ts
git commit -m "Add PWA manifest, service worker, and code-generated icons"
```

---

## Task 7: Continuous integration workflow

**Files:**

- Create: `.github/workflows/ci.yml`

**Interfaces:**

- Consumes: every script from Tasks 1–6 (`typecheck`, `lint`, `format:check`, `test`, `build`, `test:e2e`).

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm format:check
      - run: pnpm test
      - run: pnpm build

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium

      - run: pnpm test:e2e

      - name: Upload Playwright report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

- [ ] **Step 2: Validate the YAML locally**

Run: `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/ci.yml'))" && echo OK`
Expected: `OK`. (This only checks syntax — the real test is a PR run, in Task 10.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "Add CI workflow"
```

---

## Task 8: Deploy workflow and repo metadata

**Files:**

- Create: `.github/workflows/deploy.yml`, `.github/dependabot.yml`, `.github/pull_request_template.md`, `CONTRIBUTING.md`, `LICENSE`, `.editorconfig`
- Modify: `README.md`

**Interfaces:**

- Consumes: `pnpm build` (Task 1/6). The deploy workflow sets `VITE_BASE_PATH` to match `vite.config.ts`'s `base` read added in Task 6, Step 9.

- [ ] **Step 1: Write the deploy workflow**

Create `.github/workflows/deploy.yml`. Replace `<repo-name>` with the actual GitHub repository name once it's created in Task 10 (it determines the Pages subpath, e.g. `/time-and-date-trainer/`):

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm build
        env:
          VITE_BASE_PATH: /<repo-name>/

      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

- [ ] **Step 2: Add Dependabot config**

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
    groups:
      dev-dependencies:
        dependency-type: 'development'

  - package-ecosystem: 'github-actions'
    directory: '/'
    schedule:
      interval: 'weekly'
```

- [ ] **Step 3: Add a PR template**

Create `.github/pull_request_template.md`:

```markdown
## What changed

## How to test

- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build && pnpm test:e2e` all pass locally
- [ ] Manually verified in the browser (describe what you clicked through)
```

- [ ] **Step 4: Add CONTRIBUTING.md**

Create `CONTRIBUTING.md`:

````markdown
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
````

`pnpm test:e2e` requires a build to exist first (`pnpm build`), since Playwright serves the built
app via `vite preview`.

## Project layout

See `docs/superpowers/specs/2026-08-08-summit-clock-design.md` for the full design — architecture,
game mechanics, and the milestone roadmap. `docs/superpowers/plans/` holds the implementation plan
for each milestone.

```

- [ ] **Step 5: Add an MIT license**

Create `LICENSE`:

```

MIT License

Copyright (c) 2026 Timothy Van Heest

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

````

- [ ] **Step 6: Add `.editorconfig`**

Create `.editorconfig`:

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
````

- [ ] **Step 7: Update the README**

Replace `README.md`:

```markdown
# Summit Clock

A local-storage-only, installable browser game that teaches telling time and working with
calendars by climbing ten mountain peaks.

## Setup

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Design

See [docs/superpowers/specs/2026-08-08-summit-clock-design.md](./docs/superpowers/specs/2026-08-08-summit-clock-design.md).
```

- [ ] **Step 8: Commit**

```bash
git add .github/workflows/deploy.yml .github/dependabot.yml .github/pull_request_template.md CONTRIBUTING.md LICENSE .editorconfig README.md
git commit -m "Add deploy workflow, dependabot, license, and contributor docs"
```

---

## Task 9: Claude Code GitHub Action workflows

**Files:**

- Create: `.github/workflows/claude.yml`, `.github/workflows/claude-code-review.yml`

**Interfaces:**

- Consumes: an `ANTHROPIC_API_KEY` repository secret that Task 10 (owner-only) provisions. These workflows will fail closed (no-op / auth error) until that secret exists — that's expected and fine to commit ahead of the secret being added.

- [ ] **Step 1: Write the `@claude` mention-triggered workflow**

Create `.github/workflows/claude.yml`:

```yaml
name: Claude Code

on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]
  issues:
    types: [opened, assigned]
  pull_request_review:
    types: [submitted]

jobs:
  claude:
    if: |
      (github.event_name == 'issue_comment' && contains(github.event.comment.body, '@claude')) ||
      (github.event_name == 'pull_request_review_comment' && contains(github.event.comment.body, '@claude')) ||
      (github.event_name == 'pull_request_review' && contains(github.event.review.body, '@claude')) ||
      (github.event_name == 'issues' && (contains(github.event.issue.body, '@claude') || contains(github.event.issue.title, '@claude')))
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: read
      issues: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

- [ ] **Step 2: Write the automatic PR review workflow**

Create `.github/workflows/claude-code-review.yml`:

```yaml
name: Claude Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            Review this pull request for correctness bugs, missing test coverage, and
            adherence to docs/superpowers/specs/2026-08-08-summit-clock-design.md.
            Leave inline comments on specific lines where possible.
```

- [ ] **Step 3: Validate YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/claude.yml')); yaml.safe_load(open('.github/workflows/claude-code-review.yml'))" && echo OK`
Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/claude.yml .github/workflows/claude-code-review.yml
git commit -m "Add Claude Code GitHub Action workflows"
```

---

## Task 10: Repo creation, secret, and first verified deploy (repo owner only)

This task is **not** for autonomous execution — it creates a public GitHub repository, pushes code
to it, and adds a secret. Per the design spec, these steps need the repo owner's explicit go-ahead.
Whoever executes Tasks 1–9 should stop and hand off here rather than running these commands.

- [ ] **Step 1: Create the public repo**

```bash
gh repo create time-and-date-trainer --public --source=. --remote=origin
```

- [ ] **Step 2: Fix the deploy workflow's base path**

If the repo name differs from `time-and-date-trainer`, edit the `VITE_BASE_PATH` in
`.github/workflows/deploy.yml` (Task 8, Step 1) to match, and commit that fix.

- [ ] **Step 3: Enable Pages with Actions as the source**

```bash
gh api -X PUT repos/{owner}/time-and-date-trainer/pages -f build_type=workflow
```

If that 404s (Pages not yet initialized for the repo), enable it once via the repo's Settings →
Pages → Source → "GitHub Actions" in the browser instead.

- [ ] **Step 4: Add the Claude Code secret**

```bash
gh secret set ANTHROPIC_API_KEY --repo <owner>/time-and-date-trainer
```

(Prompts for the value, or pipe it in — don't paste the key in plaintext into a command that ends
up in shell history.)

- [ ] **Step 5: Push**

```bash
git push -u origin main
```

- [ ] **Step 6: Verify CI**

```bash
gh run watch
```

Expected: the `CI` workflow run for the `main` push completes successfully.

- [ ] **Step 7: Verify the deploy**

```bash
gh run list --workflow=deploy.yml --limit=1
```

Once it succeeds, visit `https://<owner>.github.io/time-and-date-trainer/` and confirm the page
loads and shows "Summit Clock".

- [ ] **Step 8: Verify installability on a phone**

Open the deployed URL on a phone browser (Safari on iOS, Chrome on Android) and confirm an
"Add to Home Screen" / install prompt is available, and that the installed app opens to the same
placeholder screen with no network connection.

---

## Post-M0

Once all ten tasks are verified, M1 (the headless question-generation engine) gets its own plan —
don't start it as part of this one.
