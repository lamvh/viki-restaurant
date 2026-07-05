// The /vitest subpath augments Vitest's Assertion interface (not Jest's),
// so matchers like toBeInTheDocument() type-check under strict TS.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmount React trees between tests so the singleton store + DOM don't leak.
afterEach(() => cleanup());
