import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminLoginForm } from "@/components/admin-login-form";
import { getCurrentAdminUser } from "@/lib/auth";
import { getAppUrl } from "@/lib/env";
import { isSupabaseTableMissingError, listProjects } from "@/lib/projects";
import type { ProjectRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
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
                Sign in to create and manage client delivery links.
              </h1>
            </div>
          </div>
          <AdminLoginForm />
        </div>
      </main>
    );
  }

  let projects: ProjectRecord[] = [];
  let setupError: string | null = null;

  try {
    projects = await listProjects();
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
      <AdminDashboard
        adminLabel={admin.label}
        appUrl={getAppUrl()}
        projects={projects}
        setupError={setupError}
      />
    </main>
  );
}
