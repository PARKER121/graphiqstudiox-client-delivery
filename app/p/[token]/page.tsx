import { ProjectExperience } from "@/components/project-experience";
import { getPaystackPublicKey } from "@/lib/env";
import { getPublicProjectByToken } from "@/lib/projects";

export const dynamic = "force-dynamic";

interface ProjectPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{
    payment?: string;
    reference?: string;
  }>;
}

export default async function ProjectPage({
  params,
  searchParams,
}: ProjectPageProps) {
  const { token } = await params;
  const query = await searchParams;
  const project = await getPublicProjectByToken(token);

  if (!project) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-12 sm:px-10">
        <div className="w-full rounded-[36px] border border-white/60 bg-[var(--surface)] p-10 text-center shadow-[var(--shadow)] backdrop-blur">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--danger)]">
            Invalid Link
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-[var(--foreground)]">
            This delivery link is invalid or has been removed.
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--foreground-muted)]">
            Ask Graphiq Studiox to resend your project access link.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-8 sm:px-10">
      <ProjectExperience
        paystackPublicKey={getPaystackPublicKey()}
        paymentProcessing={query.payment === "processing"}
        project={project}
        reference={
          typeof query.reference === "string" ? query.reference : undefined
        }
      />
    </main>
  );
}
