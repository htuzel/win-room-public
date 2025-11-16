// Win Room v2.0 - Period Date Calculation Helpers

const PERIOD_KEYS = [
  'today',
  'yesterday',
  'this_week',
  'last_week',
  'this_15d',
  'last_15d',
  'this_month',
  'last_month',
  'this_quarter',
  'last_quarter',
  'this_year',
  'last_year',
] as const;

export type PeriodKey = (typeof PERIOD_KEYS)[number];

export const PERIOD_OPTIONS: Array<{
  value: PeriodKey;
  label: string;
  category: 'current' | 'previous';
}> = [
  { value: 'today', label: 'Today', category: 'current' },
  { value: 'yesterday', label: 'Yesterday', category: 'previous' },
  { value: 'this_week', label: 'This Week', category: 'current' },
  { value: 'last_week', label: 'Last Week', category: 'previous' },
  { value: 'this_15d', label: '15 Days (Current)', category: 'current' },
  { value: 'last_15d', label: '15 Days (Previous)', category: 'previous' },
  { value: 'this_month', label: 'This Month', category: 'current' },
  { value: 'last_month', label: 'Last Month', category: 'previous' },
  { value: 'this_quarter', label: 'This Quarter', category: 'current' },
  { value: 'last_quarter', label: 'Last Quarter', category: 'previous' },
  { value: 'this_year', label: 'This Year', category: 'current' },
  { value: 'last_year', label: 'Last Year', category: 'previous' },
];

const ALIAS_MAP: Record<string, PeriodKey> = {
  week: 'this_week',
  '15d': 'this_15d',
  month: 'this_month',
  quarter: 'this_quarter',
  year: 'this_year',
};

const PERIOD_KEY_SET = new Set<PeriodKey>(PERIOD_KEYS);

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const toISODate = (date: Date) => startOfDay(date).toISOString().split('T')[0];

const parseISODate = (iso: string): Date => {
  const parts = iso.split('-').map(Number);
  const year = parts[0] || 1970;
  const month = (parts[1] || 1) - 1;
  const day = parts[2] || 1;
  return new Date(year, month, day);
};

const endOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0);

const getQuarterStart = (date: Date, offsetQuarters = 0) => {
  const year = date.getFullYear();
  const quarterIndex = Math.floor(date.getMonth() / 3) + offsetQuarters;
  const adjustedYear = year + Math.floor(quarterIndex / 4);
  const normalizedQuarter = ((quarterIndex % 4) + 4) % 4;
  return new Date(adjustedYear, normalizedQuarter * 3, 1);
};

const getQuarterEnd = (date: Date, offsetQuarters = 0) => {
  const start = getQuarterStart(date, offsetQuarters);
  return new Date(start.getFullYear(), start.getMonth() + 3, 0);
};

export function normalizePeriod(period: string): PeriodKey {
  if (!period) return 'today';
  const normalized = period.toLowerCase();
  if (ALIAS_MAP[normalized]) {
    return ALIAS_MAP[normalized];
  }
  if (PERIOD_KEY_SET.has(normalized as PeriodKey)) {
    return normalized as PeriodKey;
  }
  return 'today';
}

export interface PeriodRange {
  startDate: string;
  endDate: string | null;
}

