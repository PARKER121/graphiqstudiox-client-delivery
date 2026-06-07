"use client";

import { FormEvent, useState } from "react";

import { formatPriceFromMinor } from "@/lib/currency";
import type { ProjectRecord } from "@/lib/types";

interface AdminDashboardProps {
  adminLabel: string;
  appUrl: string;
  projects: ProjectRecord[];
  setupError: string | null;
}

function formatDate(isoString: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoString));
}

export function AdminDashboard({
  adminLabel,
  appUrl,
  projects,
  setupError,
}: AdminDashboardProps) {
  const [projectItems, setProjectItems] = useState(projects);
  const [copiedProjectId, setCopiedProjectId] = useState<string | null>(null);
  const [copiedSuccessLink, setCopiedSuccessLink] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successLink, setSuccessLink] = useState<string | null>(null);
  const shareBaseUrl = appUrl.replace(/\/$/, "");

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  async function handleCreateProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessLink(null);

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      
      // Validate file sizes before upload
      const previewFile = formData.get("previewFile") as File | null;
      const finalFile = formData.get("finalFile") as File | null;
      const maxSize = 50 * 1024 * 1024; // 50MB limit
      
      if (previewFile && previewFile.size > maxSize) {
        throw new Error(`Preview file is too large (${(previewFile.size / 1024 / 1024).toFixed(1)}MB). Maximum is 50MB.`);
      }
      
      if (finalFile && finalFile.size > maxSize) {
        throw new Error(`Final file is too large (${(finalFile.size / 1024 / 1024).toFixed(1)}MB). Maximum is 50MB.`);
      }

      const response = await fetch("/api/admin/projects", {
        body: formData,
        method: "POST",
      });

      // Handle error responses first
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        
        // Try to read error details from response
        try {
          const contentType = response.headers.get("content-type");
          if (contentType?.includes("application/json")) {
            const errorData = await response.json();
            if (errorData.error) {
              errorMessage = errorData.error;
            }
          }
        } catch {
          // If we can't parse the error response, just use the status text
        }
        
        throw new Error(errorMessage);
      }

      // Parse successful response
      let responseBody: { error?: string; project?: ProjectRecord };
      
      try {
        responseBody = await response.json();
      } catch {
        throw new Error("Invalid response format from server.");
      }

      if (!responseBody.project?.token) {
        throw new Error(responseBody.error ?? "Unable to create project.");
      }

      const shareLink = `${shareBaseUrl}/p/${responseBody.project.token}`;
      setProjectItems((current) => [responseBody.project!, ...current]);
      setCopiedSuccessLink(false);
      setSuccessLink(shareLink);
      form.reset();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create project.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopyLink(projectId: string, shareUrl: string) {
    await navigator.clipboard.writeText(shareUrl);
    setCopiedProjectId(projectId);
    window.setTimeout(() => {
      setCopiedProjectId((current) => (current === projectId ? null : current));
    }, 1800);
  }

  async function handleCopySuccessLink() {
    if (!successLink) {
      return;
    }

    await navigator.clipboard.writeText(successLink);
    setCopiedSuccessLink(true);
    window.setTimeout(() => {
      setCopiedSuccessLink(false);
    }, 1800);
  }

  async function handleDeleteProject(projectId: string) {
    const confirmed = window.confirm(
      "Delete this client link? This removes the project record and its payment history.",
    );

    if (!confirmed) {
      return;
    }

    setDeletingProjectId(projectId);
    setError(null);

    try {
      const response = await fetch(`/api/admin/projects/${projectId}`, {
        method: "DELETE",
      });
      const responseBody = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(responseBody.error ?? "Unable to delete project.");
      }

      setProjectItems((current) =>
        current.filter((project) => project.id !== projectId),
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete project.",
      );
    } finally {
      setDeletingProjectId(null);
    }
  }

  return (
    <div className="grid gap-8 pb-8">
      <section className="rounded-[36px] border border-white/60 bg-[var(--surface)] p-8 shadow-[var(--shadow)] backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--accent)]">
              Admin Dashboard
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--foreground)]">
              Upload previews, store private deliverables, and ship secure links.
            </h1>
            <p className="mt-3 text-sm leading-7 text-[var(--foreground-muted)]">
              Signed in as {adminLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex rounded-full border border-[var(--line)] bg-white/75 px-5 py-3 text-sm font-medium text-[var(--foreground)]"
          >
            Sign out
          </button>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Statistics are now on a separate page.
            </p>
            <p className="text-sm text-[var(--foreground-muted)]">
              Click through to review yearly sales, monthly clients, and download reports.
            </p>
          </div>
          <a
            href="/admin/stats"
            className="inline-flex rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow)]"
          >
            View statistics
          </a>
        </div>
      </section>

      {setupError ? (
        <section className="rounded-[36px] border border-orange-200 bg-orange-50/90 p-6 shadow-[var(--shadow)]">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--danger)]">
            Setup Required
          </p>
          <p className="mt-3 text-sm leading-7 text-[var(--danger)]">
            {setupError}
          </p>
        </section>
      ) : null}

      <section className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <form
          onSubmit={handleCreateProject}
          className="rounded-[36px] border border-white/60 bg-[var(--surface)] p-8 shadow-[var(--shadow)] backdrop-blur"
        >
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--accent)]">
              Create Project
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
              One form, one upload pass, one private delivery link
            </h2>
          </div>

          <div className="mt-8 grid gap-4">
            <input
              name="title"
              placeholder="Project title"
              className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-teal-100"
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                name="clientName"
                placeholder="Client name"
                className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-teal-100"
                required
              />
              <input
                name="clientEmail"
                type="email"
                placeholder="client@email.com"
                className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-teal-100"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                name="price"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Price in GHS"
                className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-teal-100"
                required
              />
              <input
                name="downloadLimit"
                type="number"
                min="1"
                max="3"
                step="1"
                placeholder="Download limit"
                defaultValue="3"
                className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-teal-100"
              />
            </div>
            <p className="text-xs font-medium text-[var(--foreground-muted)]">
              Each client link is capped at a maximum of 3 downloads.
            </p>
            <label className="rounded-2xl border border-dashed border-[var(--line)] bg-white/70 px-4 py-4 text-sm text-[var(--foreground-muted)]">
              Preview file for Cloudinary or PDF preview
              <input
                name="previewFile"
                type="file"
                accept="image/*,video/*,.pdf,application/pdf"
                className="mt-2 block w-full text-sm text-[var(--foreground)]"
                required
              />
            </label>
            <label className="rounded-2xl border border-dashed border-[var(--line)] bg-white/70 px-4 py-4 text-sm text-[var(--foreground-muted)]">
              Final delivery file for UploadThing
              <input
                name="finalFile"
                type="file"
                accept="image/*,video/*,.pdf,application/pdf,application/zip"
                className="mt-2 block w-full text-sm text-[var(--foreground)]"
                required
              />
            </label>
          </div>

          {error ? (
            <p className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}

          {successLink ? (
            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--success)] sm:flex-row sm:items-center sm:justify-between">
              <p className="truncate">Share link created: {successLink}</p>
              <button
                type="button"
                onClick={handleCopySuccessLink}
                className="inline-flex shrink-0 rounded-full border border-emerald-300 bg-white px-4 py-2 text-xs font-semibold text-[var(--success)]"
              >
                {copiedSuccessLink ? "Copied" : "Copy new link"}
              </button>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || Boolean(setupError)}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {setupError
              ? "Finish database setup first"
              : isSubmitting
                ? "Uploading and saving..."
                : "Create delivery link"}
          </button>
        </form>

        <div className="rounded-[36px] border border-white/60 bg-[var(--surface)] p-8 shadow-[var(--shadow)] backdrop-blur">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--accent)]">
              Active Projects
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
              Private links, payment states, and download usage
            </h2>
          </div>

          <div className="mt-8 grid gap-4">
            {projectItems.length === 0 ? (
              <div className="rounded-[28px] border border-[var(--line)] bg-white/75 p-6 text-sm text-[var(--foreground-muted)]">
                No delivery links yet. Create your first project to get started.
              </div>
            ) : (
              projectItems.map((project) => {
                const shareUrl = `${shareBaseUrl}/p/${project.token}`;

                return (
                  <div
                    key={project.id}
                    className="rounded-[28px] border border-[var(--line)] bg-white/78 p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-semibold text-[var(--foreground)]">
                            {project.title}
                          </h3>
                          <span
                            className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                              project.status === "paid"
                                ? "border-emerald-200 bg-[var(--success-soft)] text-[var(--success)]"
                                : "border-orange-200 bg-[var(--danger-soft)] text-[var(--danger)]"
                            }`}
                          >
                            {project.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-[var(--foreground-muted)]">
                          {project.clientName} - {project.clientEmail}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(project.id, shareUrl)}
                          className="inline-flex rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)]"
                        >
                          {copiedProjectId === project.id ? "Copied" : "Copy link"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(project.id)}
                          disabled={deletingProjectId === project.id}
                          className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingProjectId === project.id ? "Deleting..." : "Delete link"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-[var(--foreground-muted)] sm:grid-cols-4">
                      <div>
                        <p>Price</p>
                        <p className="mt-1 font-semibold text-[var(--foreground)]">
                          {formatPriceFromMinor(project.price)}
                        </p>
                      </div>
                      <div>
                        <p>Downloads</p>
                        <p className="mt-1 font-semibold text-[var(--foreground)]">
                          {project.downloadsUsed} / {project.downloadLimit}
                        </p>
                      </div>
                      <div>
                        <p>Created</p>
                        <p className="mt-1 font-semibold text-[var(--foreground)]">
                          {formatDate(project.createdAt)}
                        </p>
                      </div>
                      <div>
                        <p>Token</p>
                        <p className="mt-1 truncate font-mono text-xs text-[var(--foreground)]">
                          {project.token}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
