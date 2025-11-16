// Win Room v2.0 - Monthly Sales Overview Panel
'use client';

import { useState, useEffect } from 'react';

interface MonthlyStat {
  year: number;
  month: number;
  total_sales: number;
  total_revenue_usd: number;
  total_margin_usd: number;
  original_margin_usd: number;
  total_adjustments_usd: number;
  avg_margin_percent: number;
}

interface MonthlyOverviewPanelProps {
  token: string | null;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function MonthlyOverviewPanel({ token }: MonthlyOverviewPanelProps) {
  const [stats, setStats] = useState<MonthlyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!token) return;
    fetchMonthlyStats();
  }, [token]);

  const fetchMonthlyStats = async () => {
    try {
      const res = await fetch('/api/admin/monthly-overview', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setStats(data);

        // Auto-expand current year
        const currentYear = new Date().getFullYear();
        setExpandedYears(new Set([currentYear]));
      }
    } catch (error) {
      console.error('Failed to fetch monthly stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(year)) {
        newSet.delete(year);
      } else {
        newSet.add(year);
      }
      return newSet;
    });
  };

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  // Group stats by year
  const statsByYear = stats.reduce((acc, stat) => {
    if (!acc[stat.year]) {
      acc[stat.year] = [];
    }
    acc[stat.year].push(stat);
    return acc;
  }, {} as Record<number, MonthlyStat[]>);

  // Calculate year totals
  const yearTotals = Object.entries(statsByYear).reduce((acc, [year, months]) => {
    acc[parseInt(year)] = {
      total_sales: months.reduce((sum, m) => sum + m.total_sales, 0),
      total_revenue_usd: months.reduce((sum, m) => sum + m.total_revenue_usd, 0),
      total_margin_usd: months.reduce((sum, m) => sum + m.total_margin_usd, 0),
      original_margin_usd: months.reduce((sum, m) => sum + m.original_margin_usd, 0),
      total_adjustments_usd: months.reduce((sum, m) => sum + m.total_adjustments_usd, 0),
      avg_margin_percent: months.reduce((sum, m) => sum + m.avg_margin_percent, 0) / months.length,
    };
    return acc;
  }, {} as Record<number, Omit<MonthlyStat, 'year' | 'month'>>);

  const years = Object.keys(statsByYear).map(Number).sort((a, b) => b - a);

  if (loading) {
    return <div className="text-center text-foreground/60">Loading monthly overview...</div>;
  }

  if (stats.length === 0) {
    return <div className="text-center text-foreground/60">No monthly data available</div>;
  }

  return (
    <div className="rounded-3xl border border-border/60 bg-surface/70 p-6 shadow-[0_24px_45px_rgba(0,0,0,0.25)]">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground">Monthly Sales Overview</h2>
        <p className="text-sm text-foreground/60 mt-1">Historical sales data by month</p>
      </div>

      <div className="space-y-4">
        {years.map((year) => {
          const isExpanded = expandedYears.has(year);
          const yearTotal = yearTotals[year];
          const months = statsByYear[year].sort((a, b) => b.month - a.month);

          return (
            <div key={year} className="rounded-2xl border border-border/50 bg-background/40 overflow-hidden">
              {/* Year Header */}
              <button
                onClick={() => toggleYear(year)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-background/60 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-foreground">{year}</span>
                  <span className="text-sm text-foreground/60">
                    {months.length} {months.length === 1 ? 'month' : 'months'}
                  </span>
                </div>

                <div className="flex items-center gap-6">
                  {/* Year Totals */}
                  <div className="text-right">
                    <div className="text-xs text-foreground/50 uppercase">Total Sales</div>
                    <div className="text-lg font-bold text-foreground">{yearTotal.total_sales}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-foreground/50 uppercase">Revenue</div>
                    <div className="text-lg font-bold text-accent">
                      {currencyFormatter.format(yearTotal.total_revenue_usd)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-foreground/50 uppercase">Margin</div>
                    <div className="text-lg font-bold text-emerald-400">
                      {currencyFormatter.format(yearTotal.total_margin_usd)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-foreground/50 uppercase">Avg %</div>
                    <div className="text-lg font-bold text-foreground/80">
                      {(yearTotal.avg_margin_percent * 100).toFixed(1)}%
                    </div>
                  </div>

                  {/* Expand/Collapse Icon */}
                  <svg
                    className={`w-5 h-5 text-foreground/60 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Month Details */}
              {isExpanded && (
                <div className="border-t border-border/30">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-background/20">
                        <tr className="border-b border-border/20">
                          <th className="px-6 py-3 text-left text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                            Month
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                            Sales
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                            Revenue
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                            Original Margin
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                            Adjustments
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                            Final Margin
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-foreground/60 uppercase tracking-wider">
                            Margin %
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {months.map((stat) => {
                          const hasAdjustments = stat.total_adjustments_usd > 0;

                          return (
                            <tr
                              key={`${stat.year}-${stat.month}`}
                              className="border-b border-border/10 hover:bg-background/20 transition-colors"
                            >
                              <td className="px-6 py-4 text-sm font-medium text-foreground">
                                {MONTH_NAMES[stat.month - 1]}
                              </td>
                              <td className="px-6 py-4 text-right text-sm text-foreground">
                                {stat.total_sales}
                              </td>
                              <td className="px-6 py-4 text-right text-sm font-semibold text-accent">
                                {currencyFormatter.format(stat.total_revenue_usd)}
                              </td>
                              <td className="px-6 py-4 text-right text-sm text-foreground">
                                {currencyFormatter.format(stat.original_margin_usd)}
                              </td>
                              <td className="px-6 py-4 text-right text-sm">
                                {hasAdjustments ? (
                                  <span className="text-rose-400 font-semibold">
                                    -{currencyFormatter.format(stat.total_adjustments_usd)}
                                  </span>
                                ) : (
                                  <span className="text-foreground/40">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right text-sm">
                                <span className={hasAdjustments ? 'text-emerald-300 font-semibold' : 'text-emerald-400 font-semibold'}>
                                  {currencyFormatter.format(stat.total_margin_usd)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right text-sm text-foreground/80">
                                {(stat.avg_margin_percent * 100).toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
