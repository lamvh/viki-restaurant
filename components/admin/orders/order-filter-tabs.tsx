import Link from 'next/link';

export type FilterTab = { key: string; label: string; count?: number; href: string };

/** Pill row — the kitchen-status filters. */
export function StatusFilterTabs({ tabs, activeKey }: { tabs: FilterTab[]; activeKey: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition-colors ${
              active
                ? 'border-admin-ink bg-admin-ink text-admin-bg'
                : 'border-admin-line-strong bg-admin-card text-admin-ink/80 hover:border-admin-ink/40'
            }`}
          >
            {tab.label}
            {tab.count === undefined ? null : <span className="ml-1.5 opacity-60">{tab.count}</span>}
          </Link>
        );
      })}
    </div>
  );
}

/** Segmented control — the service filter. */
export function ServiceFilterTabs({ tabs, activeKey }: { tabs: FilterTab[]; activeKey: string }) {
  return (
    <div className="flex rounded-[9px] bg-admin-well p-[3px]">
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-[7px] px-3.5 py-[7px] text-[12.5px] font-semibold transition-colors ${
              active ? 'bg-white text-admin-ink shadow-sm' : 'text-admin-muted hover:text-admin-ink'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
