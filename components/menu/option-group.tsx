'use client';

import type { OptionGroup as OptionGroupType } from '@/types/menu';
import { money } from '@/lib/format';

type OptionGroupProps = {
  group: OptionGroupType;
  selected: string[];
  /** Called with the toggled choice id; parent applies single/multi semantics. */
  onToggle: (choiceId: string) => void;
};

/** One option group: radios for 'single', checkboxes for 'multi'. */
export function OptionGroup({ group, selected, onToggle }: OptionGroupProps) {
  const single = group.type === 'single';

  return (
    <fieldset className="border-t border-line pt-4">
      <legend className="mb-2 text-sm font-semibold">
        {group.title}
        {single ? '' : <span className="font-normal text-muted"> · optional</span>}
      </legend>
      <div className="flex flex-col gap-2">
        {group.choices.map((choice) => {
          const checked = selected.includes(choice.id);
          return (
            <label
              key={choice.id}
              className="flex cursor-pointer items-center justify-between gap-3 text-sm"
            >
              <span className="flex items-center gap-2">
                <input
                  type={single ? 'radio' : 'checkbox'}
                  name={group.id}
                  checked={checked}
                  onChange={() => onToggle(choice.id)}
                  className="accent-[var(--color-brand)]"
                />
                {choice.label}
              </span>
              {choice.price > 0 ? (
                <span className="text-muted">+{money(choice.price)}</span>
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
