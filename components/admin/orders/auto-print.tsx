'use client';

import { useEffect } from 'react';

/**
 * Opens the browser print dialog once the receipt has rendered.
 *
 * Deliberately fires only when the page is opened with `?print=1`, so staff can
 * also just look at a bill without a dialog jumping at them.
 */
export function AutoPrint({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    // A frame's delay lets fonts and layout settle, otherwise the preview can
    // capture a half-styled receipt.
    const id = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(id);
  }, [enabled]);

  return null;
}
