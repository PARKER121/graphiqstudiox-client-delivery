"use client";

import { useEffect, useState } from "react";

import type { AdminStatistics } from "@/lib/types";

interface AdminStatsDisplayProps {
  initialStats: AdminStatistics | null;
  initialYear: number;
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(amount / 100);
}

export function AdminStatsDisplay({
  initialStats,
  initialYear,
}: AdminStatsDisplayProps) {
  const [stats, setStats] = useState<AdminStatistics | null>(initialStats);
  const [year, setYear] = useState(initialYear);
  const [isLoading, setIsLoading] = useState(false);

  // Load stats from API on mount and periodically refresh
  useEffect(() => {
    async function loadStats() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/admin/stats?year=${year}`);
        if (response.ok) {
          const data = (await response.json()) as { stats: AdminStatistics };
          setStats(data.stats);
        }
      } catch {
        // Silently fail - stats will remain as currently loaded
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();

    // Refresh stats every 30 seconds to stay in sync with database
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, [year]);

  const currentYear = new Date().getUTCFullYear();

  return (
    <>
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <label htmlFor="year-select" className="text-sm font-medium text-[var(--foreground)]">
            Year:
          </label>
          <select
            id="year-select"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-full border border-[var(--line)] bg-white/75 px-4 py-2 text-sm font-medium text-[var(--foreground)]"
          >
            {Array.from({ length: 5 }, (_, i) => currentYear - i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        {isLoading && (
          <p className="text-xs text-[var(--foreground-muted)]">Updating...</p>
        )}
      </div>

      {stats ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[28px] border border-[var(--line)] bg-white/75 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
              Total sales ({stats.year})
            </p>
            <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
              {formatPrice(stats.totalSales)}
            </p>
          </div>
          <div className="rounded-[28px] border border-[var(--line)] bg-white/75 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
              Clients paid this year
            </p>
            <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
              {stats.totalClients}
            </p>
          </div>
          <div className="rounded-[28px] border border-[var(--line)] bg-white/75 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--foreground-muted)]">
              Clients this month
            </p>
            <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
              {stats.clientsThisMonth}
            </p>
          </div>
        </div>
      ) : null}

      {stats ? (
        <div className="mt-8 rounded-[28px] border border-[var(--line)] bg-white/75 p-5">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-[var(--foreground-muted)]">
              <thead>
                <tr>
                  <th className="py-3 pr-6 font-medium text-[var(--foreground)]">Month</th>
                  <th className="py-3 pr-6 font-medium text-[var(--foreground)]">Sales</th>
                  <th className="py-3 font-medium text-[var(--foreground)]">Clients</th>
                </tr>
              </thead>
              <tbody>
                {stats.monthlyStats.map((monthStat) => (
                  <tr key={monthStat.month} className="border-t border-[var(--line)]">
                    <td className="py-3 pr-6 font-medium text-[var(--foreground)]">
                      {monthStat.month}
                    </td>
                    <td className="py-3 pr-6">{formatPrice(monthStat.amount)}</td>
                    <td className="py-3">{monthStat.clients}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </>
  );
}
