'use client';

import { useEffect, useState } from 'react';
import { useMenu } from './menu-provider';

/** Sticky category navigation; highlights the section currently in view. */
export function CategoryChips() {
  const menu = useMenu();
  const [active, setActive] = useState(menu[0]?.id ?? '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      // Trigger when a section sits within the middle band of the viewport.
      { rootMargin: '-40% 0px -55% 0px' },
    );
    for (const category of menu) {
      const el = document.getElementById(category.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [menu]);

  return (
    <nav
      aria-label="Menu categories"
      className="sticky top-[var(--header-h)] z-30 -mx-4 border-b border-line bg-surface/90 px-4 py-2 backdrop-blur"
    >
      <div className="flex gap-2 overflow-x-auto">
        {menu.map((category) => {
          const isActive = active === category.id;
          return (
            <a
              key={category.id}
              href={`#${category.id}`}
              aria-current={isActive ? 'true' : undefined}
              className={`whitespace-nowrap rounded-[var(--radius-pill)] border px-3 py-1 text-sm transition-colors ${
                isActive
                  ? 'border-brand bg-brand text-surface'
                  : 'border-line text-subtle hover:text-ink'
              }`}
            >
              {category.name}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
