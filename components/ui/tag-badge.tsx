import type { Tag } from '@/types/menu';

const TAG_LABELS: Record<Tag, string> = {
  GF: 'Gluten free',
  DF: 'Dairy free',
  VEG: 'Vegetarian',
  R18: 'R18 — contains alcohol',
};

/** Small dietary/label pill (GF, DF, VEG, R18). */
export function TagBadge({ tag }: { tag: Tag }) {
  return (
    <span
      title={TAG_LABELS[tag]}
      className="inline-flex items-center rounded-[var(--radius-pill)] border border-line px-2 py-0.5 text-[11px] font-medium text-subtle"
    >
      {tag}
    </span>
  );
}
