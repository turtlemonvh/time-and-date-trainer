import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// `vite.config.ts` sets `test.globals: false`, so RTL's automatic
// cleanup-between-tests (which hooks the global `afterEach`) never attaches
// on its own — any test file with more than one `render()` call would leak
// DOM nodes across tests without this.
afterEach(() => {
  cleanup();
});

// jsdom has no real <canvas> 2D context (`getContext('2d')` returns null and
// logs "Not implemented" to the console). Stub just enough of the API for
// PixelCanvas's draw calls not to throw or warn — this is a rendering smoke
// test concern, not a pixel-accuracy one, so a no-op stub is enough.
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  fillStyle: '',
  imageSmoothingEnabled: true,
})) as unknown as typeof HTMLCanvasElement.prototype.getContext;
