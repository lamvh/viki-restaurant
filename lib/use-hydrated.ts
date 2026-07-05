'use client';

import { useEffect, useState } from 'react';

/**
 * True only after the component has mounted on the client. Store values that
 * come from persisted localStorage (cart count, service) differ from the
 * server-rendered defaults, so gate their display on this to avoid hydration
 * mismatches.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
