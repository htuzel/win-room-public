// Win Room v2.0 - Period Filter Component
'use client';

import {
  PERIOD_OPTIONS,
  PeriodKey,
  normalizePeriod,
} from '@/lib/helpers/periods';

interface PeriodFilterProps {
  value: PeriodKey;
  onChange: (period: PeriodKey) => void;
  label?: string;
}

const GROUPED_OPTIONS = [
  {
    label: 'Current Periods',
    options: PERIOD_OPTIONS.filter((option) => option.category === 'current'),
  },
  {
    label: 'Previous Periods',
    options: PERIOD_OPTIONS.filter((option) => option.category === 'previous'),
  },
];

export function PeriodFilter({ value, onChange, label }: PeriodFilterProps) {
  const normalizedValue = normalizePeriod(value);
  const labelText = label ?? 'Date range';
  const spanClassName = label ? undefined : 'sr-only';

  return (
    <label className="flex items-center gap-2 text-sm text-foreground/60">
      <span className={spanClassName}>{labelText}</span>
      <select
        aria-label={labelText}
        className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        value={normalizedValue}
        onChange={(event) => onChange(normalizePeriod(event.target.value))}
      >
        {GROUPED_OPTIONS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
