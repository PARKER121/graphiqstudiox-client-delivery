import Link from "next/link";

import { AdminStatsDisplay } from "@/components/admin-stats-display";
import { AdminLoginForm } from "@/components/admin-login-form";
import { getCurrentAdminUser } from "@/lib/auth";
import { getAdminStatistics, isSupabaseTableMissingError } from "@/lib/projects";
import type { AdminStatistics } from "@/lib/types";

export const dynamic = "force-dynamic";

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
              <div className="flex gap-3 flex-col sm:flex-row">
                <Link
                  href={`/api/admin/report?year=${new Date().getUTCFullYear()}&format=csv`}
                  className="inline-flex rounded-full border border-[var(--line)] bg-white/75 px-5 py-3 text-sm font-semibold text-[var(--foreground)]"
                >
                  Download CSV
                </Link>
                <Link
                  href={`/api/admin/report?year=${new Date().getUTCFullYear()}&format=pdf`}
                  className="inline-flex rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow)]"
                >
                  Download PDF
                </Link>
              </div>
            </div>
          </div>

          {setupError ? (
            <div className="mt-8 rounded-[28px] border border-orange-200 bg-orange-50 px-5 py-4 text-sm text-[var(--danger)]">
              {setupError}
            </div>
          ) : null}

          <AdminStatsDisplay
            initialStats={stats}
            initialYear={new Date().getUTCFullYear()}
          />
        </section>
      </div>
    </main>
  );
}