export function getPeriodRange(
  period: string,
  referenceDate: Date = new Date()
): PeriodRange {
  const normalized = normalizePeriod(period);
  const today = startOfDay(referenceDate);
  const year = today.getFullYear();
  const month = today.getMonth();

  switch (normalized) {
    case 'today': {
      return { startDate: toISODate(today), endDate: null };
    }
    case 'yesterday': {
      const day = addDays(today, -1);
      const iso = toISODate(day);
      return { startDate: iso, endDate: iso };
    }
    case 'this_week': {
      const dayOfWeek = today.getDay(); // 0 Sunday
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = addDays(today, -daysToMonday);
      return { startDate: toISODate(monday), endDate: null };
    }
    case 'last_week': {
      const dayOfWeek = today.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const thisMonday = addDays(today, -daysToMonday);
      const previousMonday = addDays(thisMonday, -7);
      const previousSunday = addDays(thisMonday, -1);
      return {
        startDate: toISODate(previousMonday),
        endDate: toISODate(previousSunday),
      };
    }
    case 'this_15d': {
      const dayOfMonth = today.getDate();
      const startDay = dayOfMonth <= 15 ? 1 : 16;
      const start = new Date(year, month, startDay);
      return { startDate: toISODate(start), endDate: null };
    }
    case 'last_15d': {
      const dayOfMonth = today.getDate();
      if (dayOfMonth <= 15) {
        const previousMonth = new Date(year, month - 1, 1);
        const start = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 16);
        const end = endOfMonth(previousMonth);
        return { startDate: toISODate(start), endDate: toISODate(end) };
      }
      const start = new Date(year, month, 1);
      const end = new Date(year, month, 15);
      return { startDate: toISODate(start), endDate: toISODate(end) };
    }
    case 'this_month': {
      const start = new Date(year, month, 1);
      return { startDate: toISODate(start), endDate: null };
    }
    case 'last_month': {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      return { startDate: toISODate(start), endDate: toISODate(end) };
    }
    case 'this_quarter': {
      const start = getQuarterStart(today, 0);
      return { startDate: toISODate(start), endDate: null };
    }
    case 'last_quarter': {
      const start = getQuarterStart(today, -1);
      const end = getQuarterEnd(today, -1);
      return { startDate: toISODate(start), endDate: toISODate(end) };
    }
    case 'this_year': {
      const start = new Date(year, 0, 1);
      return { startDate: toISODate(start), endDate: null };
    }
    case 'last_year': {
      const start = new Date(year - 1, 0, 1);
      const end = new Date(year - 1, 11, 31);
      return { startDate: toISODate(start), endDate: toISODate(end) };
    }
    default: {
      return { startDate: toISODate(today), endDate: null };
    }
  }
}

export function getPeriodStartDate(
  period: string,
  referenceDate: Date = new Date()
): string {
  return getPeriodRange(period, referenceDate).startDate;
}

export function getPeriodLabel(
  period: string,
  referenceDate: Date = new Date()
): string {
  const normalized = normalizePeriod(period);
  const { startDate, endDate } = getPeriodRange(normalized, referenceDate);
  const today = startOfDay(referenceDate);
  const monthFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  });

  switch (normalized) {
    case 'today':
      return `Today (${startDate})`;
    case 'yesterday':
      return `Yesterday (${startDate})`;
    case 'this_week':
      return `This Week (from ${startDate})`;
    case 'last_week':
      return `Last Week (${startDate} → ${endDate})`;
    case 'this_15d':
      return `15 Days (from ${startDate})`;
    case 'last_15d':
      return `Previous 15 Days (${startDate} → ${endDate})`;
    case 'this_month':
      return `This Month (${monthFormatter.format(today)})`;
    case 'last_month': {
      const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return `Last Month (${monthFormatter.format(lastMonthDate)})`;
    }
    case 'this_quarter': {
      const quarter = Math.floor(today.getMonth() / 3) + 1;
      return `This Quarter (Q${quarter} ${today.getFullYear()})`;
    }
    case 'last_quarter': {
      const lastQuarterStart = getQuarterStart(today, -1);
      const quarter = Math.floor(lastQuarterStart.getMonth() / 3) + 1;
      return `Last Quarter (Q${quarter} ${lastQuarterStart.getFullYear()})`;
    }
    case 'this_year':
      return `This Year (${today.getFullYear()})`;
    case 'last_year':
      return `Last Year (${today.getFullYear() - 1})`;
    default:
      return normalized;
  }
}

