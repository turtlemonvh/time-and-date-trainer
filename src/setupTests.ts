import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// `vite.config.ts` sets `test.globals: false`, so RTL's automatic
// cleanup-between-tests (which hooks the global `afterEach`) never attaches
// on its own — any test file with more than one `render()` call would leak
// DOM nodes across tests without this.
afterEach(() => {
  cleanup();
});
