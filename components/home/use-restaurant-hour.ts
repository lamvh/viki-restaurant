'use client';

import { useEffect, useState } from 'react';

import { restaurantHour } from '@/lib/home/service-window';

/**
 * The hour at the restaurant, seeded from the server.
 *
 * The initial value arrives as a prop rather than being read from the clock on
 * mount, so the first client render matches the HTML exactly — reading
 * `new Date()` during render is the classic hydration mismatch. The interval
 * then keeps a long-open tab honest across the lunch/dinner boundary.
 */
export function useRestaurantHour(initialHour: number): number {
  const [hour, setHour] = useState(initialHour);

  useEffect(() => {
    const tick = () => setHour(restaurantHour());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  return hour;
}
