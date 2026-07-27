// The /vitest subpath augments Vitest's Assertion interface (not Jest's),
// so matchers like toBeInTheDocument() type-check under strict TS.
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmount React trees between tests so the singleton store + DOM don't leak.
afterEach(() => cleanup());

// Any test that reaches the network is a bug: a suite that quietly drives a live
// card terminal fails in CI and confuses whoever is standing at the counter.
// Tests that need HTTP stub `fetch` themselves, which overrides this.
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw new Error('Un-stubbed fetch in a test — mock the Windcave client instead.');
    }),
  );
});