export function getPreviousPeriod(
  period: string,
  referenceDate: Date = new Date()
): { startDate: string; endDate: string } {
  const normalized = normalizePeriod(period);
  const today = startOfDay(referenceDate);

  switch (normalized) {
    case 'today': {
      const yesterday = addDays(today, -1);
      const iso = toISODate(yesterday);
      return { startDate: iso, endDate: iso };
    }
    case 'yesterday': {
      const dayBefore = addDays(today, -2);
      const iso = toISODate(dayBefore);
      return { startDate: iso, endDate: iso };
    }
    case 'this_week':
      return getPeriodRange('last_week', referenceDate) as {
        startDate: string;
        endDate: string;
      };
    case 'last_week': {
      const current = getPeriodRange('last_week', referenceDate);
      const start = parseISODate(current.startDate);
      const end = parseISODate(current.endDate ?? current.startDate);
      const prevStart = addDays(start, -7);
      const prevEnd = addDays(end, -7);
      return { startDate: toISODate(prevStart), endDate: toISODate(prevEnd) };
    }
    case 'this_15d':
      return getPeriodRange('last_15d', referenceDate) as {
        startDate: string;
        endDate: string;
      };
    case 'last_15d': {
      const current = getPeriodRange('last_15d', referenceDate);
      const start = parseISODate(current.startDate);
      const end = parseISODate(current.endDate ?? current.startDate);
      const span = Math.max(
        1,
        Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1
      );
      const previousEnd = addDays(start, -1);
      const previousStart = addDays(previousEnd, -(span - 1));
      return {
        startDate: toISODate(previousStart),
        endDate: toISODate(previousEnd),
      };
    }
    case 'this_month':
      return getPeriodRange('last_month', referenceDate) as {
        startDate: string;
        endDate: string;
      };
    case 'last_month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      const end = new Date(today.getFullYear(), today.getMonth() - 1, 0);
      return { startDate: toISODate(start), endDate: toISODate(end) };
    }
    case 'this_quarter':
      return getPeriodRange('last_quarter', referenceDate) as {
        startDate: string;
        endDate: string;
      };
    case 'last_quarter': {
      const start = getQuarterStart(today, -2);
      const end = getQuarterEnd(today, -2);
      return { startDate: toISODate(start), endDate: toISODate(end) };
    }
    case 'this_year':
      return getPeriodRange('last_year', referenceDate) as {
        startDate: string;
        endDate: string;
      };
    case 'last_year': {
      const start = new Date(today.getFullYear() - 2, 0, 1);
      const end = new Date(today.getFullYear() - 2, 11, 31);
      return { startDate: toISODate(start), endDate: toISODate(end) };
    }
    default: {
      const yesterday = addDays(today, -1);
      const iso = toISODate(yesterday);
      return { startDate: iso, endDate: iso };
    }
  }
}

export function getConversionWindow(
  period: string,
  referenceDate: Date = new Date()
): {
  current: { startDate: string; endDate: string };
  previous: { startDate: string; endDate: string };
} {
  const normalized = normalizePeriod(period);
  const today = startOfDay(referenceDate);

  if (normalized === 'today') {
    const currentStart = addDays(today, -4);
    const previousStart = addDays(today, -5);
    return {
      current: {
        startDate: toISODate(currentStart),
        endDate: toISODate(currentStart),
      },
      previous: {
        startDate: toISODate(previousStart),
        endDate: toISODate(previousStart),
      },
    };
  }

  if (normalized === 'yesterday') {
    const yesterday = addDays(today, -1);
    const currentStart = addDays(yesterday, -4);
    const previousStart = addDays(yesterday, -5);
    return {
      current: {
        startDate: toISODate(currentStart),
        endDate: toISODate(currentStart),
      },
      previous: {
        startDate: toISODate(previousStart),
        endDate: toISODate(previousStart),
      },
    };
  }

  const { startDate, endDate } = getPeriodRange(normalized, referenceDate);
  const start = parseISODate(startDate);
  const inclusiveEnd = endDate ? parseISODate(endDate) : today;
  const span =
    Math.max(0, Math.round((inclusiveEnd.getTime() - start.getTime()) / DAY_MS)) + 1;
  const previousEnd = addDays(start, -1);
  const previousStart = addDays(previousEnd, -(span - 1));

  return {
    current: {
      startDate,
      endDate: toISODate(inclusiveEnd),
    },
    previous: {
      startDate: toISODate(previousStart),
      endDate: toISODate(previousEnd),
    },
  };
}
