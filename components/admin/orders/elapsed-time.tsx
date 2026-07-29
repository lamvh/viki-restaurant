'use client';

import { useEffect, useState } from 'react';

import { elapsedLabel } from '@/lib/orders/elapsed-label';

/**
 * "2 min ago", kept current without a reload.
 *
 * Client-only on purpose. Rendering a relative time on the server bakes in the
 * server's clock, which then disagrees with the browser's and trips a hydration
 * mismatch. Rendering nothing on the first pass and filling in after mount is
 * the one version that is always right.
 */
export function ElapsedTime({ createdAt }: { createdAt: string }) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    const update = () => setLabel(elapsedLabel(createdAt));
    update();
    // A minute is the display's own resolution — ticking faster changes nothing.
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [createdAt]);

  return (
    <time dateTime={createdAt} suppressHydrationWarning>
      {label}
    </time>
  );
}
