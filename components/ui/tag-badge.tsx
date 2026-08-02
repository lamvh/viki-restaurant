import type { Tag } from '@/types/menu';

/**
 * Dietary pills, in the design's tinted style with bilingual tooltips.
 *
 * Only tags the kitchen has actually confirmed reach this component — the menu
 * data deliberately leaves `tags` empty until per-dish allergen info is signed
 * off, because publishing a wrong "gluten free" is a safety issue, not a
 * cosmetic one. An empty tag list renders nothing.
 */
const TAG_META: Record<Tag, { label: string; title: string; bg: string; fg: string }> = {
  GF: { label: 'GF', title: 'Gluten free · Không gluten', bg: '#E7F1EA', fg: '#1f4a36' },
  DF: { label: 'DF', title: 'Dairy free · Không sữa', bg: '#E7F1EA', fg: '#1f4a36' },
  VEG: { label: 'V', title: 'Vegetarian · Món chay', bg: '#EAF3DE', fg: '#41631a' },
  R18: { label: 'R18', title: 'Alcohol · Có cồn', bg: '#F3E5E2', fg: '#96382a' },
};

export function TagBadge({ tag }: { tag: Tag }) {
  const meta = TAG_META[tag];
  if (!meta) return null;

  return (
    <span
      title={meta.title}
      className="inline-flex items-center rounded-[5px] px-[7px] py-[3px] text-[10.5px] font-bold"
      style={{ backgroundColor: meta.bg, color: meta.fg }}
    >
      {meta.label}
    </span>
  );
}

/** The pill row used on dish cards and rows. Renders nothing without tags. */
export function TagBadges({ tags, className = '' }: { tags?: Tag[]; className?: string }) {
  if (!tags?.length) return null;

  return (
    <div className={`flex flex-wrap gap-[5px] ${className}`}>
      {tags.map((tag) => (
        <TagBadge key={tag} tag={tag} />
      ))}
    </div>
  );
}
