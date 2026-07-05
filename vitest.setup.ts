// The /vitest subpath augments Vitest's Assertion interface (not Jest's),
// so matchers like toBeInTheDocument() type-check under strict TS.
import '@testing-library/jest-dom/vitest';
