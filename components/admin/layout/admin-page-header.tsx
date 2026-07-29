/**
 * Desktop title bar for an admin section.
 *
 * Pages render this rather than the layout, because the trailing action is
 * page-specific ("+ New dish") and a layout cannot reach into its child route
 * for one. Below 820px it is hidden — the mobile header already carries the
 * section title, and repeating it wastes a third of a phone screen.
 */
export function AdminPageHeader({
  title,
  sub,
  action,
}: {
  title: string;
  sub: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="no-print mb-4 hidden shrink-0 items-center gap-4 min-[820px]:flex">
      <div className="min-w-0">
        <h1 className="font-display text-[30px] leading-[1.05]">{title}</h1>
        <p className="mt-0.5 text-[13px] text-admin-muted">{sub}</p>
      </div>
      {action ? <div className="ml-auto flex items-center gap-2.5">{action}</div> : null}
    </div>
  );
}
