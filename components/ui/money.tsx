import { money } from '@/lib/format';

/** Renders a money amount using the shared "$0.00" format. */
export function Money({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return <span className={className}>{money(value)}</span>;
}
