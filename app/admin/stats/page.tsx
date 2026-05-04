import Link from "next/link";

import { AdminLoginForm } from "@/components/admin-login-form";
import { getCurrentAdminUser } from "@/lib/auth";
import { getAppUrl } from "@/lib/env";
import { getAdminStatistics, isSupabaseTableMissingError } from "@/lib/projects";
import type { AdminStatistics } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
  }).format(amount / 100);
}

export default async function AdminStatsPage() {
  const admin = await getCurrentAdminUser();

  if (!admin) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-12 sm:px-10">
        <div className="grid w-full gap-8 rounded-[36px] border border-white/60 bg-[var(--surface)] p-8 shadow-[var(--shadow)] backdrop-blur lg:grid-cols-[0.95fr_1.05fr]">
          <div className="flex flex-col justify-between gap-6">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--accent)]">
                Admin Access
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--foreground)]">
                Sign in to view your statistics.
              </h1>
            </div>
            <p className="text-sm leading-7 text-[var(--foreground-muted)]">
              Admin statistics are protected. Use your admin password to continue.
            </p>
          </div>
          <AdminLoginForm />
        </div>
      </main>
    );
  }

  let stats: AdminStatistics | null = null;
  let setupError: string | null = null;

  try {
    stats = await getAdminStatistics();
  } catch (error) {
    if (isSupabaseTableMissingError(error, "projects")) {
      setupError =
        "Supabase is connected, but the `public.projects` table is missing. Run `supabase/schema.sql` in the Supabase SQL Editor, then refresh this page.";
    } else {
      throw error;
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-screen-2xl px-4 py-8 sm:px-10">
      <div className="grid gap-8 pb-8">
        <section className="rounded-[36px] border border-white/60 bg-[var(--surface)] p-8 shadow-[var(--shadow)] backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--accent)]">
                Admin statistics
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--foreground)]">
                Yearly performance and report export
              </h1>
              <p className="mt-3 text-sm leading-7 text-[var(--foreground-muted)]">
                Review annual sales and monthly client activity, then download a PDF summary.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:items-end">
              <Link
                href="/admin"
                className="inline-flex rounded-full border border-[var(--line)] bg-white/75 px-5 py-3 text-sm font-medium text-[var(--foreground)]"
              >
                Back to dashboard
              </Link>
              <Link
                href={`/api/admin/report?year=${new Date().getUTCFullYear()}`}
                className="inline-flex rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow)]"
              >
                Download yearly report
              </Link>
            </div>
          </div>

          {setupError ? (
            <div className="mt-8 rounded-[28px] border border-orange-200 bg-orange-50 px-5 py-4 text-sm text-[var(--danger)]">
              {setupError}
            </div>
          ) : null}

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
        </section>
      </div>
    </main>
  );
}
