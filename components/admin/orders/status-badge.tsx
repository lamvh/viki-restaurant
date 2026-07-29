import { serviceMeta, statusMeta, type BadgePalette } from '@/lib/admin/status-meta';

/**
 * Rounded pill in one of the design's status palettes.
 *
 * Colours arrive as values rather than classes because they are chosen at
 * runtime from the row's status — inline `style` avoids Tailwind having to
 * enumerate every status × property combination.
 */
function Badge({ palette, withDot = true }: { palette: BadgePalette; withDot?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-bold"
      style={{ backgroundColor: palette.bg, color: palette.fg }}
    >
      {withDot ? (
        <span
          className="h-[7px] w-[7px] shrink-0 rounded-full"
          style={{ backgroundColor: palette.dot }}
        />
      ) : null}
      {palette.label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge palette={statusMeta(status)} />;
}

export function ServiceBadge({ service }: { service: string }) {
  return <Badge palette={serviceMeta(service)} withDot={false} />;
}
