import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock CSS imports
vi.mock('@xterm/xterm/css/xterm.css', () => ({}));

// Mock xterm.js - must be in setup to run before component imports
vi.mock('@xterm/xterm', () => {
  return {
    Terminal: vi.fn().mockImplementation(() => ({
      open: vi.fn(),
      write: vi.fn(),
      onData: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      onResize: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      dispose: vi.fn(),
      loadAddon: vi.fn(),
      focus: vi.fn(),
    })),
  };
});

// Mock xterm FitAddon
vi.mock('@xterm/addon-fit', () => {
  return {
    FitAddon: vi.fn().mockImplementation(() => ({
      fit: vi.fn(),
      proposeDimensions: vi.fn().mockReturnValue({ cols: 80, rows: 24 }),
    })),
  };
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock fetch globally
global.fetch = vi.fn();

// Reset mocks after each test
afterEach(() => {
  vi.resetAllMocks();
});
