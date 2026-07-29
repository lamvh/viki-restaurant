/** One Overview headline figure: label, value, and a comparison line. */
export function KpiCard({
  label,
  value,
  delta,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  delta: string;
  tone?: 'up' | 'down' | 'neutral';
}) {
  const deltaColor =
    tone === 'up' ? 'text-brand' : tone === 'down' ? 'text-admin-red' : 'text-admin-faint';

  return (
    <div className="rounded-[14px] border border-admin-line bg-admin-card px-[18px] pb-4 pt-[18px]">
      <p className="text-xs font-semibold text-admin-muted">{label}</p>
      <p className="my-1.5 font-display text-[38px] leading-[1.05]">{value}</p>
      <p className={`text-xs font-semibold ${deltaColor}`}>{delta}</p>
    </div>
  );
}
