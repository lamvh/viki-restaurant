'use client';

/**
 * The design's pill toggle.
 *
 * A real `<button role="switch">` rather than a styled div, so it is reachable
 * by keyboard and announced correctly — the design draws the control but says
 * nothing about how it is operated.
 */
export function AvailabilitySwitch({
  checked,
  onChange,
  disabled = false,
  label,
  size = 'sm',
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
  size?: 'sm' | 'md';
}) {
  const track = size === 'sm' ? 'h-5 w-[34px]' : 'h-[22px] w-[38px]';
  const knob = size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]';
  const offset = size === 'sm' ? (checked ? 'left-4' : 'left-0.5') : checked ? 'left-[18px]' : 'left-0.5';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 disabled:opacity-50"
    >
      <span
        className={`relative shrink-0 rounded-full transition-colors ${track} ${
          checked ? 'bg-brand' : 'bg-admin-faint/60'
        }`}
      >
        <span
          className={`absolute top-0.5 rounded-full bg-white transition-[left] ${knob} ${offset}`}
        />
      </span>
      <span
        className={`text-xs font-semibold ${checked ? 'text-brand' : 'text-admin-faint'}`}
      >
        {checked ? 'Available' : 'Hidden'}
      </span>
    </button>
  );
}
