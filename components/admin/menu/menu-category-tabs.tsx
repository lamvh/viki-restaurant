'use client';

/** Category filter pills above the dish grid, including an "All" entry. */
export function MenuCategoryTabs({
  tabs,
  activeId,
  onSelect,
}: {
  tabs: { id: string; name: string; count: number }[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            aria-pressed={active}
            className={`rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition-colors ${
              active
                ? 'border-admin-ink bg-admin-ink text-admin-bg'
                : 'border-admin-line-strong bg-admin-card text-admin-ink/80 hover:border-admin-ink/40'
            }`}
          >
            {tab.name}
            <span className="ml-1.5 opacity-60">{tab.count}</span>
          </button>
        );
      })}
    </div>
  );
}
